# Deployment guide

Two supported modes:

- **Mode A — Public synthetic demo.** No database, no account, no writes. This is the default and the fastest way to publish.
- **Mode B — Research workspace.** Adds Supabase Postgres with RLS. Authentication UI is not included in the public release; treat Mode B as infrastructure-ready, not a validated multi-tenant clinical service.

---

## 1. Prerequisites

- Node.js ≥ 20.9 (CI uses Node 22).
- A GitHub account and repository.
- A Vercel account for permanent hosting (optional for a temporary preview).
- Supabase project only for Mode B.

The repository root contains multiple deliverables. **Vercel's Root Directory must be `amr-pulse`.**

---

## 2. Local production check

```bash
cd amr-pulse
npm ci
npm run typecheck
npm run lint
npm test
npm run build
npm start
```

Open <http://localhost:3000>. Then, in a second terminal:

```bash
PLAYWRIGHT_CHANNEL=chrome npm run test:e2e
```

On a CI machine, install Playwright's browser first:

```bash
npx playwright install --with-deps chromium
npm run test:e2e
```

Required checks before publishing:

- [ ] `/` renders the synthetic-demo landing page.
- [ ] `/dashboard` shows 147 eligible pairs for the primary pairing.
- [ ] `/analysis` runs with organism/antibiotic filters.
- [ ] `/investigations` opens the review workbench.
- [ ] `/reports` downloads Markdown and JSON.
- [ ] `/api/manifest` returns dataset type `SYNTHETIC` and disclaimer text.
- [ ] `/api/ai/chat` works in deterministic mode without a key.

---

## 3. Environment variables

Copy `amr-pulse/.env.example` to `amr-pulse/.env.local` for local use.

| Variable | Server/client | Required | Notes |
| --- | --- | --- | --- |
| `AI_PROVIDER` | server | no | `openai-compatible` or `anthropic` |
| `AI_API_KEY` | server | with provider | Never expose; never commit |
| `AI_MODEL` | server | with provider | Provider model ID |
| `AI_BASE_URL` | server | no | Override provider endpoint |
| `AI_REQUESTS_PER_HOUR` | server | no | Default 30 per client |
| `NEXT_PUBLIC_SITE_URL` | public | recommended | Canonical production URL |
| `NEXT_PUBLIC_SUPABASE_URL` | public | Mode B | Safe for RLS-protected reads |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | public | Mode B | Safe for RLS-protected reads |
| `SUPABASE_SERVICE_ROLE_KEY` | **server only** | Mode B | Never expose or prefix with `NEXT_PUBLIC_` |

The demo does not need any of these. AI is optional and falls back deterministically.

---

## 4. GitHub

```bash
# from the repository root (contains README.md, amr-pulse/, AMR-PULSE-RESEARCH/, marketing/)
git init
git add .
git commit -m "feat: AMR PULSE research intelligence platform with synthetic demo"
gh repo create ua6546830-ai/amr-pulse --public --source=. --remote=origin --push
```

CI runs automatically:

- typecheck
- ESLint
- Vitest (40 tests)
- production build
- Playwright e2e (3 journeys)

Check the Actions tab before deploying.

> Raw BV-BRC extracts (~195 MB) are intentionally excluded by `.gitignore`. The fetch script and checksum manifest are committed.

---

## 5. Vercel — dashboard (14 steps)

1. Sign in at <https://vercel.com>.
2. **Add New → Project**.
3. Import `ua6546830-ai/amr-pulse`.
4. Set **Root Directory** = `amr-pulse`.
5. Framework preset: **Next.js**.
6. Install command: `npm ci`.
7. Build command: `npm run build`.
8. Output directory: leave default (`.next`).
9. Add production env `NEXT_PUBLIC_SITE_URL` once the domain is known.
10. Optionally add `AI_PROVIDER`, `AI_API_KEY`, `AI_MODEL`, `AI_BASE_URL`, `AI_REQUESTS_PER_HOUR`.
11. Leave Supabase variables unset for Mode A.
12. Click **Deploy**.
13. Open the deployment and verify the checklist in section 2.
14. Add a custom domain under **Settings → Domains**, then update `NEXT_PUBLIC_SITE_URL` and redeploy.

Every push to `main` creates a production deployment; pull requests get preview URLs.

---

## 6. Vercel — CLI

```bash
npm i -g vercel
cd amr-pulse
vercel link
vercel env add NEXT_PUBLIC_SITE_URL production
vercel --prod
```

Temporary unauthenticated deployment:

```bash
npx vercel deploy --temporary
```

A temporary deployment yields a public URL for evaluation but expires and must be claimed with a Vercel account to become permanent.

---

## 7. Mode B — Supabase

1. Create a Supabase project.
2. Open **SQL Editor**.
3. Run `amr-pulse/supabase/migrations/202611220001_initial_schema.sql`.
4. Confirm 15 tables exist and RLS is enabled on every table.
5. Add the project URL, anon key and **server-only** service-role key to Vercel.
6. Never place the service-role key in a `NEXT_PUBLIC_*` variable or client component.
7. Reload the deployment and confirm server-side Supabase operations.

The migration creates ownership-based workspace policies. The public demo continues to work without Supabase.

---

## 8. Post-deploy verification

```bash
curl -s https://YOUR-DOMAIN/api/manifest | head -c 600
curl -s -o /dev/null -w "%{http_code}\n" https://YOUR-DOMAIN/dashboard
curl -s -o /dev/null -w "%{http_code}\n" https://YOUR-DOMAIN/api/ai/chat
```

Expected:

- manifest contains `"type": "SYNTHETIC"`, seed `20261122`, and the diagnostic-device disclaimer;
- dashboard returns 200;
- `/api/ai/chat` returns 405 for GET (POST only);
- no secret appears in page source or network responses.

If AI is unconfigured, the assistant must display **Deterministic mode** and still answer.

---

## 9. Rollback and operations

- **Vercel:** Deployments → previous deployment → **Promote to Production**.
- **GitHub:** revert the offending commit; CI must pass before redeploying.
- **Demo data:** regenerate with `npm run demo:data`, then `npm run verify:demo`; commit both data and benchmark truth together.
- **Evidence map:** bump the mapping version whenever rows change; never edit a released version in place.
- **AI incidents:** unset `AI_PROVIDER` to disable model calls immediately; deterministic mode remains available.

## 10. Do not claim

Deployment does not create regulatory compliance or scientific validation. Do not state or imply HIPAA, ISO 27001, clinical validation, diagnostic use, ethics approval or IRB exemption. Any real research use requires independent faculty/IRB and data-governance review.
