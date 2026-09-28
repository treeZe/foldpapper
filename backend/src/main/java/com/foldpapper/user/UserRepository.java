package com.foldpapper.user;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

public interface UserRepository extends JpaRepository<User, UUID> {

    Optional<User> findByUsernameIgnoreCase(String username);

    Optional<User> findByUsernameIgnoreCaseOrEmailIgnoreCase(String username, String email);

    boolean existsByUsernameIgnoreCase(String username);

    boolean existsByEmailIgnoreCase(String email);

    /** Минимум для фильтра авторизации — без загрузки всей сущности. */
    @Query("SELECT u.role AS role, u.bannedAt AS bannedAt FROM User u WHERE u.id = :id")
    Optional<AuthState> findAuthStateById(@Param("id") UUID id);

    // ------------------------------------------------------------ админка

    /** Строка блокируется до конца транзакции: два одновременных «Заблокировать» не пройдут оба. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT u FROM User u WHERE u.id = :id")
    Optional<User> findForUpdateById(@Param("id") UUID id);

    /** Пустая строка в query/filter — без условия; filter "admins" — только админы, "banned" — только заблокированные. */
    @Query("""
            SELECT u FROM User u
            WHERE (:query = ''
                   OR LOWER(u.username) LIKE :query
                   OR LOWER(u.email) LIKE :query
                   OR LOWER(u.displayName) LIKE :query)
              AND (:filter = ''
                   OR (:filter = 'admins' AND u.role = com.foldpapper.user.Role.ADMIN)
                   OR (:filter = 'banned' AND u.bannedAt IS NOT NULL))
            """)
    Page<User> searchForAdmin(@Param("query") String query, @Param("filter") String filter, Pageable pageable);

    long countByRole(Role role);

    long countByBannedAtIsNotNull();

    long countByCreatedAtAfter(Instant since);

    interface AuthState {
        Role getRole();

        Instant getBannedAt();
    }
}
