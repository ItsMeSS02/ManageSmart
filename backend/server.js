require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const authRoutes = require("./routes/auth");
const libraryRoutes = require("./routes/library");
const seatRoutes = require("./routes/seats");

const app = express();
app.use(
  cors({
    origin: "http://localhost:5173", // your frontend
    credentials: true,
  })
);

app.use(express.json());

// connect mongo
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("Mongo connect error", err));

// routes
app.use("/api/auth", authRoutes);
app.use("/api/library", libraryRoutes);
app.use("/api/seats", seatRoutes);

app.get("/", (req, res) => res.send("Library backend is running"));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log("Server started on port", PORT));
