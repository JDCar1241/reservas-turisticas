
"use strict";

/* =========================================
   ViajaPerú | main.js
   Inicialización de la interfaz
   ========================================= */

document.addEventListener("DOMContentLoaded", () => {
    console.log("ViajaPerú: frontend inicializado.");

    if (typeof API_URL !== "undefined" && API_URL) {
        console.log(`API configurada en: ${API_URL}`);
    } else {
        console.warn(
            "API_URL no está configurada. Revisa js/data.js."
        );
    }

    const estado = document.querySelector("#sessionStatus");

    if (estado && !estado.textContent.trim()) {
        mostrarEstado(
            "Bienvenido a ViajaPerú. Consulta los destinos y paquetes disponibles."
        );
    }
});
