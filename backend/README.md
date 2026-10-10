# HarvestWindow Authentication & Backend Service

Production-minded authentication and role-based authorization backend for **HarvestWindow**, engineered with Express.js, Prisma ORM, MySQL, Argon2id, and JWT with HttpOnly refresh-session rotation.

---

## 1. Architecture Overview

- **Runtime**: Node.js (ES Modules)
- **Framework**: Express.js
- **Database**: MySQL 8.0+
- **ORM**: Prisma ORM
- **Password Hashing**: Argon2id (`argon2`)
- **Access Authentication**: Short-lived JWT (15 minutes) signed with `HS256` containing `sub`, `role`, and `jti` (unique UUID)
- **Refresh Session**: Cryptographically secure random tokens stored only as SHA-256 hashes in MySQL, rotated on each refresh, protected in `HttpOnly`, `SameSite=Lax`, `Secure` (in prod) cookies
- **Request Validation**: Zod schemas for all inbound payloads
- **Security Middlewares**: Helmet security headers, strict origin CORS with credentials, express-rate-limit

---

## 2. Directory Structure

```text
backend/
├── prisma/
│   ├── migrations/
│   │   └── 20261010101429_init_auth/
│   │       └── migration.sql
│   ├── schema.prisma
│   └── seed.js
├── src/
│   ├── config/
│   │   ├── env.js
│   │   └── prisma.js
│   ├── middleware/
│   │   ├── authenticate.js
│   │   ├── authorize.js
│   │   ├── errorHandler.js
│   │   ├── rateLimiter.js
│   │   └── validate.js
│   ├── modules/
│   │   ├── auth/
│   │   │   ├── auth.controller.js
│   │   │   ├── auth.routes.js
│   │   │   ├── auth.service.js
│   │   │   └── auth.validation.js
│   │   └── users/
│   │       ├── users.controller.js
│   │       ├── users.routes.js
│   │       └── users.service.js
│   ├── app.js
│   └── server.js
├── tests/
│   └── auth.test.js
├── .env.example
├── .gitignore
├── package.json
├── postman_collection.json
└── README.md
```

---

## 3. Environment Configuration

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

### Required Variables:

```dotenv
NODE_ENV=development
PORT=5000
FRONTEND_URL=http://localhost:5173

DATABASE_URL="mysql://USER:PASSWORD@localhost:3306/harvestwindow"
TEST_DATABASE_URL="mysql://USER:PASSWORD@localhost:3306/harvestwindow_test"

JWT_ACCESS_SECRET="generate_at_least_32_characters_random_secret"
JWT_REFRESH_SECRET="generate_at_least_32_characters_random_secret"
JWT_ACCESS_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"
JWT_ISSUER="harvestwindow-auth"
JWT_AUDIENCE="harvestwindow-app"

COOKIE_SECURE=false
COOKIE_SAME_SITE=lax

# Administrator seed credentials (for one-time seed)
ADMIN_NAME="System Administrator"
ADMIN_EMAIL="admin@harvestwindow.local"
ADMIN_PASSWORD="StrongAdminPassword123!"
```

---

## 4. Setup, Migration & Seed Commands

### Install Dependencies
```bash
npm install
```

### Apply Database Migrations
```bash
# Apply migrations to development database
npm run prisma:migrate

# Or deploy existing migrations without schema drift
npm run prisma:deploy
```

### Initialize System Administrator (One-Time Seed)
Public registration assigns `FARMER` by default and forbids `ADMIN` assignment. To initialize the administrative account:
```bash
npm run db:seed
```
This reads `ADMIN_NAME`, `ADMIN_EMAIL`, and `ADMIN_PASSWORD` from `.env`, hashes the password with Argon2id, and writes the `ADMIN` record to MySQL.

---

## 5. Running the Application

### Development (with Nodemon)
```bash
npm run dev
```

### Production
```bash
npm start
```

---

## 6. Running Automated Tests

Run the complete 18-scenario automated test suite against the isolated `harvestwindow_test` database:
```bash
npm test
```

### Verified Test Cases:
1. User registration with default `FARMER` role and safe profile return.
2. Duplicate email rejection (HTTP 409 Conflict).
3. Invalid email and weak password validation rejection (HTTP 400).
4. Successful login returning short-lived access token, safe user, and HttpOnly refresh cookie.
5. Invalid password login rejection with generic error message (HTTP 401).
6. Nonexistent email login rejection with identical generic error message (HTTP 401).
7. Inactive account rejection (HTTP 403 Forbidden).
8. Unauthorized `/api/v1/auth/me` rejection without Bearer token (HTTP 401).
9. Authorized `/api/v1/auth/me` returning current user profile (HTTP 200).
10. Corrupted or expired access token rejection (HTTP 401).
11. Refresh token rotation issuing new access token and rotating refresh cookie.
12. Reuse detection for already revoked refresh tokens triggering breach safeguards.
13. Successful logout invalidating refresh session and expiring the cookie.
14. Role-based access control (`FARMER` denied access to `ADMIN` endpoints).
15. Strict prevention of `ADMIN` role assignment during public registration.
16. Resource ownership checks preventing unauthorized access across users.
17. Verification that password hashes are never exposed in any API responses.
18. Strict CORS and Helmet security headers enforcement.

---

## 7. API Endpoints Reference

### Authentication (`/api/v1/auth`)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/register` | Public (Rate Limited) | Register new user account (defaults to `FARMER`) |
| `POST` | `/login` | Public (Rate Limited) | Authenticate user, receive JWT access token + HttpOnly cookie |
| `GET` | `/me` | Bearer Token | Fetch authenticated user profile |
| `POST` | `/refresh` | HttpOnly Cookie | Rotate refresh token and issue new access token |
| `POST` | `/logout` | Optional Cookie | Revoke refresh session and clear cookie |

### Users & Authorization (`/api/v1/users`)

| Method | Endpoint | Roles | Description |
|---|---|---|---|
| `GET` | `/profile` | Any Authenticated | Get current user's profile |
| `PATCH` | `/profile` | Any Authenticated | Update allowed profile fields (role cannot be changed) |
| `GET` | `/admin-dashboard` | `ADMIN` only | Restricted administrative workspace |
| `GET` | `/farmer-dashboard` | `FARMER`, `ADMIN` | Farmer workspace |
| `GET` | `/farms/:ownerId` | Owner or `ADMIN` | Ownership-verified farm access |

### System

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/v1/health` | Public | Service health and uptime |
