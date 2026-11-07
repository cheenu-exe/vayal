# Vayal — AgriMach MVP

Voice-first agricultural machinery booking marketplace for Tamil Nadu.

## MVP features
- Farmer machinery catalogue and booking requests
- GPS coordinates or village/landmark-based location capture
- Machinery owner listings and booking decisions
- Tamil/English text booking assistant (deterministic prototype; not an LLM)
- FastAPI backend with SQLite for local development and PostgreSQL for deployment

## Run locally on Windows
1. Install Python 3.12+.
2. Clone or download this repository.
3. Run `run_windows.bat`.
4. Open http://127.0.0.1:8000.

By default, local development uses SQLite and creates `vayal.db` in the project root.

## Run locally with PostgreSQL
1. Copy `.env.example` to `.env`.
2. Replace the placeholder with your PostgreSQL connection URL.
3. Install dependencies and run the app:

```powershell
python -m venv .venv
.venv\\Scripts\\Activate.ps1
python -m pip install -r requirements.txt
uvicorn app.main:app --reload
```

The application selects PostgreSQL whenever `DATABASE_URL` is set. If it is not set, it uses local SQLite. Never commit a real database URL or password.

## Deploy to Vercel + Neon
1. Create a PostgreSQL database in Neon.
2. In Neon, open **Connect**, select the branch, database and role, and copy the **pooled** connection string. Keep `sslmode=require` and `channel_binding=require` if Neon includes them.
3. Import this GitHub repository into Vercel. Keep the project root at the repository root.
4. In Vercel, open **Project → Settings → Environment Variables**.
5. Add `DATABASE_URL` with the Neon pooled connection string for **Production**, **Preview**, and **Development** as needed.
6. Redeploy after adding or changing the environment variable.

Vercel detects the FastAPI application through `app/index.py`. No custom build command is required for this project.

The first application startup creates the required tables and adds illustrative sample machine listings if the machines table is empty. Do not treat those sample listings or rates as real offers.

## Database behavior
- `DATABASE_URL` set: PostgreSQL via Psycopg 3.
- `DATABASE_URL` absent: SQLite for local development.
- On Vercel, `DATABASE_URL` is mandatory. The app deliberately refuses to fall back to SQLite because Vercel's function filesystem is not durable.

## API
- `GET /api/health`
- `GET /api/machines`
- `POST /api/machines`
- `POST /api/bookings`
- `GET /api/bookings`
- `PATCH /api/bookings/{booking_id}`
- `POST /api/assistant/message`
- Interactive API docs: `/docs`

## Important limitations
This is an early local MVP, not production-ready. It has no user authentication, payment processing, verified providers, production-grade authorization, telephony integration, or live STT/LLM/TTS. The assistant is a rules-based conversation scaffold. Do not enter real personal data or expose it publicly before implementing authentication, authorization, validation, rate limiting, logging controls, backups, and a privacy policy.

All booking prices and availability must come from the backend/database, never be invented by an LLM.
