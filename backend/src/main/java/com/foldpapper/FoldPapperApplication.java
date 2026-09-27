package com.foldpapper;

import com.foldpapper.config.AppProperties;
import com.foldpapper.security.JwtProperties;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;

@SpringBootApplication
@EnableConfigurationProperties({JwtProperties.class, AppProperties.class})
public class FoldPapperApplication {

    public static void main(String[] args) {
        SpringApplication.run(FoldPapperApplication.class, args);
    }
}
