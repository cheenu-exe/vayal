# Vayal — Role-Based Frontend Prototype Plan

## Scope and implementation approach

This plan supersedes the earlier backend-backed interface direction. Rework Vayal as a polished, fully navigable frontend product prototype using the existing React 19, TypeScript, Vite and Wouter client and the Manus Preview dev server. Demonstration authentication, role profiles, machinery, booking requests, verification states and earnings use a versioned browser-local store (`localStorage`) only. The documented six-digit demo code is `123456`; it does not send SMS or verify a real phone number. New role profiles pass through a role-specific completion step. Seeded demo Farmer and Owner accounts expose illustrative sample data; the Help Center offers a local demo reset.

Keep the new prototype model in `client/src/prototype/` and `client/src/contexts/PrototypeContext.tsx`, independent of the existing tRPC and server/database integration. Remove the unused tRPC/auth client and platform-config script from the active React/HTML bootstrap, so prototype flows do not issue service requests. Leave the pre-existing Express/API/Drizzle files and records untouched and inactive from the prototype UI. Do not add a production backend, database migration/write, real authentication, SMS service, payment gateway, live booking service, or GPS/geofencing integration.

Farm Holder journeys include the dashboard; machinery search by machine/category and village, town, district or PIN; price, approximate distance, availability and machine-type filters; eight equipment categories; machine photos, owner, availability, operating area, price and clearly simulated verification details; machine information and calendar; date/time/duration/location/instructions form; review summary; My Bookings and local status tracking. The on-site demo lets a Farmer confirm presence and share the booking OTP, then lets the Owner/operator enter it. Show that typed addresses, manually clicked confirmations and the demo OTP do not prove physical presence or GPS/geofence location.

Machinery Owner journeys include a metrics dashboard; inventory editing, price/availability changes and listing pause/resume; booking-request review with farmer, machine, farm location, date/time, duration, estimate, status, Accept and Reject; verification details and reasons; booking confirmation and operator OTP/location step; and illustrative, non-withdrawable earnings. Registration is a six-step wizard: (1) basic machine identity/category, manufacturer, model, year and identifier; (2) capacity, specifications, condition, applicable fuel and description; (3) required front, side and rear photos plus optional additional photos; (4) relevant supporting documents, with vehicle-specific certificates explicitly conditional; (5) hourly/daily prices, operator, service area, availability and transport estimate; and (6) review/submit to simulated verification. Compress and store photo previews locally (maximum eight per listing); store only document filenames and sizes. Do not upload documents or claim a real review. Detail galleries show only unique images; when a seeded fixture has one sample photo, do not repeat it to imply other views. A newly created listing stays hidden from Farmer discovery until its demo review status is Verified.

## Navigation and project structure

- `client/src/App.tsx`: provider tree and the public routes `/`, `/start`, `/auth/:role`, `/machines`, `/machine/:id`; Farm Holder routes `/farmer`, `/farmer/find`, `/farmer/bookings`, `/farmer/bookings/:id`, `/farmer/bookings/:id/verify`; Machinery Owner routes `/owner`, `/owner/machinery`, `/owner/machinery/new`, `/owner/machinery/:id`, `/owner/requests`, `/owner/requests/:id/verify`, `/owner/verification`, `/owner/earnings`; and shared `/profile` and `/help`.
- `client/src/prototype/`: typed local fixtures, machine/booking/status models, dates and formatting, plus local photo compression.
- `client/src/contexts/PrototypeContext.tsx`: browser-local persistence, demo sign-in/profile actions, owner and Farmer role checks, booking transitions and local review states.
- `client/src/components/`: responsive public/role-aware navigation, role gate, shared page headings, machine cards and status indicators.
- `client/src/pages/`: public landing and role selection/auth; Farm Holder discovery, machine detail, bookings and on-site OTP; Machinery Owner dashboard, inventory, six-step registration, requests, verification and earnings; profile and Help Center.
- `client/src/index.css`, `client/public/fonts/`: Base-UI design tokens, responsive page/component styling and the supplied local Inter Regular/Medium/SemiBold/Bold fonts.
- `client/public/manus-routes.json`: exact route patterns declared by the app; exclude APIs/system and 404-only paths.
- `client/index.html`, `client/src/main.tsx`: minimal local-only app bootstrap, metadata, and styling entry.
- `plan.md`, `TODO.md`: implementation decisions and the full product outcome clauses.

## Base-UI visual direction

Use the user's `Base-UI.zip` as the primary visual reference, especially its home, machinery, owner, requests and owner-registration screenshots and its `SKILL.md`, `DESIGN.md`, `VISUAL_GUIDE.md`, `COMPONENTS.md`, `LAYOUT.md`, `INTERACTIONS.md` and `ANIMATIONS.md`. Reuse the supplied local Inter font files (Regular, Medium, SemiBold, Bold). Preserve the Vayal wordmark/sprout-furrow motif, Tamil Nadu agricultural context, warm light surfaces, field-green typography, thin rules, small uppercase overlines, original machinery photos, warm gold CTAs, tactile cards and responsive quality. Redesign the information architecture for a public landing page, distinct role selection/authentication, and dedicated Farmer/Owner workspaces; do not just rearrange the previous pages.

- **Design Movement:** Editorial rural-services marketplace from the supplied Vayal/Base-UI reference; clean, light, locally grounded and information-forward.
- **Core Principles:** Preserve pricing/status clarity; make role journeys obvious; keep prototype claims honest; keep controls accessible and responsive.
- **Color Philosophy:** White and warm `#f7f3eb` surfaces frame primary `#292923`; muted field green `#587a54` and its green family signal agriculture and trust; warm `#ead9ae` and reference gold `#e49a2b` highlight key actions and status cues. Use the supplied palette, not gradients or blur.
- **Layout Paradigm:** Slim utility strip and centered nav, broad editorial landing hero, dedicated dashboard hierarchies, responsive machinery cards and a labeled six-step form with a vertical stepper and focused content stage.
- **Signature Elements:** Sprout/furrow mark; fine field-row illustration lines; uppercase location/category labels and warm-gold status chips.
- **Interaction Philosophy:** Disclose the demo before simulated OTP, booking, document review and on-site confirmation; actions provide local success/error feedback; no fake network waits or unearned verification/GPS badges.
- **Animation:** Follow restrained 0.18s control transitions and 0.2–0.4s page/state fades; disable movement under `prefers-reduced-motion`; no blur or looping decoration.
- **Typography System:** Supplied local Inter for Latin UI; 48/32/24px display hierarchy and 16/12px body/captions, responsive down on small screens; platform Tamil fallback for Tamil glyphs.
- **Brand Essence:** Local machinery access without ownership for Farm Holders, and a clear way to receive demand for Machinery Owners; practical, warm, transparent.
- **Brand Voice:** Direct, reassuring and honest about the prototype. Examples: “Find the machine your fieldwork needs.” “Demo OTP only — no SMS will be sent.”
- **Wordmark & Logo:** Keep the supplied Vayal wordmark and sprout/furrow symbol; pair with `வயல்` where the reference shows the Tamil name.
- **Signature Brand Color:** Field green `#436541` paired with Vayal's warm gold.

## Serving and constraints

Use the configured port 3000 and relative app-origin URLs. Keep the website unpublished and inside Manus Preview/local development. Do not connect GitHub/Vercel, provision external paid services, add SMS/payment/production authentication, implement GPS/geofencing, or add new backend/database behavior. The full prototype must work from local browser mock state and explicitly explain that it does not send data to an owner or provider. Do not alter existing database schemas or records. Keep the route manifest synchronized and run the existing TypeScript, unit and production-build checks after UI changes.
