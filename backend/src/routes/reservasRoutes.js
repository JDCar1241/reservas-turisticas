const express = require("express");
const router = express.Router();
const { crearReservaPresencial } = require("../controllers/reservasController");

router.post("/", crearReservaPresencial);

module.exports = router;