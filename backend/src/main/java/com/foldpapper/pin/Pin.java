package com.foldpapper.pin;

import com.foldpapper.tag.Tag;
import com.foldpapper.user.User;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.JoinTable;
import jakarta.persistence.ManyToMany;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.BatchSize;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.annotations.UuidGenerator;

import java.time.Instant;
import java.util.LinkedHashSet;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;

@Entity
@Table(name = "pins")
@Getter
@Setter
@NoArgsConstructor
public class Pin {

    @Id
    @GeneratedValue
    @UuidGenerator
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "author_id", nullable = false)
    private User author;

    @Column(length = 160)
    private String title;

    @Column(length = 2000)
    private String description;

    /** Откуда взята картинка (ссылка на первоисточник). */
    @Column(name = "source_url", length = 1024)
    private String sourceUrl;

    @Column(name = "image_url", nullable = false, length = 1024)
    private String imageUrl;

    @Column(name = "image_width")
    private Integer imageWidth;

    @Column(name = "image_height")
    private Integer imageHeight;

    /** Сколько людей поставили перец. */
    @Column(name = "pepper_count", nullable = false)
    private int pepperCount;

    /** Сумма остроты всех перцев — по ней сортируется лента "огонь". */
    @Column(name = "heat_score", nullable = false)
    private int heatScore;

    /** Сколько раз пин сохранили на доски. */
    @Column(name = "save_count", nullable = false)
    private int saveCount;

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
            name = "pin_tags",
            joinColumns = @JoinColumn(name = "pin_id"),
            inverseJoinColumns = @JoinColumn(name = "tag_id"))
    @BatchSize(size = 50)
    private Set<Tag> tags = new LinkedHashSet<>();

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Override
    public boolean equals(Object other) {
        if (this == other) {
            return true;
        }
        if (!(other instanceof Pin pin) || id == null) {
            return false;
        }
        return id.equals(pin.id);
    }

    @Override
    public int hashCode() {
        return Objects.hashCode(id);
    }
}
