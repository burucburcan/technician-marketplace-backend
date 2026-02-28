# Technician Marketplace Platform

A comprehensive platform connecting users with qualified technicians and artists for home repair, maintenance, and artistic services in Mexico and South America.

## Project Structure

```
technician-marketplace-platform/
├── packages/
│   ├── backend/              # NestJS backend API
│   ├── web-frontend/         # React web application
│   └── mobile-frontend/      # React Native mobile app
├── .github/
│   └── workflows/            # CI/CD pipelines
├── docker-compose.yml        # Docker services configuration
└── package.json              # Root package.json for monorepo
```

## Tech Stack

### Backend
- **Runtime**: Node.js 20 + TypeScript
- **Framework**: NestJS
- **Databases**: PostgreSQL, Redis, MongoDB, ElasticSearch
- **Testing**: Jest, fast-check (property-based testing)

### Web Frontend
- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **State Management**: Redux Toolkit
- **Testing**: Vitest

### Mobile Frontend
- **Framework**: React Native + Expo
- **State Management**: Redux Toolkit
- **Testing**: Jest

## Prerequisites

- Node.js >= 20.0.0
- npm >= 10.0.0
- Docker and Docker Compose

## Getting Started

### 1. Clone the repository

```bash
git clone <repository-url>
cd technician-marketplace-platform
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up environment variables

```bash
cp .env.example .env
# Edit .env with your configuration
```

### 4. Start Docker services

```bash
npm run docker:up
```

This will start:
- PostgreSQL on port 5432
- Redis on port 6379
- MongoDB on port 27017
- ElasticSearch on ports 9200 and 9300

### 5. Start development servers

```bash
# Start all services
npm run dev

# Or start individually
npm run dev --workspace=@technician-marketplace/backend
npm run dev --workspace=@technician-marketplace/web-frontend
npm run dev --workspace=@technician-marketplace/mobile-frontend
```

## Available Scripts

### Root Level

- `npm run dev` - Start all development servers
- `npm run build` - Build all packages
- `npm run test` - Run all tests
- `npm run lint` - Lint all packages
- `npm run format` - Format code with Prettier
- `npm run docker:up` - Start Docker services
- `npm run docker:down` - Stop Docker services
- `npm run docker:logs` - View Docker logs

### Backend

- `npm run dev --workspace=@technician-marketplace/backend` - Start backend dev server
- `npm run build --workspace=@technician-marketplace/backend` - Build backend
- `npm run test --workspace=@technician-marketplace/backend` - Run backend tests

### Web Frontend

- `npm run dev --workspace=@technician-marketplace/web-frontend` - Start web dev server
- `npm run build --workspace=@technician-marketplace/web-frontend` - Build web app
- `npm run test --workspace=@technician-marketplace/web-frontend` - Run web tests

### Mobile Frontend

- `npm run dev --workspace=@technician-marketplace/mobile-frontend` - Start Expo dev server
- `npm run android --workspace=@technician-marketplace/mobile-frontend` - Run on Android
- `npm run ios --workspace=@technician-marketplace/mobile-frontend` - Run on iOS

## Docker Services

The platform uses the following Docker services:

- **PostgreSQL 15**: Primary relational database
- **Redis 7**: Caching and session storage
- **MongoDB 6**: Document storage for messages and logs
- **ElasticSearch 8**: Search engine for professionals

## Testing

The project uses multiple testing frameworks:

- **Jest**: Unit and integration tests for backend
- **Vitest**: Unit tests for web frontend
- **fast-check**: Property-based testing for critical business logic

Run all tests:
```bash
npm run test
```

## CI/CD

GitHub Actions workflows are configured for:

- **CI Pipeline**: Runs on every push and PR
  - Linting
  - Testing (with database services)
  - Building

- **Deploy Pipeline**: Runs on main branch
  - Deploys backend
  - Deploys web frontend

## Project Status

This is the initial project setup. See `.kiro/specs/technician-marketplace-platform/tasks.md` for the implementation plan.

## License

Private - All rights reserved
