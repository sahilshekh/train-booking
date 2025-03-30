# Train Seat Booking App

## Setup Instructions
1. Clone the repository: `https://github.com/sahilshekh/train-booking`
2. Install dependencies:
   - Frontend: `cd client && npm install`
   - Backend: `cd server && npm install`
3. Set up environment variables:
   - In `server`, created a `.env` file with `DATABASE_URL` (MongoDB Atlas connection string)
4. Run the app:
   - Backend: `cd server && node api/index.js`
   - Frontend: `cd client && npm start`
5. Open `http://localhost:3000` to view the app.

## API Documentation
- `POST /api/signup`: Register a new user. Body: `{ "username": "string", "password": "string" }`
- `POST /api/login`: Log in a user. Body: `{ "username": "string", "password": "string" }`
- `GET /api/seats`: Get all seats.
- `POST /api/book`: Book seats manually. Body: `{ "seatNumber": number }`
- `POST /api/book-auto`: Book seats automatically. Body: `{ "count": number }`
- `POST /api/reset`: Reset all seats.
- `GET /api/my-seats`: Get seats booked by the logged-in user.
