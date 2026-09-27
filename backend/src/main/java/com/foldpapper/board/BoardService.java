package com.foldpapper.board;

import com.foldpapper.board.dto.BoardDtos.BoardCreateRequest;
import com.foldpapper.board.dto.BoardDtos.BoardResponse;
import com.foldpapper.board.dto.BoardDtos.BoardUpdateRequest;
import com.foldpapper.common.ApiException;
import com.foldpapper.common.PageResponse;
import com.foldpapper.common.Slugs;
import com.foldpapper.pin.Pin;
import com.foldpapper.pin.PinRepository;
import com.foldpapper.pin.PinService;
import com.foldpapper.pin.dto.PinDtos.PinResponse;
import com.foldpapper.security.AppUserPrincipal;
import com.foldpapper.user.User;
import com.foldpapper.user.UserRepository;
import com.foldpapper.user.UserService;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.List;
import java.util.UUID;

@Service
public class BoardService {

    private final BoardRepository boardRepository;
    private final BoardPinRepository boardPinRepository;
    private final BoardPinService boardPinService;
    private final PinRepository pinRepository;
    private final PinService pinService;
    private final UserRepository userRepository;

    public BoardService(BoardRepository boardRepository,
                        BoardPinRepository boardPinRepository,
                        BoardPinService boardPinService,
                        PinRepository pinRepository,
                        PinService pinService,
                        UserRepository userRepository) {
        this.boardRepository = boardRepository;
        this.boardPinRepository = boardPinRepository;
        this.boardPinService = boardPinService;
        this.pinRepository = pinRepository;
        this.pinService = pinService;
        this.userRepository = userRepository;
    }

    @Transactional
    public BoardResponse create(UUID ownerId, BoardCreateRequest request) {
        User owner = userRepository.findById(ownerId)
                .orElseThrow(() -> ApiException.notFound("Пользователь"));

        Board board = new Board();
        board.setOwner(owner);
        board.setTitle(request.title().trim());
        board.setDescription(trimToNull(request.description()));
        board.setPrivate(Boolean.TRUE.equals(request.isPrivate()));
        board.setSlug(uniqueSlug(ownerId, request.title()));
        return toResponse(boardRepository.save(board));
    }

    @Transactional
    public BoardResponse update(UUID boardId, UUID userId, BoardUpdateRequest request) {
        Board board = boardPinService.requireEditable(boardId, userId);
        if (StringUtils.hasText(request.title()) && !request.title().trim().equals(board.getTitle())) {
            board.setTitle(request.title().trim());
            board.setSlug(uniqueSlug(userId, request.title()));
        }
        if (request.description() != null) {
            board.setDescription(trimToNull(request.description()));
        }
        if (request.isPrivate() != null) {
            board.setPrivate(request.isPrivate());
        }
        if (request.coverPinId() != null) {
            Pin cover = pinRepository.findById(request.coverPinId())
                    .orElseThrow(() -> ApiException.notFound("Пин"));
            if (!boardPinRepository.existsById(new BoardPin.BoardPinId(boardId, cover.getId()))) {
                throw ApiException.badRequest("Обложкой может быть только пин с этой доски");
            }
            board.setCoverPin(cover);
        }
        return toResponse(board);
    }

    @Transactional
    public void delete(UUID boardId, UUID userId) {
        boardRepository.delete(boardPinService.requireEditable(boardId, userId));
    }

    @Transactional(readOnly = true)
    public BoardResponse get(UUID boardId, AppUserPrincipal principal) {
        return toResponse(requireVisible(boardId, principal));
    }

    @Transactional(readOnly = true)
    public List<BoardResponse> listByOwner(String username, AppUserPrincipal principal) {
        User owner = userRepository.findByUsernameIgnoreCase(username)
                .orElseThrow(() -> ApiException.notFound("Пользователь"));
        boolean isSelf = principal != null && principal.getId().equals(owner.getId());
        return boardRepository.findByOwnerIdOrderByCreatedAtDesc(owner.getId()).stream()
                .filter(board -> isSelf || !board.isPrivate())
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public PageResponse<PinResponse> listPins(UUID boardId, AppUserPrincipal principal, Pageable pageable) {
        requireVisible(boardId, principal);
        // порядок задан в запросе (по дате добавления на доску)
        Pageable unsorted = PageRequest.of(pageable.getPageNumber(), Math.min(pageable.getPageSize(), 100));
        return pinService.toPage(boardPinRepository.findPinsByBoardId(boardId, unsorted), principal);
    }

    @Transactional
    public void savePin(UUID boardId, UUID pinId, UUID userId, String note) {
        boardPinService.attach(boardId, pinId, userId, note);
    }

    @Transactional
    public void removePin(UUID boardId, UUID pinId, UUID userId) {
        boardPinService.detach(boardId, pinId, userId);
    }

    // ------------------------------------------------------------------ helpers

    private Board requireVisible(UUID boardId, AppUserPrincipal principal) {
        Board board = boardRepository.findWithOwnerById(boardId)
                .orElseThrow(() -> ApiException.notFound("Доска"));
        boolean isOwner = principal != null && principal.getId().equals(board.getOwner().getId());
        if (board.isPrivate() && !isOwner) {
            throw ApiException.notFound("Доска");
        }
        return board;
    }

    private String uniqueSlug(UUID ownerId, String title) {
        String base = Slugs.slugify(title, "board");
        String candidate = base;
        int suffix = 2;
        while (boardRepository.existsByOwnerIdAndSlug(ownerId, candidate)) {
            candidate = base + "-" + suffix++;
        }
        return candidate;
    }

    private BoardResponse toResponse(Board board) {
        return new BoardResponse(
                board.getId(),
                board.getTitle(),
                board.getSlug(),
                board.getDescription(),
                board.isPrivate(),
                board.getPinCount(),
                board.getCoverPin() == null ? null : board.getCoverPin().getImageUrl(),
                UserService.toSummary(board.getOwner()),
                board.getCreatedAt());
    }

    private static String trimToNull(String value) {
        return StringUtils.hasText(value) ? value.trim() : null;
    }
}
