# Repository Guidelines

## Project Structure & Module Organization
- App: `src/app` (Next.js App Router, pages & `api/*` routes), global styles in `src/app/globals.css`.
- UI: `src/components` (React components), `src/components/ui` for primitives.
- Core libs: `src/lib` (auth, db, services). Drizzle schema at `src/lib/db/schema.ts`; client in `src/lib/db/index.ts`.
- Types: `src/types`. Hooks: `src/hooks`.
- Browser extension: `extension/` (MV3 manifest, core, plugins, ui).
- Scripts: `scripts/` (maintenance, data fixes, storage tests).
- Assets: `public/`. Migrations output: `drizzle/migrations/`. Dev DB: `dev.db`.

## Build, Test, and Development Commands
- `npm run dev` ? Start Next.js dev server (Turbopack).
- `npm run build` ? Production build.
- `npm run start` ? Start production server.
- `npm run lint` ? Run Next/ESLint checks.
- Database (Drizzle): `npm run db:generate`, `db:migrate`, `db:push`, `db:studio`.
- Examples: `npm run db:push` (init local SQLite), `npm run db:studio` (inspect schema).

## Coding Style & Naming Conventions
- Language: TypeScript (strict). Path alias `@/*` (see `tsconfig.json`).
- Indentation: 2 spaces; prefer named exports.
- React: functional components; components in `src/components` use PascalCase; routes and API folders are lowercase.
- Styling: Tailwind CSS 4 via PostCSS. Keep class lists readable (group by layout/spacing/typography).
- Linting: `next lint`; fix small issues before committing.

## Testing Guidelines
- No unit test suite is enforced yet. Validate critical flows manually:
  - API routes under `src/app/api/*`
  - Editor and publish flows in the app
  - Extension behavior on supported hosts
- If adding tests, colocate as `*.test.ts(x)` near source or under `tests/`.

## Commit & Pull Request Guidelines
- Commit style: use short, typed prefixes seen in history: `feat:`, `fix:`, `chore:`, `refactor:`, `update:`. Keep subject imperative and concise.
- PRs must include: purpose, scope, screenshots for UI changes, test/verify steps, DB/migration notes, and linked issues.
- For DB changes, include Drizzle migration output and indicate required env vars.

## Security & Configuration Tips
- Copy `.env.example` to `.env.local`. Do not commit secrets.
- Local dev uses SQLite (`dev.db`). Prod uses Turso (LibSQL) and R2/S3-compatible storage.
- Next public URLs: `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_API_BASE_URL`. Ensure extension host permissions stay in sync with domains.

