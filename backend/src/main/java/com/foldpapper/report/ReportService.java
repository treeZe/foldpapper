package com.foldpapper.report;

import com.foldpapper.common.ApiException;
import com.foldpapper.pin.Pin;
import com.foldpapper.pin.PinRepository;
import com.foldpapper.user.User;
import com.foldpapper.user.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.UUID;

@Service
public class ReportService {

    private final ReportRepository reportRepository;
    private final PinRepository pinRepository;
    private final UserRepository userRepository;

    public ReportService(ReportRepository reportRepository,
                         PinRepository pinRepository,
                         UserRepository userRepository) {
        this.reportRepository = reportRepository;
        this.pinRepository = pinRepository;
        this.userRepository = userRepository;
    }

    @Transactional
    public void report(UUID pinId, UUID reporterId, ReportReason reason, String comment) {
        Pin pin = pinRepository.findWithAuthorAndTagsById(pinId)
                .orElseThrow(() -> ApiException.notFound("Пин"));
        if (reason == ReportReason.IMPERSONATION) {
            throw ApiException.badRequest("Эта причина только для жалоб на профиль");
        }
        if (pin.getAuthor().getId().equals(reporterId)) {
            throw ApiException.badRequest("Нельзя пожаловаться на свой пин");
        }
        if (reportRepository.existsByPinIdAndReporterId(pinId, reporterId)) {
            throw ApiException.conflict("Вы уже пожаловались на этот пин — модераторы разберутся");
        }

        Report report = new Report();
        report.setPin(pin);
        report.setReporter(userRepository.getReferenceById(reporterId));
        report.setReason(reason);
        report.setComment(StringUtils.hasText(comment) ? comment.trim() : null);
        report.setPinTitle(pin.getTitle());
        report.setPinImageUrl(pin.getImageUrl());
        reportRepository.save(report);
    }

    @Transactional
    public void reportUser(String username, UUID reporterId, ReportReason reason, String comment) {
        User target = userRepository.findByUsernameIgnoreCase(username)
                .orElseThrow(() -> ApiException.notFound("Пользователь"));
        if (target.getId().equals(reporterId)) {
            throw ApiException.badRequest("Нельзя пожаловаться на самого себя");
        }
        if (reason == ReportReason.COPYRIGHT) {
            throw ApiException.badRequest("Жалобу на авторские права подайте на конкретный пин");
        }
        if (target.isBanned()) {
            throw ApiException.conflict("Аккаунт уже заблокирован");
        }
        if (reportRepository.existsByTargetUserIdAndReporterIdAndStatus(target.getId(), reporterId, ReportStatus.OPEN)) {
            throw ApiException.conflict("Вы уже пожаловались на этого пользователя — модераторы разберутся");
        }

        Report report = new Report();
        report.setKind(ReportKind.USER);
        report.setTargetUser(target);
        report.setTargetUsername(target.getUsername());
        report.setReporter(userRepository.getReferenceById(reporterId));
        report.setReason(reason);
        report.setComment(StringUtils.hasText(comment) ? comment.trim() : null);
        reportRepository.save(report);
    }
}
