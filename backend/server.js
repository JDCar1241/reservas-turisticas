
require("dotenv").config();

const express = require("express");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
    res.json({
        mensaje: "API de Reservas Turísticas funcionando",
        estado: "OK"
    });
});

app.get("/api/health", (req, res) => {
    res.json({
        status: "OK",
        servicio: "Reservas Turísticas"
    });
});

app.listen(PORT, () => {
    console.log(`Servidor activo en http://localhost:${PORT}`);
});
