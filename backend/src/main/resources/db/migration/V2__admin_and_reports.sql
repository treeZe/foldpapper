-- Роли, блокировка пользователей и жалобы на пины — всё, что нужно админ-панели.

-- ---------------------------------------------------------------- users
ALTER TABLE users
    ADD COLUMN role       varchar(20)  NOT NULL DEFAULT 'USER',
    ADD COLUMN banned_at  timestamptz,
    ADD COLUMN ban_reason varchar(300),
    ADD CONSTRAINT ck_users_role CHECK (role IN ('USER', 'ADMIN'));

CREATE INDEX idx_users_created_at ON users (created_at DESC);

-- -------------------------------------------------------------- reports
-- pin_id обнуляется при удалении пина, а снимок названия и картинки остаётся:
-- так в истории модерации видно, на что жаловались.
CREATE TABLE reports
(
    id            uuid          PRIMARY KEY,
    pin_id        uuid          REFERENCES pins (id) ON DELETE SET NULL,
    reporter_id   uuid          NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    reason        varchar(20)   NOT NULL,
    comment       varchar(500),
    status        varchar(20)   NOT NULL DEFAULT 'OPEN',
    pin_title     varchar(160),
    pin_image_url varchar(1024) NOT NULL,
    resolved_by   uuid          REFERENCES users (id) ON DELETE SET NULL,
    resolved_at   timestamptz,
    created_at    timestamptz   NOT NULL DEFAULT now(),
    CONSTRAINT uq_reports_pin_reporter UNIQUE (pin_id, reporter_id),
    CONSTRAINT ck_reports_reason CHECK (reason IN ('SPAM', 'NSFW', 'OFFENSIVE', 'COPYRIGHT', 'OTHER')),
    CONSTRAINT ck_reports_status CHECK (status IN ('OPEN', 'RESOLVED', 'DISMISSED'))
);

CREATE INDEX idx_reports_status ON reports (status, created_at DESC);
CREATE INDEX idx_reports_pin ON reports (pin_id);

-- для графиков активности в админке
CREATE INDEX idx_peppers_created_at ON peppers (created_at);
