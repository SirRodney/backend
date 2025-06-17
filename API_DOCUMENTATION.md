# Multi-Tenant Backend API Documentation

This document provides comprehensive information about the available API endpoints, authentication flows, and usage examples.

## Table of Contents
- [Authentication](#authentication)
- [Projects API](#projects-api)
- [Tasks API](#tasks-api)
- [Security](#security)
- [Error Handling](#error-handling)
- [Testing with Postman](#testing-with-postman)

## Authentication

### Base URL
All authentication endpoints are available at `/api/auth/`.

### Endpoints

#### Register
Create a new user account.

- **URL**: `/api/auth/register`
- **Method**: `POST`
- **Auth Required**: No
- **Body**:
```json
{
  "email": "user@example.com",
  "password": "securepassword",
  "tenant_id": 1   // Optional, defaults to primary tenant
}
```
- **Success Response**: 
```json
{
  "success": true,
  "userId": 123,
  "accessToken": "eyJhbGciOiJIUzI1...",
  "refreshToken": "abc123def456..."
}
```

#### Login
Authenticate with existing credentials.

- **URL**: `/api/auth/login`
- **Method**: `POST`
- **Auth Required**: No
- **Body**:
```json
{
  "email": "user@example.com",
  "password": "securepassword"
}
```
- **Success Response**:
```json
{
  "success": true,
  "userId": 123,
  "accessToken": "eyJhbGciOiJIUzI1...",
  "refreshToken": "abc123def456..."
}
```

#### Refresh Token
Get a new access token using a refresh token.

- **URL**: `/api/auth/refresh`
- **Method**: `POST`
- **Auth Required**: No
- **Body**:
```json
{
  "refreshToken": "abc123def456..."
}
```
- **Success Response**:
```json
{
  "success": true,
  "accessToken": "eyJhbGciOiJIUzI1..."
}
```

#### Logout
Invalidate the refresh token.

- **URL**: `/api/auth/logout`
- **Method**: `POST`
- **Auth Required**: Yes (Access Token)
- **Body**:
```json
{
  "refreshToken": "abc123def456..."
}
```
- **Success Response**:
```json
{
  "success": true,
  "message": "Successfully logged out"
}
```

## Projects API

### Base URL
All project endpoints are available at `/api/projects/`.

### Authorization
All project endpoints require a valid JWT token in the `Authorization` header:
```
Authorization: Bearer eyJhbGciOiJIUzI1...
```

### Endpoints

#### List Projects
Get all projects for the current user's tenant.

- **URL**: `/api/projects`
- **Method**: `GET`
- **Auth Required**: Yes (Access Token)
- **Roles Allowed**: admin, member, viewer
- **Success Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Project Alpha",
      "tenant_id": 1,
      "owner_user_id": 123
    },
    {
      "id": 2,
      "name": "Project Beta",
      "tenant_id": 1,
      "owner_user_id": 123
    }
  ]
}
```

#### Get Project
Get details of a specific project.

- **URL**: `/api/projects/:id`
- **Method**: `GET`
- **Auth Required**: Yes (Access Token)
- **Roles Allowed**: admin, member, viewer
- **URL Parameters**: `id=[integer]` where `id` is the project's ID
- **Success Response**:
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Project Alpha",
    "tenant_id": 1,
    "owner_user_id": 123
  }
}
```

#### Create Project
Create a new project.

- **URL**: `/api/projects`
- **Method**: `POST`
- **Auth Required**: Yes (Access Token)
- **Roles Allowed**: admin, member
- **Body**:
```json
{
  "name": "New Project",
  "description": "This is a new project"
}
```
- **Success Response**:
```json
{
  "success": true,
  "data": {
    "id": 3,
    "name": "New Project",
    "description": "This is a new project",
    "tenant_id": 1,
    "owner_user_id": 123
  }
}
```

## Tasks API

### Base URL
All task endpoints are available as nested resources under projects: `/api/projects/:projectId/tasks/`.

### Authorization
All task endpoints require a valid JWT token in the `Authorization` header:
```
Authorization: Bearer eyJhbGciOiJIUzI1...
```

### Endpoints

#### List Tasks
Get all tasks for a specific project.

- **URL**: `/api/projects/:projectId/tasks`
- **Method**: `GET`
- **Auth Required**: Yes (Access Token)
- **Roles Allowed**: admin, member, viewer
- **URL Parameters**: `projectId=[integer]` where `projectId` is the project's ID
- **Success Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "title": "Implement Authentication",
      "status": "completed",
      "project_id": 1,
      "assignee_user_id": 123
    },
    {
      "id": 2,
      "title": "Create Database Schema",
      "status": "in_progress",
      "project_id": 1,
      "assignee_user_id": 124
    }
  ]
}
```

#### Get Task
Get details of a specific task.

- **URL**: `/api/projects/:projectId/tasks/:taskId`
- **Method**: `GET`
- **Auth Required**: Yes (Access Token)
- **Roles Allowed**: admin, member, viewer
- **URL Parameters**: 
  - `projectId=[integer]` where `projectId` is the project's ID
  - `taskId=[integer]` where `taskId` is the task's ID
- **Success Response**:
```json
{
  "success": true,
  "data": {
    "id": 1,
    "title": "Implement Authentication",
    "status": "completed",
    "project_id": 1,
    "assignee_user_id": 123
  }
}
```

#### Create Task
Create a new task in a project.

- **URL**: `/api/projects/:projectId/tasks`
- **Method**: `POST`
- **Auth Required**: Yes (Access Token)
- **Roles Allowed**: admin, member
- **URL Parameters**: `projectId=[integer]` where `projectId` is the project's ID
- **Body**:
```json
{
  "title": "New Task",
  "status": "todo",
  "assignee_user_id": 123
}
```
- **Success Response**:
```json
{
  "success": true,
  "data": {
    "id": 3,
    "title": "New Task",
    "status": "todo",
    "project_id": 1,
    "assignee_user_id": 123
  }
}
```

#### Update Task
Update an existing task.

- **URL**: `/api/projects/:projectId/tasks/:taskId`
- **Method**: `PUT`
- **Auth Required**: Yes (Access Token)
- **Roles Allowed**: admin, member
- **URL Parameters**: 
  - `projectId=[integer]` where `projectId` is the project's ID
  - `taskId=[integer]` where `taskId` is the task's ID
- **Body** (all fields optional):
```json
{
  "title": "Updated Task Title",
  "status": "completed",
  "assignee_user_id": 124
}
```
- **Success Response**:
```json
{
  "success": true,
  "data": {
    "id": 3,
    "title": "Updated Task Title",
    "status": "completed",
    "project_id": 1,
    "assignee_user_id": 124
  }
}
```

#### Delete Task
Delete an existing task.

- **URL**: `/api/projects/:projectId/tasks/:taskId`
- **Method**: `DELETE`
- **Auth Required**: Yes (Access Token)
- **Roles Allowed**: admin, member
- **URL Parameters**: 
  - `projectId=[integer]` where `projectId` is the project's ID
  - `taskId=[integer]` where `taskId` is the task's ID
- **Success Response**:
```json
{
  "success": true,
  "message": "Task deleted successfully"
}
```

## Error Handling

All endpoints follow a consistent error response format:

```json
{
  "success": false,
  "message": "Error description here"
}
```

Common HTTP status codes:
- `200 OK`: Request succeeded
- `201 Created`: Resource successfully created
- `400 Bad Request`: Invalid input
- `401 Unauthorized`: Missing or invalid authentication
- `403 Forbidden`: Not enough permissions
- `404 Not Found`: Resource not found
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server-side error

## Security

### Cross-Origin Resource Sharing (CORS)

The API implements strict CORS policies that only allow requests from whitelisted origins:

- **Allowed Origins**:
  - `http://localhost:8787` (local development)
  - `https://prueba-backend-multitenant.luis-leivag23.workers.dev` (production)

- **Allowed Methods**: `GET`, `POST`, `PUT`, `DELETE`, `OPTIONS`

- **Allowed Headers**:
  - `Content-Type`
  - `Authorization`
  - `X-API-Key`
  - `X-Requested-With`

- **Exposed Headers**:
  - `X-RateLimit-Limit`
  - `X-RateLimit-Remaining`
  - `X-RateLimit-Reset`
  - `Retry-After`

- **Credentials**: Supported (cookies, authorization headers)

- **Preflight Cache**: 1 hour (3600 seconds)

Requests from origins not in the whitelist will not be able to access the API resources.

### Rate Limiting

The API implements rate limiting to ensure fair usage and protect against abuse:

### IP-Based Rate Limiting
- **Limit**: 60 requests per minute
- **Applies to**: All requests without an API key
- **Response Headers**:
  - `X-RateLimit-Limit`: Maximum requests allowed in the window
  - `X-RateLimit-Remaining`: Number of requests remaining in the window
  - `X-RateLimit-Reset`: Timestamp when the rate limit window resets (Unix timestamp in seconds)
  - `Retry-After`: Seconds to wait before making another request (only sent when limit is exceeded)

### API Key Rate Limiting
- **Limit**: 1,000 requests per day
- **Applies to**: Requests with an `X-API-Key` header
- **Usage**: Add your API key in the request headers
  ```
  X-API-Key: your-api-key-here
  ```

When a rate limit is exceeded, the API returns a `429 Too Many Requests` status code with details about the limit and when it resets.

## Testing with Postman

### Setting up Authorization

1. First, make a login request to obtain an access token.
2. For subsequent requests, open the "Authorization" tab in Postman.
3. Select "Bearer Token" from the Type dropdown.
4. Paste your access token in the "Token" field.

### Creating a Collection

1. Create a new Postman Collection named "Multi-Tenant API".
2. Create folders for "Auth", "Projects", and "Tasks".
3. Import the example requests from this documentation.
4. Set up environment variables to store:
   - `base_url`: The API base URL (e.g., `http://localhost:8787`)
   - `access_token`: Your current access token
   - `refresh_token`: Your refresh token

### Using Variables in Requests

For convenience, use environment variables in your requests:
- URL: `{{base_url}}/api/projects`
- Authorization: `Bearer {{access_token}}`

### Token Refresh Flow

If you get a 401 error, your access token might have expired. Use the refresh endpoint to get a new access token:

1. Send a POST request to `/api/auth/refresh` with your refresh token
2. Update the `access_token` variable with the new token
3. Retry your original request
