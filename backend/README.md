# HarvestWindow — Farm Management Backend (Phase 2)

Node.js, Express, MySQL, and Prisma backend implementing the complete, secure Farm Management module for HarvestWindow.

---

## 1. Technology Stack

- **Runtime:** Node.js (v22+)
- **Framework:** Express.js 4 (ES modules)
- **Database & ORM:** MySQL 8.0, Prisma ORM 5
- **Validation:** Zod 3
- **Security & Auth:** JSON Web Tokens (`jsonwebtoken`), `bcryptjs`, `helmet`, `cors`
- **Testing:** Native Node.js test runner (`node:test`, `node:assert`)

---

## 2. Project Architecture

```
backend/
├── prisma/
│   ├── schema.prisma                  # Prisma models: User, Farm
│   └── migrations/
│       └── 20261010000000_init_farms/ # Initial SQL migration
├── src/
│   ├── config/
│   │   └── prisma.js                  # Shared Prisma client singleton
│   ├── middleware/
│   │   ├── authenticate.js            # JWT Bearer token authentication & identity extraction
│   │   ├── validate.js                # Zod request validation middleware
│   │   └── errorHandler.js            # Centralized safe error and 404 handler
│   ├── modules/
│   │   ├── auth/                      # Phase 1 integration boundary
│   │   │   ├── auth.service.js
│   │   │   ├── auth.controller.js
│   │   │   └── auth.routes.js
│   │   └── farms/                     # Phase 2 Farm Management Module
│   │       ├── farms.validation.js    # Zod schemas for create, update, params
│   │       ├── farms.service.js       # Database business logic & ownership queries
│   │       ├── farms.controller.js    # HTTP request/response handlers
│   │       └── farms.routes.js        # Protected Express route definitions
│   ├── app.js                         # Express application setup
│   └── server.js                      # Server startup and graceful shutdown
├── tests/
│   └── farms.test.js                  # Comprehensive unit & integration test suite
├── .env.example
├── .env
└── package.json
```

---

## 3. Database Setup & Configuration

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Update your MySQL connection string in `.env`:
   ```env
   DATABASE_URL="mysql://root:YOUR_PASSWORD@localhost:3306/harvestwindow"
   PORT=5000
   JWT_SECRET="harvestwindow-jwt-super-secret-key-2026"
   ```

3. Run Prisma migration to apply schema to MySQL:
   ```bash
   npm run prisma:migrate
   ```
   *(Or generate Prisma client: `npm run prisma:generate`)*

---

## 4. Running the Application

### Development mode:
```bash
npm run dev
```

### Production mode:
```bash
npm start
```

### Run Tests:
```bash
npm test
```

---

## 5. REST API Documentation

### A. Farm Management (`/api/farms`) — All Protected with `Authorization: Bearer <token>`

| Method | Endpoint | Description | Status Code |
|---|---|---|---|
| `GET` | `/api/farms` | List all farms owned by the authenticated user (sorted newest first) | `200 OK` |
| `POST` | `/api/farms` | Create a new farm for the authenticated user | `201 Created` |
| `GET` | `/api/farms/:farmId` | Retrieve a single farm by ID (enforcing ownership) | `200 OK` / `404` |
| `PUT` | `/api/farms/:farmId` | Update farm details (enforcing ownership) | `200 OK` / `404` |
| `PATCH` | `/api/farms/:farmId` | Partial update of farm details | `200 OK` / `404` |
| `DELETE` | `/api/farms/:farmId` | Safely delete a farm | `200 OK` / `404` |

#### Example: Create Farm Request Body (`POST /api/farms`)
```json
{
  "name": "Greenridge Farm",
  "state": "Karnataka",
  "district": "Hassan",
  "latitude": 13.0068,
  "longitude": 76.1001,
  "area": 12.5,
  "areaUnit": "hectare",
  "notes": "Irrigated bore-well blocks with two rainfed fields."
}
```

#### Example: Success Response (`201 Created` / `200 OK`)
```json
{
  "success": true,
  "data": {
    "id": "c1f7b7e2-4144-484d-a912-70b99f36f90d",
    "name": "Greenridge Farm",
    "state": "Karnataka",
    "district": "Hassan",
    "latitude": 13.0068,
    "longitude": 76.1001,
    "area": 12.5,
    "areaUnit": "hectare",
    "notes": "Irrigated bore-well blocks with two rainfed fields.",
    "createdAt": "2026-10-10T10:00:00.000Z",
    "updatedAt": "2026-10-10T10:00:00.000Z"
  }
}
```

#### Example: Validation Error (`422 Unprocessable Entity`)
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "area",
      "message": "Field size must be a number greater than zero"
    },
    {
      "field": "longitude",
      "message": "Latitude and longitude must both be provided together"
    }
  ]
}
```

---

### B. Authentication Boundary (`/api/auth`)

- `POST /api/auth/login` — Sign in with email and password (demo credentials: `ananya@harvestwindow.demo` / `harvest-demo`).
- `POST /api/auth/register` — Register a new farmer account.
- `POST /api/auth/demo` — Instant demo session token generation.
- `GET /api/auth/me` — Authenticated profile details (`Bearer` token required).
