# BDCCC Backend

A tiny real server for the Bahir Dar Childcare Center app. Once this is
running, every device that opens the app talks to the SAME server, so
everyone sees the same live data — instead of each phone/browser only
seeing what was typed on that one device.

## What this is (and isn't)

- It's a small key-value API (`get` / `set` / `delete` / `list`) that mirrors
  the storage calls already used throughout the app, protected by a secret
  API key.
- It is **not** a full user-management system — this app still has one
  admin account (as before); this backend just gives that account's data a
  real, shared home.
- Data is kept in a single file, `data.json`, next to `server.js`.

## 1. Deploy it (Render.com — free tier, easiest)

1. Create a free account at [render.com](https://render.com).
2. Click **New +** → **Web Service**.
3. Choose **"Deploy from a Git repository"** if you push this `backend/`
   folder to GitHub first (recommended), or use **"Deploy an existing
   image"** / the Render CLI if you'd rather upload directly.
4. Settings:
   - **Build command:** `npm install`
   - **Start command:** `npm start`
5. Under **Environment**, add:
   - `API_KEY` = a long random secret you make up (e.g. run
     `node -e "console.log(require('crypto').randomBytes(24).toString('hex'))"`
     on your own computer and paste the result). **Do not skip this.**
   - `ALLOWED_ORIGIN` = the exact URL where you host the app's HTML file
     (e.g. `https://your-site.netlify.app`), once you know it. You can leave
     it unset (defaults to `*`) while testing, then lock it down.
6. **Important — free tier data persistence:** Render's free web services
   use an ephemeral disk, meaning `data.json` can be wiped on redeploy or
   after long inactivity. For real, permanent storage, either:
   - Upgrade to a Render paid plan and attach a **Persistent Disk**, and set
     `DATA_FILE` to a path inside that disk (e.g. `/data/data.json`), or
   - Use **Railway.app** instead, which offers persistent **Volumes** on its
     free/starter tier — attach a volume, set `DATA_FILE` to a path inside
     it, done.
7. Once deployed, note the server's URL, e.g. `https://bdccc-backend.onrender.com`.

## 2. Point the app at it

1. Open the app (`app.html`) and log in.
2. Go to **ቅንብሮች (Settings) → 🖥️ Backend ማዋቀሪያ**.
3. Enter the server URL from step 1, and the same `API_KEY` you set above.
4. Save. The app will now read and write through this server instead of
   only the local device.

If you never do this setup, the app keeps working exactly as before —
each device just keeps its own local copy, same as it always did.

## 3. Test it's alive

```
curl https://your-backend-url/api/health
```

should return `{"ok":true,"keys":0}` (or a growing key count once the app
is using it).

## Local development

```
cd backend
npm install
API_KEY=dev-secret npm start
```

Server runs on `http://localhost:3000` by default.
