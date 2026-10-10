# HarvestWindow

Harvest-readiness and agronomic window forecasting platform for agricultural producers.

## Project Structure

```
HarvestWindow/
├── backend/       # Node.js + Express + Prisma + MySQL API (Phase 2 Farm Management)
└── frontend/      # React 19 + TypeScript + Vite frontend application
```

## Getting Started

### 1. Backend

Navigate to the `backend` folder:

```bash
cd backend
npm install
# Configure your MySQL credentials in .env
npm run prisma:generate
npm run dev
```

Run backend automated tests:
```bash
npm test
```

### 2. Frontend

Navigate to the `frontend` folder:

```bash
cd frontend
npm install
npm run dev
```
