package com.foldpapper.pepper;

import com.foldpapper.pepper.PepperDtos.PepperRequest;
import com.foldpapper.pepper.PepperDtos.PepperResponse;
import com.foldpapper.security.AppUserPrincipal;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/pins/{pinId}/pepper")
@Tag(name = "Peppers", description = "Перцы — местный аналог лайков, с остротой 1..5")
public class PepperController {

    private final PepperService pepperService;

    public PepperController(PepperService pepperService) {
        this.pepperService = pepperService;
    }

    @PutMapping
    @Operation(summary = "Поставить перец или изменить его остроту")
    public PepperResponse setPepper(@PathVariable UUID pinId,
                                    @AuthenticationPrincipal AppUserPrincipal principal,
                                    @Valid @RequestBody(required = false) PepperRequest request) {
        int heat = request == null ? Pepper.MIN_HEAT : request.heatOrDefault();
        return pepperService.setPepper(pinId, principal.getId(), heat);
    }

    @DeleteMapping
    @Operation(summary = "Убрать перец")
    public PepperResponse removePepper(@PathVariable UUID pinId,
                                       @AuthenticationPrincipal AppUserPrincipal principal) {
        return pepperService.removePepper(pinId, principal.getId());
    }
}
