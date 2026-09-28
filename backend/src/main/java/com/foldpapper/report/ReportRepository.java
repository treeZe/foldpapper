package com.foldpapper.report;

import com.foldpapper.user.User;
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

public interface ReportRepository extends JpaRepository<Report, UUID> {

    boolean existsByPinIdAndReporterId(UUID pinId, UUID reporterId);

    boolean existsByTargetUserIdAndReporterIdAndStatus(UUID targetUserId, UUID reporterId, ReportStatus status);

    long countByStatus(ReportStatus status);

    @EntityGraph(attributePaths = {"pin", "pin.author", "targetUser", "reporter", "resolvedBy"})
    Page<Report> findByStatus(ReportStatus status, Pageable pageable);

    @EntityGraph(attributePaths = {"pin", "pin.author", "targetUser", "reporter", "resolvedBy"})
    Optional<Report> findWithDetailsById(UUID id);

    /** Удаляя пин, закрываем разом все открытые жалобы на него. */
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("""
            UPDATE Report r
            SET r.status = com.foldpapper.report.ReportStatus.RESOLVED, r.resolvedBy = :moderator, r.resolvedAt = :now
            WHERE r.pin.id = :pinId AND r.status = com.foldpapper.report.ReportStatus.OPEN
            """)
    int resolveOpenForPin(@Param("pinId") UUID pinId, @Param("moderator") User moderator, @Param("now") Instant now);

    /** Блокируя пользователя, закрываем разом все открытые жалобы на его профиль. */
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("""
            UPDATE Report r
            SET r.status = com.foldpapper.report.ReportStatus.RESOLVED, r.resolvedBy = :moderator, r.resolvedAt = :now
            WHERE r.targetUser.id = :userId AND r.status = com.foldpapper.report.ReportStatus.OPEN
            """)
    int resolveOpenForUser(@Param("userId") UUID userId, @Param("moderator") User moderator, @Param("now") Instant now);

    /** Число открытых жалоб по каждому пину страницы — одним запросом. */
    @Query("""
            SELECT r.pin.id AS pinId, COUNT(r) AS count FROM Report r
            WHERE r.status = com.foldpapper.report.ReportStatus.OPEN AND r.pin.id IN :pinIds
            GROUP BY r.pin.id
            """)
    List<PinReportCount> countOpenByPinIds(@Param("pinIds") Collection<UUID> pinIds);

    /** Число открытых жалоб на каждый профиль страницы — одним запросом. */
    @Query("""
            SELECT r.targetUser.id AS userId, COUNT(r) AS count FROM Report r
            WHERE r.status = com.foldpapper.report.ReportStatus.OPEN AND r.targetUser.id IN :userIds
            GROUP BY r.targetUser.id
            """)
    List<UserReportCount> countOpenByTargetUserIds(@Param("userIds") Collection<UUID> userIds);

    interface UserReportCount {
        UUID getUserId();

        long getCount();
    }

    interface PinReportCount {
        UUID getPinId();

        long getCount();
    }
}
