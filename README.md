# Iris Art Frame — Web Platform

A full-stack **TypeScript** platform for managing Iris Art Frame digital E-Ink displays. Users register devices via QR codes, upload artwork, and push images to frames remotely. Admins provision devices from MAC addresses and generate printable QR labels.

---

## Table of Contents

- [Architecture](#architecture)
- [How It Works](#how-it-works)
- [Features](#features)
- [Project Structure](#project-structure)
- [Local Development](#local-development)
- [Default Admin Login](#default-admin-login)
- [User Flows](#user-flows)
- [Frontend Routes](#frontend-routes)
- [Database Schema](#database-schema)
- [API Reference](#api-reference)
- [Postman Collection](#postman-collection)
- [Raspberry Pi Setup](#raspberry-pi-setup)
- [Deployment](#deployment)
- [Build Commands](#build-commands)
- [Testing](#testing)
- [Troubleshooting](#troubleshooting)
- [Security](#security)
- [TypeScript Notes](#typescript-notes)
- [License](#license)

---

## Architecture

```
┌─────────────┐     HTTPS      ┌──────────────────┐     libSQL    ┌──────────┐
│ React (Vite)│ ◄────────────► │ Express API (TS) │ ◄───────────► │ Turso DB │
│  on Vercel  │                │    on Render     │             └──────────┘
└─────────────┘                └────────┬─────────┘
                                        │ device polling (outbound)
                                        ▼
                               ┌──────────────────┐
                               │ Raspberry Pi +   │
                               │ E-Ink Display    │
                               │ (Flask on :5000) │
                               └──────────────────┘
```

| Layer | Stack |
|-------|-------|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, React Router |
| Backend | Node.js 20+, Express, TypeScript, Zod validation |
| Database | Turso (libSQL) — images stored as BLOBs |
| Auth | JWT (7-day expiry) + bcrypt password hashing |
| Device auth | `x-api-key` header (hashed in DB) |
| Image storage | Turso BLOB (Render-compatible, no ephemeral disk) |
| QR scanning | html5-qrcode (camera-based in browser) |

### Why polling?

The cloud backend **cannot reach private LAN IPs** on home networks. Instead, each Raspberry Pi **polls outward** to the API every few seconds, picks up pending display jobs, fetches the public image URL, renders on the E-Ink panel, and acknowledges completion.

---

## How It Works

### Device lifecycle

```
Admin provisions MAC  →  Device ID + API key + QR label
        ↓
User scans QR         →  Device linked to user account
        ↓
Pi runs poll client   →  Device shows "Online" (last seen ≤ 5 min)
        ↓
User queues display   →  Job stored as "pending"
        ↓
Pi polls & fetches    →  Renders image on E-Ink
        ↓
Pi sends ack          →  Job "completed", log written
```

### Device ID format

MAC addresses are converted to a canonical device ID:

| MAC address | Device ID |
|-------------|-----------|
| `B8:27:EB:12:34:56` | `IRIS-B827EB123456` |
| `b827eb123456` | `IRIS-B827EB123456` |

Accepted MAC formats: `AA:BB:CC:DD:EE:FF`, `AABBCCDDEEFF`, or with dashes.

### Online / Offline status

A device shows **Online** when it has polled the API within the last **5 minutes** (`last_seen_at`). Scanning a QR code only links the device to your account — the frame must run the poll client with its API key to appear online.

### Display job flow

1. User calls `POST /api/devices/:id/display` with an `image_id`
2. Any existing pending jobs for that device are marked `superseded`
3. A new job is created with status `pending` and a public `image_url`
4. Pi polls `GET /api/device/poll` → receives `{ job_id, image_url }`
5. Pi calls local Flask `POST http://127.0.0.1:5000/display` with the image URL
6. Pi calls `POST /api/device/poll/ack` with `success` or `error`
7. Job moves to `completed` / `failed`; a row is added to `display_logs`

---

## Features

### Authentication
- Register with email, password, name, and optional mobile number
- Login with JWT stored in browser localStorage
- Forgot password flow (`POST /api/auth/reset-password`)
- Role-based access: `user` and `admin`

### Admin provisioning
- Enter a Raspberry Pi MAC address → auto-generate device ID
- One-time API key (save immediately — not retrievable later)
- QR code payload as PNG data URL for printable labels
- Regenerate QR for existing devices
- View all provisioned devices with owner count and online status

### Device management
- Register device by scanning QR or entering `IRIS-XXXXXXXXXXXX` manually
- Rename devices and set optional IP address
- View display history per device
- Unregister device from account (does not delete provisioned device)

### Image gallery
- Upload JPG, JPEG, or PNG (max 10 MB, configurable)
- Each image gets a unique 12-character `public_id`
- Public URL: `{PUBLIC_BASE_URL}/public/images/{publicId}` (no auth required)
- Display artwork on any linked frame

### UI
- Mobile-first responsive layout
- Dark / light theme toggle (persisted in localStorage)
- Dashboard with device count, image count, and recent activity
- Printable 4×6 QR labels (single-page, no page break)
- Ready for future Capacitor / React Native wrap

---

## Project Structure

```
iris-artframe/
├── backend/                     # Express API (TypeScript)
│   ├── src/
│   │   ├── config/              # Turso libSQL client
│   │   ├── middleware/          # JWT auth, device auth, admin guard, errors
│   │   ├── routes/              # REST route handlers
│   │   │   ├── auth.routes.ts
│   │   │   ├── devices.routes.ts
│   │   │   ├── images.routes.ts
│   │   │   ├── admin.routes.ts
│   │   │   ├── devicePoll.routes.ts
│   │   │   └── public.routes.ts
│   │   ├── services/            # Business logic (auth, devices, images, display)
│   │   ├── types/               # Shared TS types + Express Request augmentation
│   │   ├── utils/               # deviceId, apiKey, params helpers
│   │   ├── migrate.ts           # Run SQL migrations
│   │   ├── seedAdmin.ts         # Create/update admin user from env
│   │   └── tests/               # Integration tests (Node test runner)
│   ├── migrations/
│   │   ├── 001_initial.sql      # Core schema
│   │   └── 002_device_last_seen.sql
│   └── dist/                    # Compiled JS (production)
├── frontend/                    # React SPA (TypeScript)
│   └── src/
│       ├── api/                 # Typed Axios client + interceptors
│       ├── components/          # Layout, QR scanner, print label, UI primitives
│       ├── context/             # AuthContext, ThemeContext
│       ├── pages/               # Route pages
│       └── types/               # Frontend TypeScript interfaces
├── postman/
│   └── Iris-Art-Frame-API.postman_collection.json
├── scripts/
│   └── device-poll-client.js    # Run on Raspberry Pi
├── render.yaml                  # Render deployment blueprint
├── SPECIFICATION.md             # Full technical specification
└── package.json                 # Root workspace scripts
```

---

## Local Development

### Prerequisites

- **Node.js 20+**
- **npm** (comes with Node)
- **Turso database** — free tier at [turso.tech](https://turso.tech)

### 1. Clone and install

```bash
git clone <your-repo-url>
cd iris-artframe
npm run install:all
```

### 2. Set up Turso

```bash
# Install Turso CLI (macOS)
brew install tursodatabase/tap/turso

# Log in and create a database
turso auth login
turso db create iris-artframe-dev
turso db show iris-artframe-dev --url
turso db tokens create iris-artframe-dev
```

Copy the database URL and auth token into your `.env` file.

### 3. Environment variables

```bash
cp backend/.env.example backend/.env
```

**`backend/.env`:**

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | Turso libSQL connection URL | `libsql://iris-artframe-dev-xxx.turso.io` |
| `DATABASE_AUTH_TOKEN` | Turso auth token | `eyJhbG...` |
| `JWT_SECRET` | Secret for signing JWTs (use a long random string) | `your-64-char-random-string` |
| `JWT_EXPIRES_IN` | Token lifetime | `7d` |
| `PORT` | API port | `3001` |
| `NODE_ENV` | Environment | `development` |
| `PUBLIC_BASE_URL` | Base URL for public image links (must match API URL) | `http://localhost:3001` |
| `CORS_ORIGIN` | Allowed frontend origin(s), comma-separated | `http://localhost:5173` |
| `MAX_UPLOAD_SIZE_MB` | Max image upload size | `10` |
| `ADMIN_EMAIL` | Admin account email (used by seed script) | `admin@iris-artframe.vercel.app` |
| `ADMIN_PASSWORD` | Admin account password | `Admin@Iris2026` |
| `ADMIN_NAME` | Admin display name | `Admin` |

**`frontend/.env`:**

```env
VITE_API_BASE_URL=http://localhost:3001/api
```

> **Note:** The backend loads env from both `backend/.env` and the repo root `.env`.

### 4. Database setup

```bash
npm run migrate      # Apply SQL migrations
npm run seed:admin   # Create or update admin user from ADMIN_* env vars
```

### 5. Run dev servers

```bash
# Terminal 1 — API (tsx watch, hot reload)
npm run dev:backend

# Terminal 2 — Frontend (Vite HMR)
npm run dev:frontend
```

| Service | URL |
|---------|-----|
| Frontend | http://localhost:5173 |
| API | http://localhost:3001 |
| Health check | http://localhost:3001/health |

### 6. Verify setup

```bash
curl http://localhost:3001/health
# → {"status":"ok","service":"iris-artframe-api"}
```

---

## Default Admin Login

After `npm run seed:admin`:

| Field | Value |
|-------|-------|
| Email | Value of `ADMIN_EMAIL` in `.env` (default: `admin@iris-artframe.vercel.app`) |
| Password | Value of `ADMIN_PASSWORD` in `.env` (default: `Admin@Iris2026`) |

The seed script is idempotent — re-running it updates the admin password if the email already exists.

---

## User Flows

### Admin — Provision a device

1. Log in as admin → navigate to **Admin**
2. Enter the Raspberry Pi MAC address (e.g. `B8:27:EB:12:34:56`)
3. Optionally enter a frame name (e.g. "Living Room")
4. Click **Generate QR Label**
5. **Copy and save the API key immediately** — it is shown only once
6. Print the QR label (4×6 format) and attach to the physical frame
7. Configure the API key on the Raspberry Pi (see [Raspberry Pi Setup](#raspberry-pi-setup))

### User — Register a device

1. Register or log in
2. Go to **Devices → Add Device**
3. Allow camera access and scan the printed QR code, **or** enter `IRIS-XXXXXXXXXXXX` manually
4. Device appears in your dashboard (status: **Offline** until Pi polls)

### User — Display artwork

1. Go to **Gallery → Upload** and select a JPG or PNG
2. Open the image detail page to copy the public link if needed
3. Click **Display on Frame** and select a target device
4. Ensure the Pi poll client is running — the frame picks up the job on the next poll cycle
5. Check **Display Logs** on the device page for history

### User — Reset password

1. On the login page, click **Forgot password?**
2. Enter your email and new password
3. Sign in with the updated credentials

---

## Frontend Routes

| Path | Access | Page |
|------|--------|------|
| `/login` | Guest | Login |
| `/register` | Guest | Register |
| `/forgot-password` | Guest | Reset password |
| `/dashboard` | Auth | Overview stats |
| `/devices` | Auth | Device list |
| `/devices/add` | Auth | QR scan / manual entry |
| `/gallery` | Auth | Image grid |
| `/gallery/upload` | Auth | Upload form |
| `/gallery/:id` | Auth | Image detail + display |
| `/admin` | Admin | Provision devices, print labels |

Protected routes redirect to `/login` when unauthenticated. Admin routes redirect non-admins to `/dashboard`.

---

## Database Schema

| Table | Purpose |
|-------|---------|
| `users` | Accounts (email, password hash, name, mobile, role) |
| `devices` | Provisioned frames (device_id, api_key_hash, status, last_seen_at) |
| `user_devices` | Many-to-many link between users and devices |
| `images` | Uploaded artwork (BLOB storage, public_id for URLs) |
| `display_jobs` | Pending/completed display queue per device |
| `display_logs` | Historical record of display attempts |

Key indexes: email lookup, device_id lookup, pending jobs by device+status, public_id for image serving.

Run migrations with `npm run migrate`. Migration files are in `backend/migrations/` and applied in filename order.

---

## API Reference

**Base URL:** `http://localhost:3001` (dev) or your Render URL (prod)

**Authenticated routes** require header: `Authorization: Bearer <JWT>`

**Device routes** require header: `x-api-key: <device-api-key>`

### Health

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/health` | — | Service health check |

### Auth — `/api/auth`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/register` | — | Register new user |
| POST | `/login` | — | Login, returns JWT |
| POST | `/reset-password` | — | Reset password by email |
| GET | `/me` | JWT | Current user profile |

**Register / Login body:**
```json
{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "password": "securepass123",
  "mobile": "+919876543210"
}
```
(`mobile` optional on register; login only needs `email` + `password`)

**Reset password body:**
```json
{
  "email": "jane@example.com",
  "new_password": "newsecurepass123"
}
```

### Devices — `/api/devices`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | JWT | List user's linked devices |
| POST | `/register` | JWT | Link device by device_id |
| PATCH | `/:id` | JWT | Update name or ip_address |
| DELETE | `/:id` | JWT | Unlink device from account |
| POST | `/:id/display` | JWT | Queue display job |
| GET | `/:id/display-logs` | JWT | Display history |

**Register device body:**
```json
{
  "device_id": "IRIS-B827EB123456",
  "name": "Living Room Frame"
}
```

**Queue display body:**
```json
{
  "image_id": "uuid-of-image"
}
```

### Images — `/api/images`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | JWT | List user's images |
| POST | `/upload` | JWT | Upload image (multipart `file`) |
| GET | `/:id` | JWT | Image metadata |
| DELETE | `/:id` | JWT | Delete image |

**Upload:** `multipart/form-data` with field name `file`. Allowed: JPG, JPEG, PNG. Max size: `MAX_UPLOAD_SIZE_MB`.

### Admin — `/api/admin`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/devices` | Admin JWT | List all provisioned devices |
| POST | `/devices/provision` | Admin JWT | Provision from MAC |
| GET | `/devices/:id/qr` | Admin JWT | Regenerate QR data URL |

**Provision body:**
```json
{
  "mac": "B8:27:EB:12:34:56",
  "name": "Living Room Frame"
}
```

**Provision response (201):**
```json
{
  "status": "success",
  "device": { "id": "uuid", "device_id": "IRIS-B827EB123456", "name": "...", "status": "inactive" },
  "api_key": "iris_xxxxxxxx",
  "qr_payload": "{\"type\":\"iris-artframe\",\"device_id\":\"IRIS-B827EB123456\",\"version\":1}",
  "qr_data_url": "data:image/png;base64,..."
}
```

### Device poll — `/api/device`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/poll` | x-api-key | Poll for pending job |
| POST | `/poll/ack` | x-api-key | Acknowledge display result |

**Poll response (job pending):**
```json
{
  "status": "success",
  "job": {
    "job_id": "uuid",
    "image_url": "http://localhost:3001/public/images/abc123xyz"
  }
}
```

**Poll response (no job):**
```json
{ "status": "success", "job": null }
```

**Ack body:**
```json
{
  "job_id": "uuid",
  "status": "success",
  "message": "Displayed on frame"
}
```
(`status` must be `"success"` or `"error"`)

### Public — `/public`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/images/:publicId` | — | Serve image bytes (used by Pi to fetch artwork) |

### Error responses

All errors follow:
```json
{ "status": "error", "message": "Human-readable description" }
```

Common status codes: `400` validation, `401` auth, `403` forbidden, `404` not found, `409` conflict, `429` rate limited.

### Rate limits

| Route group | Limit |
|-------------|-------|
| `/api/auth/*` | 50 requests / 15 min per IP |
| `/api/images/*` | 30 requests / 15 min per IP |

---

## Postman Collection

A complete Postman collection with all endpoints, sample bodies, and auto-save scripts is included:

```
postman/Iris-Art-Frame-API.postman_collection.json
```

**Import:** Postman → Import → select the file.

**Recommended test order** (folder included in collection):

1. Health Check
2. Admin Login → saves `adminToken`
3. Provision Device → saves `deviceApiKey`, `deviceUuid`
4. User Login → saves `userToken`
5. Register Device to User
6. Upload Image (pick a local JPG/PNG)
7. Queue Display
8. Device Poll
9. Device Ack

Collection variables are pre-filled with default admin credentials and a sample MAC address.

---

## Raspberry Pi Setup

The cloud backend cannot reach private LAN IPs. Devices **poll outward** to the API.

### Prerequisites on the Pi

- Node.js 20+ (or run via systemd with `node`)
- Local Flask display service on port `5000` accepting `POST /display`
- API key from admin provisioning

### 1. Configure the API key

Save the API key from admin provisioning. If lost, you must re-provision with a new MAC or update the hash directly in the database — there is no "view API key" endpoint.

### 2. Run the poll client

```bash
IRIS_API_KEY=iris_your_key_here \
IRIS_API_URL=https://your-api.onrender.com \
POLL_INTERVAL_MS=10000 \
DEVICE_PORT=5000 \
node scripts/device-poll-client.js
```

The client:
1. Polls `GET /api/device/poll` every 10 seconds (configurable)
2. When a job exists, calls `POST http://127.0.0.1:5000/display` with `{ "image_url": "..." }`
3. Acknowledges via `POST /api/device/poll/ack`

Console output: `.` for no job, full log when a job is processed.

### 3. Run as a systemd service (production)

Create `/etc/systemd/system/iris-poll.service`:

```ini
[Unit]
Description=Iris Art Frame Poll Client
After=network.target

[Service]
Type=simple
User=pi
WorkingDirectory=/home/pi/iris-artframe
Environment=IRIS_API_KEY=iris_your_key_here
Environment=IRIS_API_URL=https://your-api.onrender.com
Environment=POLL_INTERVAL_MS=10000
ExecStart=/usr/bin/node scripts/device-poll-client.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable iris-poll
sudo systemctl start iris-poll
sudo systemctl status iris-poll
```

---

## Deployment

### Backend — Render

1. Push repo to GitHub
2. Create a **Web Service** on [Render](https://render.com)
3. Use `render.yaml` or configure manually:

| Setting | Value |
|---------|-------|
| Root directory | repo root |
| Build command | `cd backend && npm install && npm run build && npm run migrate && npm run seed:admin` |
| Start command | `cd backend && npm start` |
| Node version | 20+ |

4. Set environment variables in Render dashboard:

| Variable | Notes |
|----------|-------|
| `DATABASE_URL` | Turso URL |
| `DATABASE_AUTH_TOKEN` | Turso token |
| `JWT_SECRET` | Random 64+ char string (`generateValue: true` in render.yaml) |
| `PUBLIC_BASE_URL` | Your Render service URL, e.g. `https://iris-artframe-api.onrender.com` |
| `CORS_ORIGIN` | Your Vercel frontend URL |
| `ADMIN_EMAIL` | Admin login email |
| `ADMIN_PASSWORD` | Strong admin password |
| `NODE_ENV` | `production` |

> **Important:** `PUBLIC_BASE_URL` must be your public Render URL so image links work when the Pi fetches artwork.

### Frontend — Vercel

1. Import the GitHub repo on [Vercel](https://vercel.com)
2. Set **Root Directory** to `frontend`
3. Framework preset: **Vite**
4. Environment variable:

| Variable | Value |
|----------|-------|
| `VITE_API_BASE_URL` | `https://your-api.onrender.com/api` |

5. Deploy — `frontend/vercel.json` rewrites all routes to `index.html` for SPA routing

### Post-deploy checklist

- [ ] `GET https://your-api.onrender.com/health` returns `{ "status": "ok" }`
- [ ] Frontend loads and can register / login
- [ ] Admin can provision a device and print QR label
- [ ] Image upload returns a public URL under `PUBLIC_BASE_URL`
- [ ] Pi poll client connects with API key and device shows Online
- [ ] End-to-end: upload → display → poll → ack → log appears

---

## Build Commands

```bash
# Install all dependencies
npm run install:all

# Run database migrations
npm run migrate

# Seed admin user
npm run seed:admin

# Backend — compile TypeScript to dist/
cd backend && npm run build && npm start

# Frontend — typecheck + production bundle
cd frontend && npm run build

# Full project build
npm run build

# Frontend preview (after build)
cd frontend && npm run preview
```

---

## Testing

```bash
npm test
```

Runs 12 integration tests in `backend/src/tests/api.test.ts` using Node's built-in test runner:

| Test | Coverage |
|------|----------|
| MAC → device ID conversion | `macToDeviceId`, `isValidMac` |
| QR payload parsing | JSON and plain text formats |
| User registration & login | Auth service |
| Device provisioning | MAC → device + API key + QR |
| Device registration | User links device |
| Image upload validation | Rejects unsupported formats (e.g. WebP) |
| Image upload & public serve | PNG upload, public URL |
| Display job queue | Pending job created |
| Device poll | Job returned to device |
| Device ack | Job completed, no pending jobs remain |

Tests require a configured Turso database (same `.env` as dev).

---

## Troubleshooting

### Device shows Offline after QR scan

Scanning only links the device to your account. The frame must run the poll client with the correct `IRIS_API_KEY`. Verify the key matches the one from provisioning.

### Login returns 401

- Check email/password (emails are case-insensitive, trimmed)
- Use **Forgot password** to reset, or re-run `npm run seed:admin` for the admin account
- Ensure `JWT_SECRET` has not changed (invalidates existing tokens)

### Image upload fails

- File must be JPG, JPEG, or PNG (not WebP, GIF, etc.)
- Check file size against `MAX_UPLOAD_SIZE_MB`
- Ensure `Authorization: Bearer` header is present

### Display job never completes

- Confirm Pi poll client is running (`systemctl status iris-poll`)
- Check Pi can reach `IRIS_API_URL` (outbound HTTPS)
- Verify local Flask service responds on port 5000
- Check `PUBLIC_BASE_URL` — Pi must be able to fetch `{PUBLIC_BASE_URL}/public/images/{id}`

### CORS errors in browser

Set `CORS_ORIGIN` to your exact frontend URL (including `https://`, no trailing slash). Multiple origins: comma-separated.

### Provision returns 409 Device already provisioned

That MAC is already in the database. Use a different MAC for testing, or look up the existing device in Admin → device list.

### QR scanner blank or camera error

- Grant camera permission in the browser
- Use HTTPS in production (camera requires secure context)
- Try manual device ID entry as fallback

---

## Security

- Passwords hashed with **bcrypt** (cost factor 12)
- Device API keys hashed in database (plain key shown once at provision)
- JWT signed with `JWT_SECRET`, expires in 7 days (configurable via `JWT_EXPIRES_IN`)
- Rate limiting on auth (50/15min) and upload (30/15min) routes
- **Helmet** security headers on all responses
- CORS restricted to configured frontend origin(s)
- Admin routes require JWT with `role: admin`
- Device routes require valid `x-api-key`
- Input validation with **Zod** on all mutation endpoints
- Images served publicly by opaque `public_id` (not sequential IDs)

---

## TypeScript Notes

- Backend compiles with `tsc` → output in `backend/dist/`
- Dev uses `tsx watch` for instant reload without a build step
- Frontend uses Vite + `tsc --noEmit` for type checking before build
- Shared types live in `backend/src/types/` and `frontend/src/types/`
- Express `Request` is augmented in `backend/src/types/express.d.ts` for `req.user` and `req.device`
- ESM throughout (`"type": "module"` in both package.json files)

For the full technical specification including future roadmap, see [`SPECIFICATION.md`](SPECIFICATION.md).

---

## License

Private — Iris Art Frame project.
