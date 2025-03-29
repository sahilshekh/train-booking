const mongoose = require('mongoose');
const seatSchema = new mongoose.Schema({
  seatNumber: { type: Number, required: true },
  rowNumber: { type: Number, required: true },
  isBooked: { type: Boolean, default: false },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
});
module.exports = mongoose.model('Seat', seatSchema);