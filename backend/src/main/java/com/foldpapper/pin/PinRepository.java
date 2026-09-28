package com.foldpapper.pin;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PinRepository extends JpaRepository<Pin, UUID> {

    /** Итоги по пинам автора для профиля — одним запросом. */
    @Query("""
            SELECT COUNT(p) AS pins, COALESCE(SUM(p.pepperCount), 0L) AS peppers, COALESCE(SUM(p.saveCount), 0L) AS saves
            FROM Pin p WHERE p.author.id = :authorId
            """)
    AuthorTotals totalsByAuthorId(@Param("authorId") UUID authorId);

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

    long countByCreatedAtAfter(Instant since);

    @Query("SELECT p.author.id AS authorId, COUNT(p) AS count FROM Pin p WHERE p.author.id IN :authorIds GROUP BY p.author.id")
    List<AuthorPinCount> countByAuthorIds(@Param("authorIds") Collection<UUID> authorIds);

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

    interface AuthorTotals {
        long getPins();

        long getPeppers();

        long getSaves();
    }

    interface AuthorPinCount {
        UUID getAuthorId();

        long getCount();
    }

    interface PinCounters {
        int getPepperCount();

        int getHeatScore();
    }
}
