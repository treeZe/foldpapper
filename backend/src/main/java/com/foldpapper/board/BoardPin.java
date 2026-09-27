package com.foldpapper.board;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;

import java.io.Serializable;
import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

/** Связь "пин лежит на доске". Один пин может быть на многих досках. */
@Entity
@Table(name = "board_pins")
@Getter
@Setter
@NoArgsConstructor
public class BoardPin {

    @EmbeddedId
    private BoardPinId id;

    @Column(name = "added_by")
    private UUID addedBy;

    @Column(length = 500)
    private String note;

    @CreationTimestamp
    @Column(name = "added_at", nullable = false, updatable = false)
    private Instant addedAt;

    public BoardPin(UUID boardId, UUID pinId, UUID addedBy, String note) {
        this.id = new BoardPinId(boardId, pinId);
        this.addedBy = addedBy;
        this.note = note;
    }

    @Embeddable
    @Getter
    @Setter
    @NoArgsConstructor
    public static class BoardPinId implements Serializable {

        @Column(name = "board_id", nullable = false)
        private UUID boardId;

        @Column(name = "pin_id", nullable = false)
        private UUID pinId;

        public BoardPinId(UUID boardId, UUID pinId) {
            this.boardId = boardId;
            this.pinId = pinId;
        }

        @Override
        public boolean equals(Object other) {
            if (this == other) {
                return true;
            }
            if (!(other instanceof BoardPinId that)) {
                return false;
            }
            return Objects.equals(boardId, that.boardId) && Objects.equals(pinId, that.pinId);
        }

        @Override
        public int hashCode() {
            return Objects.hash(boardId, pinId);
        }
    }
}
