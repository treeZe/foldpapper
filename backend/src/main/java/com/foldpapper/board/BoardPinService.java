package com.foldpapper.board;

import com.foldpapper.common.ApiException;
import com.foldpapper.pin.Pin;
import com.foldpapper.pin.PinRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

/**
 * Работа со связью пин↔доска: "сохранить пин к себе" и обратная операция.
 * Вынесено отдельно, чтобы этим могли пользоваться и доски, и создание пина.
 */
@Service
public class BoardPinService {

    private final BoardRepository boardRepository;
    private final BoardPinRepository boardPinRepository;
    private final PinRepository pinRepository;

    public BoardPinService(BoardRepository boardRepository,
                           BoardPinRepository boardPinRepository,
                           PinRepository pinRepository) {
        this.boardRepository = boardRepository;
        this.boardPinRepository = boardPinRepository;
        this.pinRepository = pinRepository;
    }

    @Transactional
    public void attach(UUID boardId, UUID pinId, UUID userId, String note) {
        Pin pin = pinRepository.findById(pinId).orElseThrow(() -> ApiException.notFound("Пин"));
        attach(boardId, pin, userId, note);
    }

    @Transactional
    public void attach(UUID boardId, Pin pin, UUID userId) {
        attach(boardId, pin, userId, null);
    }

    @Transactional
    public void attach(UUID boardId, Pin pin, UUID userId, String note) {
        Board board = requireEditable(boardId, userId);
        BoardPin.BoardPinId id = new BoardPin.BoardPinId(boardId, pin.getId());
        if (boardPinRepository.existsById(id)) {
            return;
        }

        boardPinRepository.save(new BoardPin(boardId, pin.getId(), userId, note));
        if (board.getCoverPin() == null) {
            board.setCoverPin(pin);
        }

        // счётчики обновляем UPDATE-запросами: они же делают flush изменений доски
        boardRepository.incrementPinCount(boardId);
        pinRepository.incrementSaveCount(pin.getId());
    }

    @Transactional
    public void detach(UUID boardId, UUID pinId, UUID userId) {
        Board board = requireEditable(boardId, userId);
        BoardPin.BoardPinId id = new BoardPin.BoardPinId(boardId, pinId);
        if (!boardPinRepository.existsById(id)) {
            return;
        }

        boardPinRepository.deleteById(id);
        boardPinRepository.flush();

        boolean coverRemoved = board.getCoverPin() != null && board.getCoverPin().getId().equals(pinId);
        if (coverRemoved) {
            board.setCoverPin(boardPinRepository.findPinsByBoardId(boardId, PageRequest.of(0, 1))
                    .stream()
                    .findFirst()
                    .orElse(null));
        }

        boardRepository.decrementPinCount(boardId);
        pinRepository.decrementSaveCount(pinId);
    }

    @Transactional(readOnly = true)
    public Board requireEditable(UUID boardId, UUID userId) {
        Board board = boardRepository.findWithOwnerById(boardId)
                .orElseThrow(() -> ApiException.notFound("Доска"));
        if (!board.getOwner().getId().equals(userId)) {
            throw ApiException.forbidden("Это не ваша доска");
        }
        return board;
    }
}
