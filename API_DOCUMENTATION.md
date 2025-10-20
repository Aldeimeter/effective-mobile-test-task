# API Documentation

This document provides an overview of the API documentation for the Effective Mobile Test Task project.

## Swagger/OpenAPI Documentation

The project includes comprehensive Swagger/OpenAPI 3.0 documentation for all API endpoints.

### Accessing the Documentation

Once the server is running, you can access the interactive Swagger UI at:

```
http://localhost:3000/api-docs
```

The Swagger UI provides:

- Interactive API exploration
- Request/response examples
- Schema definitions
- Authentication flows
- Try-it-out functionality for testing endpoints

### Documentation File

The OpenAPI specification is defined in `swagger.yaml` at the root of the project. This file contains:

- All endpoint definitions
- Request/response schemas
- Authentication schemes
- Comprehensive examples
- Error response formats

## API Overview

### Base URL

```
http://localhost:3000/api
```

### Authentication

The API uses JWT (JSON Web Tokens) for authentication. Protected endpoints require an `Authorization` header:

```
Authorization: Bearer <access_token>
```

### Endpoints

#### Health Check

- `GET /health` - Check server health status

#### Authentication

- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login and receive JWT tokens
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/logout` - Logout from current device (requires auth)
- `POST /api/auth/logout-all` - Logout from all devices (requires auth)

#### Users

- `GET /api/users` - Get all users (admin only)
- `GET /api/users/:id` - Get user by ID (self or admin)
- `PATCH /api/users/:id/block` - Block a user (self or admin)

### Response Format

All API responses follow a consistent format:

**Success Response:**

```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": {
    /* response data */
  }
}
```

**Error Response:**

```json
{
  "success": false,
  "error": {
    "message": "Error message",
    "details": [
      /* optional validation errors */
    ]
  }
}
```

### Authentication Flow

1. **Register** - Create a new account with email and password

   ```
   POST /api/auth/register
   ```

2. **Login** - Get access and refresh tokens

   ```
   POST /api/auth/login
   ```

   Response includes:
   - `accessToken` - Short-lived token for API requests (15 minutes)
   - `refreshToken` - Long-lived token for getting new access tokens (7 days)

3. **Use Access Token** - Include in Authorization header for protected endpoints

   ```
   Authorization: Bearer <access_token>
   ```

4. **Refresh Token** - When access token expires, use refresh token to get new tokens

   ```
   POST /api/auth/refresh
   ```

5. **Logout** - Invalidate refresh token(s)
   ```
   POST /api/auth/logout (single device)
   POST /api/auth/logout-all (all devices)
   ```

### Password Requirements

Passwords must meet the following criteria:

- Minimum 8 characters
- At least one letter (a-z, A-Z)
- At least one number (0-9)
- At least one special character (!@#$%^&\*()\_+-=[]{}|;:,.<>?)

### Date Formats

The API accepts multiple date formats for date of birth:

- ISO format: `YYYY-MM-DD` (e.g., `1990-01-15`)
- US format: `MM/DD/YYYY` (e.g., `01/15/1990`)
- EU format: `DD.MM.YYYY` (e.g., `15.01.1990`)

### User Roles

- `user` - Regular user with access to own profile
- `admin` - Administrator with access to all users and management functions

### Error Codes

| Status Code | Description                             |
| ----------- | --------------------------------------- |
| 200         | Success                                 |
| 201         | Created                                 |
| 400         | Bad Request - Validation error          |
| 401         | Unauthorized - Missing or invalid token |
| 403         | Forbidden - Insufficient permissions    |
| 404         | Not Found - Resource doesn't exist      |
| 409         | Conflict - Resource already exists      |
| 500         | Internal Server Error                   |

## Example Usage

### Register a New User

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "John Doe",
    "email": "john.doe@example.com",
    "password": "SecurePass123!",
    "dateOfBirth": "1990-01-15"
  }'
```

### Login

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john.doe@example.com",
    "password": "SecurePass123!"
  }'
```

### Get User Profile (Authenticated)

```bash
curl -X GET http://localhost:3000/api/users/550e8400-e29b-41d4-a716-446655440000 \
  -H "Authorization: Bearer <access_token>"
```

### Get All Users (Admin Only)

```bash
curl -X GET http://localhost:3000/api/users \
  -H "Authorization: Bearer <admin_access_token>"
```

### Block a User

```bash
curl -X PATCH http://localhost:3000/api/users/550e8400-e29b-41d4-a716-446655440000/block \
  -H "Authorization: Bearer <access_token>"
```

### Refresh Access Token

```bash
curl -X POST http://localhost:3000/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "<refresh_token>"
  }'
```

### Logout

```bash
curl -X POST http://localhost:3000/api/auth/logout \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "<refresh_token>"
  }'
```

## Testing with Swagger UI

The Swagger UI at `/api-docs` provides a convenient way to test the API:

1. Start the development server: `npm run dev`
2. Open `http://localhost:3000/api-docs` in your browser
3. Click on an endpoint to expand it
4. Click "Try it out" to enable editing
5. Fill in the required parameters
6. For protected endpoints, click "Authorize" and enter your access token
7. Click "Execute" to send the request
8. View the response below

## Additional Resources

- OpenAPI Specification: `swagger.yaml`
- Source Code: `src/` directory
- Tests: `test/` directory
- Prisma Schema: `prisma/schema.prisma`
