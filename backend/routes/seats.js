const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const Seat = require("../models/Seat");
const Student = require("../models/Student");
const Library = require("../models/Library");
const mongoose = require("mongoose");

/**
 * GET /api/seats/:libraryId
 * returns seat grid for a library
 */
router.get("/:libraryId", auth, async (req, res) => {
  try {
    const { libraryId } = req.params;

    const lib = await Library.findOne({
      _id: libraryId,
      managerId: req.manager._id,
    });
    if (!lib) return res.status(403).json({ message: "Forbidden" });

    // FETCH SEATS WITHOUT POPULATE
    const seats = await Seat.find({ libraryId }).lean();

    res.json({ library: lib, seats });
  } catch (err) {
    console.error("SEATS FETCH ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * POST /api/seats/:libraryId/:seatNumber/book
 * Body: { name, rollNo, contact, shiftName }
 * Books the seat for a student in the requested shift (if available).
 */
router.post("/:libraryId/:seatNumber/book", auth, async (req, res) => {
  try {
    const { libraryId, seatNumber } = req.params;
    const { name, rollNo, contact, shiftName } = req.body;

    if (!name || !shiftName)
      return res
        .status(400)
        .json({ message: "Missing required fields: name and shiftName" });

    // ensure manager owns this library
    const lib = await Library.findOne({
      _id: libraryId,
      managerId: req.manager._id,
    });
    if (!lib) return res.status(403).json({ message: "Forbidden" });

    // find the seat
    const seat = await Seat.findOne({
      libraryId,
      seatNumber: Number(seatNumber),
    });
    if (!seat) return res.status(404).json({ message: "Seat not found" });

    // find the shift inside seat
    const shiftIndex = seat.shifts.findIndex((s) => s.name === shiftName);
    if (shiftIndex === -1)
      return res
        .status(400)
        .json({ message: "Shift not available on this seat" });

    if (seat.shifts[shiftIndex].studentId) {
      return res
        .status(400)
        .json({ message: "Shift already booked for this seat" });
    }

    // create student
    const student = new Student({
      libraryId,
      name,
      rollNo,
      contact,
      seatNumber: Number(seatNumber),
      shiftName,
    });
    await student.save();

    // update seat shift with studentId
    seat.shifts[shiftIndex].studentId = student._id;
    await seat.save();

    res.json({ message: "Seat booked", studentId: student._id, student });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * GET single seat details including shifts & student info
 * GET /api/seats/:libraryId/:seatNumber
 */
router.get("/:libraryId/:seatNumber", auth, async (req, res) => {
  try {
    const { libraryId, seatNumber } = req.params;
    const lib = await Library.findOne({
      _id: libraryId,
      managerId: req.manager._id,
    });
    if (!lib) return res.status(403).json({ message: "Forbidden" });

    const seat = await Seat.findOne({
      libraryId,
      seatNumber: Number(seatNumber),
    }).populate("shifts.studentId", "-__v -createdAt");
    if (!seat) return res.status(404).json({ message: "Seat not found" });

    res.json({ seat });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
