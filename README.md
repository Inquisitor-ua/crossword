# Генератор кроссвордов

Веб-приложение для автоматической генерации кроссвордов по списку слов и описаний.

**Стек:** Django, Vue 3, HTML, CSS, JavaScript

## Запуск

```bash
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

Откройте в браузере: http://127.0.0.1:8000/

## Как пользоваться

1. Введите слова и описания (вопросы) в форму.
2. Нажмите «Сгенерировать кроссворд».
3. Слева появится сетка, справа — списки определений «По горизонтали» и «Пo вертикали».

Кнопка «Пример» загружает набор русских слов для быстрой проверки.

После генерации появится **ссылка на кроссворд** — её можно скопировать и отправить другому человеку. По адресу вида `/c/<uuid>/` откроется сохранённый кроссворд с теми же словами и сеткой.

## Структура проекта

```
crossword/
├── crossword_project/   # настройки Django
├── generator/
│   ├── crossword.py     # алгоритм генерации сетки
│   ├── views.py         # API и главная страница
│   └── urls.py
├── templates/
│   └── index.html       # Vue-приложение
├── static/
│   ├── css/style.css
│   └── js/app.js
└── manage.py
```

## API

`POST /api/generate/`

```json
{
  "words": [
    {"word": "PYTHON", "clue": "Язык программирования"},
    {"word": "HTML", "clue": "Язык разметки"}
  ]
}
```

Ответ содержит сетку (`grid`), списки подсказок (`across_clues`, `down_clues`), статистику размещения, а также `id` и `share_url`.

`GET /api/crossword/<uuid>/` — получить сохранённый кроссворд по ссылке.

`GET /c/<uuid>/` — страница с кроссвордом для sharing.

## Деплой на VPS (Linux)

### 1. Что поменять перед выкладкой

Скопируйте `.env.example` в `.env` и задайте значения:

| Переменная | Что указать |
|---|---|
| `DJANGO_SECRET_KEY` | Случайная строка (сгенерировать командой ниже) |
| `DJANGO_DEBUG` | `False` |
| `DJANGO_ALLOWED_HOSTS` | `crossword.yehor-inq.com` |
| `DJANGO_CSRF_TRUSTED_ORIGINS` | `https://crossword.yehor-inq.com` |

Сгенерировать секретный ключ:

```bash
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```

Домен настраивается **только в `.env`** — в коде менять ничего не нужно. Ссылки для sharing (`share_url`) формируются автоматически из домена запроса.

### 2. Установка на сервере

```bash
# Клонировать/скопировать проект на сервер
cd /var/www/crossword

python3 -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate

pip install -r requirements.txt
cp .env.example .env              # отредактировать .env
python manage.py migrate
python manage.py collectstatic --noinput
```

### 3. Запуск (Gunicorn)

```bash
source venv/bin/activate
gunicorn crossword_project.wsgi:application --bind 0.0.0.0:8000 --workers 2
```

Или с портом из `.env`:

```bash
gunicorn crossword_project.wsgi:application --bind 0.0.0.0:${PORT:-8000} --workers 2
```

Проверка: откройте `http://IP_СЕРВЕРА:8000`.

### 4. Nginx + HTTPS (рекомендуется)

Готовый конфиг: `deploy/nginx.conf` (домен `crossword.yehor-inq.com`):

```bash
sudo cp deploy/nginx.conf /etc/nginx/sites-available/crossword
sudo ln -s /etc/nginx/sites-available/crossword /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

SSL через Certbot:

```bash
sudo certbot --nginx -d crossword.yehor-inq.com
```

### 5. Автозапуск через systemd

Готовый unit-файл: `deploy/crossword.service`

```bash
sudo cp deploy/crossword.service /etc/systemd/system/crossword.service
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable crossword
sudo systemctl start crossword
```

### Локальная разработка

Без `.env` проект работает как раньше (`DEBUG=True`, localhost). Для локального теста production-режима создайте `.env` с `DJANGO_DEBUG=False` и своим доменом.
