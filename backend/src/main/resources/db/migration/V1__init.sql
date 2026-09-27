-- Fold Papper — базовая схема данных.
-- Ключевая идея: "перец" (pepper) вместо лайка, у перца есть острота (heat 1..5).

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ---------------------------------------------------------------- users
CREATE TABLE users
(
    id            uuid         PRIMARY KEY,
    username      varchar(30)  NOT NULL,
    email         varchar(255) NOT NULL,
    password_hash varchar(100) NOT NULL,
    display_name  varchar(80),
    bio           varchar(500),
    avatar_url    varchar(1024),
    created_at    timestamptz  NOT NULL DEFAULT now(),
    updated_at    timestamptz  NOT NULL DEFAULT now(),
    CONSTRAINT uq_users_username UNIQUE (username),
    CONSTRAINT uq_users_email UNIQUE (email)
);

CREATE INDEX idx_users_username_trgm ON users USING gin (username gin_trgm_ops);

-- ----------------------------------------------------------------- pins
CREATE TABLE pins
(
    id             uuid          PRIMARY KEY,
    author_id      uuid          NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    title          varchar(160),
    description    varchar(2000),
    source_url     varchar(1024),
    image_url      varchar(1024) NOT NULL,
    image_width    int,
    image_height   int,
    -- денормализованные счётчики: нужны для сортировки ленты без тяжёлых JOIN
    pepper_count   int           NOT NULL DEFAULT 0,
    heat_score     int           NOT NULL DEFAULT 0,
    save_count     int           NOT NULL DEFAULT 0,
    created_at     timestamptz   NOT NULL DEFAULT now(),
    updated_at     timestamptz   NOT NULL DEFAULT now(),
    CONSTRAINT ck_pins_counters CHECK (pepper_count >= 0 AND heat_score >= 0 AND save_count >= 0)
);

-- лента "новое": keyset-пагинация по (created_at, id)
CREATE INDEX idx_pins_created_at ON pins (created_at DESC, id DESC);
CREATE INDEX idx_pins_author ON pins (author_id, created_at DESC);
CREATE INDEX idx_pins_heat ON pins (heat_score DESC, created_at DESC);
CREATE INDEX idx_pins_title_trgm ON pins USING gin (title gin_trgm_ops);

-- --------------------------------------------------------------- boards
CREATE TABLE boards
(
    id           uuid        PRIMARY KEY,
    owner_id     uuid        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    title        varchar(80) NOT NULL,
    slug         varchar(90) NOT NULL,
    description  varchar(500),
    is_private   boolean     NOT NULL DEFAULT false,
    cover_pin_id uuid        REFERENCES pins (id) ON DELETE SET NULL,
    pin_count    int         NOT NULL DEFAULT 0,
    created_at   timestamptz NOT NULL DEFAULT now(),
    updated_at   timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT uq_boards_owner_slug UNIQUE (owner_id, slug)
);

CREATE INDEX idx_boards_owner ON boards (owner_id, created_at DESC);

-- ----------------------------------------------------------- board_pins
-- один пин может лежать на многих досках (это и есть "сохранить к себе")
CREATE TABLE board_pins
(
    board_id uuid        NOT NULL REFERENCES boards (id) ON DELETE CASCADE,
    pin_id   uuid        NOT NULL REFERENCES pins (id) ON DELETE CASCADE,
    added_by uuid        REFERENCES users (id) ON DELETE SET NULL,
    note     varchar(500),
    added_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (board_id, pin_id)
);

CREATE INDEX idx_board_pins_board ON board_pins (board_id, added_at DESC);
CREATE INDEX idx_board_pins_pin ON board_pins (pin_id);

-- -------------------------------------------------------------- peppers
-- "лайк" = перец. Один пользователь — один перец на пин, но остроту можно менять.
CREATE TABLE peppers
(
    id         uuid        PRIMARY KEY,
    pin_id     uuid        NOT NULL REFERENCES pins (id) ON DELETE CASCADE,
    user_id    uuid        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    heat       smallint    NOT NULL DEFAULT 1,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT uq_peppers_pin_user UNIQUE (pin_id, user_id),
    CONSTRAINT ck_peppers_heat CHECK (heat BETWEEN 1 AND 5)
);

CREATE INDEX idx_peppers_user ON peppers (user_id, created_at DESC);

-- ----------------------------------------------------------------- tags
CREATE TABLE tags
(
    id         bigserial   PRIMARY KEY,
    name       varchar(50) NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT uq_tags_name UNIQUE (name)
);

CREATE TABLE pin_tags
(
    pin_id uuid   NOT NULL REFERENCES pins (id) ON DELETE CASCADE,
    tag_id bigint NOT NULL REFERENCES tags (id) ON DELETE CASCADE,
    PRIMARY KEY (pin_id, tag_id)
);

CREATE INDEX idx_pin_tags_tag ON pin_tags (tag_id);

-- -------------------------------------------------------------- follows
CREATE TABLE follows
(
    follower_id uuid        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    followee_id uuid        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    created_at  timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (follower_id, followee_id),
    CONSTRAINT ck_follows_not_self CHECK (follower_id <> followee_id)
);

CREATE INDEX idx_follows_followee ON follows (followee_id);
