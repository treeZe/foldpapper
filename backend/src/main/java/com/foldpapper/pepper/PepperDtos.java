package com.foldpapper.pepper;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;

import java.util.UUID;

public final class PepperDtos {

    private PepperDtos() {
    }

    public record PepperRequest(
            /** Острота: 1 — "мило", 5 — "жжёт". По умолчанию 1. */
            @Min(1) @Max(5) Integer heat
    ) {
        public int heatOrDefault() {
            return heat == null ? Pepper.MIN_HEAT : heat;
        }
    }

    public record PepperResponse(
            UUID pinId,
            Integer myPepper,
            int pepperCount,
            int heatScore
    ) {
    }
}
