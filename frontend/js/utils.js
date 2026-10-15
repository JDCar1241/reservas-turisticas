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

async function solicitarAPI(ruta, opciones = {}) {
    const respuesta = await fetch(`${API_URL}${ruta}`, {
        ...opciones,
        credentials: "include",
        // Con FormData (archivos) el navegador define el Content-Type por su cuenta.
        headers: opciones.body instanceof FormData
            ? { ...opciones.headers }
            : {
                "Content-Type": "application/json",
                ...opciones.headers
            }
    });

    const tipoContenido = respuesta.headers.get("content-type") || "";

    let datos = {};

    if (tipoContenido.includes("application/json")) {
        datos = await respuesta.json();
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

// ¿El rol pertenece al personal de la empresa? (cualquier otro va al área de clientes)
function esPersonal(rol) {
    return ROLES_PERSONAL.includes(rol);
}