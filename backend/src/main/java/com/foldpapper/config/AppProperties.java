package com.foldpapper.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.util.List;

/**
 * Настройки приложения: где хранить загруженные картинки и кому разрешён CORS.
 */
@ConfigurationProperties(prefix = "app")
public record AppProperties(
        Storage storage,
        List<String> allowedOrigins
) {

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
