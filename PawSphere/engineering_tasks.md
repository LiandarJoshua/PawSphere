# PawSphere Engineering Tasks (Demo-Optimized)

This document breaks down the PawSphere implementation plan into executable engineering tasks. Each task is designed to be independently testable, affect a limited number of files, and includes clear acceptance criteria. These are ideal for processing by an AI coding assistant.

---

## Phase 1: Foundation & Setup

### Task 1.1: Initialize Project Monorepo & Scaffolding
*   **Description:** Set up the basic directory structure for the frontend and backend using npm workspaces or a tool like Nx. Scaffold the NestJS backend and Expo React Native frontend.
*   **Files Affected:** `/package.json`, `/apps/api/package.json`, `/apps/mobile/package.json`, basic NestJS/Expo boilerplate files.
*   **Acceptance Criteria:**
    *   Running `npm run dev:api` starts the NestJS server on port 3000.
    *   Running `npm run dev:mobile` starts the Expo bundler.
    *   ESLint and Prettier are configured and format check passes at the root level.

### Task 1.2: Database & Supabase Integration (Free Tier)
*   **Description:** Initialize a free Supabase project (which provides PostgreSQL + PostGIS). Connect Prisma ORM in the backend to the Supabase connection string.
*   **Files Affected:** `/apps/api/prisma/schema.prisma`, `/apps/api/.env`.
*   **Acceptance Criteria:**
    *   `schema.prisma` contains `User`, `Household`, and `Pet` models.
    *   Running `npx prisma db push` successfully synchronizes the schema with the remote Supabase database.

---

## Phase 2: Core Authentication & User Management

### Task 2.1: Backend - Supabase Authentication
*   **Description:** Integrate Supabase Auth for handling user sign-ups and logins instead of a custom JWT strategy.
*   **Files Affected:** `/apps/api/src/auth/auth.module.ts`, `auth.controller.ts`, `auth.service.ts`, `supabase.strategy.ts`.
*   **Acceptance Criteria:**
    *   API endpoints act as wrappers for Supabase Auth or middleware validates the Supabase JWT.
    *   Unit tests for `AuthService` pass.

### Task 2.2: Frontend - i18n & Minimalistic Onboarding UI
*   **Description:** Configure `i18next` (EN/AR). Create login/registration screens using NativeWind following the new **Apple-style Design System** (white backgrounds, soft light pink accents, rounded corners `borderRadius: 20`, soft shadows).
*   **Files Affected:** `/apps/mobile/tailwind.config.js`, `/apps/mobile/src/locales/en.json`, `ar.json`, `/apps/mobile/src/app/(auth)/login.tsx`, `register.tsx`, `/apps/mobile/src/store/authStore.ts`.
*   **Acceptance Criteria:**
    *   Tailwind theme is configured with the white/pink palette.
    *   UI looks extremely clean, minimalistic, and uses soft drop shadows.
    *   Users can toggle between English and Arabic; layout switches to RTL when Arabic is selected.
    *   App redirects to the main stack upon successful login via Supabase client.

---

## Phase 3: Pet Profiles & Health

### Task 3.1: Backend - Pets & Vaccinations API
*   **Description:** Extend Prisma schema for `Vaccination`. Create CRUD endpoints for pets and their health records.
*   **Files Affected:** `/apps/api/prisma/schema.prisma`, `/apps/api/src/pets/pets.module.ts`, `pets.controller.ts`, `pets.service.ts`.
*   **Acceptance Criteria:**
    *   `GET /api/v1/pets` returns an array of pets for the authenticated user's household.
    *   `POST /api/v1/pets` successfully creates a new pet.
    *   `GET /api/v1/pets/:id/vaccinations` returns the vaccination history.

### Task 3.2: Frontend - Premium Pet Dashboard UI
*   **Description:** Build the main dashboard and pet profile screens using the minimalistic UI rules. Lots of whitespace and card-based soft layouts.
*   **Files Affected:** `/apps/mobile/src/app/(tabs)/index.tsx`, `/apps/mobile/src/app/(tabs)/pets/[id].tsx`, `/apps/mobile/src/components/PetCard.tsx`.
*   **Acceptance Criteria:**
    *   Dashboard displays a horizontal scrolling list of user's pets in clean, soft-cornered cards.
    *   Tapping a pet opens their detailed profile with medical notes and vaccination timeline.

---

## Phase 4: Discovery & Booking

### Task 4.1: Backend - Location-based Services (PostGIS)
*   **Description:** Add `Provider` model with PostGIS `Point` geometry. Implement geospatial queries.
*   **Files Affected:** `/apps/api/prisma/schema.prisma`, `/apps/api/src/services/services.controller.ts`, `services.service.ts`, `seed.ts`.
*   **Acceptance Criteria:**
    *   A seed script successfully populates Supabase with dummy providers (Vets, Groomers) in UAE coordinates.
    *   `GET /api/v1/services/nearby?lat={x}&lng={y}&radius=10` accurately returns providers within the radius, ordered by distance.

### Task 4.2: Frontend - Interactive Map (OpenStreetMap/Mapbox)
*   **Description:** Integrate `react-native-maps` using **OpenStreetMap tiles or Mapbox** (free tier) to avoid Google Maps costs. Add UI for map markers and filters.
*   **Files Affected:** `/apps/mobile/src/app/(tabs)/discovery.tsx`, `/apps/mobile/src/components/MapMarker.tsx`.
*   **Acceptance Criteria:**
    *   Map renders centered on a default UAE location without relying on paid Google Maps APIs.
    *   Map displays markers for nearby providers fetched from the API.

### Task 4.3: Backend - Booking API & Stripe Test Mode
*   **Description:** Add `Booking` model. Create booking endpoint and integrate **Stripe (Test Mode)** for generating a payment intent.
*   **Files Affected:** `/apps/api/prisma/schema.prisma`, `/apps/api/src/bookings/bookings.controller.ts`, `payments.service.ts`.
*   **Acceptance Criteria:**
    *   `POST /api/v1/bookings` creates a booking with status `PENDING`.
    *   `POST /api/v1/payments/intent` returns a Stripe test payment intent client secret.
    *   Frontend can complete the mock checkout flow using Stripe test credit cards.

---

## Phase 5: Community, Alerts & AI

### Task 5.1: Backend - Lost Pet Alerts
*   **Description:** Implement `LostPetAlert` schema and broadcasting logic.
*   **Files Affected:** `/apps/api/prisma/schema.prisma`, `/apps/api/src/alerts/alerts.controller.ts`, `alerts.service.ts`.
*   **Acceptance Criteria:**
    *   `POST /api/v1/alerts/lost` creates a new alert with last known coordinates.
    *   Endpoint returns a uniquely generated string for the `qr_tag_id`.

### Task 5.2: Backend - Gemini AI Reminder Generation
*   **Description:** Create a scheduled task that evaluates pet data and generates personalized reminders using the **Google Gemini API free tier**.
*   **Files Affected:** `/apps/api/src/ai/ai.service.ts`, `ai.scheduler.ts`.
*   **Acceptance Criteria:**
    *   Service makes a successful call to the Gemini API using prompt engineering based on pet age, breed, and health data.
    *   Saves the `AIReminder` to the database.

### Task 5.3: Frontend - Emergency & AI Feed UI
*   **Description:** Build the Emergency Action button (using high-contrast but still thematic styling) and the AI personalized feed.
*   **Files Affected:** `/apps/mobile/src/components/EmergencyButton.tsx`, `/apps/mobile/src/components/AIReminderList.tsx`.
*   **Acceptance Criteria:**
    *   Tapping the Emergency button instantly triggers a route to the nearest 24/7 clinic.
    *   Dashboard elegantly displays Gemini AI Reminders specific to the selected pet.

---

## Phase 6: Real-time Features

### Task 6.1: Backend - WebSockets (Chat)
*   **Description:** Implement NestJS WebSocket gateway for chat (self-hosted Socket.io to stay free).
*   **Files Affected:** `/apps/api/src/messages/messages.gateway.ts`, `messages.service.ts`.
*   **Acceptance Criteria:**
    *   Clients can connect to the `/chat` namespace.
    *   Messages are broadcasted and persisted to Supabase.

### Task 6.2: Frontend - Chat Interface
*   **Description:** Build the chat UI using `socket.io-client` with clean, Apple-style message bubbles (pink for sender, light gray for receiver).
*   **Files Affected:** `/apps/mobile/src/app/(tabs)/chat/[bookingId].tsx`.
*   **Acceptance Criteria:**
    *   UI displays real-time messages.
    *   Message bubbles use the soft pink/gray color palette.
