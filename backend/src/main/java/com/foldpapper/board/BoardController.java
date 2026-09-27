package com.foldpapper.board;

import com.foldpapper.board.dto.BoardDtos.BoardCreateRequest;
import com.foldpapper.board.dto.BoardDtos.BoardResponse;
import com.foldpapper.board.dto.BoardDtos.BoardUpdateRequest;
import com.foldpapper.board.dto.BoardDtos.SavePinRequest;
import com.foldpapper.common.PageResponse;
import com.foldpapper.pin.dto.PinDtos.PinResponse;
import com.foldpapper.security.AppUserPrincipal;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/boards")
@Tag(name = "Boards", description = "Доски и сохранение пинов на них")
public class BoardController {

    private final BoardService boardService;

    public BoardController(BoardService boardService) {
        this.boardService = boardService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Создать доску")
    public BoardResponse create(@AuthenticationPrincipal AppUserPrincipal principal,
                                @Valid @RequestBody BoardCreateRequest request) {
        return boardService.create(principal.getId(), request);
    }

    @GetMapping("/{boardId}")
    @Operation(summary = "Доска")
    public BoardResponse get(@PathVariable UUID boardId,
                             @AuthenticationPrincipal AppUserPrincipal principal) {
        return boardService.get(boardId, principal);
    }

    @PatchMapping("/{boardId}")
    @Operation(summary = "Изменить свою доску")
    public BoardResponse update(@PathVariable UUID boardId,
                                @AuthenticationPrincipal AppUserPrincipal principal,
                                @Valid @RequestBody BoardUpdateRequest request) {
        return boardService.update(boardId, principal.getId(), request);
    }

    @DeleteMapping("/{boardId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Удалить доску (пины остаются)")
    public void delete(@PathVariable UUID boardId,
                       @AuthenticationPrincipal AppUserPrincipal principal) {
        boardService.delete(boardId, principal.getId());
    }

    @GetMapping("/{boardId}/pins")
    @Operation(summary = "Пины на доске")
    public PageResponse<PinResponse> pins(@PathVariable UUID boardId,
                                          @AuthenticationPrincipal AppUserPrincipal principal,
                                          @PageableDefault(size = 24) Pageable pageable) {
        return boardService.listPins(boardId, principal, pageable);
    }

    @PutMapping("/{boardId}/pins/{pinId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Сохранить пин на доску")
    public void savePin(@PathVariable UUID boardId,
                        @PathVariable UUID pinId,
                        @AuthenticationPrincipal AppUserPrincipal principal,
                        @Valid @RequestBody(required = false) SavePinRequest request) {
        boardService.savePin(boardId, pinId, principal.getId(), request == null ? null : request.note());
    }

    @DeleteMapping("/{boardId}/pins/{pinId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Убрать пин с доски")
    public void removePin(@PathVariable UUID boardId,
                          @PathVariable UUID pinId,
                          @AuthenticationPrincipal AppUserPrincipal principal) {
        boardService.removePin(boardId, pinId, principal.getId());
    }
}
