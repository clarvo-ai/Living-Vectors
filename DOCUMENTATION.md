# Living Vectors Project Documentation

## Overview

Living Vectors template is a full-stack application template built with a modern monorepo architecture using Turbo.js. The project combines a Next.js frontend with a Python FastAPI backend, all orchestrated through Docker Compose for seamless development and deployment.

## Project Architecture

This is a monorepo that uses:

- **Turbo.js** for build orchestration and task management
- **Docker Compose** for containerized development environment
- **Next.js** for the frontend web application
- **FastAPI** for the Python backend API
- **PostgreSQL** for the database
- **Prisma** for database schema management and migrations

## Folder Structure

### Root Directory

```
living-vectors/
├── apps/                    # Application packages
├── packages/               # Shared packages and utilities
├── workspaces/            # VS Code workspace configuration
├── scripts/               # Build and deployment scripts
├── docker-compose.yml     # Docker orchestration
├── turbo.json            # Turbo build configuration
├── package.json          # Root package.json with workspace config
└── README.md             # Development guide and helpful information
```

## Apps Folder Structure

The `apps/` directory contains the main application packages:

### `apps/lv-web/`

**Next.js Frontend Application**

```
lv-web/
├── src/                   # Source code
├── public/               # Static assets
├── components.json       # shadcn/ui configuration
├── Dockerfile           # Production Docker build
├── Dockerfile.web       # Development Docker build
├── next.config.ts       # Next.js configuration
├── tailwind.config.ts   # Tailwind CSS configuration
├── package.json         # Dependencies and scripts
└── tsconfig.json        # TypeScript configuration
```

**Key Features:**

- Built with Next.js 15.2.3 and React 18
- Uses Tailwind CSS for styling
- Integrates shadcn/ui components
- Configured with TypeScript
- Includes ESLint and Prettier for code quality
- Uses Turbopack for fast development builds

**Dependencies:**

- UI: Radix UI components, Lucide React icons
- Forms: React Hook Form with Zod validation
- Auth: NextAuth.js
- Database: Prisma client via `@repo/db`

### `apps/lv-pyapi/`

**Python FastAPI Backend**

```
lv-pyapi/
├── main.py              # FastAPI application entry point
├── database.py          # Database connection and models
├── requirements.txt     # Python dependencies
├── Dockerfile          # Docker build configuration
└── __init__.py         # Python package initialization
```

**Key Features:**

- FastAPI framework for high-performance API
- SQLAlchemy for database ORM
- Pydantic for data validation
- PostgreSQL integration
- Containerized with Docker

> **Note**: The current folder structure is minimal and should be improved as the API grows. Consider organizing into modules like `routers/`, `models/`, `services/`, `schemas/`, etc.

**Dependencies:**

- FastAPI 0.115.2 with Uvicorn server
- SQLAlchemy 2.0.27 for ORM
- Pydantic for data validation
- psycopg2-binary for PostgreSQL connection

## Packages Folder Structure

The `packages/` directory contains shared libraries and utilities:

### `packages/database/`

**Database Schema and Prisma Configuration**

```
database/
├── prisma/              # Prisma schema and migrations
├── src/                # Database utilities and exports
├── package.json        # Database package configuration
└── Dockerfile.web      # Docker build for migrations
```

**Purpose:**

- Centralized database schema management
- Prisma client generation
- Database migrations and seeding
- Shared database types and utilities

**Scripts:**

- `db:generate` - Generate Prisma client
- `db:migrate` - Run database migrations
- `db:deploy` - Deploy migrations to production
- `db:seed` - Seed database with initial data

### `packages/python-utils/`

**Python Shared Utilities**

```
python-utils/
├── src/                # Python utility modules
│   └── typegen/       # Type generation from database
└── setup.py           # Python package setup
```

**Purpose:**

- Shared Python utilities across Python applications
- Database type generation for Python
- Common functions and classes

### `packages/ts-shared/`

**TypeScript Shared Libraries**

```
ts-shared/
├── lib/               # Shared TypeScript libraries
└── ui/                # Shared UI components
```

**Purpose:**

- Shared TypeScript utilities and types
- Reusable UI components
- Common business logic

### `packages/lib/`

**Additional Shared Libraries**

Contains additional shared utilities and helper functions used across the monorepo.

## Docker Compose Configuration

The `docker-compose.yml` file defines multiple services and profiles for different development scenarios:

### Services Overview

#### Core Application Services

**`lv-web`** (Profile: `lv-web`)

- **Purpose**: Development Next.js frontend
- **Port**: 3045:3000
- **Features**: Hot reload, development mode
- **Dependencies**: Database, Python API

**`lv-web-build`** (Profile: `lv-web-build`)

- **Purpose**: Production-optimized Next.js build
- **Port**: 3045:3000
- **Features**: Optimized build, production environment

**`lv-pyapi`** (Profile: `lv-web`, `lv-pyapi`)

- **Purpose**: Python FastAPI backend
- **Port**: 8091:8000
- **Features**: Auto-reload, development mode
- **Dependencies**: Database

#### Database Services

**`db`** (Profile: Multiple)

- **Purpose**: PostgreSQL database
- **Port**: 3772:5432
- **Image**: Custom PostgreSQL with initialization
- **Credentials**: postgres/postgres

#### Utility Services

**`prisma-migrate`** (Profile: `prisma-migrate`)

- **Purpose**: Run database migrations
- **Usage**: One-time execution for schema updates

**`python-typegen`** (Profile: `python-typegen`)

- **Purpose**: Generate Python types from database schema
- **Usage**: Run after schema changes

**`container-node-modules`** (Profile: `container-node-modules`)

- **Purpose**: Install node_modules in Linux container
- **Usage**: Solve cross-platform dependency issues

### Docker Profiles Usage

#### Development Profiles

**LV-WEB Development:**

```bash
docker compose --profile lv-web up -d --build
```

- Starts: Frontend (dev mode) + Backend + Database
- Features: Hot reload, development optimizations
- Use case: Full-stack development

**LV-WEB Production Build:**

```bash
docker compose --profile lv-web-build up -d --build
```

- Starts: Frontend (production build) + Database
- Features: Optimized build, production environment
- Use case: Testing production builds locally

**LV-PYAPI Only:**

```bash
docker compose --profile lv-pyapi up -d --build
```

- Starts: Backend + Database only
- Use case: Backend-only development or API testing

#### Utility Profiles

**Database Migrations:**

```bash
docker compose run --rm prisma-migrate
```

- Runs database migrations
- Use case: After modifying Prisma schema

**Python Type Generation:**

```bash
docker compose run --rm python-typegen
```

- Generates Python types from database
- Use case: After database schema changes

**Node Modules (Cross-platform):**

```bash
docker compose run --rm container-node-modules
```

- Installs dependencies in Linux container
- Use case: Solving Windows/macOS compatibility issues
- Can be used if npm install doesn't work

## README Usage and Development Workflow

The `README.md` file serves as a quick reference guide for common development tasks:

### Key Workflows

#### Initial Project Setup

1. Clone repository
2. Configure environment files
3. Run database migrations
4. Choose appropriate Docker profile

#### Daily Development

1. Sync with dev branch
2. Run migrations if needed
3. Start appropriate Docker profile
4. View logs and manage containers

#### Database Management

- **Migrations**: Apply schema changes
- **Type Generation**: Sync Python types with database
- **Direct Access**: Connect to PostgreSQL directly

#### Git Collaboration

- **Issue-based workflow**: GitHub Issues integration
- **Branch naming**: Structured branch naming convention
- **PR process**: Feature → dev → main workflow

### Environment Profiles

The project supports multiple development environments:

1. **Full Development** (`lv-web`): Complete stack with hot reload
2. **Production Testing** (`lv-web-build`): Test production builds
3. **Backend Only** (`lv-pyapi`): API development and testing

### Monitoring and Debugging

**Container Logs:**

```bash
docker compose logs -f $(docker compose ps --services --filter "status=running")
```

**Database Access:**

```bash
sudo docker exec -it $(docker ps -q --filter name=lv-db) psql -U postgres
```

**VS Code Integration:**

- Docker/Containers extension for container management
- Workspace configuration in `workspaces/`

## Development Best Practices

### Code Quality

- **TypeScript**: Strict type checking across frontend
- **ESLint/Prettier**: Automated code formatting
- **Turbo**: Optimized build caching and task execution

### Database Management

- **Prisma**: Type-safe database access
- **Migrations**: Version-controlled schema changes
- **Type Generation**: Automatic Python type sync

### Containerization

- **Development**: Volume mounts for hot reload
- **Production**: Optimized builds and minimal images
- **Cross-platform**: Linux container compatibility

### Monorepo Benefits

- **Shared Dependencies**: Centralized package management
- **Type Safety**: Shared types across frontend/backend
- **Build Optimization**: Turbo caching and parallel execution
- **Code Reuse**: Shared utilities and components

## Getting Started

1. **Clone and Setup:**

   ```bash
   git clone <repository-url>
   cd living-vectors
   ```

2. **Environment Configuration:**
   - Configure `.env` files for each app
   - Set up database credentials

3. **Initialize Database:**

   ```bash
   docker compose run --rm prisma-migrate
   ```

4. **Start Development:**

   ```bash
   docker compose --profile lv-web up -d --build
   ```

5. **Access Applications:**
   - Frontend: http://localhost:3045
   - Backend API: http://localhost:8091
   - Database: localhost:3772

This documentation provides a comprehensive overview of the Living Vectors project structure, Docker configuration, and development workflows. For specific implementation details, refer to individual package README files and source code.
