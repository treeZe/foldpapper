package com.foldpapper.admin;

import com.foldpapper.config.AppProperties;
import com.foldpapper.user.Role;
import com.foldpapper.user.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Выдаёт роль ADMIN пользователям из ADMIN_USERNAMES при старте.
 * Так появляется первый админ — дальше роли раздаются уже из админки.
 */
@Component
public class AdminBootstrap implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(AdminBootstrap.class);

    private final AppProperties properties;
    private final UserRepository userRepository;

    public AdminBootstrap(AppProperties properties, UserRepository userRepository) {
        this.properties = properties;
        this.userRepository = userRepository;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        for (String raw : properties.adminUsernames()) {
            String username = raw.trim();
            if (username.isEmpty()) {
                continue;
            }
            userRepository.findByUsernameIgnoreCase(username).ifPresentOrElse(user -> {
                if (user.getRole() != Role.ADMIN) {
                    user.setRole(Role.ADMIN);
                    user.setBannedAt(null);
                    user.setBanReason(null);
                    log.info("Пользователь {} назначен администратором (ADMIN_USERNAMES)", user.getUsername());
                }
            }, () -> log.warn("ADMIN_USERNAMES: пользователь {} не найден — зарегистрируйтесь и перезапустите сервер",
                    username));
        }
    }
}
