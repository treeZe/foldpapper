package com.foldpapper.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.util.List;

/**
 * Настройки приложения: где хранить загруженные картинки и кому разрешён CORS.
 */
@ConfigurationProperties(prefix = "app")
public record AppProperties(
        Storage storage,
        List<String> allowedOrigins,
        /** Кого сделать админом при старте (ADMIN_USERNAMES=anna,igor) — так появляется первый админ. */
        List<String> adminUsernames
) {

    public List<String> adminUsernames() {
        return adminUsernames == null ? List.of() : adminUsernames;
    }

    public record Storage(
            /** Каталог на диске, куда складываются загруженные файлы. */
            String location,
            /** Публичный префикс, по которому файлы отдаются наружу. */
            String publicPath,
            /** Максимальный размер файла в байтах. */
            long maxFileSize
    ) {
    }
}
