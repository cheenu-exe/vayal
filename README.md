# Vayal — Farm Machinery Marketplace

Vayal connects farmers who need agricultural machinery with local equipment owners who can provide it.

## Product flow

1. Choose an account type: **Farmer** or **Machinery Owner**.
2. Sign up or sign in using a mobile number and password.
3. Enter the workspace designed for that account type.

### Farmer workspace
- Browse available machinery by equipment type, village and district.
- Submit a booking request with acreage, date and field location details.
- Optionally share browser GPS coordinates.
- Track requests and cancel pending requests.

### Machinery Owner workspace
- Register and manage your own machinery listings.
- Set a per-acre service rate and availability.
- Review requests that match your listed equipment type and district.
- Accept a request by assigning one of your own matching machines, or decline it.

## Authentication and access control

- Passwords are stored as salted PBKDF2-HMAC-SHA256 hashes; plaintext passwords are never stored.
- The server issues an HTTP-only session cookie.
- Farmer booking history and owner inventory are filtered by authenticated account.
- Role checks are enforced by the API, not just by hiding frontend screens.
- Sign-in is currently password-based. SMS OTP, phone-number verification, password reset and multi-factor authentication are not implemented yet.

## Run locally on Windows

1. Install Python 3.12+.
2. Clone this repository.
3. Run `run_windows.bat`.
4. Open http://127.0.0.1:8000.

Without `DATABASE_URL`, the app uses SQLite in the project directory and adds illustrative sample machinery listings for local testing.

## Run locally with PostgreSQL

1. Copy `.env.example` to `.env`.
2. Set `DATABASE_URL` to your PostgreSQL connection string.
3. Install dependencies and run:

```powershell
python -m venv .venv
.venv\\Scripts\\Activate.ps1
python -m pip install -r requirements.txt
uvicorn app.main:app --reload
```

## Deploy to Vercel + Neon

1. Use a dedicated Neon database for Vayal.
2. Add its pooled connection string as `DATABASE_URL` in Vercel.
3. Set the variable for Production, Preview and Development as required.
4. Redeploy after changing environment variables.

The Vayal PostgreSQL schema is provisioned separately from the runtime role. The runtime `vayal_app` role should have read/write access to Vayal's tables, but should not have schema-creation privileges. The application verifies that the schema exists during startup.

Never commit database credentials or passwords.

## API

- `GET /api/health`
- `POST /api/auth/signup`
- `POST /api/auth/signin`
- `POST /api/auth/signout`
- `GET /api/me`
- `GET /api/machines`
- `GET /api/my/machines` (machinery owner)
- `POST /api/machines` (machinery owner)
- `PATCH /api/machines/{machine_id}/availability` (machinery owner)
- `POST /api/bookings` (farmer)
- `GET /api/bookings` (role-filtered)
- `PATCH /api/bookings/{booking_id}` (role-checked)
- Interactive API docs: `/docs`

## Not yet included

This is an MVP, not a production-ready marketplace. It does not yet include SMS OTP, password recovery, payment collection, identity or machinery verification, telephony, live Tamil speech recognition or text-to-speech, dispute resolution, availability calendars, transport/mobilisation pricing, or production-grade rate limiting and audit monitoring. Confirm real machinery, prices and availability with the owner before relying on a booking.

Booking acceptance is not a substitute for a service agreement between the farmer and machinery owner.
