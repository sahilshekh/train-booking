import { useState, useEffect } from 'react';
import '../style.css';

function SeatMap({ token, onBook, bookedSeats, refreshTrigger }) {
  const [seats, setSeats] = useState([]);
  const [selected, setSelected] = useState([]);

  useEffect(() => {
    fetchSeats();
  }, [refreshTrigger]);

  const fetchSeats = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/seats');
      const data = await res.json();
      setSeats(data);
    } catch (err) {
      alert('Failed to load seats');
    }
  };

  const toggleSeat = (seat) => {
    if (seat.isBooked) return;
    const isSelected = selected.some(s => s._id === seat._id);
    if (isSelected) {
      setSelected(selected.filter(s => s._id !== seat._id));
    } else if (selected.length < 7) {
      setSelected([...selected, seat]);
    }
  };

  const handleBooking = () => {
    const seatIds = selected.map(seat => seat._id);
    onBook(seatIds);
    setSelected([]);
  };

  return (
    <div className="seat-map">
      {Array.from({ length: 12 }, (_, row) => (
        <div key={row} className="seat-row">
          {seats
            .filter(seat => seat.rowNumber === row + 1)
            .map(seat => (
              <button
                key={seat._id}
                className={`seat ${seat.isBooked ? 'booked' : 'available'} ${selected.some(s => s._id === seat._id) ? 'selected' : ''}`}
                onClick={() => toggleSeat(seat)}
                disabled={seat.isBooked}
                title={`Seat ${seat.seatNumber} - ${seat.isBooked ? 'Booked Already' : 'Available'}`}
              >
                {seat.seatNumber}
              </button>
            ))}
        </div>
      ))}
      <button
        className="book-btn custom-book-btn"
        onClick={handleBooking}
        disabled={selected.length === 0}
      >
        Book {selected.length} Seat(s)
      </button>
    </div>
  );
}

export default SeatMap;