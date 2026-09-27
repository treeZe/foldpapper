package com.foldpapper.pin;

import com.foldpapper.common.PageResponse;
import com.foldpapper.pin.dto.PinDtos.PinResponse;
import com.foldpapper.security.AppUserPrincipal;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** Домашняя лента — требует авторизации, поэтому вынесена из /api/v1/pins. */
@RestController
@RequestMapping("/api/v1/feed")
@Tag(name = "Feed", description = "Лента подписок")
public class FeedController {

    private final PinService pinService;

    public FeedController(PinService pinService) {
        this.pinService = pinService;
    }

    @GetMapping
    @Operation(summary = "Пины авторов, на которых вы подписаны")
    public PageResponse<PinResponse> home(@AuthenticationPrincipal AppUserPrincipal principal,
                                          @RequestParam(required = false) String sort,
                                          @PageableDefault(size = 24) Pageable pageable) {
        return pinService.followingFeed(principal.getId(), PinService.FeedSort.parse(sort), pageable);
    }
}
