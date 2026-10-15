"use strict";

/* data.js | Configuración de la API y estado compartido */

// Entorno: en tu computadora (localhost) se activa el modo desarrollo; en el servidor, no.
// Así no hay que acordarse de apagarlo al desplegar.
const MODO_DESARROLLO =
    window.location.protocol === "file:" ||
    ["localhost", "127.0.0.1"].includes(window.location.hostname);

// Dirección del backend.
// - En desarrollo: el backend local en el puerto 3000.
// - En producción: cadena vacía, porque el backend también sirve el frontend y ambos
//   comparten dominio (las peticiones van a /api/... del mismo sitio).
// Si algún día separas el frontend del backend, pon aquí la URL completa del backend
// (con https://) y limita el CORS del backend a tu dominio.
const API_URL = MODO_DESARROLLO
    ? "http://localhost:3000"
    : "";

// Rutas del backend. Deben coincidir con las que implementa el backend.
// Implementadas hoy: login, logout y me. Pendiente: register.
const API_ROUTES = {
    login: "/api/auth/login",
    register: "/api/auth/register",
    packages: "/api/paquetes",
    reservations: "/api/reservas",
    logout: "/api/auth/logout",
    me: "/api/auth/me"            // devuelve el usuario de la sesión: { usuario: { nombre, rol } }
};

// Panel al que entra cada rol del personal (ruta desde la carpeta frontend/).
// El rol lo decide SIEMPRE el backend (columna "rol" de la base); el navegador solo lo lee
// para redirigir. Las claves se escriben en minúsculas, sin tildes y con guion bajo:
// "Guía Turístico" -> guia_turistico. La comparación ignora mayúsculas y tildes,
// pero las palabras deben coincidir con las de la base de datos.
const PANEL_POR_ROL = {
    administrador: "admin/dashboard.html",
    gerente: "admin/dashboard.html",
    trabajador: "admin/dashboard.html",
    encargado_viajes: "admin/dashboard.html",
    recepcionista: "recepcion/dashboard.html"
};
const ROLES_PERSONAL = Object.keys(PANEL_POR_ROL);


// Datos temporales para preparar la interfaz.
// No representan paquetes reales de la base de datos.
let paquetesDisponibles = [];

// La contraseña nunca se guarda en el navegador. El token de sesión que devuelve el
// backend se guarda en sessionStorage (se borra al cerrar la pestaña) y se envía en cada
// petición como "Authorization: Bearer <token>". La seguridad real la valida el backend.