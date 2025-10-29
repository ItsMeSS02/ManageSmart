import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";

function LibraryRegister() {
  const [name, setName] = useState("");
  const [capacity, setCapacity] = useState(0);
  const [quote, setQuote] = useState("");
  const [location, setLocation] = useState("");
  const [shifts, setShifts] = useState([
    { name: "Morning", startTime: "", endTime: "" },
  ]);
  const navigate = useNavigate();

  const handleShiftChange = (index, field, value) => {
    const newShifts = [...shifts];
    newShifts[index][field] = value;
    setShifts(newShifts);
  };

  const addShift = () =>
    setShifts([...shifts, { name: "", startTime: "", endTime: "" }]);

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      await api.post("/library/register", {
        name,
        capacity,
        quote,
        location,
        shifts,
      });
      navigate("/dashboard"); // after library registration, go to dashboard
    } catch (err) {
      alert(err.response?.data?.message || "Library registration failed");
    }
  };

  return (
    <div className="container mt-5">
      <h2>Register Library</h2>
      <form onSubmit={handleRegister}>
        <div className="mb-3">
          <label>Library Name</label>
          <input
            className="form-control"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="mb-3">
          <label>Capacity</label>
          <input
            className="form-control"
            type="number"
            value={capacity}
            onChange={(e) => setCapacity(e.target.value)}
          />
        </div>
        <div className="mb-3">
          <label>Quote</label>
          <input
            className="form-control"
            value={quote}
            onChange={(e) => setQuote(e.target.value)}
          />
        </div>
        <div className="mb-3">
          <label>Location</label>
          <input
            className="form-control"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />
        </div>

        <h5>Shifts</h5>
        {shifts.map((shift, index) => (
          <div key={index} className="mb-3 border p-2">
            <input
              className="form-control mb-1"
              placeholder="Shift Name"
              value={shift.name}
              onChange={(e) => handleShiftChange(index, "name", e.target.value)}
            />
            <input
              className="form-control mb-1"
              placeholder="Start Time (HH:mm)"
              value={shift.startTime}
              onChange={(e) =>
                handleShiftChange(index, "startTime", e.target.value)
              }
            />
            <input
              className="form-control"
              placeholder="End Time (HH:mm)"
              value={shift.endTime}
              onChange={(e) =>
                handleShiftChange(index, "endTime", e.target.value)
              }
            />
          </div>
        ))}
        <button
          type="button"
          className="btn btn-secondary mb-3"
          onClick={addShift}
        >
          Add Shift
        </button>
        <br />
        <button type="submit" className="btn btn-primary">
          Register Library
        </button>
      </form>
    </div>
  );
}

export default LibraryRegister;
