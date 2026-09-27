package com.foldpapper.follow;

import com.foldpapper.common.ApiException;
import com.foldpapper.user.User;
import com.foldpapper.user.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
public class FollowService {

    private final FollowRepository followRepository;
    private final UserRepository userRepository;

    public FollowService(FollowRepository followRepository, UserRepository userRepository) {
        this.followRepository = followRepository;
        this.userRepository = userRepository;
    }

    @Transactional
    public void follow(UUID followerId, String followeeUsername) {
        User followee = requireUser(followeeUsername);
        if (followee.getId().equals(followerId)) {
            throw ApiException.badRequest("Нельзя подписаться на себя");
        }
        Follow.FollowId id = new Follow.FollowId(followerId, followee.getId());
        if (!followRepository.existsById(id)) {
            followRepository.save(new Follow(followerId, followee.getId()));
        }
    }

    @Transactional
    public void unfollow(UUID followerId, String followeeUsername) {
        User followee = requireUser(followeeUsername);
        followRepository.deleteById(new Follow.FollowId(followerId, followee.getId()));
    }

    @Transactional(readOnly = true)
    public boolean isFollowing(UUID followerId, UUID followeeId) {
        return followerId != null && followRepository.existsByIdFollowerIdAndIdFolloweeId(followerId, followeeId);
    }

    private User requireUser(String username) {
        return userRepository.findByUsernameIgnoreCase(username)
                .orElseThrow(() -> ApiException.notFound("Пользователь"));
    }
}
