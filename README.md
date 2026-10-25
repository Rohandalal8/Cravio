# Cravio

Cravio is a premium food discovery and delivery platform built with Next.js, Express, Prisma, PostgreSQL, and Firebase Authentication.

The current repository contains the customer application and shared backend foundation. The persistent catalog slice includes Prisma-backed restaurant discovery, restaurant detail, cuisines, menu categories, menu items, and development seed data.

## Architecture

```mermaid
flowchart LR
    A[Customer Browser] --> B[Next.js Customer App]
    B --> C[Express Cravio API]
    C --> D[Prisma ORM]
    D --> E[PostgreSQL]
    C --> F[Firebase Auth]
```

## Project structure

```text
Cravio/
├─ frontend/       # customer app, port 3000
├─ restaurant/     # restaurant operations app, port 3001
├─ rider/          # rider app, port 3002
├─ admin/          # admin app, port 3003
├─ backend/        # single shared API, port 5000
├─ package.json
├─ README.md
└─ .gitignore
```

## Local setup

Create `.env.local` in `frontend` and `.env` in `backend` from the existing example files.

```bash
# frontend/.env.local
NEXT_PUBLIC_API_URL=http://localhost:5000/api

# backend/.env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/cravio?schema=public"
PORT=5000
CLIENT_URL="http://localhost:3001"
NODE_ENV="development"
```

For Supabase, copy the session pooler URL from **Project Settings > Database**.
Use the `*.pooler.supabase.com:5432` host instead of the direct
`db.<project-ref>.supabase.co:5432` host when the local network does not support
IPv6. The pooler username includes the project reference:
`postgres.<project-ref>`.

Start the applications:

```bash
cd backend
npm install
npx prisma generate
npm run db:seed
npm run dev
```

```bash
cd frontend
npm install
npm run dev
```

The customer app runs at `http://localhost:3001`; the API runs at `http://localhost:5000`.

## Catalog API

- `GET /api/restaurants` lists active restaurants with search, cuisine, rating, and vegetarian filters.
- `GET /api/restaurants/:slug` returns a restaurant and its available menu categories and items.
- `GET /api/health` verifies API availability.

Checkout, role-based ownership, applications, delivery assignment, and authenticated Socket.IO rooms are implemented on the shared backend. Payment provider integration, notification persistence, and dedicated authentication screens remain deployment work.

## Workspace commands

```bash
npm run dev:frontend
npm run dev:restaurant
npm run dev:rider
npm run dev:admin
npm run dev:backend
```

Restaurant, rider, and admin dashboards call the shared protected APIs. Set a Firebase ID token in browser local storage under `cravio-token` while those authentication screens are being completed.
