package com.foldpapper.security;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.time.Duration;

@ConfigurationProperties(prefix = "app.jwt")
public record JwtProperties(
        /** HMAC-секрет, минимум 32 байта. На проде — только из переменной окружения. */
        String secret,
        String issuer,
        Duration accessTokenTtl
) {
}
