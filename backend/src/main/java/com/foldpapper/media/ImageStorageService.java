package com.foldpapper.media;

import com.foldpapper.common.ApiException;
import com.foldpapper.config.AppProperties;
import jakarta.annotation.PostConstruct;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.Map;
import java.util.UUID;

/**
 * Локальное хранилище картинок. Отдельный сервис, чтобы позже заменить
 * реализацию на S3 без изменения контроллеров.
 */
@Service
public class ImageStorageService {

    private static final DateTimeFormatter FOLDERS = DateTimeFormatter.ofPattern("yyyy/MM");
    private static final Map<String, String> EXTENSIONS = Map.of(
            "image/jpeg", "jpg",
            "image/png", "png",
            "image/webp", "webp",
            "image/gif", "gif");

    private final AppProperties properties;
    private Path root;

    public ImageStorageService(AppProperties properties) {
        this.properties = properties;
    }

    @PostConstruct
    void prepareRoot() throws IOException {
        root = Path.of(properties.storage().location()).toAbsolutePath().normalize();
        Files.createDirectories(root);
    }

    public StoredImage store(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw ApiException.badRequest("Файл не передан");
        }
        if (file.getSize() > properties.storage().maxFileSize()) {
            throw ApiException.badRequest("Файл больше допустимых %d байт"
                    .formatted(properties.storage().maxFileSize()));
        }

        String extension = EXTENSIONS.get(file.getContentType());
        if (extension == null) {
            throw ApiException.badRequest("Поддерживаются только JPEG, PNG, WebP и GIF");
        }

        String relativeDir = LocalDate.now().format(FOLDERS);
        String fileName = UUID.randomUUID() + "." + extension;
        Path target = root.resolve(relativeDir).resolve(fileName);

        try {
            Files.createDirectories(target.getParent());
            try (InputStream input = file.getInputStream()) {
                Files.copy(input, target, StandardCopyOption.REPLACE_EXISTING);
            }
        } catch (IOException ex) {
            throw new IllegalStateException("Не удалось сохранить файл", ex);
        }

        Dimensions dimensions = readDimensions(target);
        String url = "%s/%s/%s".formatted(properties.storage().publicPath(), relativeDir, fileName);
        return new StoredImage(url, dimensions.width(), dimensions.height(), file.getSize());
    }

    /** Размеры нужны фронтенду, чтобы сразу зарезервировать место в masonry-сетке. */
    private Dimensions readDimensions(Path path) {
        try {
            BufferedImage image = ImageIO.read(path.toFile());
            return image == null
                    ? new Dimensions(null, null)
                    : new Dimensions(image.getWidth(), image.getHeight());
        } catch (IOException ex) {
            return new Dimensions(null, null);
        }
    }

    public record StoredImage(String url, Integer width, Integer height, long sizeBytes) {
    }

    private record Dimensions(Integer width, Integer height) {
    }
}
