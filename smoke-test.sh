#!/bin/sh
# Сквозная проверка API: регистрация -> доска -> пин -> перец -> лента.
# Запуск: sh smoke-test.sh [base_url]
#
# Тело запросов передаётся через stdin (--data-binary @-), а не аргументом:
# на Windows Git-bash перекодирует argv нативного curl.exe в кодировку системы
# и UTF-8 портится.
set -eu

BASE="${1:-http://localhost:8080}"
USERNAME="chef$(date +%s)"
PASSWORD="ostryi-perec-2026"
JSON='Content-Type: application/json'

# берём первое вхождение поля: у вложенных объектов (owner, author) тоже есть "id"
field() { grep -o "\"$1\":\"[^\"]*\"" | head -n 1 | cut -d'"' -f4; }

post() { curl -sS -X POST "$1" -H "$JSON" -H "Authorization: Bearer ${TOKEN:-}" --data-binary @-; }

echo "--- 1. Регистрация $USERNAME"
AUTH=$(printf '{"username":"%s","email":"%s@foldpapper.dev","password":"%s","displayName":"Шеф Перец"}' \
  "$USERNAME" "$USERNAME" "$PASSWORD" \
  | curl -sS -X POST "$BASE/api/v1/auth/register" -H "$JSON" --data-binary @-)
TOKEN=$(printf '%s' "$AUTH" | field accessToken)
test -n "$TOKEN" || { echo "НЕ ПОЛУЧЕН ТОКЕН: $AUTH"; exit 1; }
echo "ok: токен получен, displayName=$(printf '%s' "$AUTH" | field displayName)"

echo "--- 2. Вход по email"
printf '{"login":"%s@foldpapper.dev","password":"%s"}' "$USERNAME" "$PASSWORD" \
  | curl -sS -o /dev/null -w "HTTP %{http_code}\n" -X POST "$BASE/api/v1/auth/login" -H "$JSON" --data-binary @-

echo "--- 3. Создание доски"
BOARD=$(printf '{"title":"Острые рецепты","description":"Всё, что жжёт"}' | post "$BASE/api/v1/boards")
BOARD_ID=$(printf '%s' "$BOARD" | field id)
echo "board=$BOARD_ID slug=$(printf '%s' "$BOARD" | field slug)"

echo "--- 4. Создание пина сразу на доску"
PIN=$(printf '{"title":"Халапеньо в меду","description":"Закуска на 10 минут","imageUrl":"https://picsum.photos/600/900","imageWidth":600,"imageHeight":900,"tags":["#Перец","закуски","острое"],"boardId":"%s"}' "$BOARD_ID" \
  | post "$BASE/api/v1/pins")
PIN_ID=$(printf '%s' "$PIN" | field id)
echo "pin=$PIN_ID"
echo "$PIN"

echo "--- 5. Перец остроты 4"
printf '{"heat":4}' | curl -sS -X PUT "$BASE/api/v1/pins/$PIN_ID/pepper" \
  -H "$JSON" -H "Authorization: Bearer $TOKEN" --data-binary @-
echo ""

echo "--- 6. Меняем остроту на 2 (без дублей)"
printf '{"heat":2}' | curl -sS -X PUT "$BASE/api/v1/pins/$PIN_ID/pepper" \
  -H "$JSON" -H "Authorization: Bearer $TOKEN" --data-binary @-
echo ""

echo "--- 7. Пин глазами автора"
curl -sS "$BASE/api/v1/pins/$PIN_ID" -H "Authorization: Bearer $TOKEN"
echo ""

echo "--- 8. Лента 'огонь'"
curl -sS "$BASE/api/v1/pins?sort=hot&size=3" -H "Authorization: Bearer $TOKEN"
echo ""

echo "--- 9. Фильтр по тегу 'острое' (URL-encoded)"
curl -sS "$BASE/api/v1/pins?tag=%D0%BE%D1%81%D1%82%D1%80%D0%BE%D0%B5&size=3"
echo ""

echo "--- 10. Пины доски"
curl -sS "$BASE/api/v1/boards/$BOARD_ID/pins"
echo ""

echo "--- 11. Мои перцы"
curl -sS "$BASE/api/v1/users/$USERNAME/peppered"
echo ""

echo "--- 12. Популярные теги"
curl -sS "$BASE/api/v1/tags?limit=5"
echo ""

echo "--- 13. Профиль со статистикой"
curl -sS "$BASE/api/v1/users/$USERNAME"
echo ""

echo "--- 14. Лента подписок"
curl -sS -o /dev/null -w "HTTP %{http_code}\n" "$BASE/api/v1/feed" -H "Authorization: Bearer $TOKEN"

echo "--- 15. Запись без токена запрещена (ожидаем 401)"
printf '{"imageUrl":"https://example.com/a.jpg"}' \
  | curl -sS -o /dev/null -w "HTTP %{http_code}\n" -X POST "$BASE/api/v1/pins" -H "$JSON" --data-binary @-

echo "--- 16. Невалидный пин (ожидаем 400)"
printf '{"title":"без картинки"}' | curl -sS -X POST "$BASE/api/v1/pins" \
  -H "$JSON" -H "Authorization: Bearer $TOKEN" --data-binary @-
echo ""

echo "--- Готово"
