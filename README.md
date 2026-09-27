# Fold Papper

**Fold Papper** — веб-сервис визуальных закладок: пользователи сохраняют понравившиеся изображения в виде пинов, раскладывают их по тематическим доскам и находят новые идеи в общей ленте. Отличительная механика сервиса — **перцы** вместо лайков: каждый пин можно оценить по «остроте» от 1 («Мило») до 5 («Огонь!»), и самые острые идеи поднимаются в ленте «Огонь».

Проект выполнен как студенческая работа и состоит из REST API на Spring Boot и одностраничного веб-приложения на React.

## Возможности

- **Пины** — изображение (загрузка файла или ссылка) с названием, описанием, ссылкой на источник и тегами.
- **Доски** — тематические подборки пинов; публичные или секретные. Один пин можно сохранить на любое число досок.
- **Перцы** — оценка остроты 1–5. Для каждого пина считаются число перцев и суммарная острота.
- **Ленты** — «Свежее», «Огонь» (по остроте) и персональная «Для вас» из подписок.
- **Поиск** по тексту и по тегам, облако популярных тегов.
- **Профили и подписки** — статистика, пины, доски и перцы пользователя.
- **Жалобы** — любой пользователь может пожаловаться на пин (спам, 18+, оскорбления, авторские права).
- **Админ-панель** — статистика и графики активности, очередь жалоб, управление пользователями (роли, блокировка) и модерация пинов.
- **Интерфейс** — masonry-сетка с бесконечной прокруткой, светлая и тёмная темы, адаптивная вёрстка для телефонов.

## Технологии

| Часть     | Стек                                                                                 |
|-----------|--------------------------------------------------------------------------------------|
| Бэкенд    | Java 17+, Spring Boot 3.3, Spring Security + JWT, Spring Data JPA, Flyway, springdoc (Swagger) |
| База      | PostgreSQL 16 (в Docker)                                                             |
| Фронтенд  | React 19, TypeScript, Vite, React Router, TanStack Query                             |

## Структура репозитория

```
FoldPapper/
├── backend/            # REST API (Spring Boot)
│   └── src/main/
│       ├── java/com/foldpapper/   # user, pin, board, pepper, tag, follow, media, report, admin, security, …
│       └── resources/db/migration # миграции схемы БД (Flyway)
├── frontend/           # веб-приложение (React + Vite)
│   └── src/
│       ├── api/        # клиент API и типы
│       ├── components/ # карточки, сетка, шкала перцев, модальные окна
│       ├── pages/      # страницы сайта (admin/ — админ-панель)
│       └── styles/     # дизайн-система (CSS)
├── docs/ADMIN.md       # гайд по админ-панели
├── docker-compose.yml  # PostgreSQL для разработки
├── seed-demo.sh        # демо-данные
└── smoke-test.sh       # сквозная проверка API
```

---

## Установка

Понадобятся:

| Инструмент         | Версия      | Зачем                              |
|--------------------|-------------|------------------------------------|
| JDK                | 17 или новее (проверено на 21) | сборка и запуск бэкенда |
| Maven              | 3.9+        | сборка бэкенда (Maven Wrapper в проекте нет) |
| Node.js            | 22.22+      | фронтенд                           |
| Docker + Compose   | любой свежий | база данных PostgreSQL            |
| curl и sh          | —           | скрипты `seed-demo.sh` и `smoke-test.sh` |

### Linux

**Arch Linux / CachyOS / Manjaro**

```sh
sudo pacman -Syu --needed jdk21-openjdk maven nodejs npm docker docker-compose
sudo systemctl enable --now docker
sudo usermod -aG docker $USER
```

**Ubuntu / Debian**

```sh
sudo apt update
sudo apt install openjdk-21-jdk maven docker.io docker-compose-v2 curl
sudo systemctl enable --now docker
sudo usermod -aG docker $USER
```

Node.js из стандартных репозиториев Ubuntu/Debian обычно слишком старый. Поставьте актуальную версию через [nvm](https://github.com/nvm-sh/nvm):

```sh
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/master/install.sh | bash
# перезапустите терминал
nvm install 22
```

**Fedora**

```sh
sudo dnf install java-21-openjdk-devel maven nodejs docker docker-compose
sudo systemctl enable --now docker
sudo usermod -aG docker $USER
```

После `usermod` **перелогиньтесь** (или выполните `newgrp docker` в текущем терминале), иначе `docker` будет отвечать `permission denied`.

### Windows 10/11

1. Установите программы через `winget` (PowerShell от имени администратора):

   ```powershell
   winget install EclipseAdoptium.Temurin.21.JDK
   winget install OpenJS.NodeJS.LTS
   winget install Docker.DockerDesktop
   winget install Git.Git
   ```

2. Установите **Maven**. Проще всего через [Scoop](https://scoop.sh): `scoop install maven`. Либо вручную: скачайте архив с [maven.apache.org](https://maven.apache.org/download.cgi), распакуйте, например, в `C:\Tools\maven` и добавьте `C:\Tools\maven\bin` в переменную `PATH`.
   Если вы работаете в IntelliJ IDEA, Maven уже встроен — проект можно открыть и запускать прямо из IDE.

3. Запустите **Docker Desktop** и дождитесь, пока он напишет *Engine running*. При первом запуске он может попросить включить WSL 2 и перезагрузить компьютер.

4. Скрипты `seed-demo.sh` и `smoke-test.sh` запускайте в **Git Bash** (ставится вместе с Git), а не в PowerShell.

### Проверка установки

```sh
java -version        # 17 или новее
mvn -v
node -v              # v22.22 или новее
docker compose version
```

---

## Запуск

Нужны три процесса: база, бэкенд и фронтенд. Бэкенд и фронтенд запускайте в **разных терминалах**.

### 1. База данных

Из корня проекта:

```sh
docker compose up -d
```

PostgreSQL 16 поднимется на `localhost:5432` (база, пользователь и пароль — `foldpapper`). Данные хранятся в docker-томе и переживают перезапуск.

### 2. Бэкенд

```sh
cd backend
mvn spring-boot:run
```

При первом старте Flyway сам создаст таблицы. API будет доступно на <http://localhost:8080>, документация — на <http://localhost:8080/swagger-ui.html>. Проверка: `curl http://localhost:8080/actuator/health` → `{"status":"UP"}`.

### 3. Фронтенд

```sh
cd frontend
npm install        # только первый раз
npm run dev
```

Откройте **<http://localhost:5173>**. Dev-сервер Vite проксирует `/api` и `/uploads` на бэкенд `localhost:8080`, поэтому отдельно настраивать CORS не нужно. Другой адрес бэкенда задаётся переменной `BACKEND_URL`, например `BACKEND_URL=http://localhost:9090 npm run dev`.

### 4. Демо-данные (по желанию)

Чтобы сайт не был пустым, из корня проекта выполните:

```sh
sh seed-demo.sh
```

Скрипт создаст четырёх пользователей, доски, 16 пинов, перцы и подписки. Войти можно как `anna.chili` с паролем `demo-pepper-2026`. Картинки берутся с picsum.photos, поэтому для их показа нужен интернет. Повторный запуск ничего не дублирует.

### 5. Администратор

> 📘 Подробный гайд по админке — где что настраивается, все способы назначить админа (Linux, Windows, IntelliJ, SQL), правила и API: **[docs/ADMIN.md](docs/ADMIN.md)**.

Админ-панель доступна пользователям с ролью `ADMIN`. Первого администратора назначает переменная `ADMIN_USERNAMES` (через запятую): при старте бэкенд выдаёт роль перечисленным пользователям. Пользователь должен быть уже зарегистрирован.

```sh
cd backend
ADMIN_USERNAMES=anna.chili mvn spring-boot:run
```

В PowerShell: `$env:ADMIN_USERNAMES="anna.chili"; mvn spring-boot:run`.

Дальше роли выдаются прямо в админке: **аватар → Админ-панель → Пользователи → Сделать админом**. Переменную можно убрать: роль хранится в базе.

Что есть в админ-панели (`/admin`):

- **Обзор** — количество пользователей, пинов, перцев, досок, открытых жалоб и блокировок, графики активности за 14 дней (с табличным видом).
- **Жалобы** — очередь от старых к новым. Можно удалить пин (закроются все жалобы на него) или отклонить жалобу. Есть история решений.
- **Пользователи** — поиск, фильтры «Админы» и «Заблокированные», выдача и снятие роли, блокировка с причиной.
- **Пины** — поиск по всем пинам, счётчик открытых жалоб, удаление любого пина.

Блокировка и снятие роли срабатывают сразу: заблокированного пользователя разлогинивает при следующем же запросе, а при входе он видит причину. Себя заблокировать или разжаловать нельзя, а администратора сначала нужно разжаловать и только потом блокировать.

### Остановка

`Ctrl+C` в терминалах бэкенда и фронтенда, затем `docker compose stop`. Удалить базу вместе со всеми данными: `docker compose down -v`.

---

## Сборка для продакшена

```sh
# бэкенд → backend/target/foldpapper-backend-0.1.0-SNAPSHOT.jar
cd backend && mvn package
java -jar target/foldpapper-backend-0.1.0-SNAPSHOT.jar

# фронтенд → frontend/dist (статические файлы)
cd frontend && npm run build
npm run preview    # локальный просмотр сборки на http://localhost:4173
```

Готовую папку `frontend/dist` можно раздавать любым веб-сервером (nginx и т. п.). Запросы `/api` и `/uploads` при этом нужно проксировать на бэкенд.

## Настройка бэкенда

Параметры задаются переменными окружения. Значения по умолчанию подходят для локальной разработки.

| Переменная    | По умолчанию                                  | Описание                                     |
|---------------|-----------------------------------------------|----------------------------------------------|
| `DB_URL`      | `jdbc:postgresql://localhost:5432/foldpapper` | JDBC-адрес базы                              |
| `DB_USER`     | `foldpapper`                                  | Пользователь БД                              |
| `DB_PASSWORD` | `foldpapper`                                  | Пароль БД                                    |
| `SERVER_PORT` | `8080`                                        | Порт HTTP-сервера                            |
| `JWT_SECRET`  | dev-значение                                  | Секрет подписи токенов (минимум 32 байта)    |
| `JWT_TTL`     | `P7D`                                         | Срок жизни токена (ISO-8601, `P7D` = 7 дней) |
| `STORAGE_DIR` | `./uploads`                                   | Каталог для загруженных картинок             |
| `ADMIN_USERNAMES` | —                                         | Кому выдать роль `ADMIN` при старте (через запятую) |

> ⚠️ На любом окружении, кроме локального, обязательно задайте свой `JWT_SECRET`.

CORS разрешён для `http://localhost:5173` и `http://localhost:3000`. Список задаётся в `app.allowed-origins` в `backend/src/main/resources/application.yml`.

## API

Все эндпоинты начинаются с `/api/v1`. Просмотр контента (`GET` пинов, досок, пользователей, тегов) доступен без авторизации. Для всего остального нужен заголовок `Authorization: Bearer <token>`. Полное описание — в Swagger UI.

| Раздел       | Эндпоинты |
|--------------|-----------|
| Авторизация  | `POST /auth/register`, `POST /auth/login` (вход по username или email) |
| Пины         | `GET/POST /pins`, `GET/PATCH/DELETE /pins/{id}`; `GET /pins?sort=new\|hot&q=…&tag=…` |
| Перцы        | `PUT /pins/{id}/pepper` с `{"heat": 1..5}`, `DELETE /pins/{id}/pepper` |
| Доски        | `POST /boards`, `GET/PATCH/DELETE /boards/{id}`, `GET /boards/{id}/pins`, `PUT/DELETE /boards/{id}/pins/{pinId}` |
| Пользователи | `GET/PATCH /users/me`, `GET /users/{username}` (+ `/pins`, `/boards`, `/peppered`), `PUT/DELETE /users/{username}/follow` |
| Лента        | `GET /feed` — пины авторов, на которых вы подписаны |
| Теги         | `GET /tags` — популярные теги |
| Картинки     | `POST /media/images` (multipart) — JPEG/PNG/WebP/GIF до 10 МБ |
| Жалобы       | `POST /pins/{id}/reports` с `{"reason": "SPAM\|NSFW\|OFFENSIVE\|COPYRIGHT\|OTHER", "comment": "…"}` |
| Админка (роль `ADMIN`) | `GET /admin/stats?tz=…`, `GET /admin/users?q=&filter=admins\|banned`, `PATCH /admin/users/{id}` с `{role, banned, banReason}`, `GET /admin/pins`, `DELETE /admin/pins/{id}`, `GET /admin/reports?status=OPEN\|RESOLVED\|DISMISSED`, `POST /admin/reports/{id}/resolve` с `{"action": "DELETE_PIN\|DISMISS"}` |

**Как считаются перцы:** один пользователь может поставить пину только один перец, а повторный `PUT` меняет его остроту. У пина хранятся `pepperCount` (число перцев) и `heatScore` (сумма остроты). Лента `sort=hot` сортирует по `heatScore`.

## Проверка

```sh
cd frontend && npm run typecheck   # проверка типов фронтенда
cd backend && mvn test             # интеграционные тесты бэкенда (нужен запущенный Docker)
sh smoke-test.sh                   # сквозная проверка API на запущенном бэкенде
```

Тесты бэкенда поднимают отдельный PostgreSQL в Docker через Testcontainers и не трогают базу разработки. Сейчас они проверяют права доступа админки, блокировку, снятие роли и разбор жалоб. Один тест запускается так: `mvn test -Dtest=AdminApiIntegrationTest#bannedUserLosesSessionAndCannotLogIn`.

Smoke-тест должен пройти все 16 шагов без ответов `500`. Шаг 15 ожидаемо возвращает `401`, шаг 16 — `400`.

## Частые проблемы

- **`Connection refused` к 5432 при старте бэкенда** — база не запущена: выполните `docker compose up -d` и дождитесь статуса `healthy` (`docker compose ps`).
- **`permission denied while trying to connect to the docker API`** (Linux) — пользователь не в группе `docker` или сессия её ещё не видит: `sudo usermod -aG docker $USER` и перелогиньтесь.
- **Порт 5432 занят** — уже работает другой PostgreSQL. Остановите его или поменяйте порт в `docker-compose.yml` и задайте `DB_URL`.
- **На сайте «Сервер недоступен»** — не запущен бэкенд или он работает не на `localhost:8080` (см. `BACKEND_URL`).
- **`npm run dev` ругается на версию Node** — нужен Node.js 22.22 или новее.
- **pacman выдаёт `404` или «подпись некорректна»** (Arch/CachyOS) — устарели базы пакетов или зеркало не отвечает. Обновите зеркала (`sudo cachyos-rate-mirrors` или `reflector`) и повторите с `-Syu`. Не используйте `pacman -Sy` без `u`.
- **`smoke-test.sh: set: -: недопустимый параметр`** — у скрипта виндовые переводы строк (CRLF): `sed -i 's/\r$//' smoke-test.sh`. В репозитории это предотвращает `.gitattributes`.
- **Нет пункта «Админ-панель» в меню** — у пользователя нет роли `ADMIN`: перезапустите бэкенд с `ADMIN_USERNAMES=<username>` и перезайдите на сайт.
- **`mvn test`: `Could not find a valid Docker environment`** — Docker не запущен или у пользователя нет к нему доступа (см. `permission denied` выше).
- **Ошибка валидации схемы Hibernate** — схема меняется только миграциями Flyway: добавьте новый файл `V2__….sql`, не редактируйте `V1__init.sql`.
