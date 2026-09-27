package com.foldpapper.pin;

import com.foldpapper.board.BoardPinService;
import com.foldpapper.common.PageResponse;
import com.foldpapper.pin.dto.PinDtos.PinCreateRequest;
import com.foldpapper.pin.dto.PinDtos.PinResponse;
import com.foldpapper.pin.dto.PinDtos.PinUpdateRequest;
import com.foldpapper.security.AppUserPrincipal;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/pins")
@Tag(name = "Pins", description = "Создание и просмотр пинов")
public class PinController {

    private final PinService pinService;
    private final BoardPinService boardPinService;

    public PinController(PinService pinService, BoardPinService boardPinService) {
        this.pinService = pinService;
        this.boardPinService = boardPinService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Transactional
    @Operation(summary = "Создать пин (и при желании сразу положить его на доску)")
    public PinResponse create(@AuthenticationPrincipal AppUserPrincipal principal,
                              @Valid @RequestBody PinCreateRequest request) {
        Pin pin = pinService.create(principal.getId(), request);
        if (request.boardId() != null) {
            boardPinService.attach(request.boardId(), pin, principal.getId());
        }
        return pinService.toResponse(pin, Map.of());
    }

    @GetMapping
    @Operation(summary = "Лента: все пины, поиск по тексту или фильтр по тегу")
    public PageResponse<PinResponse> explore(@RequestParam(required = false) String q,
                                             @RequestParam(required = false) String tag,
                                             @RequestParam(required = false) String sort,
                                             @AuthenticationPrincipal AppUserPrincipal principal,
                                             @PageableDefault(size = 24) Pageable pageable) {
        return pinService.explore(q, tag, PinService.FeedSort.parse(sort), principal, pageable);
    }

    @GetMapping("/{pinId}")
    @Operation(summary = "Один пин")
    public PinResponse get(@PathVariable UUID pinId,
                           @AuthenticationPrincipal AppUserPrincipal principal) {
        return pinService.get(pinId, principal);
    }

    @PatchMapping("/{pinId}")
    @Operation(summary = "Изменить свой пин")
    public PinResponse update(@PathVariable UUID pinId,
                              @AuthenticationPrincipal AppUserPrincipal principal,
                              @Valid @RequestBody PinUpdateRequest request) {
        return pinService.update(pinId, principal.getId(), request);
    }

    @DeleteMapping("/{pinId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Удалить свой пин")
    public void delete(@PathVariable UUID pinId,
                       @AuthenticationPrincipal AppUserPrincipal principal) {
        pinService.delete(pinId, principal.getId());
    }
}
