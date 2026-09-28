package com.foldpapper.user;

import com.foldpapper.board.BoardRepository;
import com.foldpapper.common.ApiException;
import com.foldpapper.follow.FollowRepository;
import com.foldpapper.pin.PinRepository;
import com.foldpapper.tag.TagRepository;
import com.foldpapper.user.dto.UserDtos.UpdateProfileRequest;
import com.foldpapper.user.dto.UserDtos.UserResponse;
import com.foldpapper.user.dto.UserDtos.UserStats;
import com.foldpapper.user.dto.UserDtos.UserSummary;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.List;
import java.util.UUID;
import java.util.regex.Pattern;

@Service
public class UserService {

    private static final int TOP_TAGS = 5;
    /** Только http(s): иначе в ссылку профиля можно подсунуть javascript:. */
    private static final Pattern WEBSITE = Pattern.compile("^https?://[^\\s/$.?#][^\\s]*$", Pattern.CASE_INSENSITIVE);

    private final UserRepository userRepository;
    private final PinRepository pinRepository;
    private final BoardRepository boardRepository;
    private final FollowRepository followRepository;
    private final TagRepository tagRepository;

    public UserService(UserRepository userRepository,
                       PinRepository pinRepository,
                       BoardRepository boardRepository,
                       FollowRepository followRepository,
                       TagRepository tagRepository) {
        this.userRepository = userRepository;
        this.pinRepository = pinRepository;
        this.boardRepository = boardRepository;
        this.followRepository = followRepository;
        this.tagRepository = tagRepository;
    }

    @Transactional(readOnly = true)
    public User requireById(UUID id) {
        return userRepository.findById(id).orElseThrow(() -> ApiException.notFound("Пользователь"));
    }

    @Transactional(readOnly = true)
    public User requireByUsername(String username) {
        return userRepository.findByUsernameIgnoreCase(username)
                .orElseThrow(() -> ApiException.notFound("Пользователь"));
    }

    @Transactional(readOnly = true)
    public UserResponse getProfile(String username, UUID viewerId, boolean viewerIsAdmin) {
        return toResponse(requireByUsername(username), viewerId, viewerIsAdmin);
    }

    @Transactional
    public UserResponse updateProfile(UUID userId, UpdateProfileRequest request) {
        User user = requireById(userId);
        if (request.displayName() != null) {
            user.setDisplayName(StringUtils.hasText(request.displayName()) ? request.displayName().trim() : null);
        }
        if (request.bio() != null) {
            user.setBio(StringUtils.hasText(request.bio()) ? request.bio().trim() : null);
        }
        if (request.avatarUrl() != null) {
            user.setAvatarUrl(StringUtils.hasText(request.avatarUrl()) ? request.avatarUrl().trim() : null);
        }
        if (request.location() != null) {
            user.setLocation(StringUtils.hasText(request.location()) ? request.location().trim() : null);
        }
        if (request.website() != null) {
            user.setWebsite(normalizeWebsite(request.website()));
        }
        return toResponse(user);
    }

    /** «example.com» превращаем в «https://example.com»; пустая строка стирает сайт. */
    private static String normalizeWebsite(String raw) {
        if (!StringUtils.hasText(raw)) {
            return null;
        }
        String url = raw.trim();
        if (!url.contains("://")) {
            url = "https://" + url;
        }
        if (!WEBSITE.matcher(url).matches() || url.length() > 255) {
            throw ApiException.badRequest("Сайт должен быть ссылкой вида https://example.com");
        }
        return url;
    }

    @Transactional(readOnly = true)
    public UserResponse toResponse(User user) {
        return toResponse(user, null, false);
    }

    @Transactional(readOnly = true)
    public UserResponse toResponse(User user, UUID viewerId, boolean viewerIsAdmin) {
        Boolean followedByMe = viewerId == null || viewerId.equals(user.getId())
                ? null
                : followRepository.existsByIdFollowerIdAndIdFolloweeId(viewerId, user.getId());
        PinRepository.AuthorTotals totals = pinRepository.totalsByAuthorId(user.getId());
        UserStats stats = new UserStats(
                totals.getPins(),
                boardRepository.countByOwnerId(user.getId()),
                followRepository.countByIdFolloweeId(user.getId()),
                followRepository.countByIdFollowerId(user.getId()),
                totals.getPeppers(),
                totals.getSaves());
        return new UserResponse(
                user.getId(),
                user.getUsername(),
                user.getDisplayName(),
                user.getBio(),
                user.getAvatarUrl(),
                user.getLocation(),
                user.getWebsite(),
                user.getCreatedAt(),
                stats,
                totals.getPins() == 0 ? List.of() : tagRepository.findTopNamesByAuthor(user.getId(), TOP_TAGS),
                user.getRole().name(),
                followedByMe,
                viewerIsAdmin ? user.getBannedAt() : null,
                viewerIsAdmin ? user.getBanReason() : null);
    }

    public static UserSummary toSummary(User user) {
        return new UserSummary(user.getId(), user.getUsername(), user.getDisplayName(), user.getAvatarUrl());
    }
}
