package com.foldpapper.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.nio.file.Path;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    private final AppProperties properties;

    public WebConfig(AppProperties properties) {
        this.properties = properties;
    }

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/**")
                .allowedOrigins(properties.allowedOrigins().toArray(String[]::new))
                .allowedMethods("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS")
                .allowedHeaders("*")
                .maxAge(3600);
    }

    /** Отдаём загруженные картинки как статику. На проде это заменит S3/CDN. */
    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        Path location = Path.of(properties.storage().location()).toAbsolutePath().normalize();
        registry.addResourceHandler(properties.storage().publicPath() + "/**")
                .addResourceLocations(location.toUri().toString())
                .setCachePeriod(60 * 60 * 24);
    }
}
