package com.foldpapper.user;

import com.foldpapper.board.BoardService;
import com.foldpapper.board.dto.BoardDtos.BoardResponse;
import com.foldpapper.common.PageResponse;
import com.foldpapper.follow.FollowService;
import com.foldpapper.pin.PinService;
import com.foldpapper.pin.dto.PinDtos.PinResponse;
import com.foldpapper.security.AppUserPrincipal;
import com.foldpapper.user.dto.UserDtos.UpdateProfileRequest;
import com.foldpapper.user.dto.UserDtos.UserResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/users")
@Tag(name = "Users", description = "Профили, доски и пины пользователей")
public class UserController {

    private final UserService userService;
    private final PinService pinService;
    private final BoardService boardService;
    private final FollowService followService;

    public UserController(UserService userService,
                          PinService pinService,
                          BoardService boardService,
                          FollowService followService) {
        this.userService = userService;
        this.pinService = pinService;
        this.boardService = boardService;
        this.followService = followService;
    }

    @GetMapping("/me")
    @Operation(summary = "Текущий пользователь")
    public UserResponse me(@AuthenticationPrincipal AppUserPrincipal principal) {
        return userService.toResponse(userService.requireById(principal.getId()));
    }

    @PatchMapping("/me")
    @Operation(summary = "Обновить свой профиль")
    public UserResponse updateMe(@AuthenticationPrincipal AppUserPrincipal principal,
                                 @Valid @RequestBody UpdateProfileRequest request) {
        return userService.updateProfile(principal.getId(), request);
    }

    @GetMapping("/{username}")
    @Operation(summary = "Публичный профиль")
    public UserResponse profile(@PathVariable String username,
                                @AuthenticationPrincipal AppUserPrincipal principal) {
        return principal == null
                ? userService.getProfile(username, null, false)
                : userService.getProfile(username, principal.getId(), principal.isAdmin());
    }

    @GetMapping("/{username}/pins")
    @Operation(summary = "Пины, созданные пользователем")
    public PageResponse<PinResponse> pins(@PathVariable String username,
                                          @AuthenticationPrincipal AppUserPrincipal principal,
                                          @PageableDefault(size = 24) Pageable pageable) {
        return pinService.listByAuthor(username, principal, pageable);
    }

    @GetMapping("/{username}/boards")
    @Operation(summary = "Доски пользователя")
    public List<BoardResponse> boards(@PathVariable String username,
                                      @AuthenticationPrincipal AppUserPrincipal principal) {
        return boardService.listByOwner(username, principal);
    }

    @GetMapping("/{username}/peppered")
    @Operation(summary = "Пины, которым пользователь поставил перец")
    public PageResponse<PinResponse> peppered(@PathVariable String username,
                                              @AuthenticationPrincipal AppUserPrincipal principal,
                                              @PageableDefault(size = 24) Pageable pageable) {
        return pinService.listPeppered(username, principal, pageable);
    }

    @PutMapping("/{username}/follow")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Подписаться")
    public void follow(@PathVariable String username,
                       @AuthenticationPrincipal AppUserPrincipal principal) {
        followService.follow(principal.getId(), username);
    }

    @DeleteMapping("/{username}/follow")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Отписаться")
    public void unfollow(@PathVariable String username,
                         @AuthenticationPrincipal AppUserPrincipal principal) {
        followService.unfollow(principal.getId(), username);
    }
}
