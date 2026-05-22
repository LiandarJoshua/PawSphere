# Goal Description

Develop a comprehensive implementation plan for **PawSphere**, a production-ready, UAE-focused SaaS super-app for pet owners. The application is designed to be mobile-first, supporting both Arabic and English (with proper RTL support), and provides features such as multi-pet profiles, health tracking, service discovery and booking, in-app messaging, secure payments, community lost-pet alerts, and AI-driven personalized care reminders.

> [!NOTE]
> This plan is structured to be easily digestible by an AI coding assistant (like Claude Code) for subsequent execution. No code will be implemented in this phase. The current architecture prioritizes **free APIs** for a cost-effective demo build.

## User Review Required

> [!IMPORTANT]
> Please review the chosen free-tier APIs (Mapbox/OSM, Gemini, Stripe Test Mode) to ensure they meet your expectations for the demo phase. 

## Open Questions

1. **Mobile vs. Web:** The feature set (GPS routing, emergency calls, push notifications, QR scanning) strongly implies a mobile application (iOS/Android). The plan assumes **React Native (Expo)**. Do you also need a web-based dashboard for service providers?

---

## Proposed Changes & Architecture

### 1. Architecture Decisions (Demo-Optimized)

*   **Platform Approach:** Mobile-first using React Native (Expo) for iOS and Android. 
*   **Backend:** Node.js with NestJS (TypeScript). NestJS provides a scalable, enterprise-ready structure.
*   **Database:** PostgreSQL with PostGIS extension for geospatial queries (e.g., "nearby vets", "UAE-specific filtering"). Hosted on **Supabase** (generous free tier).
*   **Caching & Queues:** Redis (Upstash provides a great free tier for serverless Redis).
*   **Real-time Communication:** WebSockets (Socket.io) hosted within the NestJS backend to avoid third-party API costs.
*   **Internationalization (i18n):** `i18next` on both frontend and backend to support English and Arabic, including Right-to-Left (RTL) layout rendering.

### 2. UI/UX Design System

*   **Aesthetic:** Minimalistic, clean, "Apple-style" human interface design. 
*   **Color Palette:**
    *   **Background:** Pure White (`#FFFFFF`) and very light, cool grays for depth (`#F8F8F8`).
    *   **Primary/Accent:** Light Pink (e.g., `#FFC0CB` or `#F4C2C2`). Used for primary buttons, active tabs, and highlights.
    *   **Text:** Dark gray/charcoal (never pure black) for high readability but softer contrast.
*   **Styling Rules:** Generous whitespace (padding/margins), large rounded corners (e.g., `borderRadius: 20`), soft subtle drop shadows for elevation, and smooth, micro-animations on interactions.
*   **Framework:** `NativeWind` (Tailwind) configured with the white/pink palette to ensure consistency.

### 3. Frontend (React Native / Expo)

**Core Libraries:**
*   `expo-router` for file-based navigation.
*   `zustand` for lightweight state management.
*   `react-native-maps` using **OpenStreetMap** tiles or **Mapbox** (free tier) to avoid Google Maps billing during the demo.
*   `i18next` and `react-i18next` for English/Arabic toggling.

**Key Modules:**
*   **Auth & Onboarding:** Phone/Email login (Supabase Auth - free), language selection (EN/AR).
*   **Dashboard:** Multi-pet selector, quick actions, AI care reminders feed. Clean, card-based layout with soft pink accents.
*   **Pet Profiles:** CRUD for pets, medical history, vaccination timeline.
*   **Discovery & Booking:** Map/List view of nearby services with UAE filters.
*   **Community:** Lost pet alerts feed.

### 4. Backend (NestJS / Node.js) & Free APIs

**Core Modules:**
*   `AuthModule`: JWT authentication (via Supabase Auth or custom).
*   `PetsModule`: Pet data, medical history.
*   `ServicesModule`: Provider listings, PostGIS location queries.
*   `AlertsModule`: Lost pet logic, QR code generation.
*   `AIModule`: Integration with **Google Gemini API** (Gemini 1.5 Flash has a very generous free tier) to process pet data and generate structured reminders.
*   `PaymentsModule`: Integration with **Stripe (Test Mode)**. This allows you to build the full, realistic payment UX/UI without needing business verification or paying fees for demo bookings.

### 5. Database Schema (PostgreSQL + Prisma ORM)

**Key Models:**
*   `User`: `id`, `email`, `phone`, `role` (OWNER, PROVIDER), `language` (EN, AR).
*   `Household`: `id`, `name`, `owner_id`.
*   `Pet`: `id`, `household_id`, `name`, `species`, `breed`, `dob`, `medical_info`, `avatar_url`.
*   `Vaccination`: `id`, `pet_id`, `vaccine_name`, `next_due_date`.
*   `Provider`: `id`, `user_id`, `service_type`, `business_name`, `location` (PostGIS Point), `is_verified`.
*   `Booking`: `id`, `user_id`, `provider_id`, `status`, `total_price`.
*   `LostPetAlert`: `id`, `pet_id`, `last_seen_location` (PostGIS Point), `status`, `qr_tag_id`.

### 6. APIs (RESTful Structure)

*   `POST /api/v1/auth/register` | `POST /api/v1/auth/login`
*   `GET /api/v1/pets` | `POST /api/v1/pets`
*   `GET /api/v1/services/nearby?lat={lat}&lng={lng}&radius={km}` (Powered by PostGIS)
*   `POST /api/v1/bookings`
*   `POST /api/v1/payments/intent` (Returns Stripe test intent)
*   `POST /api/v1/alerts/lost`
*   `GET /api/v1/ai/reminders/:petId` (Powered by Gemini Free Tier)

### 7. Deployment Workflow (Zero-Cost Setup)

*   **Backend Hosting:** Deploy the NestJS API to **Render** or **Railway** (free tiers available for demos).
*   **Database Hosting:** **Supabase** (provides free PostgreSQL with PostGIS).
*   **Frontend Mobile:** Use **Expo Go** to run and demo the app on your physical device directly without needing paid Apple Developer accounts or complex builds.

---

## Verification Plan

Since this is a planning phase, verification consists of reviewing the architecture for completeness:

1.  **UI/UX Aesthetic:** Covered by the new Design System section, enforcing the Apple-style white and light pink look.
2.  **Free APIs:** Architecture shifted to Supabase, Gemini API, Mapbox/OSM, and Stripe Test Mode to keep demo costs at $0.
3.  **Multi-pet household dashboard?** Handled via `Household` -> `Pet` relations.
4.  **Arabic/English & UAE focus?** Addressed via `i18next` and PostGIS location querying.
5.  **Emergency mode?** Specifically handled in Frontend Dashboard UI and fast-path routing.
