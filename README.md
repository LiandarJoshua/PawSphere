# 🐾 PawSphere

**PawSphere** is a mobile-first, UAE-focused super-app for pet owners — one place to manage pet health, book vets/groomers/sitters, chat with providers, get AI-powered care reminders, and stay connected to a local pet community. Built as a full-stack TypeScript monorepo with a NestJS API and an Expo (React Native) app that ships to iOS, Android, and web.

🔗 **Live web demo:** [paw-sphere-nu.vercel.app](https://paw-sphere-nu.vercel.app)

> This README describes the codebase as implemented. `implementation_plan.md` and `engineering_tasks.md` in this repo capture the original planning docs and may reference earlier tooling choices (e.g. the plan mentions Gemini; the shipped AI layer uses Groq).

---

## ✨ Features

**Pet profiles & health**
- Multi-pet, multi-household profiles with species, breed, DOB, avatar, and medical notes
- Vaccination history with due-date tracking and document attachments
- Weight logs with trend charts, active medication tracking, and vet visit history
- Activity logging (walks, feeding, etc.) and a per-pet health summary/analytics view

**Discovery & booking**
- Nearby vets, groomers, pet stores, hotels, and trainers via the Google Places API (with a haversine-distance fallback and a seeded local `Provider` table)
- Time-slot based appointment booking with Stripe (test mode) payment intents and refunds
- Provider reviews and ratings

**Pet sitters marketplace**
- Sitter profiles with rates, specialties, and availability calendars
- Sitter booking requests with accept/reject/complete flow and post-stay reviews

**Community**
- Public feed with community posts, lost/found pet alerts, and a marketplace category
- Comments, likes, follows, and user search/profiles
- Lost-pet alerts with a generated QR tag ID and last-seen location

**Messaging**
- Real-time booking chat over Socket.IO (owner ↔ service provider)
- Separate direct-messaging (DM) system between users

**AI (PawBot)**
- Groq-powered chat assistant with per-user pet context (species, age, weight, meds, recent vet visits)
- Scheduled AI-generated care reminders based on vaccination/weight/medication/visit history, with a graceful offline "demo mode" when no API key is set
- AI-written service descriptions for discovery listings
- Automatic pet birthday push notifications

**Platform**
- Supabase Auth (email/password) mirrored into a Postgres `users` table via Prisma
- Role-based access (`OWNER`, `PROVIDER`, `ADMIN`) with an admin dashboard (stats, provider verification, user list)
- Push notification token registration
- Full English/Arabic i18n with RTL layout support
- Light/dark theme support

---

## 🏗️ Tech stack

| Layer | Technology |
|---|---|
| **Mobile/Web app** | Expo (React Native 0.81, React 19), `expo-router` (file-based routing), NativeWind (Tailwind for RN), Zustand, `i18next` / `react-i18next`, `react-native-maps`, `socket.io-client` |
| **API** | NestJS 10/11, TypeScript, class-validator/class-transformer, Swagger (OpenAPI), `@nestjs/schedule` for cron jobs, Socket.IO gateway |
| **Database & Auth** | PostgreSQL via Supabase, Prisma ORM, Supabase Auth |
| **AI** | Groq SDK — `llama-3.1-8b-instant` (reminders, descriptions) and `llama-3.3-70b-versatile` (PawBot chat) |
| **Payments** | Stripe (test mode), AED currency, mock fallback when no key is configured |
| **Places data** | Google Places API |
| **Deployment** | Expo web build → Vercel (mobile), EAS Build (iOS/Android), API deployable to Render/Railway-style Node hosts |

---

## 📁 Repository structure

```
PawSphere/
├── apps/
│   ├── api/                     # NestJS backend
│   │   ├── prisma/
│   │   │   ├── schema.prisma    # Full data model (see below)
│   │   │   └── seed.ts          # Seeds UAE-based vets/groomers/sitters etc.
│   │   └── src/
│   │       ├── auth/            # Supabase-backed auth (register/login, JWT guard)
│   │       ├── pets/            # Pets + household members
│   │       ├── health/          # Weight logs, medications, vet visits, activity
│   │       ├── services/        # Provider discovery, timeslots, nearby search
│   │       ├── places/          # Google Places integration
│   │       ├── bookings/        # Bookings + Stripe payment intents
│   │       ├── sitters/         # Sitter profiles, availability, bookings, reviews
│   │       ├── alerts/          # Lost-pet alerts + QR tags
│   │       ├── posts/           # Community feed
│   │       ├── comments/        # Post comments
│   │       ├── reviews/         # Provider reviews
│   │       ├── messages/        # Booking chat (Socket.IO gateway)
│   │       ├── dm/               # Direct messages between users
│   │       ├── ai/              # PawBot chat + AI reminder generation (Groq)
│   │       ├── notifications/   # Push token registration + sending
│   │       ├── admin/           # Admin stats, provider verification, user list
│   │       ├── users/           # User profile CRUD
│   │       ├── supabase/        # Supabase client provider
│   │       └── prisma/          # Prisma service/module
│   └── mobile/                  # Expo React Native app
│       └── src/
│           ├── app/             # expo-router screens ((auth), (tabs), nested routes)
│           ├── components/      # PetCard, BookingModal, PawBotModal, EmergencyButton, ui/*
│           ├── services/        # Typed API clients per domain (pets, health, sitters, ...)
│           ├── store/           # Zustand stores (auth, pending discovery state)
│           ├── theme/           # Light/dark theme context + colors
│           ├── locales/         # en.json / ar.json
│           └── lib/             # api client, Supabase client, i18n setup, OAuth
├── implementation_plan.md       # Original architecture/planning doc
├── engineering_tasks.md         # Original phased task breakdown
└── package.json                 # npm workspaces root
```

---

## 🗄️ Data model overview

Defined in `apps/api/prisma/schema.prisma`:

- **Identity:** `User`, `Household`, `HouseholdMember`, `Follow`
- **Pets & health:** `Pet`, `Vaccination`, `WeightLog`, `Medication`, `VetVisit`, `ActivityLog`
- **Services:** `Provider`, `TimeSlot`, `Booking`, `ProviderReview`
- **Sitters:** `SitterProfile`, `SitterAvailability`, `SitterBooking`, `SitterReview`
- **Community:** `Post`, `Comment`, `PostLike`, `LostPetAlert`
- **Messaging:** `Message` (booking chat), `DirectMessage`
- **AI & notifications:** `AIReminder`, `PushToken`

---

## 🚀 Getting started

### Prerequisites
- Node.js 18+ and npm
- A [Supabase](https://supabase.com) project (Postgres + Auth)
- Optional, for full functionality: a [Groq](https://console.groq.com) API key, a Google Cloud project with the **Places API** enabled, and a [Stripe](https://stripe.com) test-mode secret key
- For native builds: Expo Go (quick testing) or EAS CLI

### 1. Clone and install
```bash
git clone https://github.com/LiandarJoshua/PawSphere.git
cd PawSphere
npm install
```

### 2. Configure the API
```bash
cd apps/api
cp .env.example .env
```
Fill in `.env`:
```
DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres"
SUPABASE_URL="https://[PROJECT].supabase.co"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
SUPABASE_ANON_KEY="your-anon-key"
PORT=3000
NODE_ENV=development
GEMINI_API_KEY="your-gemini-api-key"       # currently unused by the shipped AI service
GOOGLE_PLACES_API_KEY="your-google-places-api-key"
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
```
> Also add `GROQ_API_KEY` to enable PawBot chat and AI reminders — without it, the AI module runs in a canned "demo mode" instead of failing.

Push the schema and seed sample UAE providers/sitters:
```bash
npx prisma db push
npm run seed
```

### 3. Configure the mobile app
```bash
cd apps/mobile
cp .env.example .env
```
Fill in `.env`:
```
EXPO_PUBLIC_SUPABASE_URL=https://[PROJECT].supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
EXPO_PUBLIC_API_URL=http://localhost:3000/api/v1
```

### 4. Run everything
From the repo root:
```bash
npm run dev:api      # NestJS API on http://localhost:3000
npm run dev:mobile   # Expo dev server (press i/a/w, or scan the QR code in Expo Go)
```

The API exposes interactive Swagger docs at `http://localhost:3000/api/docs` once running.

---

## 🔌 API surface

All routes are prefixed with `/api/v1`. Highlights by module:

| Module | Base path | Notes |
|---|---|---|
| Auth | `/auth` | Register/login via Supabase, mirrored into the local `users` table |
| Pets | `/pets`, `/households` | Pet CRUD, vaccinations, household members |
| Health | `/health/pets/:petId/*` | Weight logs, medications, vet visits, activity, weight trend, health summary |
| Services | `/services`, `/services/nearby` | Provider discovery, geospatial nearby search, time slots |
| Places | `/places` | Google Places-backed search and detail lookups |
| Bookings | `/bookings` | Create/cancel bookings, Stripe payment intents, payment history |
| Sitters | `/sitters` | Sitter profiles, availability, bookings, reviews |
| Alerts | `/alerts` | Lost-pet alerts, QR lookup, resolve |
| Posts / Comments | `/posts` | Community feed, likes, comments |
| Reviews | `/providers/:providerId/reviews` | Provider ratings |
| Messages / DM | `/dm` + Socket.IO `/messages` gateway | Direct messages and real-time booking chat |
| AI | `/ai` | PawBot chat, reminder generation/listing |
| Notifications | `/notifications` | Push token register/remove |
| Admin | `/admin` | Platform stats, provider verification, user listing |

---

## 🌍 Internationalization

The mobile app ships with full English and Arabic translations (`apps/mobile/src/locales/en.json`, `ar.json`) via `i18next`/`react-i18next`, including right-to-left layout handling for Arabic.

---

## 🧪 Linting, formatting & tests

```bash
npm run lint            # ESLint across apps/**/*.{ts,tsx}
npm run format           # Prettier write
npm run format:check     # Prettier check
```
The API includes Jest unit tests (e.g. `auth.service.spec.ts`) run via `npm test` inside `apps/api`.

---

## ☁️ Deployment

- **Mobile web:** Expo's static web build is deployed to Vercel (see `apps/mobile/vercel.json`); live at [paw-sphere-nu.vercel.app](https://paw-sphere-nu.vercel.app)
- **iOS/Android:** Built and distributed via EAS (`apps/mobile/eas.json` — development, preview, and production profiles)
- **API:** Standard NestJS Node server (`npm run build && npm start`), deployable to any Node host (Render, Railway, Fly.io, etc.) alongside a Supabase Postgres instance

---

## 📝 License

No license file is currently included in this repository. All rights reserved by the author unless a license is added.
