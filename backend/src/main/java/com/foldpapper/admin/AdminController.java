package com.foldpapper.admin;

import com.foldpapper.admin.AdminDtos.AdminPinView;
import com.foldpapper.admin.AdminDtos.AdminStats;
import com.foldpapper.admin.AdminDtos.AdminUserUpdate;
import com.foldpapper.admin.AdminDtos.AdminUserView;
import com.foldpapper.admin.AdminDtos.ReportView;
import com.foldpapper.admin.AdminDtos.ResolveRequest;
import com.foldpapper.common.PageResponse;
import com.foldpapper.report.ReportStatus;
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
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

/** Доступ только с ролью ADMIN — правило в SecurityConfig. */
@RestController
@RequestMapping("/api/v1/admin")
@Tag(name = "Admin", description = "Админ-панель: статистика и модерация")
public class AdminController {

    private final AdminService adminService;

    public AdminController(AdminService adminService) {
        this.adminService = adminService;
    }

    @GetMapping("/stats")
    @Operation(summary = "Сводка и активность за две недели")
    public AdminStats stats(@RequestParam(required = false) String tz) {
        return adminService.stats(tz);
    }

    @GetMapping("/users")
    @Operation(summary = "Пользователи: поиск и фильтр admins/banned")
    public PageResponse<AdminUserView> users(@RequestParam(required = false) String q,
                                             @RequestParam(required = false) String filter,
                                             @PageableDefault(size = 20) Pageable pageable) {
        return adminService.users(q, filter, pageable);
    }

    @PatchMapping("/users/{userId}")
    @Operation(summary = "Сменить роль, заблокировать или разблокировать")
    public AdminUserView updateUser(@PathVariable UUID userId,
                                    @AuthenticationPrincipal AppUserPrincipal principal,
                                    @Valid @RequestBody AdminUserUpdate request) {
        return adminService.updateUser(principal.getId(), userId, request);
    }

    @GetMapping("/pins")
    @Operation(summary = "Все пины с числом открытых жалоб")
    public PageResponse<AdminPinView> pins(@RequestParam(required = false) String q,
                                           @PageableDefault(size = 24) Pageable pageable) {
        return adminService.pins(q, pageable);
    }

    @DeleteMapping("/pins/{pinId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Удалить любой пин")
    public void deletePin(@PathVariable UUID pinId, @AuthenticationPrincipal AppUserPrincipal principal) {
        adminService.deletePin(principal.getId(), pinId);
    }

    @GetMapping("/reports")
    @Operation(summary = "Жалобы по статусу")
    public PageResponse<ReportView> reports(@RequestParam(defaultValue = "OPEN") ReportStatus status,
                                            @PageableDefault(size = 20) Pageable pageable) {
        return adminService.reports(status, pageable);
    }

    @PostMapping("/reports/{reportId}/resolve")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Разобрать жалобу: удалить пин или отклонить")
    public void resolve(@PathVariable UUID reportId,
                        @AuthenticationPrincipal AppUserPrincipal principal,
                        @Valid @RequestBody ResolveRequest request) {
        adminService.resolve(principal.getId(), reportId, request.action());
    }
}
