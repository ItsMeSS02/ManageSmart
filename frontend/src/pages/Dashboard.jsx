import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "../api";

function Dashboard() {
  const [selectedSeat, setSelectedSeat] = useState(null);

  // Fetch library summary
  const { data: libraryData, isLoading: libLoading } = useQuery(
    ["librarySummary"],
    async () => {
      const res = await api.get("/library/me");
      return res.data.library;
    }
  );

  // Fetch all seats for this library (once library data is loaded)
  const { data: seatsData, isLoading: seatsLoading } = useQuery(
    ["librarySeats", libraryData?.id],
    async () => {
      const res = await api.get(`/seats/${libraryData.id}`);
      return res.data.seats;
    },
    { enabled: !!libraryData?.id }
  );

  if (libLoading || seatsLoading)
    return <div className="container mt-5">Loading...</div>;

  const handleSeatClick = (seat) => setSelectedSeat(seat);

  return (
    <div className="container mt-5">
      <h2>Library Dashboard</h2>
      {/* Summary Cards */}
      <div className="d-flex gap-3 my-3">
        <div className="card p-3 flex-fill">
          <h5>Total Seats</h5>
          <h3>{libraryData.totalSeats}</h3>
        </div>
        <div className="card p-3 flex-fill">
          <h5>Booked Seats</h5>
          <h3>{libraryData.bookedSeats}</h3>
        </div>
        <div className="card p-3 flex-fill">
          <h5>Available Seats</h5>
          <h3>{libraryData.availableSeats}</h3>
        </div>
      </div>

      {/* Seat Grid */}
      <h4 className="mt-4">Seat Grid</h4>
      <div className="d-flex flex-wrap gap-2">
        {seatsData.map((seat) => {
          const bookedShifts = seat.shifts.filter((s) => s.studentId).length;
          const isFullyBooked = bookedShifts === seat.shifts.length;
          return (
            <div
              key={seat.seatNumber}
              className={`card p-2 text-center ${
                isFullyBooked ? "bg-danger text-white" : "bg-success text-white"
              }`}
              style={{ width: "60px", cursor: "pointer" }}
              onClick={() => handleSeatClick(seat)}
            >
              {seat.seatNumber}
            </div>
          );
        })}
      </div>

      {/* Selected Seat Details */}
      {selectedSeat && (
        <div className="mt-4">
          <h5>Seat {selectedSeat.seatNumber} Details</h5>
          <table className="table table-bordered">
            <thead>
              <tr>
                <th>Shift</th>
                <th>Student Name</th>
                <th>Contact</th>
              </tr>
            </thead>
            <tbody>
              {selectedSeat.shifts.map((shift, idx) => (
                <tr key={idx}>
                  <td>{shift.name}</td>
                  <td>{shift.studentId?.name || "-"}</td>
                  <td>{shift.studentId?.contact || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default Dashboard;
