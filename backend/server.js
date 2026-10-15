require("dotenv").config();

const express = require("express");
const cors = require("cors");
const pool = require("./db");

const app = express();
const PORT = process.env.PORT || 3000;

// ================================
// CONFIGURACIÓN DEL SERVIDOR
// ================================

app.use(cors());
app.use(express.json());

// ================================
// RUTA PRINCIPAL
// ================================

app.get("/", (req, res) => {
    res.json({
        mensaje: "API de Reservas Turísticas funcionando",
        estado: "OK"
    });
});

// ================================
// ESTADO DEL BACKEND
// ================================

app.get("/api/health", (req, res) => {
    res.json({
        status: "OK",
        servicio: "Reservas Turísticas",
        mensaje: "El backend está funcionando correctamente"
    });
});

// ================================
// COMPROBAR CONEXIÓN CON SUPABASE
// ================================

app.get("/api/db-health", async (req, res) => {
    try {
        const resultado = await pool.query(
            "SELECT NOW() AS fecha_servidor"
        );

        res.status(200).json({
            status: "OK",
            mensaje: "Conexión con Supabase exitosa",
            baseDatos: "PostgreSQL",
            fechaServidor: resultado.rows[0].fecha_servidor
        });
    } catch (error) {
        console.error(
            "Error al conectar con Supabase:",
            error.message
        );

        res.status(500).json({
            status: "ERROR",
            mensaje: "No se pudo conectar con la base de datos"
        });
    }
});

// ================================
// MANEJO DE RUTAS NO ENCONTRADAS
// ================================

app.use((req, res) => {
    res.status(404).json({
        status: "ERROR",
        mensaje: "Ruta no encontrada",
        ruta: req.originalUrl
    });
});

// ================================
// INICIAR SERVIDOR
// ================================

const server = app.listen(PORT, () => {
    console.log("----------------------------------------");
    console.log(" API DE RESERVAS TURÍSTICAS");
    console.log("----------------------------------------");
    console.log(`Servidor activo en http://localhost:${PORT}`);
    console.log(`Estado: http://localhost:${PORT}/api/health`);
    console.log(`Base de datos: http://localhost:${PORT}/api/db-health`);
    console.log("----------------------------------------");
});

// ================================
// CIERRE ORDENADO
// ================================

process.on("SIGINT", () => {
    console.log("\nCerrando servidor...");

    server.close(async () => {
        try {
            await pool.end();
            console.log("Conexiones cerradas correctamente.");
            process.exit(0);
        } catch (error) {
            console.error("Error al cerrar conexiones:", error.message);
            process.exit(1);
        }
    });
});