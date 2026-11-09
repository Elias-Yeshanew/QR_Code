# Deploying to Render

The app runs as one Render **Web Service** and stores its data in **Render Postgres**.
Data lives in the database, so it survives redeploys and free-tier restarts.

## 1. Database

Use an existing Render Postgres instance or create one (**New + → Postgres**).
Copy its **Internal Database URL** (Postgres page → *Connections*).

The app creates its own schema, `saphire_card`, and touches nothing else, so it can
share a database with other apps. On first start it creates two tables there: `settings` and `links`.

## 2. Environment variables on the web service

In the web service, open **Environment** and add:

| Key | Value |
| --- | --- |
| `DATABASE_URL` | the Internal Database URL from step 1 |
| `ADMIN_PIN` | the admin PIN you want (6+ characters) |
| `NODE_ENV` | `production` |

`ADMIN_PIN` is only used the first time the database is set up. After that, change the PIN
from the admin panel. If you forget it, set `ADMIN_PIN_RESET` to a new PIN, redeploy,
log in, then delete `ADMIN_PIN_RESET`.

Never commit the database URL. It contains the password.

## 3. Build settings

| Setting | Value |
| --- | --- |
| Build Command | `npm install && npm run build` |
| Start Command | `npm start` |
| Health Check Path | `/api/health` |

(These are also in `render.yaml` if you deploy with a Blueprint.)

## 4. Deploy

Push to `main`. Render builds and deploys automatically.
If `DATABASE_URL` is missing, the server refuses to start. Render then keeps the previous
version running, and the deploy log shows the error.

- Public card: `https://<your-app>.onrender.com`
- Admin: `https://<your-app>.onrender.com/admin`
