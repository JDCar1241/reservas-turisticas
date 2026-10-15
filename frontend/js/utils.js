"use strict";

/* utils.js | Elementos de la interfaz y funciones de apoyo (se carga después de data.js) */

// Elementos de la interfaz.
const loginDialog = document.querySelector("#loginDialog");
const registerDialog = document.querySelector("#registerDialog");

const loginForm = document.querySelector("#loginForm");
const registerForm = document.querySelector("#registerForm");
const searchForm = document.querySelector("#searchForm");
const bookingForm = document.querySelector("#bookingForm");

const loginBtn = document.querySelector("#loginBtn");
const registerBtn = document.querySelector("#registerBtn");
const logoutBtn = document.querySelector("#logoutBtn");

const loginMessage = document.querySelector("#loginMessage");
const registerMessage = document.querySelector("#registerMessage");
const searchMessage = document.querySelector("#searchMessage");
const bookingMessage = document.querySelector("#bookingMessage");

const packageResults = document.querySelector("#packageResults");
const bookingPackage = document.querySelector("#bookingPackage");

const sessionStatus = document.querySelector("#sessionStatus");

/* =========================================
   1. UTILIDADES
   ========================================= */

function mostrarMensaje(elemento, mensaje, tipo = "info") {
    if (!elemento) return;

    elemento.textContent = mensaje;
    elemento.className = `form-message ${tipo}`;
}

function limpiarMensaje(elemento) {
    if (!elemento) return;

    elemento.textContent = "";
    elemento.className = "form-message";
}

function mostrarEstado(mensaje) {
    if (!sessionStatus) return;

    sessionStatus.textContent = mensaje;

    // El mensaje permanece visible hasta la siguiente acción.
}

function limpiarEstado() {
    if (sessionStatus) {
        sessionStatus.textContent = "";
    }
}

function establecerEstadoCargando(boton, cargando, textoOriginal) {
    if (!boton) return;

    if (cargando) {
        boton.disabled = true;
        boton.dataset.textoOriginal = boton.textContent;
        boton.textContent = textoOriginal || "Procesando...";
        boton.setAttribute("aria-busy", "true");
    } else {
        boton.disabled = false;
        boton.textContent =
            boton.dataset.textoOriginal || textoOriginal || "Enviar";
        boton.removeAttribute("aria-busy");
        delete boton.dataset.textoOriginal;
    }
}

/* =========================================
   2. SESIÓN (token del backend)
   =========================================
   El backend devuelve un access_token en el JSON. Se guarda en sessionStorage
   (se borra al cerrar la pestaña) y se envía en cada petición como
   "Authorization: Bearer <token>". La validación real la hace el backend. */

const CLAVE_TOKEN = "token";
const CLAVE_USUARIO = "usuario";

function obtenerToken() {
    try {
        return sessionStorage.getItem(CLAVE_TOKEN);
    } catch {
        return null;
    }
}

function obtenerUsuarioGuardado() {
    try {
        const texto = sessionStorage.getItem(CLAVE_USUARIO);
        return texto ? JSON.parse(texto) : null;
    } catch {
        return null;
    }
}

function guardarSesion(token, usuario) {
    try {
        sessionStorage.setItem(CLAVE_TOKEN, token);
        sessionStorage.setItem(CLAVE_USUARIO, JSON.stringify(usuario || null));
    } catch {
        // Si el navegador bloquea el almacenamiento, la sesión no se podrá conservar.
    }
}

function limpiarSesion() {
    try {
        sessionStorage.removeItem(CLAVE_TOKEN);
        sessionStorage.removeItem(CLAVE_USUARIO);
    } catch {
        // Nada que limpiar.
    }
}

/* =========================================
   3. PETICIONES AL BACKEND
   ========================================= */

async function solicitarAPI(ruta, opciones = {}) {
    const { headers: cabecerasExtra = {}, ...resto } = opciones;
    const cabeceras = { ...cabecerasExtra };

    // Con FormData (archivos) el navegador define el Content-Type por su cuenta.
    const hayCuerpo = resto.body !== undefined && resto.body !== null;
    if (hayCuerpo && !(resto.body instanceof FormData) && !cabeceras["Content-Type"]) {
        cabeceras["Content-Type"] = "application/json";
    }

    // Se envía el token guardado (si existe) sin pisar uno indicado a mano.
    const token = obtenerToken();
    if (token && !cabeceras.Authorization) {
        cabeceras.Authorization = `Bearer ${token}`;
    }

    // Sin "credentials: include": el backend usa token Bearer, no cookies.
    const respuesta = await fetch(`${API_URL}${ruta}`, {
        ...resto,
        headers: cabeceras
    });

    const tipoContenido = respuesta.headers.get("content-type") || "";

    let datos = {};

    if (tipoContenido.includes("application/json")) {
        try {
            datos = await respuesta.json();
        } catch {
            datos = {};
        }
    }

    if (!respuesta.ok) {
        const error = new Error(
            datos.mensaje ||
            datos.message ||
            `La solicitud falló (${respuesta.status}).`
        );
        error.status = respuesta.status;
        throw error;
    }

    return datos;
}

// Deja el rol en una forma estable para comparar: "Guía Turístico" -> "guia_turistico".
// Así da igual si la base guarda "Recepcionista", "recepcionista" o "RECEPCIONISTA".
function normalizarRol(rol) {
    return String(rol || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "_");
}

// ¿El rol pertenece al personal de la empresa? (cualquier otro va al área de clientes)
function esPersonal(rol) {
    return ROLES_PERSONAL.includes(normalizarRol(rol));
}

// Panel de cada rol (ruta desde frontend/) o null si el rol no es de personal.
function panelPorRol(rol) {
    return esPersonal(rol) ? PANEL_POR_ROL[normalizarRol(rol)] : null;
}