# Backend

This directory contains the backend API server code.

## Folder Structure

```
backend/
├── src/                    # Source code
│   ├── routes/            # API route definitions
│   ├── controllers/       # Request handlers
│   ├── models/            # Data models and schemas
│   ├── services/          # Business logic
│   ├── middleware/        # Custom middleware (auth, validation, etc.)
│   ├── utils/             # Utility functions
│   └── config/            # Configuration files
├── tests/                 # Test files
└── logs/                  # Application logs
```

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set up environment variables:
   ```bash
   cp .env.example .env
   ```

3. Run development server:
   ```bash
   npm run dev
   ```

4. Run tests:
   ```bash
   npm test
   ```

## Technologies

- Node.js / Express.js
- TypeScript
- Database (PostgreSQL / MongoDB)
- Authentication (JWT)
- Testing (Jest / Mocha)
