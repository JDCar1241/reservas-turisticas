"use strict";

/* data.js | Configuración de la API y estado compartido */

// Entorno: en tu computadora (localhost) se activa el modo desarrollo; en el servidor, no.
// Así no hay que acordarse de apagarlo al desplegar.
const MODO_DESARROLLO =
    window.location.protocol === "file:" ||
    ["localhost", "127.0.0.1"].includes(window.location.hostname);

// Dirección del backend. AL DESPLEGAR: reemplaza el texto de producción por la URL real
// de tu backend (con https://). El backend debe permitir el origen del frontend en su CORS.
const API_URL = MODO_DESARROLLO
    ? "http://localhost:3000"
    : "https://REEMPLAZAR-CON-LA-URL-DE-TU-BACKEND";

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


// Datos temporales para preparar la interfaz.
// No representan paquetes reales de la base de datos.
let paquetesDisponibles = [];

// No guardamos contraseñas ni tokens en localStorage.
// La sesión real deberá administrarse mediante el backend
// y una cookie segura o el mecanismo de autenticación elegido.