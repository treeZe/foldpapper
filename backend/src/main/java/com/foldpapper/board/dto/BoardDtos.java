package com.foldpapper.board.dto;

import com.foldpapper.user.dto.UserDtos.UserSummary;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.time.Instant;
import java.util.UUID;

public final class BoardDtos {

    private BoardDtos() {
    }

    public record BoardCreateRequest(
            @NotBlank @Size(max = 80) String title,
            @Size(max = 500) String description,
            Boolean isPrivate
    ) {
    }

    public record BoardUpdateRequest(
            @Size(max = 80) String title,
            @Size(max = 500) String description,
            Boolean isPrivate,
            UUID coverPinId
    ) {
    }

    public record SavePinRequest(
            @Size(max = 500) String note
    ) {
    }

    public record BoardResponse(
            UUID id,
            String title,
            String slug,
            String description,
            boolean isPrivate,
            int pinCount,
            String coverImageUrl,
            UserSummary owner,
            Instant createdAt
    ) {
    }
}
