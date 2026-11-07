# Vayal — AgriMach MVP

Voice-first agricultural machinery booking marketplace for Tamil Nadu.

## MVP features
- Farmer machinery catalogue and booking requests
- GPS coordinates or village/landmark-based location capture
- Machinery owner listings and booking decisions
- Tamil/English text booking assistant (deterministic prototype; not an LLM)
- SQLite persistence and FastAPI API

## Run on Windows
1. Install Python 3.11+
2. Extract/clone this repository.
3. Run `run_windows.bat`.
4. Open http://127.0.0.1:8000

## Run manually
```bash
python -m venv .venv
# Windows: .venv\\Scripts\\activate
# macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

API docs: http://127.0.0.1:8000/docs

## Demo
The database is initialized on first run with sample listings. Sample contact data and prices are illustrative only. Do not treat demo listings as real offers.

## Important limitations
This is an early local MVP, not production-ready. It has no user authentication, payment processing, verified providers, production-grade authorization, telephony integration, or live STT/LLM/TTS. The assistant is a rules-based conversation scaffold. Do not enter real personal data or expose it publicly before implementing authentication, authorization, validation, rate limiting, logging controls, and a privacy policy.

## Planned integrations
- Tamil STT: evaluate AI4Bharat IndicConformer on consented field recordings
- LLM: integrate a tool-calling model behind a backend service
- TTS: integrate a Tamil-capable speech synthesis service
- Telephony: integrate a provider such as Exotel after obtaining credentials

All booking prices and availability must come from the backend/database, never be invented by an LLM.
