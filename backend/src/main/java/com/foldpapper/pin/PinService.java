package com.foldpapper.pin;

import com.foldpapper.common.ApiException;
import com.foldpapper.common.PageResponse;
import com.foldpapper.pepper.PepperRepository;
import com.foldpapper.pin.dto.PinDtos.PinCreateRequest;
import com.foldpapper.pin.dto.PinDtos.PinResponse;
import com.foldpapper.pin.dto.PinDtos.PinUpdateRequest;
import com.foldpapper.security.AppUserPrincipal;
import com.foldpapper.tag.Tag;
import com.foldpapper.tag.TagService;
import com.foldpapper.user.User;
import com.foldpapper.user.UserRepository;
import com.foldpapper.user.UserService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class PinService {

    /** Сортировки ленты. */
    public enum FeedSort {
        /** Свежие сверху. */
        NEW,
        /** Самые "острые" сверху. */
        HOT;

        public static FeedSort parse(String raw) {
            if (!StringUtils.hasText(raw)) {
                return NEW;
            }
            try {
                return valueOf(raw.trim().toUpperCase());
            } catch (IllegalArgumentException ex) {
                throw ApiException.badRequest("Неизвестная сортировка: " + raw);
            }
        }

        Sort toSort() {
            return this == HOT
                    ? Sort.by(Sort.Order.desc("heatScore"), Sort.Order.desc("createdAt"))
                    : Sort.by(Sort.Order.desc("createdAt"));
        }
    }

    private final PinRepository pinRepository;
    private final PepperRepository pepperRepository;
    private final UserRepository userRepository;
    private final TagService tagService;

    public PinService(PinRepository pinRepository,
                      PepperRepository pepperRepository,
                      UserRepository userRepository,
                      TagService tagService) {
        this.pinRepository = pinRepository;
        this.pepperRepository = pepperRepository;
        this.userRepository = userRepository;
        this.tagService = tagService;
    }

    @Transactional
    public Pin create(UUID authorId, PinCreateRequest request) {
        User author = userRepository.findById(authorId)
                .orElseThrow(() -> ApiException.notFound("Пользователь"));

        Pin pin = new Pin();
        pin.setAuthor(author);
        pin.setTitle(trimToNull(request.title()));
        pin.setDescription(trimToNull(request.description()));
        pin.setSourceUrl(trimToNull(request.sourceUrl()));
        pin.setImageUrl(request.imageUrl().trim());
        pin.setImageWidth(request.imageWidth());
        pin.setImageHeight(request.imageHeight());
        pin.setTags(tagService.resolveOrCreate(request.tags()));
        return pinRepository.save(pin);
    }

    @Transactional
    public PinResponse update(UUID pinId, UUID userId, PinUpdateRequest request) {
        Pin pin = requireOwned(pinId, userId);
        if (request.title() != null) {
            pin.setTitle(trimToNull(request.title()));
        }
        if (request.description() != null) {
            pin.setDescription(trimToNull(request.description()));
        }
        if (request.sourceUrl() != null) {
            pin.setSourceUrl(trimToNull(request.sourceUrl()));
        }
        if (request.tags() != null) {
            pin.setTags(tagService.resolveOrCreate(request.tags()));
        }
        return toResponse(pin, myPepper(userId, List.of(pin)));
    }

    @Transactional
    public void delete(UUID pinId, UUID userId) {
        pinRepository.delete(requireOwned(pinId, userId));
    }

    @Transactional(readOnly = true)
    public PinResponse get(UUID pinId, AppUserPrincipal principal) {
        Pin pin = pinRepository.findWithAuthorAndTagsById(pinId)
                .orElseThrow(() -> ApiException.notFound("Пин"));
        return toResponse(pin, myPepper(userId(principal), List.of(pin)));
    }

    @Transactional(readOnly = true)
    public PageResponse<PinResponse> explore(String query,
                                             String tag,
                                             FeedSort sort,
                                             AppUserPrincipal principal,
                                             Pageable pageable) {
        Pageable sorted = withSort(pageable, sort);
        Page<Pin> page;
        if (StringUtils.hasText(tag)) {
            page = pinRepository.findByTagName(TagService.normalize(tag), sorted);
        } else if (StringUtils.hasText(query)) {
            page = pinRepository.search("%" + query.trim().toLowerCase() + "%", sorted);
        } else {
            page = pinRepository.findAllBy(sorted);
        }
        return toPage(page, principal);
    }

    @Transactional(readOnly = true)
    public PageResponse<PinResponse> followingFeed(UUID userId, FeedSort sort, Pageable pageable) {
        Pageable sorted = withSort(pageable, sort);
        Page<Pin> page = pinRepository.findFollowingFeed(userId, sorted);
        // если подписок ещё нет — показываем общую ленту, чтобы главная не была пустой
        if (page.isEmpty() && page.getNumber() == 0) {
            page = pinRepository.findAllBy(withSort(pageable, FeedSort.HOT));
        }
        return toPage(page, null, userId);
    }

    @Transactional(readOnly = true)
    public PageResponse<PinResponse> listByAuthor(String username, AppUserPrincipal principal, Pageable pageable) {
        User author = userRepository.findByUsernameIgnoreCase(username)
                .orElseThrow(() -> ApiException.notFound("Пользователь"));
        return toPage(pinRepository.findByAuthorId(author.getId(), withSort(pageable, FeedSort.NEW)), principal);
    }

    @Transactional(readOnly = true)
    public PageResponse<PinResponse> listPeppered(String username, AppUserPrincipal principal, Pageable pageable) {
        User user = userRepository.findByUsernameIgnoreCase(username)
                .orElseThrow(() -> ApiException.notFound("Пользователь"));
        // порядок задан в самом запросе (по дате перца), поэтому сортировку из Pageable убираем
        Pageable unsorted = PageRequest.of(pageable.getPageNumber(), pageable.getPageSize());
        return toPage(pepperRepository.findPepperedPins(user.getId(), unsorted), principal);
    }

    @Transactional(readOnly = true)
    public Pin requireExisting(UUID pinId) {
        return pinRepository.findById(pinId).orElseThrow(() -> ApiException.notFound("Пин"));
    }

    // ------------------------------------------------------------------ mapping

    public PageResponse<PinResponse> toPage(Page<Pin> page, AppUserPrincipal principal) {
        return toPage(page, principal, userId(principal));
    }

    private PageResponse<PinResponse> toPage(Page<Pin> page, AppUserPrincipal principal, UUID userId) {
        Map<UUID, Integer> myPeppers = myPepper(userId, page.getContent());
        return PageResponse.of(page, page.getContent().stream()
                .map(pin -> toResponse(pin, myPeppers))
                .toList());
    }

    public PinResponse toResponse(Pin pin, Map<UUID, Integer> myPeppers) {
        List<String> tags = pin.getTags().stream().map(Tag::getName).sorted().toList();
        return new PinDtoBuilder(pin, tags, myPeppers.get(pin.getId())).build();
    }

    private Map<UUID, Integer> myPepper(UUID userId, Collection<Pin> pins) {
        if (userId == null || pins.isEmpty()) {
            return Map.of();
        }
        Set<UUID> ids = pins.stream().map(Pin::getId).collect(Collectors.toSet());
        return pepperRepository.findByUserIdAndPinIdIn(userId, ids).stream()
                .collect(Collectors.toMap(pepper -> pepper.getPinId(), pepper -> (int) pepper.getHeat()));
    }

    private Pin requireOwned(UUID pinId, UUID userId) {
        Pin pin = pinRepository.findWithAuthorAndTagsById(pinId)
                .orElseThrow(() -> ApiException.notFound("Пин"));
        if (!pin.getAuthor().getId().equals(userId)) {
            throw ApiException.forbidden("Это не ваш пин");
        }
        return pin;
    }

    private static Pageable withSort(Pageable pageable, FeedSort sort) {
        return PageRequest.of(pageable.getPageNumber(), Math.min(pageable.getPageSize(), 100), sort.toSort());
    }

    private static UUID userId(AppUserPrincipal principal) {
        return principal == null ? null : principal.getId();
    }

    private static String trimToNull(String value) {
        return StringUtils.hasText(value) ? value.trim() : null;
    }

    /** Маленький хелпер, чтобы конструктор PinResponse не расползался по коду. */
    private record PinDtoBuilder(Pin pin, List<String> tags, Integer myPepper) {

        PinResponse build() {
            return new PinResponse(
                    pin.getId(),
                    pin.getTitle(),
                    pin.getDescription(),
                    pin.getSourceUrl(),
                    pin.getImageUrl(),
                    pin.getImageWidth(),
                    pin.getImageHeight(),
                    tags,
                    UserService.toSummary(pin.getAuthor()),
                    pin.getPepperCount(),
                    pin.getHeatScore(),
                    pin.getSaveCount(),
                    myPepper,
                    pin.getCreatedAt());
        }
    }
}
