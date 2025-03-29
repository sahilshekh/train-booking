const express = require('express');
const mongoose = require('mongoose');
const Seat = require('./models/Seat');
const app = express();

app.use(express.json());

// CORS for React client
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', 'http://localhost:3000');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST');
  next();
});

// Connect to MongoDB
mongoose.connect('mongodb://127.0.0.1:27017/train_booking')
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));


// Initialize seats
async function initSeats() {
  const seatCount = await Seat.countDocuments();
  if (seatCount === 0) {
    const seats = [];
    for (let row = 1; row <= 11; row++) {
      for (let seat = 1; seat <= 7; seat++) {
        seats.push({ seatNumber: (row - 1) * 7 + seat, rowNumber: row });
      }
    }
    for (let seat = 1; seat <= 3; seat++) {
      seats.push({ seatNumber: 77 + seat, rowNumber: 12 });
    }
    await Seat.insertMany(seats);
    console.log('80 seats initialized');
  }
}
initSeats();

app.listen(5000, () => console.log('Server running on port 5000'));