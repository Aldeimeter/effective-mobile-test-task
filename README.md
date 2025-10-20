# User Management Service

**Production-ready RESTful API for user authentication and management with comprehensive testing, CI/CD, and Docker deployment.**

Built with Express.js, TypeScript, PostgreSQL, Redis, and Prisma. Features JWT authentication, role-based access control, full test coverage, Swagger documentation, and automated CI/CD pipeline.

## Table of Contents

- [Quick Start](#quick-start)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Technical Requirements](#technical-requirements)
- [API Endpoints](#api-endpoints)
- [Project Structure](#project-structure)
- [API Response Format](#api-response-format)
- [Security & Implementation Details](#security--implementation-details)
- [Access Control Rules](#access-control-rules)
- [Environment Variables](#environment-variables)
- [Getting Started](#getting-started)
- [Running Tests](#running-tests)
- [Swagger API Documentation](#swagger-api-documentation)
- [Project Status](#project-status)
- [Author](#author)

## Quick Start

Get up and running in minutes with Docker Compose:

```bash
# Clone the repository
git clone <repository-url>
cd effective-mobile-test-task

# Copy environment file
cp .env.example .env

# Start all services (app, PostgreSQL, Redis)
docker compose up --build

# Access the API
curl http://localhost:3000/health

# View Swagger documentation
open http://localhost:3000/api-docs
```

The application will be available at `http://localhost:3000` with:

- API endpoints at `/api/*`
- Swagger documentation at `/api-docs`
- Health check at `/health`
- Default admin user created (credentials in `.env`)

## Features

### Core Functionality

- **User Registration** - Create new user accounts with email verification
- **Authentication** - Secure JWT-based login with access and refresh tokens
- **Token Management** - Automatic token refresh and revocation
- **User Management** - View, list, and block user accounts
- **Role-Based Access Control** - Admin and user roles with granular permissions
- **Account Security** - Password hashing, rate limiting, and user blocking

### Technical Features

- **RESTful API** - Clean, well-documented REST endpoints
- **Input Validation** - Zod schema validation for all requests
- **Error Handling** - Comprehensive error handling with detailed messages
- **Type Safety** - Full TypeScript implementation
- **OpenAPI Documentation** - Interactive Swagger UI
- **Database Migrations** - Versioned schema management with Prisma
- **Session Management** - Redis-based token storage
- **Security Headers** - Helmet.js for HTTP security
- **Rate Limiting** - Protection against brute force attacks

### Development & Testing

- **Unit Tests** - Comprehensive unit test coverage
- **Integration Tests** - End-to-end API testing
- **Docker Support** - Containerized development and production
- **CI/CD Pipeline** - Automated testing and deployment
- **Code Quality** - ESLint, Prettier, and pre-commit hooks
- **Hot Reload** - Fast development with tsx

## Tech Stack

- **Runtime**: Node.js 22+
- **Framework**: Express.js 5.1.x
- **Language**: TypeScript 5.9+
- **Database**: PostgreSQL 17+
- **ORM**: Prisma 6.17+
- **Cache**: Redis 8+ (refresh token storage)
- **Authentication**: JWT (access + refresh tokens)
- **Validation**: Zod 4.1+
- **Security**: bcrypt, helmet, express-rate-limit
- **Testing**: Jest 30+ with Supertest
- **DevOps**: Docker, Docker Compose, GitHub Actions
- **Documentation**: Swagger/OpenAPI 3.0
- **Tools**: ESLint, Prettier, Husky, lint-staged

## Technical Requirements

This service implements a complete user management system with the following specifications:

### User Model

The user entity contains:

- **Full Name** - User's complete name
- **Date of Birth** - User's birth date
- **Email** - Unique identifier for authentication
- **Password** - Securely hashed password
- **Role** - Either `admin` or `user`
- **Status** - Active or inactive user state

### API Functionality

1. **User Registration** - Create new user accounts
2. **User Authorization** - Authenticate users with secure token-based mechanism
3. **Get User by ID** - Retrieve user details (accessible by admins or the user themselves)
4. **Get Users List** - Retrieve all users (admin-only access)
5. **Block User** - Deactivate user accounts (accessible by admins or users can block themselves)

## API Endpoints

### Authentication

#### Register User

```
POST /api/auth/register
Content-Type: application/json

{
  "fullName": "John Doe",
  "dateOfBirth": "1990-01-15",
  "email": "john.doe@example.com",
  "password": "SecurePassword123"
}
```

#### Login

```
POST /api/auth/login
Content-Type: application/json

{
  "email": "john.doe@example.com",
  "password": "SecurePassword123"
}
```

**Response**:

```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": { ... }
  }
}
```

#### Refresh Token

```
POST /api/auth/refresh
Content-Type: application/json

{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response**:

```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

#### Logout

```
POST /api/auth/logout
Authorization: Bearer <token>
Content-Type: application/json

{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Users

#### Get User by ID

```
GET /api/users/:id
Authorization: Bearer <token>
```

**Access**: Admin or the user themselves

#### Get All Users

```
GET /api/users
Authorization: Bearer <token>
```

**Access**: Admin only

#### Block User

```
PATCH /api/users/:id/block
Authorization: Bearer <token>
```

**Access**: Admin or the user themselves

## Project Structure

```
effective-mobile-test-task/
├── src/
│   ├── config/
│   │   ├── database.ts          # Prisma client initialization
│   │   ├── redis.ts             # Redis client setup
│   │   └── env.ts               # Environment variables validation
│   ├── controllers/
│   │   ├── auth.controller.ts   # Register, login, refresh, logout
│   │   └── user.controller.ts   # Get users, block user
│   ├── middlewares/
│   │   ├── auth.middleware.ts   # JWT verification
│   │   ├── role.middleware.ts   # Role-based access control
│   │   ├── rateLimit.middleware.ts
│   │   ├── validation.middleware.ts
│   │   └── error.middleware.ts  # Global error handler
│   ├── routes/
│   │   ├── auth.routes.ts
│   │   └── user.routes.ts
│   ├── services/
│   │   ├── auth.service.ts      # Business logic for auth
│   │   ├── user.service.ts      # Business logic for users
│   │   ├── token.service.ts     # JWT generation/validation
│   │   └── redis.service.ts     # Refresh token storage
│   ├── validators/
│   │   ├── auth.validator.ts    # Zod schemas for auth
│   │   └── user.validator.ts    # Zod schemas for users
│   ├── types/
│   │   ├── index.ts             # Common types
│   │   └── express.d.ts         # Express type extensions
│   ├── utils/
│   │   ├── password.util.ts     # bcrypt helpers
│   │   ├── response.util.ts     # Standardized responses
│   │   └── errors.ts            # Custom error classes
│   ├── app.ts                   # Express app setup
│   └── server.ts                # Server entry point
├── prisma/
│   ├── schema.prisma            # Database schema
│   ├── migrations/              # Database migrations
│   └── seed.ts                  # Admin user creation
├── tests/
│   ├── unit/                    # Unit tests
│   └── integration/             # Integration tests
├── .env                         # Environment variables
├── .env.example                 # Environment template
├── .gitignore
├── package.json
├── tsconfig.json
└── README.md
```

## API Response Format

### Success Response

```json
{
  "success": true,
  "data": { ... },
  "message": "Operation successful"
}
```

### Error Response

```json
{
  "success": false,
  "error": {
    "message": "Error description"
  }
}
```

HTTP status codes are used to indicate error types (400, 401, 403, 404, 409, 500, etc.)

## Security & Implementation Details

### Authentication

- **Access tokens**: JWT, 15 minute expiration
- **Refresh tokens**: JWT, stored in Redis
- **JWT payload**: `userId`, `role`
- **Token revocation**: Refresh tokens deleted from Redis on logout/block
- **Redis failure**: Refresh requests rejected (fail closed)

### Password Requirements

- Minimum 8 characters
- Must include: letters, numbers, and special symbols
- Hashed using bcrypt before storage

### Input Validation

- **Email**: Format validation (RFC 5322)
- **Date of Birth**: Multiple formats accepted, normalized to ISO 8601 (YYYY-MM-DD)
- **Full Name**: No special constraints
- All inputs validated using Zod schemas

### Rate Limiting

- **Auth endpoints only**: 3 requests per 15 minutes
- **Disabled in development**: Only active in production (`NODE_ENV=production`)

### User Blocking

- Blocked users cannot login
- Existing tokens remain valid until expiration
- Refresh tokens deleted from Redis immediately
- **No unblock functionality** - permanent action

### Additional Security

- Password field excluded from all API responses
- CORS configuration
- Helmet.js for security headers
- Protection against SQL injection (Prisma ORM)
- XSS protection

## Access Control Rules

| Endpoint       | Admin | User (Self) | User (Others) | Guest |
| -------------- | ----- | ----------- | ------------- | ----- |
| Register       | ✓     | ✓           | ✓             | ✓     |
| Login          | ✓     | ✓           | ✓             | ✓     |
| Refresh Token  | ✓     | ✓           | ✓             | ✓     |
| Logout         | ✓     | ✓           | N/A           | ✗     |
| Get User by ID | ✓     | ✓           | ✗             | ✗     |
| Get All Users  | ✓     | ✗           | ✗             | ✗     |
| Block User     | ✓     | ✓           | ✗             | ✗     |

## Environment Variables

```env
# Server
NODE_ENV=development
PORT=3000

# Database (use 'postgres' for Docker Compose, 'localhost' for local dev)
DATABASE_URL=postgresql://user:password@localhost:5432/dbname

# Redis (use 'redis' for Docker Compose, 'localhost' for local dev)
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-this
JWT_ACCESS_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=7d

# Admin Seed
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=AdminPass123!
ADMIN_FULL_NAME=System Administrator
ADMIN_DATE_OF_BIRTH=1990-01-01
```

## Getting Started

### Prerequisites

- Docker and Docker Compose
- Node.js 22+ (for local development)
- PostgreSQL 17+ (for local development)
- Redis 8+ (for local development)

### Setup

1. Clone the repository:

```bash
git clone <repository-url>
cd effective-mobile-test-task
```

2. Create environment file:

```bash
cp .env.example .env
```

3. Update the `.env` file with your configuration (especially `JWT_SECRET` for production)

### Running with Docker Compose (Recommended)

This method starts the application along with PostgreSQL and Redis containers:

```bash
# Start all services (app, postgres, redis)
docker-compose up --build

# Run in detached mode
docker-compose up -d --build

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Stop and remove volumes (clean slate)
docker-compose down -v
```

The application will be available at `http://localhost:3000`

### Running with Docker (Standalone)

#### Production Build

```bash
# Build the production image
docker build -t user-management-service:prod --target production .

# Run with environment file
docker run --env-file .env -p 3000:3000 user-management-service:prod

# Or pass environment variables individually
docker run \
  -e NODE_ENV=production \
  -e PORT=3000 \
  -e DATABASE_URL=postgresql://user:password@host:5432/dbname \
  -e REDIS_URL=redis://host:6379 \
  -e JWT_SECRET=your-secret \
  -e JWT_ACCESS_EXPIRATION=15m \
  -e JWT_REFRESH_EXPIRATION=7d \
  -p 3000:3000 \
  user-management-service:prod
```

**Note**: Standalone Docker requires external PostgreSQL and Redis instances. Use `docker-compose` for a complete setup.

#### Test Build

```bash
# Build the test image
docker build -t user-management-service:test --target test .

# Run tests
docker run user-management-service:test
```

### Local Development

```bash
# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate dev

# Start development server with hot-reload
npm run dev

# Run all tests
npm test

# Run only unit tests
npm run test:unit

# Run only integration tests (requires running services)
npm run test:integration

# Lint code
npm run lint

# Format code
npm run format
```

### Running Tests

#### Unit Tests

Unit tests can be run independently without any external services:

```bash
npm run test:unit
```

#### Integration Tests

Integration tests require PostgreSQL and Redis to be running. You can run them with Docker Compose:

```bash
# Run integration tests in Docker environment
docker compose -f docker-compose.test.yml up --build --exit-code-from app

# Cleanup after tests
docker compose -f docker-compose.test.yml down -v
```

Or run them locally if you have PostgreSQL and Redis running:

```bash
npm run test:integration
```

## Swagger API Documentation

Once the server is running, you can access the interactive Swagger UI at:

```
http://localhost:3000/api-docs
```

The Swagger UI provides:

- Interactive API exploration
- Request/response examples
- Schema definitions
- Authentication testing
- Try-it-out functionality for all endpoints

## Project Status

### Completed Features

**Core Implementation**

- [x] User registration with validation
- [x] User authentication (login/logout)
- [x] JWT token management (access + refresh tokens)
- [x] Token refresh endpoint
- [x] Logout from all devices
- [x] Get user by ID endpoint
- [x] Get all users endpoint (admin only)
- [x] Block user endpoint
- [x] Role-based access control (RBAC)
- [x] Input validation with Zod
- [x] Error handling middleware
- [x] Rate limiting on auth endpoints
- [x] Password hashing with bcrypt
- [x] Redis integration for token storage
- [x] PostgreSQL with Prisma ORM
- [x] Database migrations
- [x] Admin user seeding

**Testing**

- [x] Jest configuration
- [x] Unit tests for all routes
- [x] Unit tests for auth middleware
- [x] Integration tests for auth flow
- [x] Integration tests for user management
- [x] Separate test scripts (unit/integration)
- [x] Docker-based integration testing
- [x] Test coverage for critical paths

**DevOps & Infrastructure**

- [x] Docker containerization (multi-stage builds)
- [x] Docker Compose for local development
- [x] Docker Compose for integration tests
- [x] CI/CD pipeline with GitHub Actions
- [x] Pre-commit hooks (husky + lint-staged)
- [x] ESLint configuration
- [x] Prettier code formatting
- [x] Dockerfile linting with hadolint
- [x] Automated testing in CI
- [x] Production build validation

**Documentation**

- [x] Comprehensive README
- [x] API documentation with Swagger/OpenAPI
- [x] Environment variables documentation
- [x] Access control matrix
- [x] Security implementation details

## Author

**Artem Zaitsev**

This project was created as a test task for Effective Mobile.
