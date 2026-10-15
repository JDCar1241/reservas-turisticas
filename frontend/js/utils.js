
"use strict";

/* =========================================
   ViajaPerú | utils.js
   Elementos HTML y funciones auxiliares
   ========================================= */

// Elementos de la interfaz
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
   1. MENSAJES
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
    if (!sessionStatus) {
        console.info(mensaje);
        return;
    }

    sessionStatus.textContent = mensaje;
}

function limpiarEstado() {
    if (sessionStatus) {
        sessionStatus.textContent = "";
    }
}

/* =========================================
   2. ESTADO DE LOS BOTONES
   ========================================= */

function establecerEstadoCargando(boton, cargando, textoOriginal) {
    if (!boton) return;

    if (cargando) {
        if (!boton.disabled) {
            boton.dataset.textoOriginal = boton.textContent;
        }

        boton.disabled = true;
        boton.textContent = textoOriginal || "Procesando...";
        boton.setAttribute("aria-busy", "true");
        return;
    }

    boton.disabled = false;

    if (boton.dataset.textoOriginal !== undefined) {
        boton.textContent = boton.dataset.textoOriginal;
        delete boton.dataset.textoOriginal;
    }

    boton.removeAttribute("aria-busy");
}

/* =========================================
   3. SOLICITUDES AL BACKEND
   ========================================= */

async function solicitarAPI(ruta, opciones = {}) {
    if (typeof API_URL === "undefined" || !API_URL) {
        throw new Error(
            "API_URL no está configurada en js/data.js."
        );
    }

    const encabezados = new Headers(opciones.headers || {});
    const esFormData = opciones.body instanceof FormData;

    if (!esFormData && opciones.body !== undefined &&
        !encabezados.has("Content-Type")) {
        encabezados.set("Content-Type", "application/json");
    }

    const respuesta = await fetch(
        `${API_URL.replace(/\/+$/, "")}/${String(ruta).replace(/^\/+/, "")}`,
        {
            ...opciones,
            headers: encabezados,
            credentials: "include"
        }
    );

    const tipoContenido = respuesta.headers.get("content-type") || "";
    let datos = {};

    if (tipoContenido.includes("application/json")) {
        try {
            datos = await respuesta.json();
        } catch {
            throw new Error("El servidor devolvió una respuesta JSON inválida.");
        }
    } else {
        const texto = await respuesta.text();
        if (texto) datos = { mensaje: texto };
    }

    if (!respuesta.ok) {
        throw new Error(
            datos.mensaje ||
            datos.message ||
            `La solicitud falló con el código ${respuesta.status}.`
        );
    }

    return datos;
}
