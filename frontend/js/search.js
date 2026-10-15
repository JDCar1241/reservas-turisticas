"use strict";

/* search.js | Búsqueda de paquetes y botones de destinos */

/* =========================================
   6. BÚSQUEDA DE PAQUETES
   ========================================= */

searchForm?.addEventListener("submit", async (evento) => {
    evento.preventDefault();
    limpiarMensaje(searchMessage);

    const destino = document.querySelector("#destinationSearch")
        .value.trim();

    const fecha = document.querySelector("#departureDate").value;

    const orden = document.querySelector("#sortPackages").value;

    const parametros = new URLSearchParams();

    if (destino) parametros.set("destino", destino);
    if (fecha) parametros.set("fecha", fecha);
    if (orden !== "default") parametros.set("orden", orden);

    const boton = searchForm.querySelector('button[type="submit"]');

    establecerEstadoCargando(boton, true, "Buscando...");

    try {
        const query = parametros.toString();
        const ruta = query
            ? `${API_ROUTES.packages}?${query}`
            : API_ROUTES.packages;

        const resultado = await solicitarAPI(ruta, {
            method: "GET",
            headers: {}
        });

        const paquetes = Array.isArray(resultado)
            ? resultado
            : resultado.paquetes;

        if (!Array.isArray(paquetes)) {
            throw new Error(
                "La respuesta del servidor no contiene una lista de paquetes válida."
            );
        }

        paquetesDisponibles = paquetes;

        renderizarPaquetes(paquetesDisponibles);

        mostrarMensaje(
            searchMessage,
            `Se encontraron ${paquetesDisponibles.length} paquete(s).`,
            "success"
        );
    } catch (error) {
        renderizarPaquetes([]);

        mostrarMensaje(
            searchMessage,
            error.message.includes("Failed to fetch")
                ? "No se pudo conectar con el backend. Comprueba que el servidor esté activo y que exista la ruta de paquetes."
                : error.message,
            "error"
        );
    } finally {
        establecerEstadoCargando(boton, false);
    }
});

/* =========================================
   9. BOTONES DE DESTINOS
   ========================================= */

document.querySelectorAll(".reserve-btn").forEach((boton) => {
    boton.addEventListener("click", () => {
        const destino = boton.dataset.destination;

        const campoBusqueda =
            document.querySelector("#destinationSearch");

        if (campoBusqueda) {
            campoBusqueda.value = destino;
        }

        document.querySelector("#buscar")?.scrollIntoView({
            behavior: "smooth"
        });

        mostrarMensaje(
            searchMessage,
            `Destino seleccionado: ${destino}. Pulsa "Buscar paquetes" para consultar el backend.`,
            "info"
        );
    });
});