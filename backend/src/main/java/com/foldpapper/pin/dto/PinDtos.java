package com.foldpapper.pin.dto;

import com.foldpapper.user.dto.UserDtos.UserSummary;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public final class PinDtos {

    private PinDtos() {
    }

    public record PinCreateRequest(
            @Size(max = 160) String title,
            @Size(max = 2000) String description,
            @Size(max = 1024) String sourceUrl,

            @NotBlank(message = "нужна ссылка на картинку")
            @Size(max = 1024)
            String imageUrl,

            @Positive Integer imageWidth,
            @Positive Integer imageHeight,

            List<String> tags,

            /** Необязательно: сразу положить пин на свою доску. */
            UUID boardId
    ) {
    }

    public record PinUpdateRequest(
            @Size(max = 160) String title,
            @Size(max = 2000) String description,
            @Size(max = 1024) String sourceUrl,
            List<String> tags
    ) {
    }

    public record PinResponse(
            UUID id,
            String title,
            String description,
            String sourceUrl,
            String imageUrl,
            Integer imageWidth,
            Integer imageHeight,
            List<String> tags,
            UserSummary author,
            int pepperCount,
            int heatScore,
            int saveCount,
            /** Острота перца текущего пользователя (1..5) или null, если перца нет. */
            Integer myPepper,
            Instant createdAt
    ) {
    }
}
