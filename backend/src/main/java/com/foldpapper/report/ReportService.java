package com.foldpapper.report;

import com.foldpapper.common.ApiException;
import com.foldpapper.pin.Pin;
import com.foldpapper.pin.PinRepository;
import com.foldpapper.user.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.UUID;

@Service
public class ReportService {

    private final ReportRepository reportRepository;
    private final PinRepository pinRepository;
    private final UserRepository userRepository;

    public ReportService(ReportRepository reportRepository,
                         PinRepository pinRepository,
                         UserRepository userRepository) {
        this.reportRepository = reportRepository;
        this.pinRepository = pinRepository;
        this.userRepository = userRepository;
    }

    @Transactional
    public void report(UUID pinId, UUID reporterId, ReportReason reason, String comment) {
        Pin pin = pinRepository.findWithAuthorAndTagsById(pinId)
                .orElseThrow(() -> ApiException.notFound("Пин"));
        if (pin.getAuthor().getId().equals(reporterId)) {
            throw ApiException.badRequest("Нельзя пожаловаться на свой пин");
        }
        if (reportRepository.existsByPinIdAndReporterId(pinId, reporterId)) {
            throw ApiException.conflict("Вы уже пожаловались на этот пин — модераторы разберутся");
        }

        Report report = new Report();
        report.setPin(pin);
        report.setReporter(userRepository.getReferenceById(reporterId));
        report.setReason(reason);
        report.setComment(StringUtils.hasText(comment) ? comment.trim() : null);
        report.setPinTitle(pin.getTitle());
        report.setPinImageUrl(pin.getImageUrl());
        reportRepository.save(report);
    }
}
