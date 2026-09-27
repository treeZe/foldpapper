package com.foldpapper.board;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface BoardRepository extends JpaRepository<Board, UUID> {

    long countByOwnerId(UUID ownerId);

    boolean existsByOwnerIdAndSlug(UUID ownerId, String slug);

    @EntityGraph(attributePaths = {"owner", "coverPin"})
    Optional<Board> findWithOwnerById(UUID id);

    @EntityGraph(attributePaths = {"owner", "coverPin"})
    List<Board> findByOwnerIdOrderByCreatedAtDesc(UUID ownerId);

    @EntityGraph(attributePaths = {"owner", "coverPin"})
    Optional<Board> findByOwnerIdAndSlug(UUID ownerId, String slug);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("UPDATE Board b SET b.pinCount = b.pinCount + 1 WHERE b.id = :id")
    int incrementPinCount(@Param("id") UUID id);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("UPDATE Board b SET b.pinCount = b.pinCount - 1 WHERE b.id = :id AND b.pinCount > 0")
    int decrementPinCount(@Param("id") UUID id);

    /** Перед удалением пина: board_pins уйдут каскадом в БД, а счётчики досок сами не уменьшатся. */
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("""
            UPDATE Board b SET b.pinCount = b.pinCount - 1
            WHERE b.pinCount > 0
              AND b.id IN (SELECT bp.id.boardId FROM BoardPin bp WHERE bp.id.pinId = :pinId)
            """)
    int decrementPinCountForPin(@Param("pinId") UUID pinId);
}
