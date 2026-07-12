# Smart Wedding Experience Platform

QR-based wedding experience app — digital invitations with RSVP, QR entrance control, table moments (photo/message/voice uploads), live memory wall, and after-wedding archive. Pilot event: Mohammad & Renad, July 25 2026, Tal Pine Amman. Built from `Smart_Wedding_Experience_Functional_Requirements.docx_2421.docx`.

## Run & Operate

- API server: `DATABASE_URL=postgres://postgres:postgres@localhost:5432/wedding PORT=5000 pnpm --filter @workspace/api-server run dev`
- Frontend: `pnpm --filter @workspace/wedding-invitation run dev` (port 3000, proxies `/api` + `/uploads` to port 5000; override with `API_URL`)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only; needs `DATABASE_URL`)
- Required env: `DATABASE_URL` (Postgres). Optional: `ADMIN_PASSWORD`, `GUARD_PASSWORD` (seed), `PUBLIC_BASE_URL` (QR link base), `UPLOADS_DIR` (media dir, defaults to `./uploads` under the server cwd)

### Default accounts (seeded on first boot)

- `admin` / `admin2026` — full dashboard (`/admin`)
- `guard` / `guard2026` — entrance scanner (`/scanner`)

## App routes

- `/` — public invitation (envelope + wax seal animation, addressed "To Our Beloved Guests")
- `/i/:token` — personalized invitation: envelope hand-addressed "Dear {firstName}", greeting with seats reserved, functional RSVP with count picker + celebration burst, table finder, Nuqoot section (CliQ alias `MAGHATHE7` with copy button)
- `/scanner` — guard check-in: camera QR scan + manual entry, allowed/checked-in/remaining counts, extra-guest override with mandatory note (audit logged)
- `/admin` — dashboard: metrics, guest CRUD + CSV import/export + WhatsApp share + QR download, tables + table QR cards, moderation queue, event settings (auto-approve, guestbook visibility, archive mode)
- `/t/:tableToken` — table moments: upload photo/video, leave message, record voice note (≤60s), view program
- `/wall` — projector live wall: approved photos + wishes, auto-refresh (8s poll), rotates every 9s
- `/memories` — after-wedding thank-you + approved album + guestbook; invitation links redirect here when event status = `archived`

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5 (`artifacts/api-server`) — multer uploads (type/size limits), server-side QR (`qrcode`), scrypt password hashing, bearer-token sessions in DB
- DB: PostgreSQL + Drizzle ORM (`lib/db/src/schema/*` — events, users, sessions, invitations, checkins, tables, memory_uploads, guestbook_messages)
- Frontend: Vite + React 19 + wouter + TanStack Query + framer-motion + Tailwind 4 (`artifacts/wedding-invitation`)
- QR scanning in browser: `html5-qrcode` (needs HTTPS or localhost for camera)

## Where things live

- DB schema (source of truth): `lib/db/src/schema/`
- API routes: `artifacts/api-server/src/routes/` (`auth`, `public`, `scanner`, `uploads`, `admin`)
- Seed data (pilot event, accounts, sample guests/tables): `artifacts/api-server/src/lib/seed.ts`
- Frontend pages: `artifacts/wedding-invitation/src/pages/` (Home = invitation, Scanner, Admin, Wall, TableMoments, Memories)
- Frontend API client + session helpers: `artifacts/wedding-invitation/src/lib/api.ts`

## Architecture decisions

- Single-event pilot: all public endpoints resolve "the first event" — multi-event support means threading eventId/slug through, schema already has it.
- QR codes contain only the public URL with an opaque token (`/i/<token>`, `/t/<token>`); tokens are 128-bit base64url, never personal data. The scanner accepts full URLs or bare tokens.
- Check-ins are append-only audit records (count, scanner user, override flag, note); "checked in" totals are summed live.
- Uploads go to local disk (`uploads/`, gitignored) served at `/uploads`; swap `lib/storage.ts` for S3/R2 later.
- All guest content defaults to `pending`; only approved items reach the wall/archive. `autoApprove` event flag skips the queue.
- Sessions are DB-backed bearer tokens (7-day TTL). Admin role passes every role check server-side.

## Localization & typography

- The invitation is fully bilingual. `/i/<token>` is English; `/i/<token>?lang=ar` is Arabic with RTL layout. Guests can switch via the corner toggle; admins pick AR/EN per share (WhatsApp/copy buttons in the guest table).
- All invitation copy lives in `src/lib/i18n.ts` (`t(lang, key)`); Arabic couple names are `coupleGroom`/`coupleBride` there.
- One font voice across scripts: Cormorant Garamond + Amiri (body), Great Vibes + Aref Ruqaa (script display). `[dir='rtl']` CSS kills letter-spacing (tracking breaks Arabic joining).
- Invitation type scale (5 roles): display `text-5xl→7xl` (names only) · heading `text-3xl→4xl` · subheading `text-xl→2xl` · body `text-sm→base` · label `text-[10px]→xs tracking-[0.22em]`.

## Design system (July 2026 redesign)

- Palette is derived from the watercolor garland artwork (`artifacts/wedding-invitation/public/garland.svg`, ground #F9F3F3): dusty rose `#D48A96`, deep rose `#B25A6C`, rosewood `#8F4557`, plum ink `#45383C`, blush page `#F3E4E2`, sage secondary. Dark screens (wall/scanner) use deep plum `#251A1E`/`#2A1E23`/`#372930`.
- The garland renders full-width at the top of the invitation/memories cards and vertically mirrored (`<Garland flip />`) at the bottom.
- Falling petals (`FallingPetals` in `src/components/Florals.tsx`) are watercolor-toned with 3 depth layers (size/speed/blur parallax).
- Wax seal (`WaxSealSVG` in Home.tsx) is crimson wax with engraved M&R; envelope is a blush X-fold with the card hidden inside that rises out on open.

## Notes

- Workspace was pruned (July 2026): removed mockup-sandbox, lib/api-spec, lib/api-client-react, unused shadcn components (only card/toast/toaster/tooltip remain), and unused assets. `lib/api-zod` stays (health route uses it).
- CliQ nuqoot alias is the `CLIQ_ALIAS` constant in `src/pages/Home.tsx`.
- Headless Edge `--screenshot` renders these pages with a false right-edge clip; use playwright-core with `channel: 'msedge'` for accurate screenshots.

## Gotchas

- Windows: drizzle-kit needs forward slashes in schema path (handled in `lib/db/drizzle.config.ts`).
- The scanner page dev script assumed a POSIX shell; `dev` scripts are now cross-platform (no `export`).
- CSV export is auth'd via `?session=<token>` query param (browsers can't send headers on `<a download>`).
- Camera scanning requires HTTPS in production (localhost is exempt in dev).
- Freeze deployments the day before the wedding; export the printed guest list as entrance fallback.

## Pointers

- Requirements doc: `Smart_Wedding_Experience_Functional_Requirements.docx_2421.docx` (repo root)
- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
