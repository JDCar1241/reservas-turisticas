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

// Panel al que entra cada rol del personal (ruta desde la carpeta frontend/).
// El rol lo decide SIEMPRE el backend (columna "rol" de la base); el navegador solo lo lee
// para redirigir. Los valores deben coincidir exactamente con los de la base de datos.
const PANEL_POR_ROL = {
    administrador: "admin/dashboard.html",
    trabajador: "admin/dashboard.html",
    encargado_viajes: "admin/dashboard.html",
    recepcionista: "recepcion/dashboard.html"
};
const ROLES_PERSONAL = Object.keys(PANEL_POR_ROL);

// Mientras no exista el backend, true deja ver el panel sin sesión (solo para diseñar).
// ANTES DE PUBLICAR: ponerlo en false.
const MODO_DESARROLLO = true;

// Datos temporales para preparar la interfaz.
// No representan paquetes reales de la base de datos.
let paquetesDisponibles = [];

// No guardamos contraseñas ni tokens en localStorage.
// La sesión real deberá administrarse mediante el backend
// y una cookie segura o el mecanismo de autenticación elegido.