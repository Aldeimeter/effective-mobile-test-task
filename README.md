**Note**: This project is a test task for Effective Mobile.
**Note**: This is only project architecture draft. Final implementation may vary.

---

# User Management Service

A RESTful API service for user management built with Express.js and TypeScript, following best practices for project organization and architecture.

## Table of Contents

- [Technical Requirements](#technical-requirements)
- [Tech Stack](#tech-stack)
- [Features](#features)
- [User Model](#user-model)
- [API Endpoints](#api-endpoints)
- [Project Structure](#project-structure)
- [API Response Format](#api-response-format)
- [Security & Implementation Details](#security--implementation-details)
- [Access Control Rules](#access-control-rules)
- [Environment Variables](#environment-variables)
- [Future Enhancements](#future-enhancements)
- [Author](#author)

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

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js 5.1.x
- **Language**: TypeScript
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Cache/Session Store**: Redis (refresh tokens)
- **Authentication**: JWT (access + refresh tokens)
- **Validation**: Zod
- **Security**: bcrypt, helmet, express-rate-limit
- **Development Tools**:
  - ESLint for code linting
  - Prettier for code formatting
  - tsx for development hot-reload

## Features

- User registration with validation (Zod)
- Secure authentication and authorization (JWT)
- Role-based access control (RBAC)
- User profile management
- User status management (active/blocked)
- Input validation and error handling
- RESTful API design
- TypeScript for type safety

## User Model

```typescript
interface User {
  id: string;
  fullName: string;
  dateOfBirth: Date;
  email: string; // unique
  password: string; // hashed
  role: "admin" | "user";
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

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

## Implementation plan

- [x] Docker containerization
- [x] Jest configuration
- [x] Pre-commit hooks
- [x] CI/CD pipeline
- [ ] Actual code implementation
  - [ ] Unit tests (TDD)
  - [ ] Pagination for user list
  - [ ] Rate limiting
- [ ] API documentation with Swagger

## Author

Artem Zaitsev
