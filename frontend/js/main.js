"use strict";

/* main.js | Inicialización de la interfaz */

/* =========================================
   10. INICIALIZACIÓN
   ========================================= */

document.addEventListener("DOMContentLoaded", () => {
    console.log("ViajaPerú: frontend inicializado.");
    console.log(`API configurada en: ${API_URL}`);

    mostrarEstado(
        "Bienvenido a ViajaPerú. Consulta los destinos y paquetes disponibles."
    );
});