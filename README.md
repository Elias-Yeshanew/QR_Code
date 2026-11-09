# Saphire Digital Business Card

A QR-code business card. Visitors who scan the code see your profile and links.
You edit everything at `/admin` after entering your admin PIN.

- **Frontend:** React + Vite + Tailwind
- **Backend:** Express (`server/`) with a small JSON API under `/api`
- **Storage:** PostgreSQL in production. Locally, a JSON file in `data/` if no database is configured.

## Run locally

```bash
npm install
cp .env.example .env   # optional: set DATABASE_URL / ADMIN_PIN
npm run dev            # http://localhost:3000, admin at /admin
```

Without `DATABASE_URL`, data is stored in `data/dev-card.json`. If `ADMIN_PIN` is not set,
a random PIN is printed in the terminal on first start.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Vite dev server with the API mounted |
| `npm run build` | Build the frontend into `dist/` |
| `npm start` | Production server (API + built frontend) |
| `npm run lint` | Type-check |
| `npm test` | API and utility tests. Set `TEST_DATABASE_URL` to also run them against Postgres |

## Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | In production | Postgres connection string |
| `DB_SCHEMA` | No | Schema the app creates and uses (default `saphire_card`) |
| `ADMIN_PIN` | Recommended | PIN set when the database is first initialized (6+ characters) |
| `ADMIN_PIN_RESET` | No | Recovery: overwrites the PIN on every start. Remove it after use |
| `DATABASE_SSL` | No | `true` to force TLS (automatic for `*.render.com` hosts) |

## Security notes

- The PIN is stored as a scrypt hash. Logging in returns a 7-day session token.
  Changing the PIN signs out every device.
- Login is limited to 5 failed attempts per 15 minutes per client.
- All admin input is validated on the server. Links must use `http`, `https`, `mailto` or `tel`.

Deployment steps: see [DEPLOY.md](DEPLOY.md).
