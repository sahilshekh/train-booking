import { useState, useEffect } from 'react';
import '../style.css';

function SeatMap() {
  const [seats, setSeats] = useState([]);

  useEffect(() => {
    fetch('http://localhost:5000/api/seats')
      .then(res => res.json())
      .then(data => setSeats(data))
      .catch(() => alert('Failed to load seats'));
  }, []);

  return (
    <div>
      {Array.from({ length: 12 }, (_, row) => (
        <div key={row} className="seat-row">
          {seats
            .filter(seat => seat.rowNumber === row + 1)
            .map(seat => (
              <button
                key={seat._id}
                className={`seat ${seat.isBooked ? 'booked' : ''}`}
              >
                {seat.seatNumber}
              </button>
            ))}
        </div>
      ))}
    </div>
  );
}

export default SeatMap;