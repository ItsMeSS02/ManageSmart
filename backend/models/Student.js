// models/Student.js
const mongoose = require("mongoose");

const StudentSchema = new mongoose.Schema({
  libraryId: { type: mongoose.Schema.Types.ObjectId, ref: "Library" },
  name: { type: String, required: true },
  contact: String,
  shiftName: String, // Morning / Evening (optional duplicate for convenience)
  seatNumber: Number, // optional
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Student", StudentSchema);
