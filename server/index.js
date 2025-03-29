require('dotenv').config(); // Load environment variables
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Seat = require('./models/Seat');
const User = require('./models/User');

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
mongoose.connect('mongodb://127.0.0.1:27017/train_booking', {
  serverSelectionTimeoutMS: 5000, // Prevent indefinite connection hanging
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
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }
  try {
    const existingUser = await User.findOne({ username });
    if (existingUser) return res.status(400).json({ error: 'Username already taken' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ username, password: hashedPassword });
    await user.save();
    res.status(201).json({ message: 'User created successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Login Route
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }
  try {
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).json({ error: 'Invalid username' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid password' });
    }

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET || 'secret_key', { expiresIn: '1h' });
    res.json({ token });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Middleware for authentication
function authMiddleware(req, res, next) {
  const authHeader = req.headers['authorization'];
  console.log('Authorization Header:', authHeader); // Debugging log

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }
  
  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret_key');
    req.userId = decoded.userId;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
}

// Get available seats
app.get('/api/seats', async (req, res) => {
  try {
    const seats = await Seat.find({ isBooked: false });
    res.json(seats);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch seats' });
  }
});

// Book seats
app.post('/api/book', authMiddleware, async (req, res) => {
  const { numSeats } = req.body;
  const userId = req.userId;

  if (!numSeats || numSeats > 7 || numSeats < 1) {
    return res.status(400).json({ error: 'Invalid number of seats' });
  }

  try {
    // Check for a row with enough seats
    const rows = await Seat.aggregate([
      { $match: { isBooked: false } },
      { $group: { _id: '$rowNumber', count: { $sum: 1 } } },
      { $match: { count: { $gte: numSeats } } },
      { $limit: 1 },
    ]);

    if (rows.length > 0) {
      const row = rows[0]._id;
      const seatsToBook = await Seat.find({ rowNumber: row, isBooked: false }).limit(numSeats);
      await Seat.updateMany(
        { _id: { $in: seatsToBook.map(s => s._id) } },
        { isBooked: true, userId }
      );
      res.json({ message: 'Seats booked in row ' + row, seats: seatsToBook });
    } else {
      const availableSeats = await Seat.find({ isBooked: false }).limit(numSeats);
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
    res.status(500).json({ error: 'Failed to book seats' });
  }
});

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
