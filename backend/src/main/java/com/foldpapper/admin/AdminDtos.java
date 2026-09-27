package com.foldpapper.admin;

import com.foldpapper.report.ReportReason;
import com.foldpapper.report.ReportStatus;
import com.foldpapper.user.Role;
import com.foldpapper.user.dto.UserDtos.UserSummary;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public final class AdminDtos {

    private AdminDtos() {
    }

    public record AdminStats(
            long users,
            long admins,
            long bannedUsers,
            long pins,
            long boards,
            long peppers,
            long openReports,
            long newUsersWeek,
            long newPinsWeek,
            /** По дням за последние две недели, от старых к новым. */
            List<DayActivity> activity
    ) {
    }

    public record DayActivity(LocalDate day, long users, long pins, long peppers) {
    }

    public record AdminUserView(
            UUID id,
            String username,
            String displayName,
            String email,
            String avatarUrl,
            Role role,
            Instant bannedAt,
            String banReason,
            long pins,
            Instant createdAt
    ) {
    }

    /** Все поля необязательны: меняется только то, что передано. */
    public record AdminUserUpdate(
            Role role,
            Boolean banned,
            @Size(max = 300) String banReason
    ) {
    }

    public record AdminPinView(
            UUID id,
            String title,
            String imageUrl,
            Integer imageWidth,
            Integer imageHeight,
            UserSummary author,
            int pepperCount,
            int heatScore,
            int saveCount,
            long openReports,
            Instant createdAt
    ) {
    }

    public record ReportView(
            UUID id,
            ReportReason reason,
            String comment,
            ReportStatus status,
            /** null, если пин уже удалён. */
            AdminPinView pin,
            String pinTitle,
            String pinImageUrl,
            UserSummary reporter,
            UserSummary resolvedBy,
            Instant resolvedAt,
            Instant createdAt
    ) {
    }

    public enum ResolveAction {
        /** Удалить пин и закрыть все жалобы на него. */
        DELETE_PIN,
        /** Отклонить жалобу, пин оставить. */
        DISMISS
    }

    public record ResolveRequest(@NotNull ResolveAction action) {
    }
}
