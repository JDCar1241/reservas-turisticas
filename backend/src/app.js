const express = require("express");
const cors = require("cors");

const paquetesRoutes = require("./routes/paquetesRoutes");
const reservasRoutes = require("./routes/reservasRoutes");
const authRoutes = require("./routes/authRoutes");

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/paquetes", paquetesRoutes);
app.use("/api/reservas", reservasRoutes);  
app.use("/api/auth", authRoutes);

app.get("/api/db-health", async (req, res) => {
  const pool = require("./config/db");
  try {
    const result = await pool.query("SELECT NOW()");
    res.json({ status: "OK", timestamp: result.rows[0].now });
  } catch (err) {
    res.status(500).json({ status: "ERROR", error: err.message });
  }
});

app.use((req, res) => {
  res.status(404).json({ ok: false, mensaje: "Ruta no encontrada" });
});

module.exports = app;