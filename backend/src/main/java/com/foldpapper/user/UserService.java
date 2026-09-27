package com.foldpapper.user;

import com.foldpapper.board.BoardRepository;
import com.foldpapper.common.ApiException;
import com.foldpapper.follow.FollowRepository;
import com.foldpapper.pin.PinRepository;
import com.foldpapper.user.dto.UserDtos.UpdateProfileRequest;
import com.foldpapper.user.dto.UserDtos.UserResponse;
import com.foldpapper.user.dto.UserDtos.UserStats;
import com.foldpapper.user.dto.UserDtos.UserSummary;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.UUID;

@Service
public class UserService {

    private final UserRepository userRepository;
    private final PinRepository pinRepository;
    private final BoardRepository boardRepository;
    private final FollowRepository followRepository;

    public UserService(UserRepository userRepository,
                       PinRepository pinRepository,
                       BoardRepository boardRepository,
                       FollowRepository followRepository) {
        this.userRepository = userRepository;
        this.pinRepository = pinRepository;
        this.boardRepository = boardRepository;
        this.followRepository = followRepository;
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
    public UserResponse getProfile(String username, UUID viewerId) {
        return toResponse(requireByUsername(username), viewerId);
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
        return toResponse(user);
    }

    @Transactional(readOnly = true)
    public UserResponse toResponse(User user) {
        return toResponse(user, null);
    }

    @Transactional(readOnly = true)
    public UserResponse toResponse(User user, UUID viewerId) {
        Boolean followedByMe = viewerId == null || viewerId.equals(user.getId())
                ? null
                : followRepository.existsByIdFollowerIdAndIdFolloweeId(viewerId, user.getId());
        UserStats stats = new UserStats(
                pinRepository.countByAuthorId(user.getId()),
                boardRepository.countByOwnerId(user.getId()),
                followRepository.countByIdFolloweeId(user.getId()),
                followRepository.countByIdFollowerId(user.getId()));
        return new UserResponse(
                user.getId(),
                user.getUsername(),
                user.getDisplayName(),
                user.getBio(),
                user.getAvatarUrl(),
                user.getCreatedAt(),
                stats,
                followedByMe);
    }

    public static UserSummary toSummary(User user) {
        return new UserSummary(user.getId(), user.getUsername(), user.getDisplayName(), user.getAvatarUrl());
    }
}
