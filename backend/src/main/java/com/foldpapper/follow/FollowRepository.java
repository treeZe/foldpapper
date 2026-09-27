package com.foldpapper.follow;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface FollowRepository extends JpaRepository<Follow, Follow.FollowId> {

    long countByIdFolloweeId(UUID followeeId);

    long countByIdFollowerId(UUID followerId);

    boolean existsByIdFollowerIdAndIdFolloweeId(UUID followerId, UUID followeeId);
}
