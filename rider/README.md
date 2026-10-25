# Cravio Rider

The mobile-first delivery partner application. It uses the shared Express API, PostgreSQL/Prisma data, Firebase Authentication, and the existing Socket.IO server; it does not own a second backend or database.

## Local setup

1. Start the shared `backend` and configure its `DATABASE_URL`, Firebase Admin credentials, and `CLIENT_URL`.
2. Copy `.env.example` to `.env.local` and set the Firebase Web SDK values from the same Firebase project.
3. Install dependencies and run `npm run dev` (the rider app uses port 3002).

The frontend sends Firebase ID tokens as Bearer tokens. The backend verifies the token, resolves the Prisma `User`, and enforces the `RIDER` role and active status on every rider endpoint. A rider must already be approved and provisioned by the admin workflow.

## Implemented API flows

The app uses `/api/rider/dashboard`, `/me`, `/availability`, `/deliveries`, delivery workflow actions, `/history`, `/earnings`, and rider-owned notifications/profile routes. Delivery acceptance and completion use Prisma transactions and ownership checks. All values shown in the app are API data; there are no production mock deliveries or earnings.

Socket.IO authentication remains centralized in the shared backend. Map and document upload providers are intentionally not enabled until the shared backend exposes the corresponding secure provider configuration.
