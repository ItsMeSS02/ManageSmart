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

    // Ensure the library belongs to the authenticated manager
    const lib = await Library.findOne({
      _id: libraryId,
      managerId: req.manager._id,
    });
    if (!lib) {
      console.log(`Access denied: Library ${libraryId} does not belong to manager ${req.manager._id}`);
      return res.status(403).json({ message: "Access denied: This library does not belong to you" });
    }
    
    console.log(`Fetching seats for library ${libraryId} (Manager: ${req.manager.email})`);

    // Fetch seats and populate student details, sorted by seatNumber
    const seats = await Seat.find({ libraryId })
      .sort({ seatNumber: 1 }) // Sort by seatNumber ascending (1, 2, 3, ...)
      .populate({
        path: "shifts.studentId",
        model: "Student",
        select: "name rollNo contact email",
      })
      .lean();

    res.json({ library: lib, seats });
  } catch (err) {
    console.error("SEATS FETCH ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// DELETE /api/seats/:libraryId/:seatNumber/book/:shiftName
router.delete(
  "/:libraryId/:seatNumber/book/:shiftName",
  auth,
  async (req, res) => {
    try {
      const { libraryId, seatNumber, shiftName } = req.params;

      // Ensure manager owns this library
      const lib = await Library.findOne({
        _id: libraryId,
        managerId: req.manager._id,
      });
      if (!lib) return res.status(403).json({ message: "Forbidden" });

      // Find and update the seat
      const seat = await Seat.findOne({ libraryId, seatNumber });
      if (!seat) return res.status(404).json({ message: "Seat not found" });

      // Find the shift and remove the booking
      const shiftIndex = seat.shifts.findIndex((s) => s.name === shiftName);
      if (shiftIndex === -1)
        return res.status(404).json({ message: "Shift not found" });

      // Get the student ID before removing it
      const studentId = seat.shifts[shiftIndex].studentId;

      // Remove student booking from the shift
      seat.shifts[shiftIndex].studentId = null;
      await seat.save();

      // Delete the student record if it exists
      if (studentId) {
        await Student.findByIdAndDelete(studentId);
      }

      res.json({ message: "Booking deleted successfully" });
    } catch (err) {
      console.error("DELETE BOOKING ERROR:", err);
      res.status(500).json({ message: "Server error" });
    }
  }
);

/**
 * POST /api/seats/:libraryId/:seatNumber/book
 * Body: { name, rollNo, contact, shiftName }
 * Books the seat for a student in the requested shift (if available).
 */
router.post("/:libraryId/:seatNumber/book", auth, async (req, res) => {
  try {
    const { libraryId, seatNumber } = req.params;
    const { name, rollNo, contact, shiftName } = req.body;

    if (!name || !shiftName || !rollNo || !contact) {
      return res.status(400).json({
        message:
          "Missing required fields. Please provide name, roll number, contact, and shift.",
      });
    }

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
      email: req.body.email || undefined,
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
 * PUT /api/seats/:libraryId/:seatNumber/book/:shiftName
 * Body: { name, rollNo, contact, email }
 * Updates student information for a booked seat shift
 */
router.put(
  "/:libraryId/:seatNumber/book/:shiftName",
  auth,
  async (req, res) => {
    try {
      const { libraryId, seatNumber, shiftName } = req.params;
      const { name, rollNo, contact, email } = req.body;

      if (!name || !rollNo || !contact) {
        return res.status(400).json({
          message:
            "Missing required fields. Please provide name, roll number, and contact.",
        });
      }

      // Ensure manager owns this library
      const lib = await Library.findOne({
        _id: libraryId,
        managerId: req.manager._id,
      });
      if (!lib) return res.status(403).json({ message: "Forbidden" });

      // Find the seat
      const seat = await Seat.findOne({ libraryId, seatNumber: Number(seatNumber) });
      if (!seat) return res.status(404).json({ message: "Seat not found" });

      // Find the shift
      const shiftIndex = seat.shifts.findIndex((s) => s.name === shiftName);
      if (shiftIndex === -1)
        return res.status(404).json({ message: "Shift not found" });

      // Check if shift is booked
      if (!seat.shifts[shiftIndex].studentId) {
        return res.status(400).json({ message: "Shift is not booked" });
      }

      // Update student information
      const student = await Student.findByIdAndUpdate(
        seat.shifts[shiftIndex].studentId,
        {
          name,
          rollNo,
          contact,
          email: email || undefined,
        },
        { new: true }
      );

      if (!student) {
        return res.status(404).json({ message: "Student not found" });
      }

      res.json({ message: "Student information updated", student });
    } catch (err) {
      console.error("UPDATE STUDENT ERROR:", err);
      res.status(500).json({ message: "Server error" });
    }
  }
);

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
    }).populate({
      path: "shifts.studentId",
      model: "Student",
      select: "name rollNo contact email",
    });
    if (!seat) return res.status(404).json({ message: "Seat not found" });

    res.json({ seat });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
