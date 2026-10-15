"use strict";

/* data.js | Configuración de la API y estado compartido */

// Cambia esta dirección cuando publiques el backend.
const API_URL = "http://localhost:3000";

// Rutas previstas. Deben coincidir con las que implemente
// el backend antes de activar el registro y las reservas.
const API_ROUTES = {
    login: "/api/auth/login",
    register: "/api/auth/register",
    packages: "/api/paquetes",
    reservations: "/api/reservas",
    logout: "/api/auth/logout"
};

// Datos temporales para preparar la interfaz.
// No representan paquetes reales de la base de datos.
let paquetesDisponibles = [];

// No guardamos contraseñas ni tokens en localStorage.
// La sesión real deberá administrarse mediante el backend
// y una cookie segura o el mecanismo de autenticación elegido.