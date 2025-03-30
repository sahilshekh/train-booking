require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Seat = require('./models/Seat');
const User = require('./models/User');

const app = express();
app.use(express.json());

// CORS middleware with preflight support
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', 'http://localhost:3000');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});

// Connect to MongoDB
mongoose.connect('mongodb://127.0.0.1:27017/train_booking', {
  serverSelectionTimeoutMS: 5000,
})
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// Initialize seats
async function initSeats() {
  try {
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
  } catch (err) {
    console.error('Error initializing seats:', err);
  }
}
initSeats();

// Signup Route
app.post('/api/signup', async (req, res) => {
  let { username, password } = req.body;
  username = username?.trim();
  password = password?.trim();
  if (!username || !password || username.length < 3 || password.length < 6) {
    return res.status(400).json({ error: 'Username (min 3) and password (min 6) required' });
  }
  try {
    const existingUser = await User.findOne({ username });
    if (existingUser) return res.status(400).json({ error: 'Username already taken' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ username, password: hashedPassword });
    await user.save();
    res.status(201).json({ message: 'User created successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Database error: ' + err.message });
  }
});

// Login Route
app.post('/api/login', async (req, res) => {
  let { username, password } = req.body;
  username = username?.trim();
  password = password?.trim();
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }
  try {
    const user = await User.findOne({ username });
    if (!user) return res.status(401).json({ error: 'Invalid username' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ error: 'Invalid password' });

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET || 'secret_key', { expiresIn: '1h' });
    res.json({ token });
  } catch (err) {
    res.status(500).json({ error: 'Database error: ' + err.message });
  }
});

// Middleware for authentication
function authMiddleware(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret_key');
    req.userId = decoded.userId;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// Get all seats (available and booked)
app.get('/api/seats', async (req, res) => {
  try {
    const seats = await Seat.find({});
    res.json(seats);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch seats: ' + err.message });
  }
});

// Get user's booked seats
app.get('/api/my-seats', authMiddleware, async (req, res) => {
  try {
    const bookedSeats = await Seat.find({ userId: req.userId, isBooked: true });
    res.json(bookedSeats);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch booked seats: ' + err.message });
  }
});

// Book specific seats (manual selection)
app.post('/api/book', authMiddleware, async (req, res) => {
  const { seatIds } = req.body;
  const userId = req.userId;

  if (!seatIds || !Array.isArray(seatIds) || seatIds.length > 7 || seatIds.length < 1) {
    return res.status(400).json({ error: 'Invalid seat selection (1-7 seats required)' });
  }

  try {
    const seatsToBook = await Seat.find({
      _id: { $in: seatIds },
      isBooked: false,
    });

    if (seatsToBook.length !== seatIds.length) {
      return res.status(400).json({ error: 'Some selected seats are already booked' });
    }

    await Seat.updateMany(
      { _id: { $in: seatIds } },
      { isBooked: true, userId }
    );

    res.json({ message: 'Seats booked successfully', seats: seatsToBook });
  } catch (err) {
    res.status(500).json({ error: 'Booking failed: ' + err.message });
  }
});

// Book seats automatically based on input number
app.post('/api/book-auto', authMiddleware, async (req, res) => {
  const { numSeats } = req.body;
  const userId = req.userId;

  if (!numSeats || !Number.isInteger(numSeats) || numSeats > 7 || numSeats < 1) {
    return res.status(400).json({ error: 'Number of seats must be an integer between 1 and 7' });
  }

  try {
    // Find a row with enough consecutive available seats
    const rows = await Seat.aggregate([
      { $match: { isBooked: false } },
      { $group: { _id: '$rowNumber', seats: { $push: '$$ROOT' }, count: { $sum: 1 } } },
      { $match: { count: { $gte: numSeats } } },
      { $sort: { _id: 1 } }, // Sort by row number
      { $limit: 1 },
    ]);

    if (rows.length > 0) {
      const row = rows[0];
      const seatsToBook = row.seats.slice(0, numSeats); // Take the first numSeats from this row
      await Seat.updateMany(
        { _id: { $in: seatsToBook.map(s => s._id) } },
        { isBooked: true, userId }
      );
      res.json({ message: `Seats booked in row ${row._id}`, seats: seatsToBook });
    } else {
      // Fallback: book nearby seats
      const availableSeats = await Seat.find({ isBooked: false }).sort('seatNumber').limit(numSeats);
      if (availableSeats.length < numSeats) {
        return res.status(400).json({ error: 'Not enough seats available' });
      }
      await Seat.updateMany(
        { _id: { $in: availableSeats.map(s => s._id) } },
        { isBooked: true, userId }
      );
      res.json({ message: 'Nearby seats booked', seats: availableSeats });
    }
  } catch (err) {
    res.status(500).json({ error: 'Booking failed: ' + err.message });
  }
});

// Reset only user's seats
app.post('/api/reset', authMiddleware, async (req, res) => {
  const userId = req.userId;
  try {
    await Seat.updateMany(
      { userId: userId, isBooked: true },
      { isBooked: false, userId: null }
    );
    res.json({ message: 'Your seats reset successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Reset failed: ' + err.message });
  }
});

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));