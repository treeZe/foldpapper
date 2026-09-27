package com.foldpapper.pin;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.UUID;

public interface PinRepository extends JpaRepository<Pin, UUID> {

    long countByAuthorId(UUID authorId);

    @EntityGraph(attributePaths = {"author", "tags"})
    Optional<Pin> findWithAuthorAndTagsById(UUID id);

    /** `findAllBy` (а не `findAll`) — чтобы применился EntityGraph и не было N+1 по автору. */
    @EntityGraph(attributePaths = "author")
    Page<Pin> findAllBy(Pageable pageable);

    @EntityGraph(attributePaths = "author")
    Page<Pin> findByAuthorId(UUID authorId, Pageable pageable);

    @EntityGraph(attributePaths = "author")
    @Query("SELECT p FROM Pin p JOIN p.tags t WHERE t.name = :tag")
    Page<Pin> findByTagName(@Param("tag") String tag, Pageable pageable);

    @EntityGraph(attributePaths = "author")
    @Query("""
            SELECT p FROM Pin p
            WHERE LOWER(p.title) LIKE :pattern
               OR LOWER(p.description) LIKE :pattern
               OR EXISTS (SELECT 1 FROM p.tags t WHERE t.name LIKE :pattern)
            """)
    Page<Pin> search(@Param("pattern") String pattern, Pageable pageable);

    /** Лента подписок. */
    @EntityGraph(attributePaths = "author")
    @Query("""
            SELECT p FROM Pin p
            WHERE p.author.id IN (SELECT f.id.followeeId FROM Follow f WHERE f.id.followerId = :userId)
            """)
    Page<Pin> findFollowingFeed(@Param("userId") UUID userId, Pageable pageable);

    @Query("SELECT p.pepperCount AS pepperCount, p.heatScore AS heatScore FROM Pin p WHERE p.id = :id")
    Optional<PinCounters> findCountersById(@Param("id") UUID id);

    // --- атомарные счётчики: обновляем через UPDATE, чтобы не терять параллельные изменения ---

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("UPDATE Pin p SET p.pepperCount = p.pepperCount + 1, p.heatScore = p.heatScore + :heat WHERE p.id = :id")
    int applyPepperAdded(@Param("id") UUID id, @Param("heat") int heat);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("UPDATE Pin p SET p.heatScore = p.heatScore + :delta WHERE p.id = :id")
    int applyHeatDelta(@Param("id") UUID id, @Param("delta") int delta);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("""
            UPDATE Pin p
            SET p.pepperCount = p.pepperCount - 1, p.heatScore = p.heatScore - :heat
            WHERE p.id = :id AND p.pepperCount > 0
            """)
    int applyPepperRemoved(@Param("id") UUID id, @Param("heat") int heat);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("UPDATE Pin p SET p.saveCount = p.saveCount + 1 WHERE p.id = :id")
    int incrementSaveCount(@Param("id") UUID id);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("UPDATE Pin p SET p.saveCount = p.saveCount - 1 WHERE p.id = :id AND p.saveCount > 0")
    int decrementSaveCount(@Param("id") UUID id);

    interface PinCounters {
        int getPepperCount();

        int getHeatScore();
    }
}
