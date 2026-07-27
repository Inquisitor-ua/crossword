#!/bin/sh
set -e

mkdir -p /app/staticfiles
chmod -R 0777 /app/staticfiles

python manage.py collectstatic --no-input
python manage.py migrate --no-input
exec python -m gunicorn --bind 0.0.0.0:8000 --workers 3 crossword_project.wsgi