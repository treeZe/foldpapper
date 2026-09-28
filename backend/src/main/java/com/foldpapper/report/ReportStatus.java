package com.foldpapper.report;

public enum ReportStatus {
    /** Ждёт решения модератора. */
    OPEN,
    /** Жалоба подтверждена: пин удалён или пользователь заблокирован. */
    RESOLVED,
    /** Жалоба отклонена, всё осталось как есть. */
    DISMISSED
}
