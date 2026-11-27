# Cravio

Cravio is a full-stack food ordering and delivery platform composed of four Next.js applications and one shared Express API:

- Customer storefront
- Restaurant owner portal
- Rider/delivery portal
- Platform administration portal

The platform uses Firebase for identity, PostgreSQL with Prisma for application data, Razorpay for payments, Cloudinary for uploads, and Socket.IO for real-time capabilities.

## Table of contents

- [Applications](#applications)
- [Architecture](#architecture)
- [Technology stack](#technology-stack)
- [Repository structure](#repository-structure)
- [Features](#features)
- [Prerequisites](#prerequisites)
- [Local development](#local-development)
- [Environment variables](#environment-variables)
- [Database setup](#database-setup)
- [API overview](#api-overview)
- [User roles and access](#user-roles-and-access)
- [Available commands](#available-commands)
- [Production deployment](#production-deployment)
- [Troubleshooting](#troubleshooting)
- [Security](#security)

## Applications

| Application | Workspace | Local port | Production |
| --- | --- | ---: | --- |
| Customer storefront | `frontend` | 3000 | `https://cravioo.vercel.app` |
| Restaurant owner portal | `restaurant` | 3001 | `https://cravio-restaurant.vercel.app` |
| Rider/delivery portal | `rider` | 3002 | `https://cravio-rider.vercel.app` |
| Admin portal | `admin` | 3003 | `https://cravioo-admin.vercel.app` |
| Shared API | `backend` | 5000 | `https://cravio-api.vercel.app` / `https://cravioo-api.vercel.app` |

The repository may expose more than one API hostname until old Vercel deployments and environment variables are consolidated. Every frontend must point `NEXT_PUBLIC_API_URL` to the active HTTPS backend.

## Architecture

```mermaid
flowchart LR
    Customer[Customer web app] -->|HTTPS / REST| API[Express API]
    Restaurant[Restaurant owner app] -->|HTTPS / REST| API
    Rider[Rider app] -->|HTTPS / REST| API
    Admin[Admin app] -->|HTTPS / REST| API

    API --> Auth[Firebase Admin SDK]
    API --> Prisma[Prisma ORM]
    Prisma --> PostgreSQL[(PostgreSQL)]
    API --> Cloudinary[Cloudinary]
    API --> Razorpay[Razorpay]
    API -.-> SocketIO[Socket.IO]

    Auth --> Firebase[Firebase Authentication]
```

```mermaid
flowchart TD
    Browser[Web browser] --> FirebaseLogin[Firebase sign-in]
    FirebaseLogin --> FirebaseToken[Firebase ID token]
    FirebaseToken --> Sync[POST /api/auth/sync]
    Sync --> Database[Prisma user record]
    Database --> Roles[Role and status checks]
    Roles --> Portal[Customer, restaurant, rider, or admin portal]
```

Firebase verifies identity. The backend synchronizes the Firebase user with its own `User` record, then applies role and account-status authorization to protected routes.

## Technology stack

### Frontend applications

- Next.js 16
- React 19
- TypeScript
- Firebase Authentication
- Redux Toolkit and TanStack Query
- React Hook Form and Zod
- Lucide icons
- Tailwind CSS/PostCSS in the customer app

### Backend

- Node.js
- Express 5
- TypeScript
- Prisma 6
- PostgreSQL
- Firebase Admin
- Socket.IO
- Helmet, CORS, Morgan, and express-rate-limit
- Cloudinary
- Razorpay

## Repository structure

```text
Cravio/
├── frontend/                 Customer storefront
│   ├── app/                  Pages and layouts
│   ├── components/           Storefront UI
│   ├── lib/                  API, cart, Firebase, and application helpers
│   └── redux/                Redux state
├── restaurant/               Restaurant owner workspace
│   ├── app/                  Login, menu, orders, analytics, and onboarding
│   ├── components/           Restaurant UI
│   └── lib/                  API, Cloudinary, and Firebase helpers
├── rider/                    Rider workspace
│   ├── app/                  Login, deliveries, earnings, history, and profile
│   ├── components/           Rider shell and UI
│   └── lib/                  API and Firebase helpers
├── admin/                    Platform administration workspace
│   ├── app/                  Admin routes and providers
│   ├── components/           Dashboard and management UI
│   └── lib/                  API and Firebase helpers
├── backend/
│   ├── api/index.ts          Vercel serverless entry point
│   ├── prisma/schema.prisma  Database models and enums
│   ├── prisma/migrations/    Database migrations
│   ├── prisma/seed.ts        Demo restaurant seed data
│   └── src/
│       ├── app.ts            Express application and middleware
│       ├── server.ts         Local HTTP server
│       ├── config/           Environment, Firebase, and Prisma config
│       ├── middleware/       Authentication and authorization
│       ├── routes/           REST API route modules
│       ├── services/         Order and restaurant services
│       └── sockets/          Socket.IO setup
├── package.json              npm workspace scripts
└── README.md
```

## Features

### Customer storefront

- Restaurant discovery with search and cuisine filters
- Restaurant pages with menus and available items
- Cart and checkout
- Address management
- Firebase login and account verification
- Owner and rider applications
- Restaurant favorites and notifications
- Razorpay order creation and server-side signature verification
- Coupon validation
- Customer order history

### Restaurant owner portal

- Owner onboarding and document submission
- Restaurant profile and operating hours
- Menu categories and menu items
- Dish and restaurant image uploads
- Incoming order management
- Analytics, offers, reviews, and payouts
- Notifications

### Rider portal

- Rider login
- Rider profile and vehicle details
- Online/offline availability
- Delivery dashboard
- Active deliveries and status updates
- Delivery history and earnings
- Notifications

### Admin portal

- Platform dashboard
- Restaurant and rider application review
- User role and suspension management
- Restaurant, rider, and order management
- Payment monitoring
- Coupon and cuisine management
- Review moderation

## Prerequisites

- Node.js 20 or newer
- npm
- PostgreSQL 14 or newer, or a hosted PostgreSQL/Supabase database
- A Firebase project
- Optional: Cloudinary account
- Optional: Razorpay test account
- Optional: Vercel account for deployment

## Local development

Install all workspace dependencies from the repository root:

```bash
npm install
npx prisma generate --schema=backend/prisma/schema.prisma
npm run prisma:generate
```

Create environment files from the provided examples:

```text
frontend/.env.local
restaurant/.env
rider/.env
admin/.env
backend/.env
```

Set a PostgreSQL database URL and start the services:

```bash
npm run dev:backend
npm run dev:frontend
npm run dev:restaurant
npm run dev:rider
npm run dev:admin
```

Or start the customer app and API together:

```bash
npm run dev
```

The default URLs are:

```text
Customer:   http://localhost:3000
Restaurant: http://localhost:3001
Rider:      http://localhost:3002
Admin:      http://localhost:3003
Backend:    http://localhost:5000
API health: http://localhost:5000/api/health
```

Restart an application after changing a `NEXT_PUBLIC_*` environment variable.

## Environment variables

### Shared frontend variable

```bash
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

For production, use the active HTTPS API URL, for example:

```bash
NEXT_PUBLIC_API_URL=https://cravio-api.vercel.app/api
```

Remote API URLs must use HTTPS. Browsers will block HTTP API requests from an HTTPS-hosted frontend as mixed content.

### Firebase frontend variables

Use the same Firebase web app configuration in every frontend:

```bash
NEXT_PUBLIC_FIREBASE_API_KEY=your-firebase-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-messaging-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
```

The customer app additionally supports:

```bash
NEXT_PUBLIC_RESTAURANT_APP_URL=http://localhost:3001
NEXT_PUBLIC_RIDER_APP_URL=http://localhost:3002
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_your_key_id
```

### Backend variables

```bash
DATABASE_URL=postgresql://postgres:password@localhost:5432/luxebites?schema=public
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:3000,http://localhost:3001,http://localhost:3002,http://localhost:3003
```

Add the deployed frontend origins to `CLIENT_URL` in production:

```text
https://cravioo.vercel.app,
https://cravio-restaurant.vercel.app,
https://cravio-rider.vercel.app,
https://cravioo-admin.vercel.app
```

Firebase Admin:

```bash
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

Integrations:

```bash
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-cloudinary-api-key
CLOUDINARY_API_SECRET=your-cloudinary-api-secret

RAZORPAY_KEY_ID=rzp_test_your-key
RAZORPAY_KEY_SECRET=your-razorpay-secret
```

For Supabase, prefer the IPv4-compatible PostgreSQL session pooler URL:

```text
postgresql://postgres.project-ref:password@aws-region.pooler.supabase.com:5432/postgres?connection_limit=1
```

The backend defaults each Prisma client to one database connection to avoid exhausting the session pool across Vercel serverless instances. An explicit `connection_limit` in `DATABASE_URL` is preserved.

## Database setup

Generate the Prisma client:

```bash
npm run prisma:generate
```

Apply migrations to an existing database:

```bash
cd backend
npx prisma migrate deploy
```

Create a local migration while developing:

```bash
cd backend
npx prisma migrate dev
```

Seed demo restaurant, cuisine, category, and menu data:

```bash
cd backend
npm run db:seed
```

The seed creates a demo restaurant owner and sample restaurants, but Firebase sign-in still requires the corresponding Firebase project configuration.

### Core database entities

- Users and role assignments
- Restaurants and operating hours
- Cuisines, menu categories, and menu items
- Addresses, carts, cart items, and favorites
- Orders and order items
- Payments and Razorpay metadata
- Riders and delivery tasks
- Rider earnings and restaurant payouts
- Restaurant/rider applications
- Coupons and coupon usage
- Reviews and notifications

## API overview

All routes are mounted under `/api`. Public catalog and health endpoints do not require Firebase authentication.

### Health

```text
GET /api/health
GET /
GET /health
```

### Authentication

```text
POST /api/auth/sync
GET  /api/auth/me
GET  /api/auth/admin/me
```

`POST /api/auth/sync` accepts a Firebase Bearer token and creates or updates the platform user.

### Restaurants and catalogs

```text
GET /api/restaurants
GET /api/restaurants/:slug
```

Restaurant owner routes include profile, hours, menu, orders, offers, analytics, and review data under `/api/restaurant`.

### Customer orders

```text
GET  /api/orders
GET  /api/orders/:id
POST /api/orders
POST /api/orders/:id/cancel
POST /api/orders/payment/order
POST /api/orders/payment/verify
POST /api/orders/coupon/validate
```

### Rider

```text
POST  /api/rider/apply
GET   /api/rider/me
PATCH /api/rider/profile
GET   /api/rider/dashboard
GET   /api/rider/deliveries
GET   /api/rider/deliveries/:id
PATCH /api/rider/deliveries/:id/status
PATCH /api/rider/availability
GET   /api/rider/history
GET   /api/rider/earnings
POST  /api/rider/location
```

### Applications

```text
GET  /api/applications/status
POST /api/applications/owner
POST /api/applications/rider
```

### Notifications and uploads

```text
GET  /api/notifications
PATCH /api/notifications/:id/read
POST /api/notifications/read-all
POST /api/uploads/signature
```

### Admin

The `/api/admin` route group provides dashboard metrics and management endpoints for:

- Applications
- Restaurants and riders
- Users and role assignments
- Orders and payments
- Reviews
- Coupons
- Cuisines

Protected routes require:

```text
Authorization: Bearer <Firebase ID token>
```

## User roles and access

| Role | Portal | Primary access |
| --- | --- | --- |
| `CUSTOMER` | Customer app | Shopping, checkout, applications, profile |
| `RESTAURANT_OWNER` | Restaurant app | Restaurant and menu operations |
| `RIDER` | Rider app | Deliveries, earnings, availability |
| `ADMIN` | Admin app | Platform administration |

Additional roles can be assigned in `UserRoleAssignment`, but partner access is protected according to the user’s primary role.

## Available commands

Run commands from the repository root unless stated otherwise.

### Development

```bash
npm run dev
npm run dev:frontend
npm run dev:restaurant
npm run dev:rider
npm run dev:admin
npm run dev:backend
```

### Production builds

```bash
npm run build:frontend
npm run build:restaurant
npm run build:rider
npm run build:admin
npm run build:backend
```

### Linting

```bash
npm run lint:frontend
cd restaurant && npm run lint
cd rider && npm run lint
cd admin && npm run lint
```

### Prisma

```bash
npm run prisma:generate
cd backend && npm run prisma:migrate
cd backend && npm run prisma:studio
cd backend && npm run db:seed
```

## Production deployment

### Frontends on Vercel

Deploy each Next.js application from its own workspace directory or configure a Vercel project with the correct root directory:

```text
frontend
restaurant
rider
admin
```

Set the relevant `NEXT_PUBLIC_*` and Firebase variables in each Vercel project.

### Backend on Vercel

Configure the backend project with:

```text
Root Directory: backend
Build Command: npm run build
Output: Vercel API function
```

Set all backend environment variables in Vercel, including `DATABASE_URL`, Firebase Admin credentials, Cloudinary credentials, Razorpay credentials, and `CLIENT_URL`.

The backend contains a Vercel entry point at `backend/api/index.ts` and routing configuration at `backend/vercel.json`.

Use a single API hostname consistently across all frontend projects. Consolidating the API to one hostname avoids stale deployments and CORS mismatches:

```text
https://cravio-api.vercel.app/api
```

or:

```text
https://cravioo-api.vercel.app/api
```

Do not use HTTP for a deployed API.

## Troubleshooting

### Mixed content error

This occurs when an HTTPS frontend calls an HTTP backend.

Set:

```bash
NEXT_PUBLIC_API_URL=https://your-api-host.vercel.app/api
```

Then redeploy the frontend.

### CORS preflight error

Confirm that:

1. The backend deployment is the latest repository build.
2. `CLIENT_URL` includes the exact frontend origin, including `https://`.
3. The frontend does not contain a trailing slash mismatch.
4. Vercel routing is configured to expose `/api/*`.

Test a preflight locally:

```bash
curl.exe -i -X OPTIONS "http://localhost:5000/api/auth/sync" ^
  -H "Origin: http://localhost:3002" ^
  -H "Access-Control-Request-Method: POST" ^
  -H "Access-Control-Request-Headers: authorization,content-type"
```

### Database connection errors

- Verify `DATABASE_URL`.
- Verify that the database allows connections from the deployment platform.
- Use the Supabase session pooler for IPv4-only or restricted networks.
- Run `npx prisma migrate deploy`.

### Firebase authentication errors

- Confirm Firebase web configuration matches the selected project.
- Confirm the authorized domain is added to Firebase Authentication.
- Confirm Email/Password and Google providers are enabled.
- Configure Firebase Admin credentials for the backend.
- Verify that the user passed `/api/auth/sync`.

### Rider or restaurant access denied

The account must:

- Exist in Firebase
- Be synchronized through `/api/auth/sync`
- Have the correct primary role
- Be active rather than suspended
- Have an approved application where applicable

## Security

- Never commit database passwords, Firebase private keys, Cloudinary secrets, Razorpay secrets, or populated `.env` files.
- Keep Firebase private keys and Razorpay/Cloudinary secrets server-side.
- `NEXT_PUBLIC_*` variables are visible in browser bundles.
- Production API hosts must use HTTPS.
- Review CORS origins and backend environment variables during deployment.
- Rotate any credentials that have already been committed or exposed.
