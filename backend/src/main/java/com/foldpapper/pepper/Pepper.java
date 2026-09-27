package com.foldpapper.pepper;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.annotations.UuidGenerator;

import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

/**
 * Перец = лайк, но с остротой. Один пользователь может поставить пину
 * ровно один перец, зато может менять его остроту от 1 до 5.
 */
@Entity
@Table(name = "peppers")
@Getter
@Setter
@NoArgsConstructor
public class Pepper {

    public static final int MIN_HEAT = 1;
    public static final int MAX_HEAT = 5;

    @Id
    @GeneratedValue
    @UuidGenerator
    private UUID id;

    @Column(name = "pin_id", nullable = false)
    private UUID pinId;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(nullable = false)
    private short heat;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    public Pepper(UUID pinId, UUID userId, short heat) {
        this.pinId = pinId;
        this.userId = userId;
        this.heat = heat;
    }

    @Override
    public boolean equals(Object other) {
        if (this == other) {
            return true;
        }
        if (!(other instanceof Pepper pepper) || id == null) {
            return false;
        }
        return id.equals(pepper.id);
    }

    @Override
    public int hashCode() {
        return Objects.hashCode(id);
    }
}
