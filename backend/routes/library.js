const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const Library = require("../models/Library");
const Seat = require("../models/Seat");

// POST /api/library/register
// Protected; manager can register a single library (one-to-one)
router.post("/register", auth, async (req, res) => {
  try {
    const { name, capacity, quote, location, shifts } = req.body;
    // shifts: array of { name, startTime, endTime } - these are the shift templates for seats
    if (!name || !capacity || !Array.isArray(shifts) || shifts.length === 0) {
      return res.status(400).json({
        message: "Missing required fields. Provide name, capacity and shifts.",
      });
    }

    // ensure manager doesn't already have a library
    const existingLib = await Library.findOne({ managerId: req.manager._id });
    if (existingLib) {
      return res
        .status(400)
        .json({ message: "Manager already has a registered library" });
    }

    const library = new Library({
      managerId: req.manager._id,
      name,
      capacity,
      quote,
      location,
    });

    await library.save();

    // generate seats
    const seatDocs = [];
    for (let i = 1; i <= capacity; i++) {
      const seatShifts = shifts.map((s) => ({
        name: s.name,
        startTime: s.startTime,
        endTime: s.endTime,
        studentId: null,
      }));
      seatDocs.push({
        libraryId: library._id,
        seatNumber: i,
        shifts: seatShifts,
      });
    }
    // bulk insert seats
    await Seat.insertMany(seatDocs);

    res
      .status(201)
      .json({ message: "Library registered", libraryId: library._id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// GET /api/library/me -> fetch manager's library and summary
router.get("/me", auth, async (req, res) => {
  try {
    const lib = await Library.findOne({ managerId: req.manager._id }).lean();
    if (!lib)
      return res
        .status(404)
        .json({ message: "No library found for this manager" });

    const totalSeats = lib.capacity;
    // you can fetch counts of booked seats etc if needed
    const bookedCount = await Seat.countDocuments({
      libraryId: lib._id,
      "shifts.studentId": { $ne: null },
    });

    res.json({ library: lib, totalSeats, bookedShiftsCount: bookedCount });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
