# Deploying to Render (Step-by-Step Guide)

This project is fully configured for zero-hassle deployment on **[Render](https://render.com/)** using the included `render.yaml` blueprint.

---

### Step 1: Push your latest changes to GitHub

Open your terminal in this repository and run:

```bash
git add .
git commit -m "Configure production backend and Render deployment"
git push origin main
```

*(Your repository is connected to: `https://github.com/Elias-Yeshanew/QR_Code.git`)*

---

### Step 2: Create Web Service on Render

1. Log in to **[dashboard.render.com](https://dashboard.render.com/)**.
2. Click the **New +** button in the top right, then select **Web Service**.
3. Choose **Build and deploy from a Git repository**.
4. Select your repository: **`Elias-Yeshanew/QR_Code`**.
5. Render will automatically detect the settings from `render.yaml`:

| Setting | Value |
| :--- | :--- |
| **Name** | `saphire-card` (or any name you prefer) |
| **Region** | Oregon (US West) or closest to you |
| **Branch** | `main` |
| **Runtime** | `Node` |
| **Build Command** | `npm install && npm run build` |
| **Start Command** | `npm start` |
| **Instance Type** | **Free** |

6. Click **Deploy Web Service**.

---

### Step 3: Accessing Your Live Site & Admin

Once Render completes the build (takes ~1-2 minutes):

- **Public Card (For Clients / QR Code Scan):**
  `https://<your-app-name>.onrender.com`
  *(Clean, branded, no admin buttons or icons visible).*

- **Admin Management (For You Only):**
  `https://<your-app-name>.onrender.com/admin`
  *(Prompts for your Admin PIN to unlock full editing, link additions, and logo customization).*

---

### Optional: Render Persistent Disk (For Paid Render Plans)
If you are on a paid Render plan and want your `data/card_db.json` database to persist across redeployments:
1. In Render dashboard, go to your service -> **Disks**.
2. Add a disk with mount path `/var/data`.
3. In **Environment Variables**, add:
   `DATA_DIR=/var/data`
