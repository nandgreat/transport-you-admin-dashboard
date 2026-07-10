# transport-you-admin

Next.js 15 admin dashboard that consumes the **Transport You** Laravel REST API.

## Project purpose
Multi-tenant transport booking platform. This frontend is for **tenant admins** and **super admins** to manage schedules, vehicles, routes, bookings, and operators.

---

## Tech stack
- **Next.js 15** (App Router, TypeScript, Tailwind CSS)
- **TanStack React Query** — server state / API calls
- **Zustand** — client-side auth state
- **React Hook Form + Zod** — form validation
- **Axios** — HTTP client
- **Lucide React** — icons

---

## Backend API

**Base URL:** `http://localhost:8000/api/v1`
**Auth:** Laravel Passport OAuth2 — Bearer token in `Authorization` header
**Content-Type:** `application/json`
**API project path:** `/Users/NANDOM.K_SYDANI/Documents/Laravel/transport-you`
**Run API:** `php artisan serve` (port 8000)
**Run this app:** `npm run dev` (port 3000)

---

## Auth endpoints (no token required)
| Method | URL | Description |
|--------|-----|-------------|
| POST | `/register` | Register user |
| POST | `/login` | Login → returns access_token |
| POST | `/verify-otp` | Verify OTP after registration |
| POST | `/resend-otp` | Resend OTP |
| POST | `/tenant-onboarding` | Create new tenant + admin user |

## Authenticated endpoints (Bearer token required)
| Method | URL | Description |
|--------|-----|-------------|
| GET | `/user` | Current user + tenant |
| POST | `/logout` | Logout |
| GET/POST | `/schedules` | List / create schedules |
| GET/PATCH/DELETE | `/schedules/{id}` | Show / update / delete schedule |
| GET/POST | `/bookings` | List / create bookings |
| GET | `/bookings/{id}` | Show booking |
| PATCH | `/bookings/{id}/status` | Update booking status (tenant only) |
| PATCH | `/bookings/{id}/cancel` | Cancel booking |
| GET/POST | `/vehicles` | List / create vehicles |
| GET/POST | `/routes` | List / create routes |
| GET/POST | `/locations` | List / create locations |
| GET/POST | `/vehicle-types` | List / create vehicle types |
| GET/POST | `/vehicle-categories` | List / create vehicle categories |
| GET | `/states` | List all states |
| POST | `/upload/images` | Upload image (multipart/form-data) |

## Public endpoints (no token)
| Method | URL | Description |
|--------|-----|-------------|
| GET | `/trips` | Search available trips |
| GET | `/trips/{id}` | Trip detail |

---

## Key API concepts

### Multi-tenancy
- Every tenant admin user has `tenant_id` on their profile
- API auto-scopes data to the tenant — no need to pass `tenant_id` on most requests
- Super admin can pass `tenant_id` in the request body to act on behalf of any tenant

### Auth flow
1. POST /login → receive access_token
2. Store token (Zustand store + localStorage, or httpOnly cookie)
3. Attach as `Authorization: Bearer {token}` on every request

### Login response shape
```json
{
  "status": "success",
  "data": {
    "access_token": "eyJ...",
    "token_type": "Bearer",
    "user": {
      "id": 1,
      "first_name": "Okoro",
      "last_name": "Ejiofor",
      "email": "okoroejiofor@gmail.com",
      "tenant_id": 2,
      "roles": ["admin"]
    }
  }
}
```

### Common response shape
```json
{
  "status": "success",
  "message": "...",
  "data": { ... }
}
```
Paginated lists use standard Laravel pagination inside `data`:
`current_page`, `data[]`, `total`, `per_page`, `last_page`, `next_page_url`

### Schedule creation (one-off)
```json
{
  "origin_city": "Abuja",
  "destination_city": "Lagos",
  "vehicle_type_id": 1,
  "departure_time": "2026-07-20 06:00:00",
  "arrival_time": "2026-07-20 15:00:00",
  "fare": 8500,
  "is_round_trip": true,
  "return_departure_time": "2026-07-20 17:00:00",
  "return_arrival_time": "2026-07-21 02:00:00",
  "return_fare": 7500
}
```

### Recurring schedule creation
```json
{
  "origin_city": "Abuja",
  "destination_city": "Lagos",
  "vehicle_type_id": 1,
  "start_date": "2026-07-15",
  "end_date": "2026-07-31",
  "days_of_week": ["monday", "wednesday", "friday"],
  "departure_time": "06:00",
  "arrival_time": "15:00",
  "fare": 8500
}
```

### Booking status rules
- Customer creates booking → always `pending`
- Tenant admin can create with any status and update via PATCH /bookings/{id}/status
- Valid statuses: `pending`, `confirmed`, `cancelled`

### Upload image
```
POST /upload/images  (multipart/form-data)
Fields:
  image     file     required  (jpg/jpeg/png/webp, max 4MB)
  type      string   required  (tenants | vehicles | profiles | routes | locations)
  model_id  integer  optional  — if provided, updates the record's image column automatically
```

---

## Seed credentials (local dev)
| Role | Email | Password |
|------|-------|----------|
| Tenant admin (ABC Transport) | okoroejiofor@gmail.com | Pass1234 |
| Customer | paul4nank@gmail.com | Pass1234 |

---

## Suggested folder structure
```
src/
  app/
    (auth)/               ← login page, no sidebar
      login/page.tsx
    (dashboard)/          ← protected layout with sidebar
      layout.tsx
      page.tsx            ← dashboard home
      schedules/
      bookings/
      vehicles/
      routes/
      vehicle-types/
      settings/
  lib/
    axios.ts              ← axios instance with base URL + auth interceptor
    queryClient.ts        ← TanStack Query client singleton
  store/
    auth.ts               ← Zustand store (token, user, setToken, logout)
  hooks/
    useSchedules.ts
    useBookings.ts
    useVehicles.ts
  types/
    api.ts                ← TypeScript interfaces for all API response shapes
  components/
    ui/                   ← shared UI primitives
    layout/               ← Sidebar, Header, etc.
```

## Axios instance (start here)
```ts
// src/lib/axios.ts
import axios from 'axios'
import { useAuthStore } from '@/store/auth'

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1',
  headers: { Accept: 'application/json' },
})

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

export default api
```

## Notes
- Add `http://localhost:3000` to `allowed_origins` in the Laravel project's `config/cors.php`
- All dates from the API are UTC — format for display using `date-fns` or `dayjs`
