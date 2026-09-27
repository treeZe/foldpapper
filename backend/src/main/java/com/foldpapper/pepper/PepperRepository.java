package com.foldpapper.pepper;

import com.foldpapper.pin.Pin;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PepperRepository extends JpaRepository<Pepper, UUID> {

    Optional<Pepper> findByPinIdAndUserId(UUID pinId, UUID userId);

    /** Батчем узнаём, каким пинам из выдачи текущий пользователь уже поставил перец. */
    List<Pepper> findByUserIdAndPinIdIn(UUID userId, Collection<UUID> pinIds);

    long countByUserId(UUID userId);

    // @EntityGraph тут не подходит: он применяется к Pepper, а author есть только у Pin
    @Query(value = """
            SELECT p FROM Pin p
                     JOIN FETCH p.author
                     JOIN Pepper pp ON pp.pinId = p.id
            WHERE pp.userId = :userId
            ORDER BY pp.createdAt DESC
            """,
            countQuery = """
                    SELECT COUNT(p) FROM Pin p
                             JOIN Pepper pp ON pp.pinId = p.id
                    WHERE pp.userId = :userId
                    """)
    Page<Pin> findPepperedPins(@Param("userId") UUID userId, Pageable pageable);
}
