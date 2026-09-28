-- Жалобы на профили и дополнительные поля профиля.

-- ---------------------------------------------------------------- users
ALTER TABLE users
    ADD COLUMN location varchar(80),
    ADD COLUMN website  varchar(255);

-- -------------------------------------------------------------- reports
-- Жалоба теперь бывает на пин (kind = PIN) или на пользователя (kind = USER).
-- Как и с пином, username храним снимком: история модерации переживёт удаление аккаунта.
ALTER TABLE reports
    ADD COLUMN kind            varchar(10) NOT NULL DEFAULT 'PIN',
    ADD COLUMN target_user_id  uuid        REFERENCES users (id) ON DELETE SET NULL,
    ADD COLUMN target_username varchar(30),
    ALTER COLUMN pin_image_url DROP NOT NULL,
    DROP CONSTRAINT ck_reports_reason,
    ADD CONSTRAINT ck_reports_reason
        CHECK (reason IN ('SPAM', 'NSFW', 'OFFENSIVE', 'COPYRIGHT', 'IMPERSONATION', 'OTHER')),
    ADD CONSTRAINT ck_reports_kind CHECK (kind IN ('PIN', 'USER'));

-- Профиль со временем меняется, поэтому одна открытая жалоба на пару (профиль, автор жалобы),
-- а после разбора можно пожаловаться снова.
CREATE UNIQUE INDEX uq_reports_user_reporter_open ON reports (target_user_id, reporter_id) WHERE status = 'OPEN';
CREATE INDEX idx_reports_target_user ON reports (target_user_id);
