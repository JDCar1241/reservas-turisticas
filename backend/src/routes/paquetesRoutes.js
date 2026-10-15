// src/routes/paquetesRoutes.js
const express = require("express");
const router = express.Router();
const { obtenerPaquetesConSalidas } = require("../controllers/paquetesController");

router.get("/", obtenerPaquetesConSalidas);

module.exports = router;