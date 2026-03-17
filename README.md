# Project 3 — Lending Library REST Web Services

Express.js REST API wrapping the lending library from Project 2, exposing book management and lending operations over HTTPS.

## What This Project Does
- GET /api/books/:isbn — Get book by ISBN
- PUT /api/books — Add a book
- GET /api/books?search=X — Find books by keyword
- PUT /api/lendings — Checkout a book
- DELETE /api/lendings — Return a book
- DELETE /api — Clear all data

## Tech Stack
- TypeScript
- Express.js
- Node.js
- MongoDB
- Mocha + Supertest (testing)

## How to Run
```bash
