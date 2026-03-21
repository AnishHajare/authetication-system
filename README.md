# Authentication System

An Express and MongoDB authentication API with email-based account verification, JWT access tokens, refresh-token rotation, session tracking, and OTP delivery through Gmail OAuth2.

## Overview

This project is a backend-focused authentication service designed around a more realistic token lifecycle than a basic login example. It includes:

- User registration with hashed passwords
- Email verification using a 6-digit OTP
- Registration rollback if verification email delivery fails
- JWT access tokens for authenticated API requests
- Refresh tokens stored in secure cookies
- Refresh-token rotation backed by server-side session records
- Logout for the current device or all devices
- Input validation, rate limiting, and centralized error handling

## Tech Stack

- Node.js
- Express
- MongoDB with Mongoose
- JSON Web Tokens
- bcryptjs
- Nodemailer
- Google OAuth2 for Gmail SMTP

## Project Structure

```text
src/
  app.js
  config/
  controllers/
  middleware/
  models/
  routes/
  services/
  utils/
test/
server.js
```

## Authentication Flow

### Registration

1. Client sends `userName`, `email`, and `password`
2. Server validates the payload and checks for duplicates
3. Password is hashed with `bcrypt`
4. User is created as unverified
5. A one-time password is generated, hashed, stored with an expiry, and emailed
6. If email delivery fails, the OTP and user record are deleted

### Login

1. Client sends `email` and `password`
2. Server verifies credentials and checks that the account is verified
3. Server creates:
   - a short-lived access token
   - a refresh token stored in an `httpOnly` cookie
   - a session record containing the hashed refresh token

### Refresh Token Rotation

1. Client calls the refresh endpoint with the existing refresh-token cookie
2. Server validates the cookie and matches its hash against the session store
3. Server issues a new access token and a new refresh token
4. The stored session hash is replaced with the new refresh-token hash

### Email Verification

1. Client submits `email` and OTP code
2. Server compares the hashed OTP
3. If valid and not expired, the user is marked as verified
4. OTP records for that user are deleted

## API Endpoints

Base path: `/api/auth`

| Method | Endpoint                     | Description                                       |
| ------ | ---------------------------- | ------------------------------------------------- |
| `POST` | `/register`                  | Register a user and send verification OTP         |
| `POST` | `/login`                     | Authenticate a verified user                      |
| `GET`  | `/get-me`                    | Return the current user from the access token     |
| `GET`  | `/refresh-token`             | Rotate refresh token and issue a new access token |
| `GET`  | `/logout`                    | Revoke the current session                        |
| `GET`  | `/logout-all`                | Revoke all sessions for the authenticated user    |
| `POST` | `/verify-email`              | Verify the email address using OTP                |
| `POST` | `/resend-verification-email` | Send a new OTP if the cooldown has passed         |

## Request Examples

### Register

```http
POST /api/auth/register
Content-Type: application/json

{
  "userName": "anish",
  "email": "anish@example.com",
  "password": "strongpassword123"
}
```

### Verify Email

```http
POST /api/auth/verify-email
Content-Type: application/json

{
  "email": "anish@example.com",
  "otp": "123456"
}
```

### Login

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "anish@example.com",
  "password": "strongpassword123"
}
```

### Get Current User

```http
GET /api/auth/get-me
Authorization: Bearer <access_token>
```

## Environment Variables

Copy `.env.example` to `.env` and set the required values.

| Variable                      | Required | Description                                    |
| ----------------------------- | -------- | ---------------------------------------------- |
| `NODE_ENV`                    | No       | Runtime environment, defaults to `development` |
| `PORT`                        | No       | Server port, defaults to `3000`                |
| `MONGO_URI`                   | Yes      | MongoDB connection string                      |
| `JWT_SECRET`                  | Yes      | Secret used to sign JWTs                       |
| `GOOGLE_CLIENT_ID`            | Yes      | Google OAuth2 client ID                        |
| `GOOGLE_CLIENT_SECRET`        | Yes      | Google OAuth2 client secret                    |
| `GOOGLE_REFRESH_TOKEN`        | Yes      | Refresh token for Gmail sending                |
| `GOOGLE_USER`                 | Yes      | Gmail address used as sender                   |
| `MAIL_FROM_NAME`              | No       | Display name for outgoing emails               |
| `ACCESS_TOKEN_EXPIRES_IN`     | No       | Access-token lifetime                          |
| `REFRESH_TOKEN_EXPIRES_IN`    | No       | Refresh-token lifetime                         |
| `OTP_EXPIRY_MINUTES`          | No       | OTP validity window                            |
| `OTP_RESEND_COOLDOWN_SECONDS` | No       | Minimum delay before sending another OTP       |
| `RATE_LIMIT_WINDOW_MS`        | No       | Rate-limit window duration                     |
| `RATE_LIMIT_MAX_REQUESTS`     | No       | Max requests allowed per IP per window         |
| `COOKIE_SECURE`               | No       | Whether refresh-token cookies require HTTPS    |
| `COOKIE_SAME_SITE`            | No       | SameSite policy for refresh-token cookies      |

## Local Development

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

```bash
cp .env.example .env
```

### 3. Start MongoDB

Make sure a MongoDB instance is running and reachable through `MONGO_URI`.

### 4. Run the server

```bash
npm run dev
```

The API starts on `http://localhost:3000` unless `PORT` is overridden.

## Docker

This repository includes a minimal container setup for the API and MongoDB.

### Prerequisites

- Docker
- Docker Compose

### Run with Docker

1. Create `.env` from `.env.example`
2. Set the required Gmail OAuth2 and JWT values
3. Start the stack:

```bash
docker compose up --build
```

The API will be available at `http://localhost:3000`.

### Notes

- `compose.yaml` overrides `MONGO_URI` to `mongodb://mongo:27017/authentication-system`
- MongoDB data is persisted in the `mongo_data` Docker volume
- The container uses `npm start`, which runs `node server.js`

### Run the Test Suite in Docker

```bash
docker compose run --rm test
```

This starts the test container, connects it to the Mongo container defined in `compose.yaml`, and runs `npm test`.

### Docker Cleanup

Stop the app stack:

```bash
docker compose down
```

Remove containers and the Mongo volume:

```bash
docker compose down -v
```

## Testing

Run the current test suite with:

```bash
npm test
```

The test suite includes middleware coverage and API integration flows. Email delivery is mocked during tests, and Docker-based test runs use the Mongo container instead of `mongodb-memory-server`.

## Security Notes

- Passwords are hashed before storage
- Refresh tokens are stored as hashes in the database
- Refresh tokens are rotated on every refresh request
- Refresh tokens are delivered via `httpOnly` cookies
- OTPs are stored as hashes, not plaintext
- OTPs expire automatically based on configuration
- Registration is rolled back if verification email delivery fails
- Basic per-IP rate limiting is applied to auth-sensitive routes

## Current Limitations

- Rate limiting uses in-memory storage, so it is not shared across multiple server instances
- There is no background job for cleaning expired OTP records
- Gmail delivery depends on valid Google OAuth2 credentials and mailbox configuration

## License

This project is provided for educational and portfolio use.
