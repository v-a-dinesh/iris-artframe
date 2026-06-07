# Iris Art Frame — Web Platform End-to-End Specification

**Version:** 1.0  
**Status:** Draft — pending approval  
**Date:** June 7, 2026

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [System Context](#2-system-context)
3. [User Roles & Flows](#3-user-roles--flows)
4. [Architecture Overview](#4-architecture-overview)
5. [Technology Stack](#5-technology-stack)
6. [Database Design (Turso / libSQL)](#6-database-design-turso--libsql)
7. [Backend API Specification (Node + Express)](#7-backend-api-specification-node--express)
8. [Frontend Specification (React)](#8-frontend-specification-react)
9. [Device Integration](#9-device-integration)
10. [Image Storage & Public URLs](#10-image-storage--public-urls)
11. [Authentication & Security](#11-authentication--security)
12. [QR Code & Device Provisioning](#12-qr-code--device-provisioning)
13. [Project Structure](#13-project-structure)
14. [Environment Variables](#14-environment-variables)
15. [Deployment Strategy](#15-deployment-strategy)
16. [Mobile App Readiness](#16-mobile-app-readiness)
17. [Implementation Phases](#17-implementation-phases)
18. [Open Questions & Decisions Needed](#18-open-questions--decisions-needed)

---

## 1. Executive Summary

The **Iris Art Frame Web Platform** is a companion service to the existing Raspberry Pi–based E-Ink display device. It provides:

- **User registration and login** (email, password, name, mobile)
- **Device ownership** via QR scan of a printed device ID (MAC-based identifier)
- **Image upload and gallery** with each image assigned a **unique, internet-accessible URL**
- **Remote display control** — push an uploaded image to a registered device, which downloads it via the device’s existing `POST /display` API

The platform is built with **React** (frontend), **Node.js + Express** (backend), and **Turso DB** (libSQL) for persistence. The UI is responsive for web and mobile browsers, with a structure that supports a future native mobile app (React Native / Capacitor).

---

## 2. System Context

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         IRIS ART FRAME ECOSYSTEM                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   ┌──────────────┐         HTTPS/REST          ┌──────────────────┐   │
│   │  React Web   │ ◄──────────────────────────► │  Node + Express  │   │
│   │  (Browser /  │                              │  Backend API     │   │
│   │   Mobile)    │                              │                  │   │
│   └──────────────┘                              └────────┬─────────┘   │
│                                                          │               │
│                                                          ▼               │
│                                                 ┌──────────────────┐   │
│                                                 │   Turso DB       │   │
│                                                 │   (libSQL)       │   │
│                                                 └──────────────────┘   │
│                                                          │               │
│   ┌──────────────┐         POST /display                 │               │
│   │  Raspberry   │ ◄────────────────────────────────────┘               │
│   │  Pi + E-Ink  │   (image_url from public CDN/storage)                  │
│   │  Device      │                                                        │
│   └──────────────┘                                                        │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Existing Device API (Raspberry Pi)

| Property | Value |
|----------|-------|
| Endpoint | `POST http://<DEVICE_IP>:5000/display` |
| Auth | Header `x-api-key: <DEVICE_API_KEY>` |
| Body | `{ "image_url": "https://..." }` |
| Success | `{ "status": "success", "message": "Image displayed successfully" }` |

The web platform does **not** replace the device API. It **orchestrates** image hosting and sends the public `image_url` to the device when the user chooses to display an image.

---

## 3. User Roles & Flows

### 3.1 Roles

| Role | Description |
|------|-------------|
| **End User** | Registers, owns devices, uploads images, pushes images to frames |
| **Device (IoT)** | Authenticated via per-device API key; receives display commands |
| **Admin** *(future)* | Device provisioning, user support — out of scope for v1 |

### 3.2 Flow A — User Registration & Login

```
User opens web app
    → Register: name, email, password, mobile (optional)
    → Backend validates, hashes password (bcrypt), stores in Turso
    → User receives JWT access token (+ optional refresh token)
    → Login: email + password → JWT
```

### 3.3 Flow B — Device Registration (QR Scan)

```
User is logged in
    → Opens "Add Device" screen
    → Scans QR code on printed label (encodes device_id / MAC ID)
    → App sends device_id to backend
    → Backend:
        - Validates device exists in devices table (pre-provisioned or auto-create)
        - Links device to user (user_devices)
        - Returns device nickname / confirmation
    → Device appears in user's dashboard
```

**QR payload format (recommended):**

```json
{
  "type": "iris-artframe",
  "device_id": "IRIS-A1B2C3D4E5F6",
  "version": 1
}
```

Encoded as URL or plain text: `iris://register?device_id=IRIS-A1B2C3D4E5F6`

### 3.4 Flow C — Upload Image

```
User selects image (JPEG/PNG/WebP, max size TBD)
    → Frontend uploads via multipart/form-data
    → Backend:
        - Validates auth + file type/size
        - Stores file (local disk v1, S3/R2 later)
        - Creates image record with unique public_id (UUID or nanoid)
        - Returns metadata + public URL
    → Image appears in user's gallery on web
```

**Public URL example:**

```
https://api.iris-artframe.com/i/a3f9k2m1x7b4
```

Or path-based:

```
https://api.iris-artframe.com/public/images/a3f9k2m1x7b4.jpg
```

### 3.5 Flow D — Display Image on Frame

```
User selects image + target device from dashboard
    → Frontend: POST /api/devices/:deviceId/display { imageId }
    → Backend:
        - Verifies user owns device and image
        - Resolves public image URL
        - Calls device POST /display with image_url + device API key
        - Logs display event
    → Returns success/failure to UI
```

**Alternative (device-initiated polling — future):**

Device could poll `GET /api/devices/:deviceId/current-image` for a simpler NAT/firewall story. **v1 uses push from backend to device IP** (user may need to configure device IP or use mDNS).

---

## 4. Architecture Overview

### 4.1 Monorepo Layout (recommended)

```
iris-artframe/
├── backend/          # Node + Express API
├── frontend/         # React (Vite)
├── shared/           # Shared types/constants (optional)
├── docs/
├── .env              # Root or backend/.env
└── SPECIFICATION.md
```

### 4.2 Request Lifecycle — Display Image

```
[React] → POST /api/devices/:id/display
    → [Express] auth middleware (JWT)
    → [Express] ownership check (user_devices)
    → [Express] load image public URL from DB
    → [Express] HTTP POST to http://{device_ip}:5000/display
         Headers: x-api-key, Content-Type: application/json
         Body: { image_url: "https://..." }
    → [Device] downloads, processes, renders E-Ink
    → [Express] returns result to React
```

---

## 5. Technology Stack

| Layer | Technology | Rationale |
|-------|------------|-----------|
| Frontend | React 18+ with Vite | Fast dev, modern tooling, mobile-friendly |
| Routing | React Router v6 | Standard SPA routing |
| Styling | Tailwind CSS | Responsive utilities, easy mobile layouts |
| HTTP Client | Axios or fetch wrapper | API calls with JWT interceptors |
| QR Scan | `@yudiel/react-qr-scanner` or `html5-qrcode` | Browser camera access |
| Backend | Node.js 20+ / Express 4 | Matches requirement |
| ORM / DB Client | `@libsql/client` | Native Turso/libSQL support |
| Auth | JWT (`jsonwebtoken`) + bcrypt | Stateless API auth |
| Validation | Zod or express-validator | Request/schema validation |
| File Upload | multer | Multipart handling |
| Image Processing | sharp (optional) | Thumbnails, resize for web gallery |
| Database | Turso (libSQL) | Already provisioned in `.env` |

---

## 6. Database Design (Turso / libSQL)

### 6.1 Entity Relationship

```
users ──────< user_devices >────── devices
  │                                    │
  │                                    │
  └──────< images                     │
              │                        │
              └──── display_logs ──────┘
```

### 6.2 Tables

#### `users`

| Column | Type | Constraints |
|--------|------|-------------|
| id | TEXT | PRIMARY KEY (UUID) |
| email | TEXT | UNIQUE NOT NULL |
| password_hash | TEXT | NOT NULL |
| name | TEXT | NOT NULL |
| mobile | TEXT | NULL |
| created_at | TEXT | DEFAULT (datetime('now')) |
| updated_at | TEXT | DEFAULT (datetime('now')) |

#### `devices`

| Column | Type | Constraints |
|--------|------|-------------|
| id | TEXT | PRIMARY KEY (UUID) |
| device_id | TEXT | UNIQUE NOT NULL — MAC-based ID e.g. `IRIS-A1B2C3D4E5F6` |
| api_key | TEXT | NOT NULL — device auth key for POST /display |
| name | TEXT | NULL — user-assigned nickname |
| ip_address | TEXT | NULL — last known LAN IP |
| status | TEXT | DEFAULT 'inactive' — active/inactive |
| created_at | TEXT | DEFAULT (datetime('now')) |
| updated_at | TEXT | DEFAULT (datetime('now')) |

#### `user_devices`

| Column | Type | Constraints |
|--------|------|-------------|
| id | TEXT | PRIMARY KEY (UUID) |
| user_id | TEXT | NOT NULL, FK → users.id |
| device_id | TEXT | NOT NULL, FK → devices.id |
| registered_at | TEXT | DEFAULT (datetime('now')) |
| UNIQUE(user_id, device_id) | | One registration row per user-device pair |

#### `images`

| Column | Type | Constraints |
|--------|------|-------------|
| id | TEXT | PRIMARY KEY (UUID) |
| user_id | TEXT | NOT NULL, FK → users.id |
| public_id | TEXT | UNIQUE NOT NULL — used in public URL |
| original_filename | TEXT | NOT NULL |
| mime_type | TEXT | NOT NULL |
| file_path | TEXT | NOT NULL — storage path or S3 key |
| file_size | INTEGER | NOT NULL — bytes |
| width | INTEGER | NULL |
| height | INTEGER | NULL |
| created_at | TEXT | DEFAULT (datetime('now')) |

#### `display_logs`

| Column | Type | Constraints |
|--------|------|-------------|
| id | TEXT | PRIMARY KEY (UUID) |
| user_id | TEXT | NOT NULL |
| device_id | TEXT | NOT NULL |
| image_id | TEXT | NOT NULL |
| status | TEXT | NOT NULL — success / error |
| message | TEXT | NULL |
| created_at | TEXT | DEFAULT (datetime('now')) |

### 6.3 Indexes

```sql
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_devices_device_id ON devices(device_id);
CREATE INDEX idx_user_devices_user ON user_devices(user_id);
CREATE INDEX idx_images_user ON images(user_id);
CREATE INDEX idx_images_public_id ON images(public_id);
CREATE INDEX idx_display_logs_device ON display_logs(device_id);
```

### 6.4 Migration Strategy

- SQL migration files in `backend/migrations/`
- Run on startup or via `npm run migrate`
- Use Turso CLI or programmatic `@libsql/client` batch execution

---

## 7. Backend API Specification (Node + Express)

**Base URL:** `/api`  
**Auth:** `Authorization: Bearer <JWT>` unless marked public

### 7.1 Auth

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/auth/register` | Public | Register new user |
| POST | `/auth/login` | Public | Login, returns JWT |
| GET | `/auth/me` | JWT | Current user profile |

#### POST `/auth/register`

**Request:**

```json
{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "password": "securePassword123",
  "mobile": "+919876543210"
}
```

**Response (201):**

```json
{
  "user": {
    "id": "uuid",
    "name": "Jane Doe",
    "email": "jane@example.com",
    "mobile": "+919876543210"
  },
  "token": "eyJhbG..."
}
```

#### POST `/auth/login`

**Request:**

```json
{
  "email": "jane@example.com",
  "password": "securePassword123"
}
```

**Response (200):**

```json
{
  "user": { "id": "...", "name": "...", "email": "..." },
  "token": "eyJhbG..."
}
```

### 7.2 Devices

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/devices` | JWT | List user's registered devices |
| POST | `/devices/register` | JWT | Register device via scanned device_id |
| PATCH | `/devices/:id` | JWT | Update nickname, IP address |
| DELETE | `/devices/:id` | JWT | Unregister device from user account |

#### POST `/devices/register`

**Request:**

```json
{
  "device_id": "IRIS-A1B2C3D4E5F6",
  "name": "Living Room Frame"
}
```

**Logic:**

1. Look up `devices` by `device_id`
2. If not found → **Option A:** return 404 (device must be pre-provisioned) **Option B:** auto-create with generated API key (see Open Questions)
3. Insert `user_devices` if not already linked
4. Return device details

**Response (201):**

```json
{
  "device": {
    "id": "uuid",
    "device_id": "IRIS-A1B2C3D4E5F6",
    "name": "Living Room Frame",
    "status": "inactive"
  }
}
```

### 7.3 Images

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/images` | JWT | List user's uploaded images |
| POST | `/images/upload` | JWT | Upload image (multipart) |
| GET | `/images/:id` | JWT | Image metadata |
| DELETE | `/images/:id` | JWT | Delete image |

#### POST `/images/upload`

**Request:** `multipart/form-data`, field `file`

**Response (201):**

```json
{
  "image": {
    "id": "uuid",
    "public_id": "a3f9k2m1x7b4",
    "original_filename": "sunset.jpg",
    "mime_type": "image/jpeg",
    "public_url": "https://api.iris-artframe.com/public/images/a3f9k2m1x7b4",
    "created_at": "2026-06-07T10:00:00Z"
  }
}
```

### 7.4 Public Image Access (no auth)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/public/images/:publicId` | Public | Serve image binary (used by device & sharing) |

Device downloads image from this URL when backend sends `image_url` in `POST /display`.

### 7.5 Display Control

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/devices/:deviceId/display` | JWT | Push image to E-Ink frame |
| GET | `/devices/:deviceId/display-logs` | JWT | History of display attempts |

#### POST `/devices/:deviceId/display`

**Request:**

```json
{
  "image_id": "uuid-of-image"
}
```

**Backend actions:**

1. Verify user owns device and image
2. Build `public_url` from `images.public_id`
3. `POST http://{device.ip_address}:5000/display` with device `api_key`
4. Write `display_logs` row
5. Return result

**Response (200):**

```json
{
  "status": "success",
  "message": "Image sent to device",
  "display_log_id": "uuid"
}
```

**Error (502) — device unreachable:**

```json
{
  "status": "error",
  "message": "Device unreachable at 192.168.1.42:5000"
}
```

### 7.6 Error Format

All errors follow:

```json
{
  "status": "error",
  "message": "Human-readable message",
  "code": "VALIDATION_ERROR"
}
```

HTTP status codes: `400` validation, `401` unauthorized, `403` forbidden, `404` not found, `409` conflict, `500` server error.

---

## 8. Frontend Specification (React)

### 8.1 Pages / Routes

| Route | Page | Description |
|-------|------|-------------|
| `/` | Landing / redirect | Redirect to dashboard or login |
| `/login` | Login | Email + password |
| `/register` | Register | Name, email, password, mobile |
| `/dashboard` | Dashboard | Overview: devices + recent images |
| `/devices` | My Devices | List registered frames |
| `/devices/add` | Add Device | QR scanner + manual device_id entry |
| `/gallery` | Gallery | Grid of uploaded images |
| `/gallery/upload` | Upload | Drag-drop / file picker |
| `/gallery/:id` | Image Detail | Preview, public link, "Display on frame" |
| `/settings` | Settings | Profile, logout |

### 8.2 Responsive Design

- **Mobile-first** Tailwind breakpoints: `sm`, `md`, `lg`
- Bottom navigation on mobile; sidebar on desktop
- Touch-friendly targets (min 44px)
- Camera permission flow for QR scanner with fallback manual entry

### 8.3 Key UI Components

- `AuthLayout`, `AppLayout`
- `DeviceCard`, `DeviceList`
- `QRScanner`
- `ImageGrid`, `ImageUpload`, `ImagePreview`
- `DisplayModal` — select device, confirm push
- `Toast` notifications for success/error

### 8.4 State Management

- **v1:** React Context + custom hooks (`useAuth`, `useDevices`, `useImages`)
- JWT stored in `localStorage` or `httpOnly` cookie (cookie preferred for XSS; localStorage simpler for v1)
- Axios interceptor attaches `Authorization` header

---

## 9. Device Integration

### 9.1 Device Identification

- **device_id** on printed QR = MAC-derived ID, e.g. `IRIS-` + last 12 hex chars of MAC (uppercase, no colons)
- Example MAC `b8:27:eb:12:34:56` → `IRIS-EB123456` or full `IRIS-B827EB123456`

### 9.2 Device Record Provisioning

Two approaches (decide in §18):

| Approach | Description |
|----------|-------------|
| **Pre-provision** | Factory/admin inserts device + api_key before user scan |
| **Auto-provision** | First scan creates device row; api_key shown once for user to configure on Pi |

### 9.3 Network Reachability

The backend must reach the Pi on the **local network IP** stored in `devices.ip_address`.

**v1 options:**

1. User manually enters device IP in app after registration
2. Device reports IP to backend via a small agent script (future)
3. mDNS hostname `iris-{device_id}.local` (future)

**Important:** If backend runs in the **cloud**, it cannot reach private LAN IPs. Solutions:

- **A)** Run a lightweight **local bridge** on user's network (future)
- **B)** Device **polls** cloud for pending display jobs (recommended for production)
- **C)** Backend deployed on same LAN during development/demo

**v1 recommendation:** Document that cloud deployment requires **device polling (Phase 2)**; for MVP/demo, backend triggers display when Pi IP is reachable (same WiFi / dev setup), or user runs backend locally.

### 9.4 Device Polling API (Phase 2 — recommended for production)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/devices/poll` | `x-api-key` | Device fetches pending display job |
| POST | `/devices/poll/ack` | `x-api-key` | Device confirms display completed |

This avoids cloud → LAN connectivity issues.

---

## 10. Image Storage & Public URLs

### 10.1 Storage (v1)

- Local filesystem: `backend/uploads/{user_id}/{public_id}.{ext}`
- Served via Express static route or dedicated controller with correct `Content-Type`

### 10.2 Storage (production)

- Cloudflare R2, AWS S3, or Turso-compatible object storage
- CDN in front of public URLs for fast device download

### 10.3 Public URL Rules

- **Unique:** `public_id` is UUID v4 or nanoid (21 chars)
- **Unguessable:** sufficient entropy for casual sharing
- **No auth required** for GET (device must fetch without credentials)
- Optional: signed URLs with expiry (Phase 2)

### 10.4 Constraints

| Rule | Value (proposed) |
|------|------------------|
| Max file size | 10 MB |
| Allowed types | `image/jpeg`, `image/png`, `image/webp` |
| Min dimensions | None (device resizes) |
| Max dimensions | 8192×8192 (sanity check) |

---

## 11. Authentication & Security

### 11.1 User Auth

- Passwords hashed with **bcrypt** (cost factor 12)
- JWT expiry: **7 days** (access); refresh token optional in v1
- HTTPS required in production

### 11.2 Device Auth

- Per-device `api_key` stored hashed in DB (compare on poll endpoint)
- Plain key shown only at provisioning time
- Separate from user JWT

### 11.3 API Security

- CORS restricted to frontend origin
- Rate limiting on auth and upload endpoints
- Input validation on all routes
- Helmet.js for HTTP headers
- File upload: validate magic bytes, not just extension

### 11.4 Data Privacy

- Users can only access their own devices and images
- Public image URLs are accessible to anyone with the link (by design for device fetch)

---

## 12. QR Code & Device Provisioning

### 12.1 Printed Label Content

```
┌─────────────────────────────┐
│      IRIS ART FRAME         │
│                             │
│   [QR CODE]                 │
│                             │
│   Device ID:                │
│   IRIS-B827EB123456         │
└─────────────────────────────┘
```

### 12.2 QR Encoding

**Option 1 — JSON:**

```json
{"type":"iris-artframe","device_id":"IRIS-B827EB123456","v":1}
```

**Option 2 — URL:**

```
https://app.iris-artframe.com/devices/add?device_id=IRIS-B827EB123456
```

Mobile app / web scanner parses and pre-fills registration form.

### 12.3 Generation Script (admin/factory)

Small Node script: input MAC → output QR PNG + printable PDF label.

---

## 13. Project Structure

```
iris-artframe/
├── backend/
│   ├── src/
│   │   ├── index.js              # Express entry
│   │   ├── config/
│   │   │   └── db.js             # Turso client
│   │   ├── middleware/
│   │   │   ├── auth.js
│   │   │   └── errorHandler.js
│   │   ├── routes/
│   │   │   ├── auth.routes.js
│   │   │   ├── devices.routes.js
│   │   │   ├── images.routes.js
│   │   │   └── public.routes.js
│   │   ├── controllers/
│   │   ├── services/
│   │   │   ├── auth.service.js
│   │   │   ├── device.service.js
│   │   │   ├── image.service.js
│   │   │   └── display.service.js
│   │   └── utils/
│   ├── migrations/
│   │   └── 001_initial.sql
│   ├── uploads/                  # gitignored
│   ├── package.json
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── main.jsx
│   │   ├── App.jsx
│   │   ├── api/                  # API client
│   │   ├── components/
│   │   ├── pages/
│   │   ├── hooks/
│   │   ├── context/
│   │   └── styles/
│   ├── index.html
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── package.json
├── scripts/
│   └── generate-device-qr.js
├── .env                          # DATABASE_URL, DATABASE_AUTH_TOKEN, JWT_SECRET
├── .gitignore
└── SPECIFICATION.md
```

---

## 14. Environment Variables

### Backend `.env`

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | Turso libSQL URL *(already in `.env`)* |
| `DATABASE_AUTH_TOKEN` | Turso auth token *(already in `.env`)* |
| `JWT_SECRET` | Secret for signing JWTs |
| `JWT_EXPIRES_IN` | e.g. `7d` |
| `PORT` | API port, default `3001` |
| `NODE_ENV` | `development` / `production` |
| `UPLOAD_DIR` | `./uploads` |
| `PUBLIC_BASE_URL` | e.g. `http://localhost:3001` — used to build public image URLs |
| `CORS_ORIGIN` | e.g. `http://localhost:5173` |
| `MAX_UPLOAD_SIZE_MB` | `10` |

### Frontend `.env`

| Variable | Description |
|----------|-------------|
| `VITE_API_BASE_URL` | e.g. `http://localhost:3001/api` |

---

## 15. Deployment Strategy

### 15.1 Development

```bash
# Terminal 1 — backend
cd backend && npm run dev    # port 3001

# Terminal 2 — frontend
cd frontend && npm run dev   # port 5173
```

### 15.2 Production (proposed)

| Component | Platform |
|-----------|----------|
| Backend API | Railway, Render, Fly.io, or VPS |
| Frontend | Vercel, Netlify, or Cloudflare Pages |
| Database | Turso (already hosted) |
| File storage | R2/S3 + CDN (when outgrowing local disk) |

### 15.3 CI/CD (future)

- GitHub Actions: lint, test, deploy on merge to `main`

---

## 16. Mobile App Readiness

The React web app is structured for future conversion:

| Approach | Effort | Notes |
|----------|--------|-------|
| **Capacitor** | Low | Wrap existing React app; reuse 90%+ code |
| **React Native** | Medium | Rewrite UI components; reuse API layer |
| **PWA** | Low | Add manifest + service worker for install prompt |

**v1 decisions that help mobile:**

- REST API with JWT (no cookie-only auth)
- Responsive layouts + bottom nav
- QR scanner component compatible with Capacitor camera plugin
- Shared API client module easy to port

---

## 17. Implementation Phases

### Phase 1 — MVP (this build)

- [ ] Turso schema migration
- [ ] Auth: register, login, JWT middleware
- [ ] Device registration by device_id (manual + QR)
- [ ] Image upload, gallery, public GET URL
- [ ] Display push to device IP (same-network / dev)
- [ ] Responsive React UI (login, dashboard, devices, gallery)

### Phase 2 — Production Hardening

- [ ] Device polling API (cloud-friendly)
- [ ] Cloud object storage + CDN
- [ ] Refresh tokens, email verification
- [ ] Rate limiting, monitoring
- [ ] Admin device provisioning UI

### Phase 3 — Mobile & Scale

- [ ] Capacitor wrapper or React Native app
- [ ] Push notifications ("Image displayed")
- [ ] Multi-image playlists / scheduling

---

## 18. Open Questions & Decisions Needed

Please confirm before implementation:

| # | Question | Options | Recommendation |
|---|----------|---------|----------------|
| 1 | **Device provisioning** | Pre-provision vs auto-create on first scan | Pre-provision for security; admin script inserts device + api_key |
| 2 | **Cloud vs LAN display** | Push to IP vs device polling | **Polling for production**; push for MVP/dev |
| 3 | **Public image URLs** | Permanent vs signed/expiring | Permanent unguessable URL for v1 |
| 4 | **JWT storage** | localStorage vs httpOnly cookie | localStorage for MVP simplicity |
| 5 | **device_id format** | Full MAC vs shortened | `IRIS-` + 12 hex chars of MAC |
| 6 | **Image storage v1** | Local disk vs cloud from day 1 | Local disk for MVP |
| 7 | **Mobile required in v1?** | PWA install vs browser only | Responsive browser; PWA manifest optional |
| 8 | **Backend language** | JavaScript vs TypeScript | JavaScript for speed; TypeScript if you prefer type safety |

---

## Appendix A — Sample cURL Commands

### Register user

```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Jane","email":"jane@example.com","password":"secret123","mobile":"+919876543210"}'
```

### Register device

```bash
curl -X POST http://localhost:3001/api/devices/register \
  -H "Authorization: Bearer <JWT>" \
  -H "Content-Type: application/json" \
  -d '{"device_id":"IRIS-B827EB123456","name":"Living Room"}'
```

### Upload image

```bash
curl -X POST http://localhost:3001/api/images/upload \
  -H "Authorization: Bearer <JWT>" \
  -F "file=@/path/to/image.jpg"
```

### Display on frame

```bash
curl -X POST http://localhost:3001/api/devices/<device-uuid>/display \
  -H "Authorization: Bearer <JWT>" \
  -H "Content-Type: application/json" \
  -d '{"image_id":"<image-uuid>"}'
```

### Public image (device fetch)

```bash
curl http://localhost:3001/public/images/a3f9k2m1x7b4 -o downloaded.jpg
```

---

## Appendix B — Sequence Diagram — End-to-End

```
User          React App       Express API      Turso DB       Storage      Raspberry Pi
  |               |                |              |              |              |
  |-- register -->|-- POST /auth/register ------>| insert user  |              |
  |               |<-- JWT --------|              |              |              |
  |-- scan QR ---->|-- POST /devices/register --->| link device  |              |
  |               |<-- device -----|              |              |              |
  |-- upload ---->|-- POST /images/upload ------>| insert meta  |-- save file->|
  |               |<-- public_url -|              |              |              |
  |-- display ---->|-- POST /devices/:id/display->| load image   |              |
  |               |                |-- POST /display (image_url) ------------->|
  |               |                |              |              |              |-- render E-Ink
  |               |<-- success -----|              |              |              |
```

---

**Next step:** Review this document and confirm answers in §18. Once approved, implementation will begin with Phase 1 (MVP).
