package com.foldpapper.admin;

import com.foldpapper.admin.AdminDtos.AdminPinView;
import com.foldpapper.admin.AdminDtos.AdminStats;
import com.foldpapper.admin.AdminDtos.AdminUserUpdate;
import com.foldpapper.admin.AdminDtos.AdminUserView;
import com.foldpapper.admin.AdminDtos.DayActivity;
import com.foldpapper.admin.AdminDtos.ReportView;
import com.foldpapper.admin.AdminDtos.ResolveAction;
import com.foldpapper.board.BoardRepository;
import com.foldpapper.common.ApiException;
import com.foldpapper.common.PageResponse;
import com.foldpapper.pepper.PepperRepository;
import com.foldpapper.pin.Pin;
import com.foldpapper.pin.PinRepository;
import com.foldpapper.pin.PinService;
import com.foldpapper.report.Report;
import com.foldpapper.report.ReportKind;
import com.foldpapper.report.ReportRepository;
import com.foldpapper.report.ReportStatus;
import com.foldpapper.user.Role;
import com.foldpapper.user.User;
import com.foldpapper.user.UserRepository;
import com.foldpapper.user.UserService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.sql.Timestamp;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class AdminService {

    private static final int ACTIVITY_DAYS = 14;

    private final UserRepository userRepository;
    private final PinRepository pinRepository;
    private final BoardRepository boardRepository;
    private final PepperRepository pepperRepository;
    private final ReportRepository reportRepository;
    private final PinService pinService;
    private final JdbcTemplate jdbcTemplate;

    public AdminService(UserRepository userRepository,
                        PinRepository pinRepository,
                        BoardRepository boardRepository,
                        PepperRepository pepperRepository,
                        ReportRepository reportRepository,
                        PinService pinService,
                        JdbcTemplate jdbcTemplate) {
        this.userRepository = userRepository;
        this.pinRepository = pinRepository;
        this.boardRepository = boardRepository;
        this.pepperRepository = pepperRepository;
        this.reportRepository = reportRepository;
        this.pinService = pinService;
        this.jdbcTemplate = jdbcTemplate;
    }

    // ------------------------------------------------------------------ stats

    @Transactional(readOnly = true)
    public AdminStats stats(String timezone) {
        ZoneId zone = parseZone(timezone);
        Instant weekAgo = Instant.now().minus(7, ChronoUnit.DAYS);
        return new AdminStats(
                userRepository.count(),
                userRepository.countByRole(Role.ADMIN),
                userRepository.countByBannedAtIsNotNull(),
                pinRepository.count(),
                boardRepository.count(),
                pepperRepository.count(),
                reportRepository.countByStatus(ReportStatus.OPEN),
                userRepository.countByCreatedAtAfter(weekAgo),
                pinRepository.countByCreatedAtAfter(weekAgo),
                activity(zone));
    }

    /** Дни считаем в часовом поясе админа, иначе «сегодня» у него и у сервера разойдутся. */
    private List<DayActivity> activity(ZoneId zone) {
        LocalDate today = LocalDate.now(zone);
        LocalDate first = today.minusDays(ACTIVITY_DAYS - 1);
        Instant from = first.atStartOfDay(zone).toInstant();

        Map<LocalDate, Long> users = dailyCounts("users", zone, from);
        Map<LocalDate, Long> pins = dailyCounts("pins", zone, from);
        Map<LocalDate, Long> peppers = dailyCounts("peppers", zone, from);

        List<DayActivity> result = new ArrayList<>(ACTIVITY_DAYS);
        for (LocalDate day = first; !day.isAfter(today); day = day.plusDays(1)) {
            result.add(new DayActivity(day,
                    users.getOrDefault(day, 0L),
                    pins.getOrDefault(day, 0L),
                    peppers.getOrDefault(day, 0L)));
        }
        return result;
    }

    /** table — только из фиксированного списка выше, в SQL не попадает пользовательский ввод. */
    private Map<LocalDate, Long> dailyCounts(String table, ZoneId zone, Instant from) {
        String sql = "SELECT CAST(created_at AT TIME ZONE ? AS date) AS day, COUNT(*) AS n FROM " + table
                + " WHERE created_at >= ? GROUP BY 1";
        Map<LocalDate, Long> counts = new HashMap<>();
        jdbcTemplate.query(sql,
                rs -> {
                    counts.put(rs.getDate("day").toLocalDate(), rs.getLong("n"));
                },
                zone.getId(), Timestamp.from(from));
        return counts;
    }

    private static ZoneId parseZone(String timezone) {
        if (!StringUtils.hasText(timezone)) {
            return ZoneId.of("UTC");
        }
        try {
            return ZoneId.of(timezone);
        } catch (Exception ex) {
            throw ApiException.badRequest("Неизвестный часовой пояс: " + timezone);
        }
    }

    // ------------------------------------------------------------------ users

    @Transactional(readOnly = true)
    public PageResponse<AdminUserView> users(String query, String filter, Pageable pageable) {
        String pattern = StringUtils.hasText(query) ? "%" + query.trim().toLowerCase() + "%" : "";
        String normalizedFilter = "admins".equals(filter) || "banned".equals(filter) ? filter : "";
        Page<User> page = userRepository.searchForAdmin(pattern, normalizedFilter,
                PageRequest.of(pageable.getPageNumber(), Math.min(pageable.getPageSize(), 100),
                        Sort.by(Sort.Order.desc("createdAt"))));

        List<UUID> ids = page.getContent().stream().map(User::getId).toList();
        Map<UUID, Long> pinCounts = pinCounts(ids);
        Map<UUID, Long> reports = openUserReports(ids);
        return PageResponse.of(page, page.getContent().stream()
                .map(user -> toView(user, pinCounts.getOrDefault(user.getId(), 0L),
                        reports.getOrDefault(user.getId(), 0L)))
                .toList());
    }

    @Transactional
    public AdminUserView updateUser(UUID adminId, UUID userId, AdminUserUpdate update) {
        if (adminId.equals(userId)) {
            // иначе можно случайно остаться без единого админа
            throw ApiException.badRequest("Нельзя менять роль или блокировать самого себя");
        }
        User user = userRepository.findForUpdateById(userId).orElseThrow(() -> ApiException.notFound("Пользователь"));

        // повторный запрос (двойной клик, вторая вкладка, другой админ успел раньше) — ошибка, а не тихий успех
        if (update.role() != null) {
            if (update.role() == user.getRole()) {
                throw ApiException.conflict(user.isAdmin()
                        ? "Пользователь уже администратор"
                        : "Пользователь и так не администратор");
            }
            user.setRole(update.role());
        }
        boolean newlyBanned = false;
        if (Boolean.TRUE.equals(update.banned())) {
            if (user.isBanned()) {
                throw ApiException.conflict("Пользователь уже заблокирован");
            }
            if (user.isAdmin()) {
                throw ApiException.badRequest("Сначала снимите с пользователя роль администратора");
            }
            user.setBannedAt(Instant.now());
            user.setBanReason(StringUtils.hasText(update.banReason()) ? update.banReason().trim() : null);
            newlyBanned = true;
        } else if (Boolean.FALSE.equals(update.banned())) {
            if (!user.isBanned()) {
                throw ApiException.conflict("Пользователь не заблокирован");
            }
            user.setBannedAt(null);
            user.setBanReason(null);
        }
        if (user.isAdmin() && user.isBanned()) {
            throw ApiException.badRequest("Заблокированный пользователь не может быть администратором");
        }
        if (newlyBanned) {
            // блокировка — это и есть решение по жалобам на профиль; после запроса user отсоединён, но уже сохранён
            reportRepository.resolveOpenForUser(userId, userRepository.getReferenceById(adminId), Instant.now());
        }

        return toView(user, pinCounts(List.of(userId)).getOrDefault(userId, 0L),
                openUserReports(List.of(userId)).getOrDefault(userId, 0L));
    }

    private Map<UUID, Long> pinCounts(Collection<UUID> userIds) {
        if (userIds.isEmpty()) {
            return Map.of();
        }
        return pinRepository.countByAuthorIds(userIds).stream()
                .collect(Collectors.toMap(PinRepository.AuthorPinCount::getAuthorId,
                        PinRepository.AuthorPinCount::getCount));
    }

    private Map<UUID, Long> openUserReports(Collection<UUID> userIds) {
        if (userIds.isEmpty()) {
            return Map.of();
        }
        return reportRepository.countOpenByTargetUserIds(userIds).stream()
                .collect(Collectors.toMap(ReportRepository.UserReportCount::getUserId,
                        ReportRepository.UserReportCount::getCount));
    }

    private static AdminUserView toView(User user, long pins, long openReports) {
        return new AdminUserView(user.getId(), user.getUsername(), user.getDisplayName(), user.getEmail(),
                user.getAvatarUrl(), user.getRole(), user.getBannedAt(), user.getBanReason(), pins, openReports,
                user.getCreatedAt());
    }

    // ------------------------------------------------------------------- pins

    @Transactional(readOnly = true)
    public PageResponse<AdminPinView> pins(String query, Pageable pageable) {
        Pageable sorted = PageRequest.of(pageable.getPageNumber(), Math.min(pageable.getPageSize(), 100),
                Sort.by(Sort.Order.desc("createdAt")));
        Page<Pin> page = StringUtils.hasText(query)
                ? pinRepository.search("%" + query.trim().toLowerCase() + "%", sorted)
                : pinRepository.findAllBy(sorted);

        Map<UUID, Long> reports = openReports(page.getContent().stream().map(Pin::getId).collect(Collectors.toSet()));
        return PageResponse.of(page, page.getContent().stream()
                .map(pin -> toView(pin, reports.getOrDefault(pin.getId(), 0L)))
                .toList());
    }

    @Transactional
    public void deletePin(UUID adminId, UUID pinId) {
        reportRepository.resolveOpenForPin(pinId, userRepository.getReferenceById(adminId), Instant.now());
        pinService.deleteAsModerator(pinId);
    }

    private Map<UUID, Long> openReports(Set<UUID> pinIds) {
        if (pinIds.isEmpty()) {
            return Map.of();
        }
        return reportRepository.countOpenByPinIds(pinIds).stream()
                .collect(Collectors.toMap(ReportRepository.PinReportCount::getPinId,
                        ReportRepository.PinReportCount::getCount));
    }

    private static AdminPinView toView(Pin pin, long openReports) {
        return new AdminPinView(pin.getId(), pin.getTitle(), pin.getImageUrl(), pin.getImageWidth(),
                pin.getImageHeight(), UserService.toSummary(pin.getAuthor()), pin.getPepperCount(),
                pin.getHeatScore(), pin.getSaveCount(), openReports, pin.getCreatedAt());
    }

    // ---------------------------------------------------------------- reports

    @Transactional(readOnly = true)
    public PageResponse<ReportView> reports(ReportStatus status, Pageable pageable) {
        // открытые — старые сверху (очередь), разобранные — свежие сверху (история)
        Sort sort = status == ReportStatus.OPEN
                ? Sort.by(Sort.Order.asc("createdAt"))
                : Sort.by(Sort.Order.desc("resolvedAt"));
        Page<Report> page = reportRepository.findByStatus(status,
                PageRequest.of(pageable.getPageNumber(), Math.min(pageable.getPageSize(), 100), sort));

        Map<UUID, Long> counts = openReports(page.getContent().stream()
                .filter(report -> report.getPin() != null)
                .map(report -> report.getPin().getId())
                .collect(Collectors.toSet()));
        List<UUID> targetIds = page.getContent().stream()
                .filter(report -> report.getTargetUser() != null)
                .map(report -> report.getTargetUser().getId())
                .distinct()
                .toList();
        Map<UUID, Long> targetPins = pinCounts(targetIds);
        Map<UUID, Long> targetReports = openUserReports(targetIds);
        return PageResponse.of(page, page.getContent().stream()
                .map(report -> toView(report, counts, targetPins, targetReports))
                .toList());
    }

    @Transactional
    public void resolve(UUID adminId, UUID reportId, ResolveAction action) {
        Report report = reportRepository.findWithDetailsById(reportId)
                .orElseThrow(() -> ApiException.notFound("Жалоба"));
        if (report.getStatus() != ReportStatus.OPEN) {
            throw ApiException.conflict("Жалоба уже разобрана");
        }

        if (action == ResolveAction.DELETE_PIN && report.getKind() == ReportKind.USER) {
            throw ApiException.badRequest("Жалобу на профиль закрывает блокировка пользователя");
        }
        if (action == ResolveAction.DELETE_PIN && report.getPin() != null) {
            deletePin(adminId, report.getPin().getId());
            return;
        }
        // пин мог уже удалить сам автор — тогда жалобу просто закрываем
        report.setStatus(action == ResolveAction.DISMISS ? ReportStatus.DISMISSED : ReportStatus.RESOLVED);
        report.setResolvedBy(userRepository.getReferenceById(adminId));
        report.setResolvedAt(Instant.now());
    }

    private static ReportView toView(Report report, Map<UUID, Long> openCounts,
                                     Map<UUID, Long> targetPins, Map<UUID, Long> targetReports) {
        Pin pin = report.getPin();
        User target = report.getTargetUser();
        return new ReportView(
                report.getId(),
                report.getKind(),
                report.getReason(),
                report.getComment(),
                report.getStatus(),
                pin == null ? null : toView(pin, openCounts.getOrDefault(pin.getId(), 0L)),
                report.getPinTitle(),
                report.getPinImageUrl(),
                target == null ? null : toView(target, targetPins.getOrDefault(target.getId(), 0L),
                        targetReports.getOrDefault(target.getId(), 0L)),
                report.getTargetUsername(),
                UserService.toSummary(report.getReporter()),
                report.getResolvedBy() == null ? null : UserService.toSummary(report.getResolvedBy()),
                report.getResolvedAt(),
                report.getCreatedAt());
    }
}
