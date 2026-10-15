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
    logout: "/api/auth/logout",
    me: "/api/auth/me"            // devuelve el usuario de la sesión: { usuario: { nombre, rol } }
};

// Roles que entran al panel de la empresa. El rol lo decide SIEMPRE el backend
// (columna "rol" en la base de datos); el navegador solo lo lee para redirigir.
const ROLES_PERSONAL = ["administrador", "trabajador", "encargado_viajes", "recepcionista"];

// Mientras no exista el backend, true deja ver el panel sin sesión (solo para diseñar).
// ANTES DE PUBLICAR: ponerlo en false.
const MODO_DESARROLLO = true;

// Datos temporales para preparar la interfaz.
// No representan paquetes reales de la base de datos.
let paquetesDisponibles = [];

// No guardamos contraseñas ni tokens en localStorage.
// La sesión real deberá administrarse mediante el backend
// y una cookie segura o el mecanismo de autenticación elegido.