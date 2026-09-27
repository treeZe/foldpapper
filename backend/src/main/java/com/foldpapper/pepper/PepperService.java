package com.foldpapper.pepper;

import com.foldpapper.common.ApiException;
import com.foldpapper.pepper.PepperDtos.PepperResponse;
import com.foldpapper.pin.PinRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;
import java.util.UUID;

@Service
public class PepperService {

    private final PepperRepository pepperRepository;
    private final PinRepository pinRepository;

    public PepperService(PepperRepository pepperRepository, PinRepository pinRepository) {
        this.pepperRepository = pepperRepository;
        this.pinRepository = pinRepository;
    }

    /** Ставит перец или меняет его остроту. Идемпотентно. */
    @Transactional
    public PepperResponse setPepper(UUID pinId, UUID userId, int heat) {
        if (heat < Pepper.MIN_HEAT || heat > Pepper.MAX_HEAT) {
            throw ApiException.badRequest("Острота перца должна быть от %d до %d"
                    .formatted(Pepper.MIN_HEAT, Pepper.MAX_HEAT));
        }
        if (!pinRepository.existsById(pinId)) {
            throw ApiException.notFound("Пин");
        }

        Optional<Pepper> existing = pepperRepository.findByPinIdAndUserId(pinId, userId);
        if (existing.isPresent()) {
            Pepper pepper = existing.get();
            int delta = heat - pepper.getHeat();
            if (delta != 0) {
                pepper.setHeat((short) heat);
                pepperRepository.saveAndFlush(pepper);
                pinRepository.applyHeatDelta(pinId, delta);
            }
        } else {
            pepperRepository.saveAndFlush(new Pepper(pinId, userId, (short) heat));
            pinRepository.applyPepperAdded(pinId, heat);
        }

        return response(pinId, heat);
    }

    /** Убирает перец. Если перца не было — просто отдаёт текущее состояние. */
    @Transactional
    public PepperResponse removePepper(UUID pinId, UUID userId) {
        pepperRepository.findByPinIdAndUserId(pinId, userId).ifPresent(pepper -> {
            pepperRepository.delete(pepper);
            pepperRepository.flush();
            pinRepository.applyPepperRemoved(pinId, pepper.getHeat());
        });
        return response(pinId, null);
    }

    private PepperResponse response(UUID pinId, Integer myHeat) {
        PinRepository.PinCounters counters = pinRepository.findCountersById(pinId)
                .orElseThrow(() -> ApiException.notFound("Пин"));
        return new PepperResponse(pinId, myHeat, counters.getPepperCount(), counters.getHeatScore());
    }
}
