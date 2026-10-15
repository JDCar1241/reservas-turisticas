"use strict";

/* booking.js | Fechas mínimas y solicitud de reserva */

/* =========================================
   7. FECHAS DE BÚSQUEDA Y RESERVA
   ========================================= */

function establecerFechaMinima(selector) {
    const campo = document.querySelector(selector);

    if (!campo) return;

    const ahora = new Date();
    const zonaLocal = new Date(
        ahora.getTime() - ahora.getTimezoneOffset() * 60000
    );

    campo.min = zonaLocal.toISOString().slice(0, 10);
}

establecerFechaMinima("#departureDate");
establecerFechaMinima("#bookingDeparture");

/* =========================================
   8. SOLICITUD DE RESERVA
   ========================================= */

bookingForm?.addEventListener("submit", async (evento) => {
    evento.preventDefault();
    limpiarMensaje(bookingMessage);

    if (!bookingForm.reportValidity()) return;

    const paqueteId = bookingPackage.value;
    const fechaSalida = document.querySelector("#bookingDeparture").value;
    const viajeros = Number(document.querySelector("#bookingPeople").value);
    const observaciones = document.querySelector("#bookingNotes")
        .value.trim();

    if (!paqueteId) {
        mostrarMensaje(
            bookingMessage,
            "Selecciona un paquete turístico.",
            "error"
        );
        return;
    }

    if (!Number.isInteger(viajeros) || viajeros < 1 || viajeros > 20) {
        mostrarMensaje(
            bookingMessage,
            "El número de viajeros debe estar entre 1 y 20.",
            "error"
        );
        return;
    }

    const boton = bookingForm.querySelector('button[type="submit"]');

    establecerEstadoCargando(boton, true, "Enviando solicitud...");

    try {
        /*
         * El backend debe verificar la sesión del usuario,
         * la salida elegida y los cupos disponibles.
         * La validación definitiva de capacidad debe hacerse
         * de forma atómica en PostgreSQL.
         */

        const resultado = await solicitarAPI(API_ROUTES.reservations, {
            method: "POST",
            body: JSON.stringify({
                paquete_id: paqueteId,
                fecha_salida: fechaSalida,
                cantidad_personas: viajeros,
                observaciones
            })
        });

        bookingForm.reset();
        establecerFechaMinima("#bookingDeparture");

        mostrarMensaje(
            bookingMessage,
            resultado.mensaje ||
                "La solicitud de reserva se registró correctamente.",
            "success"
        );
    } catch (error) {
        mostrarMensaje(
            bookingMessage,
            error.message.includes("Failed to fetch")
                ? "No se pudo conectar con el backend. La reserva no se ha confirmado."
                : error.message,
            "error"
        );
    } finally {
        establecerEstadoCargando(boton, false);
    }
});