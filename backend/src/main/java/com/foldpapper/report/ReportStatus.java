package com.foldpapper.report;

public enum ReportStatus {
    /** Ждёт решения модератора. */
    OPEN,
    /** Жалоба подтверждена, пин удалён. */
    RESOLVED,
    /** Жалоба отклонена, пин остался. */
    DISMISSED
}
