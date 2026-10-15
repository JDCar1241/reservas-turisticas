// Ubicación: src/routes/authRoutes.js
const express = require("express");
const router = express.Router();
const { login, me, logout } = require("../controllers/authController");

// POST /api/auth/login   -> inicia sesión (recibe { correo, contrasena })
router.post("/login", login);

// GET /api/auth/me       -> devuelve el usuario de la sesión (header Authorization: Bearer <token>)
router.get("/me", me);

// POST /api/auth/logout  -> confirma el cierre de sesión
router.post("/logout", logout);

module.exports = router;