# Crossword Generator

A full-stack web application for generating interactive crossword puzzles from user-provided words and clues. The project combines a Django backend with a Vue 3 frontend to deliver a responsive experience for creating, solving, and sharing crosswords.

## Project Overview

This application allows users to:

- Enter multiple words and clue descriptions
- Generate a crossword grid automatically
- View numbered across and down clues
- Solve the puzzle directly in the browser
- Save and share generated crosswords through a unique public link

It was built as a practical portfolio project to demonstrate end-to-end web development skills, including backend logic, frontend interaction, API design, data persistence, and deployment preparation.

## Tech Stack

- Python 3.13 with Django
- Vue 3
- HTML, CSS, and JavaScript
- SQLite for local development
- Docker Compose and Nginx for containerized deployment

## Main Features

- Automatic crossword generation based on a set of words and clues
- Validation for input quality and crossword feasibility
- Interactive solving interface with letter-by-letter input
- Shareable puzzle URLs for public access
- REST-style API endpoints for generation and retrieval

## Project Structure

```text
crossword/
├── crossword_project/   # Django project settings and URL routing
├── generator/           # crossword generation logic, views, and API endpoints
├── templates/           # frontend HTML templates
├── static/              # CSS and JavaScript assets
├── manage.py            # Django management entry point
└── docker-compose.yml   # containerized deployment configuration
```

## Local Development

### 1. Create environment variables

Copy the example environment file and adjust values if needed:

```bash
copy .env.example .env
```

### 2. Install dependencies

```bash
pip install -r requirements.txt
```

### 3. Apply database migrations

```bash
python manage.py migrate
```

### 4. Run the development server

```bash
python manage.py runserver
```

Open the application at:

```text
http://127.0.0.1:8000/
```

## API

### Generate a crossword

Endpoint:

```text
POST /api/generate/
```

Example payload:

```json
{
  "words": [
    {"word": "PYTHON", "clue": "Programming language"},
    {"word": "DJANGO", "clue": "Python web framework"}
  ]
}
```

The response includes the generated crossword grid, clue lists, placement statistics, and a shareable puzzle identifier.

### Retrieve a saved crossword

```text
GET /api/crossword/<uuid>/
```

```text
GET /c/<uuid>/
```

## Deployment

The project is prepared for containerized deployment using Docker and Nginx. A production-style setup is defined in the repository configuration files.

```bash
docker network create edge   # once per server, shared with ../splitbot too
docker compose up -d --build
```

This stack publishes no ports to the host — it's only reachable through the
shared `edge` Docker network, from the main reverse proxy in
`../nginx-proxy/`, which terminates TLS (Cloudflare Origin CA certificate)
and routes `crossword.yehor-inq.com` to this project's own nginx container.
See `../nginx-proxy/README.md` for the full server setup.

## Resume Summary

This project demonstrates practical experience in building a full-stack web application from concept to deployment, with a focus on Django backend development, interactive frontend behavior, API integration, and production-ready containerization.
