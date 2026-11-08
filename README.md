# Vayal — Farm Machinery Rentals

React / Express / tRPC / Drizzle starter, adapted from the Sandbox web-db-user template.

- `pnpm dev`: development server; honors `PORT` (default 3000).
- `pnpm build` / `pnpm start`: build and serve `dist/index.js` and `dist/public/`.
- `pnpm db:migrate`: apply checked-in migrations. `pnpm db:push`: generate and apply new schema changes.
- `pnpm check` / `pnpm test`: types and application tests.

## Phone OTP configuration

Login phone verification uses the MSG91 OTP API. The server generates no OTP itself and never returns an OTP to the browser; MSG91 generates, delivers, expires and verifies the code.

Configure these environment variables in Vercel for **Production** and **Preview**:

- `MSG91_AUTH_KEY`: MSG91 account authentication key. Store as an encrypted/sensitive variable.
- `MSG91_OTP_TEMPLATE_ID`: ID of an approved MSG91 OTP template.

The MSG91 OTP template must include the `##OTP##` variable. For Indian delivery, complete the required Sender ID / DLT entity and template approvals in MSG91 before testing with real mobile numbers. The implementation sends a six-digit OTP with a five-minute expiry, enforces a 30-second resend cooldown and applies per-number / per-IP request throttles within each running server instance.

After adding or changing environment variables, redeploy the Vercel project. Without both MSG91 variables, the endpoint deliberately returns a configuration error; there is no fixed-code or development OTP bypass.

**Prototype limitation:** phone-number verification is real when MSG91 is configured, but this branch still stores profiles, machinery and booking flows in browser local storage. Phone verification alone does not make the marketplace's account and booking records server-persistent.

Platform integration values remain server-side. Private keys must not be placed in frontend code or public runtime configuration.
