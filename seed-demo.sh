#!/bin/sh
# Наполняет сайт демо-данными: пользователи, доски, пины, перцы и подписки.
# Запуск: sh seed-demo.sh [base_url]
# Картинки берутся с picsum.photos, поэтому для их показа нужен интернет.
# Пароль у всех демо-пользователей: demo-pepper-2026
set -eu

BASE="${1:-http://localhost:8080}"
PASSWORD="demo-pepper-2026"
JSON='Content-Type: application/json'

field() { grep -o "\"$1\":\"[^\"]*\"" | head -n 1 | cut -d'"' -f4; }

# регистрирует пользователя, а если он уже есть — входит; печатает токен
auth() {
  RESPONSE=$(printf '{"username":"%s","email":"%s@foldpapper.dev","password":"%s","displayName":"%s"}' "$1" "$1" "$PASSWORD" "$2" \
    | curl -sS -X POST "$BASE/api/v1/auth/register" -H "$JSON" --data-binary @-)
  TOKEN=$(printf '%s' "$RESPONSE" | field accessToken)
  if [ -z "$TOKEN" ]; then
    TOKEN=$(printf '{"login":"%s","password":"%s"}' "$1" "$PASSWORD" \
      | curl -sS -X POST "$BASE/api/v1/auth/login" -H "$JSON" --data-binary @- | field accessToken)
  fi
  test -n "$TOKEN" || { echo "Не удалось войти как $1: $RESPONSE" >&2; exit 1; }
  printf '%s' "$TOKEN"
}

call() { # method token url [body]
  if [ $# -ge 4 ]; then
    printf '%s' "$4" | curl -sS -X "$1" "$BASE$3" -H "$JSON" -H "Authorization: Bearer $2" --data-binary @-
  else
    curl -sS -X "$1" "$BASE$3" -H "Authorization: Bearer $2"
  fi
}

board() { # token title description
  call POST "$1" /api/v1/boards "$(printf '{"title":"%s","description":"%s"}' "$2" "$3")" | field id
}

pin() { # token board seed width height title description tags(json)
  call POST "$1" /api/v1/pins "$(printf '{"imageUrl":"https://picsum.photos/seed/%s/%s/%s","imageWidth":%s,"imageHeight":%s,"title":"%s","description":"%s","tags":%s,"boardId":"%s"}' \
    "$3" "$4" "$5" "$4" "$5" "$6" "$7" "$8" "$2")" | field id
}

pepper() { call PUT "$1" "/api/v1/pins/$2/pepper" "{\"heat\":$3}" > /dev/null; }

if [ "$(curl -s -o /dev/null -w '%{http_code}' "$BASE/api/v1/users/anna.chili")" = "200" ]; then
  echo "Демо-данные уже есть — пропускаю. Для чистого старта: docker compose down -v"
  exit 0
fi

echo "--- Пользователи"
ANNA=$(auth anna.chili "Анна Чили")
MARK=$(auth mark_salsa "Марк Сальса")
LENA=$(auth lena.paprika "Лена Паприка")
IGOR=$(auth igor_habanero "Игорь Хабанеро")

echo "--- Доски"
B_SAUCE=$(board "$ANNA" "Соусы, от которых плачут" "Домашние соусы разной степени коварства")
B_SNACK=$(board "$ANNA" "Закуски к вечеру" "Быстро, остро, на компанию")
B_TRAVEL=$(board "$MARK" "Острая Мексика" "Рынки, такерии и сальса на каждом углу")
B_GARDEN=$(board "$LENA" "Перцы на подоконнике" "Выращиваю чили дома — делюсь опытом")
B_DESIGN=$(board "$LENA" "Тёплые интерьеры" "Кухни цвета паприки и терракоты")
B_STREET=$(board "$IGOR" "Уличная еда" "Самое вкусное — на улице")

echo "--- Пины"
P1=$(pin "$ANNA" "$B_SAUCE" chili-sauce 600 900 "Шрирача за выходные" "Ферментируем красный чили 5 дней, потом блендер и сито." '["соусы","ферментация","острое"]')
P2=$(pin "$ANNA" "$B_SAUCE" salsa-verde 600 750 "Сальса верде" "Томатильо, халапеньо, кинза и лайм." '["соусы","мексика"]')
P3=$(pin "$ANNA" "$B_SNACK" jalapeno-honey 600 800 "Халапеньо в меду" "Закуска на 10 минут: перец, мёд, щепоть соли." '["закуски","острое","перец"]')
P4=$(pin "$ANNA" "$B_SNACK" spicy-nuts 600 600 "Орехи с копчёной паприкой" "Обжарить с маслом и паприкой, посолить горячими." '["закуски","паприка"]')
P5=$(pin "$MARK" "$B_TRAVEL" mexico-market 600 1000 "Рынок в Оахаке" "Сушёные чили всех цветов — от анчо до чипотле." '["путешествия","мексика","перец"]')
P6=$(pin "$MARK" "$B_TRAVEL" tacos-night 600 700 "Такос аль пастор" "Свинина с ананасом и много сальсы." '["мексика","уличнаяеда"]')
P7=$(pin "$MARK" "$B_TRAVEL" mezcal-bar 600 850 "Бар с мескалем" "Мескаль с солью из червячков и долькой апельсина." '["путешествия","мексика"]')
P8=$(pin "$LENA" "$B_GARDEN" chili-plant 600 900 "Хабанеро на подоконнике" "Второй урожай за сезон, куст почти метровый." '["сад","перец","хабанеро"]')
P9=$(pin "$LENA" "$B_GARDEN" seedlings 600 650 "Рассада в феврале" "Сеем в торфяные таблетки, досвечиваем фитолампой." '["сад","рассада"]')
P10=$(pin "$LENA" "$B_DESIGN" terracotta-kitchen 600 800 "Кухня цвета терракоты" "Тёплые стены, латунь и открытые полки со специями." '["интерьер","кухня"]')
P11=$(pin "$LENA" "$B_DESIGN" spice-shelf 600 1100 "Полка для специй" "Одинаковые баночки и рукописные этикетки." '["интерьер","специи"]')
P12=$(pin "$IGOR" "$B_STREET" ramen-fire 600 750 "Огненный рамен" "Бульон тонкоцу, масло чили и маринованное яйцо." '["уличнаяеда","азия","острое"]')
P13=$(pin "$IGOR" "$B_STREET" bbq-wings 600 600 "Крылышки буффало" "Классика: масло, острый соус, соус блю чиз." '["уличнаяеда","острое"]')
P14=$(pin "$IGOR" "$B_STREET" kimchi 600 900 "Кимчи дома" "Пекинская капуста, кочукару и терпение." '["ферментация","азия"]')
P15=$(pin "$MARK" "$B_TRAVEL" dried-chili 600 950 "Связки сушёного чили" "Так их продают на юге Мексики." '["перец","путешествия"]')
P16=$(pin "$ANNA" "$B_SAUCE" harissa 600 700 "Харисса" "Запечённый перец, тмин, кориандр и чеснок." '["соусы","острое"]')

echo "--- Перцы"
for P in $P1 $P3 $P5 $P8 $P12 $P13; do pepper "$MARK" "$P" 5; pepper "$LENA" "$P" 4; done
for P in $P2 $P6 $P10 $P14 $P16; do pepper "$IGOR" "$P" 3; pepper "$ANNA" "$P" 2; done
for P in $P4 $P7 $P9 $P11 $P15; do pepper "$LENA" "$P" 1; pepper "$IGOR" "$P" 2; done
pepper "$ANNA" "$P12" 5
pepper "$IGOR" "$P1" 5

echo "--- Подписки и сохранения"
for WHO in "$MARK" "$LENA" "$IGOR"; do call PUT "$WHO" /api/v1/users/anna.chili/follow > /dev/null; done
call PUT "$ANNA" /api/v1/users/lena.paprika/follow > /dev/null
call PUT "$ANNA" /api/v1/users/igor_habanero/follow > /dev/null
call PUT "$ANNA" "/api/v1/boards/$B_SNACK/pins/$P13" > /dev/null
call PUT "$LENA" "/api/v1/boards/$B_DESIGN/pins/$P5" > /dev/null

echo "--- Готово. Войти можно как anna.chili / $PASSWORD"
