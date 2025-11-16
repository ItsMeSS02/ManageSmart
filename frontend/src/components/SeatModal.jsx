import React, { useState, useEffect } from "react";
import { Modal, Button, Form, Alert } from "react-bootstrap";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { bookSeat, deleteSeatBooking, updateStudent } from "../api";

const SeatModal = ({ show, onHide, seat, library }) => {
  const [studentDetails, setStudentDetails] = useState({
    name: "",
    email: "",
    phone: "",
    rollNo: "",
    shiftName: "",
  });

  const [editingShift, setEditingShift] = useState(null);
  const [editStudentDetails, setEditStudentDetails] = useState({
    name: "",
    email: "",
    phone: "",
    rollNo: "",
  });

  const queryClient = useQueryClient();

  // Reset form when modal closes or seat changes
  useEffect(() => {
    if (!show) {
      setStudentDetails({
        name: "",
        email: "",
        phone: "",
        rollNo: "",
        shiftName: "",
      });
      setEditingShift(null);
      setEditStudentDetails({
        name: "",
        email: "",
        phone: "",
        rollNo: "",
      });
    }
  }, [show, seat]);

  // Load student data when editing
  useEffect(() => {
    if (editingShift && seat?.shifts) {
      const shift = seat.shifts.find((s) => s.name === editingShift);
      if (shift?.studentId) {
        const student = shift.studentId;
        setEditStudentDetails({
          name: student.name || "",
          email: student.email || "",
          phone: student.contact || "",
          rollNo: student.rollNo || "",
        });
      }
    }
  }, [editingShift, seat]);

  const bookSeatMutation = useMutation({
    mutationFn: bookSeat,
    onSuccess: () => {
      queryClient.invalidateQueries(["librarySummary"]);
      queryClient.invalidateQueries(["seats", library._id]);
      setStudentDetails({
        name: "",
        email: "",
        phone: "",
        rollNo: "",
        shiftName: "",
      });
    },
  });

  const deleteSeatMutation = useMutation({
    mutationFn: deleteSeatBooking,
    onSuccess: () => {
      queryClient.invalidateQueries(["librarySummary"]);
      queryClient.invalidateQueries(["seats", library._id]);
    },
  });

  const updateStudentMutation = useMutation({
    mutationFn: updateStudent,
    onSuccess: () => {
      queryClient.invalidateQueries(["librarySummary"]);
      queryClient.invalidateQueries(["seats", library._id]);
      setEditingShift(null);
      setEditStudentDetails({
        name: "",
        email: "",
        phone: "",
        rollNo: "",
      });
    },
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setStudentDetails((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleEditInputChange = (e) => {
    const { name, value } = e.target;
    setEditStudentDetails((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!studentDetails.shiftName) {
      alert("Please select a shift");
      return;
    }

    if (!library?._id || !seat?.seatNumber) {
      alert("Error: Missing library or seat information");
      return;
    }

    bookSeatMutation.mutate({
      libraryId: library._id,
      seat: seat,
      studentDetails,
    });
  };

  const handleDelete = (shiftName) => {
    if (
      window.confirm(
        `Are you sure you want to delete the booking for ${shiftName} shift?`
      )
    ) {
      deleteSeatMutation.mutate({
        libraryId: library._id,
        seatNumber: seat.seatNumber,
        shiftName,
      });
    }
  };

  const handleEdit = (shiftName) => {
    setEditingShift(shiftName);
  };

  const handleEditSubmit = (e) => {
    e.preventDefault();
    if (!library?._id || !seat?.seatNumber || !editingShift) {
      alert("Error: Missing information");
      return;
    }

    updateStudentMutation.mutate({
      libraryId: library._id,
      seatNumber: seat.seatNumber,
      shiftName: editingShift,
      studentDetails: editStudentDetails,
    });
  };

  const handleCancelEdit = () => {
    setEditingShift(null);
    setEditStudentDetails({
      name: "",
      email: "",
      phone: "",
      rollNo: "",
    });
  };

  // Helper function to check if shift is occupied
  const isShiftOccupied = (shift) => {
    // Check if studentId exists and is an object (populated) or truthy (booked)
    return shift.studentId && 
           (typeof shift.studentId === "object" || 
            (typeof shift.studentId === "string" && shift.studentId.length > 0));
  };

  // Get student from shift
  const getStudentFromShift = (shift) => {
    // If studentId is an object, it's populated with student data
    if (shift.studentId && typeof shift.studentId === "object") {
      return shift.studentId;
    }
    return null;
  };

  if (!seat) return null;

  return (
    <Modal show={show} onHide={onHide} centered size="lg">
      <Modal.Header closeButton>
        <Modal.Title>Seat {seat.seatNumber}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {seat.shifts && seat.shifts.length > 0 ? (
          <div>
            {seat.shifts.map((shift, index) => {
              const student = getStudentFromShift(shift);
              const isOccupied = !!student;
              const isEditing = editingShift === shift.name;

              return (
                <div key={index} className="shift-card">
                  <div className="shift-header">
                    <h5 className="shift-title">
                      ⏰ {shift.name} ({shift.startTime} - {shift.endTime})
                    </h5>
                    {isOccupied && !isEditing && (
                      <div>
                        <Button
                          variant="warning"
                          size="sm"
                          className="me-2"
                          onClick={() => handleEdit(shift.name)}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => handleDelete(shift.name)}
                          disabled={deleteSeatMutation.isPending}
                        >
                          {deleteSeatMutation.isPending ? "Deleting..." : "Delete"}
                        </Button>
                      </div>
                    )}
                  </div>

                  {isEditing ? (
                    <Form onSubmit={handleEditSubmit}>
                      <Form.Group className="mb-3">
                        <Form.Label>Student Name</Form.Label>
                        <Form.Control
                          type="text"
                          name="name"
                          value={editStudentDetails.name}
                          onChange={handleEditInputChange}
                          required
                        />
                      </Form.Group>
                      <Form.Group className="mb-3">
                        <Form.Label>Email</Form.Label>
                        <Form.Control
                          type="email"
                          name="email"
                          value={editStudentDetails.email}
                          onChange={handleEditInputChange}
                        />
                      </Form.Group>
                      <Form.Group className="mb-3">
                        <Form.Label>Phone Number</Form.Label>
                        <Form.Control
                          type="tel"
                          name="phone"
                          value={editStudentDetails.phone}
                          onChange={handleEditInputChange}
                          required
                        />
                      </Form.Group>
                      <Form.Group className="mb-3">
                        <Form.Label>Roll Number</Form.Label>
                        <Form.Control
                          type="text"
                          name="rollNo"
                          value={editStudentDetails.rollNo}
                          onChange={handleEditInputChange}
                          required
                        />
                      </Form.Group>
                      <div className="d-flex gap-2">
                        <Button
                          variant="primary"
                          type="submit"
                          disabled={updateStudentMutation.isPending}
                        >
                          {updateStudentMutation.isPending
                            ? "Updating..."
                            : "Update"}
                        </Button>
                        <Button
                          variant="secondary"
                          onClick={handleCancelEdit}
                        >
                          Cancel
                        </Button>
                      </div>
                    </Form>
                  ) : isOccupied ? (
                    <div className="student-info-card">
                      <strong className="text-primary">👤 Student Information:</strong>
                      <div className="mt-2">
                        <p className="mb-2">
                          <strong>📛 Name:</strong> {student.name}
                        </p>
                        <p className="mb-2">
                          <strong>🎫 Roll No:</strong> {student.rollNo}
                        </p>
                        <p className="mb-2">
                          <strong>📞 Contact:</strong> {student.contact}
                        </p>
                        {student.email && (
                          <p className="mb-0">
                            <strong>📧 Email:</strong> {student.email}
                          </p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div>
                      <Alert variant="success">
                        ✅ This shift is available for booking
                      </Alert>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Booking Form for Available Shifts */}
            {seat.shifts.some((shift) => !isShiftOccupied(shift)) && (
              <div className="mt-4 p-4 border rounded" style={{ background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)', borderColor: 'var(--info-color)' }}>
                <h5 className="mb-3">📝 Book Available Shift</h5>
                <Form onSubmit={handleSubmit}>
                  <Form.Group className="mb-3">
                    <Form.Label>Student Name</Form.Label>
                    <Form.Control
                      type="text"
                      name="name"
                      value={studentDetails.name}
                      onChange={handleInputChange}
                      required
                    />
                  </Form.Group>
                  <Form.Group className="mb-3">
                    <Form.Label>Email</Form.Label>
                    <Form.Control
                      type="email"
                      name="email"
                      value={studentDetails.email}
                      onChange={handleInputChange}
                    />
                  </Form.Group>
                  <Form.Group className="mb-3">
                    <Form.Label>Phone Number</Form.Label>
                    <Form.Control
                      type="tel"
                      name="phone"
                      value={studentDetails.phone}
                      onChange={handleInputChange}
                      required
                    />
                  </Form.Group>
                  <Form.Group className="mb-3">
                    <Form.Label>Roll Number</Form.Label>
                    <Form.Control
                      type="text"
                      name="rollNo"
                      value={studentDetails.rollNo}
                      onChange={handleInputChange}
                      required
                    />
                  </Form.Group>
                  <Form.Group className="mb-3">
                    <Form.Label>Select Shift</Form.Label>
                    <Form.Control
                      as="select"
                      name="shiftName"
                      value={studentDetails.shiftName}
                      onChange={handleInputChange}
                      required
                    >
                      <option value="">Choose a shift...</option>
                      {seat.shifts
                        .filter((shift) => !isShiftOccupied(shift))
                        .map((shift, index) => (
                          <option key={index} value={shift.name}>
                            {shift.name} ({shift.startTime} - {shift.endTime})
                          </option>
                        ))}
                    </Form.Control>
                  </Form.Group>
                  <div className="text-center">
                    <Button
                      variant="primary"
                      type="submit"
                      disabled={bookSeatMutation.isPending}
                    >
                      {bookSeatMutation.isPending ? "Booking..." : "Book Seat"}
                    </Button>
                  </div>
                </Form>
              </div>
            )}
          </div>
        ) : (
          <p>No shifts are configured for this seat.</p>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>
          Close
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default SeatModal;
