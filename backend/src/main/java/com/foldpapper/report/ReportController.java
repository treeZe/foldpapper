package com.foldpapper.report;

import com.foldpapper.security.AppUserPrincipal;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1")
@Tag(name = "Reports", description = "Жалобы на пины и профили")
public class ReportController {

    private final ReportService reportService;

    public ReportController(ReportService reportService) {
        this.reportService = reportService;
    }

    @PostMapping("/pins/{pinId}/reports")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Пожаловаться на пин")
    public void report(@PathVariable UUID pinId,
                       @AuthenticationPrincipal AppUserPrincipal principal,
                       @Valid @RequestBody ReportRequest request) {
        reportService.report(pinId, principal.getId(), request.reason(), request.comment());
    }

    @PostMapping("/users/{username}/reports")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Пожаловаться на профиль")
    public void reportUser(@PathVariable String username,
                           @AuthenticationPrincipal AppUserPrincipal principal,
                           @Valid @RequestBody ReportRequest request) {
        reportService.reportUser(username, principal.getId(), request.reason(), request.comment());
    }

    public record ReportRequest(
            @NotNull(message = "выберите причину") ReportReason reason,
            @Size(max = 500) String comment
    ) {
    }
}
