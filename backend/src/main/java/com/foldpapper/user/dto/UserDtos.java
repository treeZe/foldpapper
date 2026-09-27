package com.foldpapper.user.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.time.Instant;
import java.util.UUID;

public final class UserDtos {

    private UserDtos() {
    }

    public record RegisterRequest(
            @NotBlank
            @Size(min = 3, max = 30)
            @Pattern(regexp = "^[a-zA-Z0-9_.]+$", message = "только латиница, цифры, _ и .")
            String username,

            @NotBlank @Email @Size(max = 255)
            String email,

            @NotBlank @Size(min = 8, max = 72, message = "пароль от 8 до 72 символов")
            String password,

            @Size(max = 80)
            String displayName
    ) {
    }

    public record LoginRequest(
            @NotBlank String login,
            @NotBlank String password
    ) {
    }

    public record AuthResponse(
            String accessToken,
            String tokenType,
            long expiresIn,
            UserResponse user
    ) {
    }

    public record UpdateProfileRequest(
            @Size(max = 80) String displayName,
            @Size(max = 500) String bio,
            @Size(max = 1024) String avatarUrl
    ) {
    }

    public record UserResponse(
            UUID id,
            String username,
            String displayName,
            String bio,
            String avatarUrl,
            Instant createdAt,
            UserStats stats,
            /** Подписан ли на него текущий пользователь; null для гостя и для своего профиля. */
            Boolean followedByMe
    ) {
    }

    public record UserStats(
            long pins,
            long boards,
            long followers,
            long following
    ) {
    }

    /** Краткая карточка автора — вкладывается в пины/доски. */
    public record UserSummary(
            UUID id,
            String username,
            String displayName,
            String avatarUrl
    ) {
    }
}
