package com.foldpapper.board;

import com.foldpapper.pin.Pin;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.UUID;

public interface BoardPinRepository extends JpaRepository<BoardPin, BoardPin.BoardPinId> {

    // @EntityGraph тут не подходит: он применяется к BoardPin, а author есть только у Pin
    @Query(value = """
            SELECT p FROM Pin p
                     JOIN FETCH p.author
                     JOIN BoardPin bp ON bp.id.pinId = p.id
            WHERE bp.id.boardId = :boardId
            ORDER BY bp.addedAt DESC
            """,
            countQuery = """
                    SELECT COUNT(p) FROM Pin p
                             JOIN BoardPin bp ON bp.id.pinId = p.id
                    WHERE bp.id.boardId = :boardId
                    """)
    Page<Pin> findPinsByBoardId(@Param("boardId") UUID boardId, Pageable pageable);
}
