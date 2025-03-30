import { useState, useEffect } from 'react';
import axios from 'axios';
import SeatMap from './components/SeatMap';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './style.css';

function App() {
  const [token, setToken] = useState(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [bookedSeats, setBookedSeats] = useState([]);
  const [refreshSeats, setRefreshSeats] = useState(0);
  const [numSeatsInput, setNumSeatsInput] = useState(''); 
  const [totalBooked, setTotalBooked] = useState(0); 
  const [totalAvailable, setTotalAvailable] = useState(80); 

  useEffect(() => {
    if (token) {
      fetchBookedSeats();
      fetchSeatCounts();
    }
  }, [token, refreshSeats]);

  const fetchBookedSeats = async () => {
    try {
      const res = await axios.get('https://trainbookingbackend.vercel.app/api/my-seats', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setBookedSeats(res.data);
    } catch (err) {
      console.error('Failed to fetch booked seats:', err);
    }
  };

  const fetchSeatCounts = async () => {
    try {
      const res = await axios.get('https://trainbookingbackend.vercel.app/api/seats');
      const seats = res.data;
      const bookedCount = seats.filter(seat => seat.isBooked).length;
      setTotalBooked(bookedCount);
      setTotalAvailable(80 - bookedCount);
    } catch (err) {
      console.error('Failed to fetch seat counts:', err);
    }
  };

  const handleSignup = async () => {
    try {
      await axios.post('https://trainbookingbackend.vercel.app/api/signup', { username, password });
      toast.success('Signup successful! Please log in.');
    } catch (err) {
      toast.error('Signup failed: ' + (err.response?.data?.error || 'Unknown error'));
    }
  };

  const handleLogin = async () => {
    try {
      const res = await axios.post('https://trainbookingbackend.vercel.app/api/login', { username, password });
      setToken(res.data.token);
      toast.success('Login successful!');
    } catch (err) {
      toast.error('Login failed: ' + (err.response?.data?.error || 'Unknown error'));
    }
  };

  const handleBook = async (selectedSeatIds) => {
    if (!selectedSeatIds || selectedSeatIds.length === 0) {
      toast.error('Please select at least one seat to book.');
      return;
    }
    try {
      const res = await axios.post(
        'https://trainbookingbackend.vercel.app/api/book',
        { seatIds: selectedSeatIds },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(res.data.message);
      fetchBookedSeats();
      fetchSeatCounts();
      setRefreshSeats(prev => prev + 1);
    } catch (err) {
      toast.error('Booking failed: ' + (err.response?.data?.error || 'Unknown error'));
    }
  };

  const handleBookAuto = async () => {
    const numSeats = parseInt(numSeatsInput);
    if (!numSeats || numSeats < 1 || numSeats > 7) {
      toast.error('Not Book 8 or more that 8 seat at the time.');
      return;
    }
    try {
      const res = await axios.post(
        'https://trainbookingbackend.vercel.app/api/book-auto',
        { numSeats },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(res.data.message);
      fetchBookedSeats();
      fetchSeatCounts();
      setRefreshSeats(prev => prev + 1);
      setNumSeatsInput(''); // Clear input
    } catch (err) {
      toast.error('Booking failed: ' + (err.response?.data?.error || 'Unknown error'));
    }
  };

  const handleReset = async () => {
    try {
      const res = await axios.post(
        'https://trainbookingbackend.vercel.app/api/reset',
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(res.data.message);
      setBookedSeats([]);
      fetchSeatCounts();
      setRefreshSeats(prev => prev + 1);
    } catch (err) {
      toast.error('Reset failed: ' + (err.response?.data?.error || 'Unknown error'));
    }
  };

  const handleLogout = () => {
    setToken(null);
    setBookedSeats([]);
    toast.info('Logged out successfully.');
  };

  if (!token) {
    return (
      <div className="auth-form">
        <h1>Train Seat Booking</h1>
        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={e => setUsername(e.target.value)}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={e => setPassword(e.target.value)}
        />
        <button onClick={handleSignup}>Signup</button>
        <button onClick={handleLogin}>Login</button>
        <ToastContainer position="top-right" autoClose={3000} />
      </div>
    );
  }

  return (
    <div className="container">
      <h1>Train Seat Booking</h1>
      <div className="booking-options">
        <div className="auto-book">
          <input
            type="number"
            placeholder="Enter number of seats"
            value={numSeatsInput}
            onChange={e => setNumSeatsInput(e.target.value)}
            min="1"
            max="7"
          />
          <button className="book-btn auto-book-btn" onClick={handleBookAuto}>
            Book Automatically
          </button>
        </div>
        <SeatMap token={token} onBook={handleBook} bookedSeats={bookedSeats} refreshTrigger={refreshSeats} />
      </div>
      <div className="booked-seats">
        <h3>Your Booked Seats:</h3>
        {bookedSeats.length > 0 ? (
          <ul>
            {bookedSeats.map(seat => (
              <li key={seat._id}>Seat {seat.seatNumber} (Row {seat.rowNumber})</li>
            ))}
          </ul>
        ) : (
          <p>No seats booked yet.</p>
        )}
      </div>
      <div className="seat-stats">
        <span className="booked-count">Booked Seats: {totalBooked}</span>
        <span className="available-count">Available Seats: {totalAvailable}</span>
      </div>
      <div className="action-buttons">
        <button className="book-btn reset-btn" onClick={handleReset}>Reset My Seats</button>
        <button className="book-btn logout-btn" onClick={handleLogout}>Logout</button>
      </div>
      <ToastContainer position="top-right" autoClose={3000} />
    </div>
  );
}

export default App;