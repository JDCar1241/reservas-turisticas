"use strict";

/* search.js | Búsqueda, filtros, ordenamiento y destinos */

/* =========================================
   1. FUNCIONES AUXILIARES
   ========================================= */

function obtenerPrecioFiltro(paquete) {
    const precio = paquete.precio ?? paquete.costo;
    if (precio === null || precio === undefined || precio === "") {
        return null;
    }

    const numero = Number(precio);
    return Number.isFinite(numero) ? numero : null;
}

function obtenerCapacidadFiltro(paquete) {
    const capacidad =
        paquete.cupos_disponibles ??
        paquete.capacidad_disponible ??
        paquete.capacidad ??
        paquete.capacidad_maxima;

    if (capacidad === null || capacidad === undefined || capacidad === "") {
        return 0;
    }

    const numero = Number(capacidad);
    return Number.isFinite(numero) ? numero : 0;
}

function obtenerFechasFiltro(paquete) {
    const salidas = paquete.salidas ?? paquete.fechas_salida;

    if (Array.isArray(salidas)) {
        return salidas.map((salida) => {
            if (typeof salida === "string") return salida;

            return (
                salida.fecha_salida ??
                salida.fecha ??
                salida.fecha_inicio ??
                ""
            );
        }).filter(Boolean);
    }

    const fecha =
        paquete.fecha_salida ??
        paquete.fecha_inicio ??
        paquete.fecha;

    return fecha ? [String(fecha)] : [];
}

function aplicarFiltrosLocales(paquetes, filtros) {
    return paquetes.filter((paquete) => {
        const destinoPaquete = String(
            paquete.destino ?? ""
        ).toLowerCase();

        if (
            filtros.destino &&
            !destinoPaquete.includes(filtros.destino.toLowerCase())
        ) {
            return false;
        }

        const precio = obtenerPrecioFiltro(paquete);

        if (
            filtros.precioMinimo !== null &&
            (precio === null || precio < filtros.precioMinimo)
        ) {
            return false;
        }

        if (
            filtros.precioMaximo !== null &&
            (precio === null || precio > filtros.precioMaximo)
        ) {
            return false;
        }

        if (filtros.fecha) {
            const fechas = obtenerFechasFiltro(paquete);

            if (!fechas.some((fecha) => fecha.startsWith(filtros.fecha))) {
                return false;
            }
        }

        return true;
    });
}

function ordenarPaquetes(paquetes, orden) {
    const resultado = [...paquetes];

    switch (orden) {
        case "price-asc":
        case "precio-asc":
            return resultado.sort((a, b) => {
                const precioA = obtenerPrecioFiltro(a) ?? Infinity;
                const precioB = obtenerPrecioFiltro(b) ?? Infinity;
                return precioA - precioB;
            });

        case "price-desc":
        case "precio-desc":
            return resultado.sort((a, b) => {
                const precioA = obtenerPrecioFiltro(a) ?? -Infinity;
                const precioB = obtenerPrecioFiltro(b) ?? -Infinity;
                return precioB - precioA;
            });

        case "capacity-desc":
        case "capacidad":
            return resultado.sort(
                (a, b) => obtenerCapacidadFiltro(b) -
                          obtenerCapacidadFiltro(a)
            );

        default:
            return resultado;
    }
}

function obtenerFiltrosActuales() {
    const destino = document.querySelector("#destinationSearch");
    const fecha = document.querySelector("#departureDate");
    const minimo = document.querySelector("#minPrice");
    const maximo = document.querySelector("#maxPrice");
    const orden = document.querySelector("#sortPackages");

    const precioMinimo =
        minimo && minimo.value.trim() !== ""
            ? Number(minimo.value)
            : null;

    const precioMaximo =
        maximo && maximo.value.trim() !== ""
            ? Number(maximo.value)
            : null;

    return {
        destino: destino?.value.trim() ?? "",
        fecha: fecha?.value ?? "",
        precioMinimo,
        precioMaximo,
        orden: orden?.value ?? "default"
    };
}

/* =========================================
   2. CARGAR Y MOSTRAR PAQUETES
   ========================================= */

async function buscarPaquetes() {
    if (!searchForm) return;

    limpiarMensaje(searchMessage);

    const filtros = obtenerFiltrosActuales();

    if (
        filtros.precioMinimo !== null &&
        (!Number.isFinite(filtros.precioMinimo) ||
         filtros.precioMinimo < 0)
    ) {
        mostrarMensaje(
            searchMessage,
            "Introduce un precio mínimo válido, igual o mayor que cero.",
            "error"
        );
        return;
    }

    if (
        filtros.precioMaximo !== null &&
        (!Number.isFinite(filtros.precioMaximo) ||
         filtros.precioMaximo < 0)
    ) {
        mostrarMensaje(
            searchMessage,
            "Introduce un precio máximo válido, igual o mayor que cero.",
            "error"
        );
        return;
    }

    if (
        filtros.precioMinimo !== null &&
        filtros.precioMaximo !== null &&
        filtros.precioMinimo > filtros.precioMaximo
    ) {
        mostrarMensaje(
            searchMessage,
            "El precio mínimo no puede superar al precio máximo.",
            "error"
        );
        return;
    }

    const boton = searchForm.querySelector('button[type="submit"]');

    if (boton) {
        establecerEstadoCargando(boton, true, "Buscando...");
    }

    try {
        const parametros = new URLSearchParams();

        if (filtros.destino) {
            parametros.set("destino", filtros.destino);
        }

        if (filtros.fecha) {
            parametros.set("fecha", filtros.fecha);
        }

        if (filtros.precioMinimo !== null) {
            parametros.set("precio_min", String(filtros.precioMinimo));
        }

        if (filtros.precioMaximo !== null) {
            parametros.set("precio_max", String(filtros.precioMaximo));
        }

        if (filtros.orden !== "default") {
            parametros.set("orden", filtros.orden);
        }

        const query = parametros.toString();

        const ruta = query
            ? `${API_ROUTES.packages}?${query}`
            : API_ROUTES.packages;

        const respuesta = await solicitarAPI(ruta, {
            method: "GET",
            headers: {}
        });

        const paquetes = Array.isArray(respuesta)
            ? respuesta
            : respuesta?.paquetes;

        if (!Array.isArray(paquetes)) {
            throw new Error(
                "El servidor no devolvió una lista válida de paquetes."
            );
        }

        paquetesDisponibles = paquetes;

        const filtrados = aplicarFiltrosLocales(
            paquetesDisponibles,
            filtros
        );

        const ordenados = ordenarPaquetes(
            filtrados,
            filtros.orden
        );

        renderizarPaquetes(ordenados);

        mostrarMensaje(
            searchMessage,
            `Se encontraron ${ordenados.length} paquete(s).`,
            "success"
        );
    } catch (error) {
        console.error("Error al buscar paquetes:", error);

        renderizarPaquetes([]);

        const mensaje = String(error.message ?? "");

        mostrarMensaje(
            searchMessage,
            mensaje.includes("Failed to fetch")
                ? "No se pudo conectar con el backend. Comprueba que esté ejecutándose y que exista la ruta /api/paquetes."
                : mensaje,
            "error"
        );
    } finally {
        if (boton) {
            establecerEstadoCargando(boton, false);
        }
    }
}

/* =========================================
   3. EVENTO DEL FORMULARIO DE BÚSQUEDA
   ========================================= */

searchForm?.addEventListener("submit", (evento) => {
    evento.preventDefault();
    buscarPaquetes();
});

/* =========================================
   4. LIMPIAR FILTROS
   ========================================= */

const clearSearchBtn = document.querySelector("#clearSearchBtn");

clearSearchBtn?.addEventListener("click", async () => {
    searchForm?.reset();
    limpiarMensaje(searchMessage);
    await buscarPaquetes();
});

/* =========================================
   5. BOTONES DE DESTINOS
   ========================================= */

document.querySelectorAll(".reserve-btn").forEach((boton) => {
    boton.addEventListener("click", () => {
        const destino = boton.dataset.destination;

        const campoBusqueda =
            document.querySelector("#destinationSearch");

        if (campoBusqueda && destino) {
            campoBusqueda.value = destino;
        }

        document.querySelector("#buscar")?.scrollIntoView({
            behavior: "smooth"
        });

        mostrarMensaje(
            searchMessage,
            `Destino seleccionado: ${destino}. Pulsa "Buscar paquetes" para ver los resultados.`,
            "info"
        );
    });
});"use strict";

/* search.js | Búsqueda, filtros, ordenamiento y destinos */

/* =========================================
   1. FUNCIONES AUXILIARES
   ========================================= */

function obtenerPrecioFiltro(paquete) {
    const precio = paquete.precio ?? paquete.costo;
    if (precio === null || precio === undefined || precio === "") {
        return null;
    }

    const numero = Number(precio);
    return Number.isFinite(numero) ? numero : null;
}

function obtenerCapacidadFiltro(paquete) {
    const capacidad =
        paquete.cupos_disponibles ??
        paquete.capacidad_disponible ??
        paquete.capacidad ??
        paquete.capacidad_maxima;

    if (capacidad === null || capacidad === undefined || capacidad === "") {
        return 0;
    }

    const numero = Number(capacidad);
    return Number.isFinite(numero) ? numero : 0;
}

function obtenerFechasFiltro(paquete) {
    const salidas = paquete.salidas ?? paquete.fechas_salida;

    if (Array.isArray(salidas)) {
        return salidas.map((salida) => {
            if (typeof salida === "string") return salida;

            return (
                salida.fecha_salida ??
                salida.fecha ??
                salida.fecha_inicio ??
                ""
            );
        }).filter(Boolean);
    }

    const fecha =
        paquete.fecha_salida ??
        paquete.fecha_inicio ??
        paquete.fecha;

    return fecha ? [String(fecha)] : [];
}

function aplicarFiltrosLocales(paquetes, filtros) {
    return paquetes.filter((paquete) => {
        const destinoPaquete = String(
            paquete.destino ?? ""
        ).toLowerCase();

        if (
            filtros.destino &&
            !destinoPaquete.includes(filtros.destino.toLowerCase())
        ) {
            return false;
        }

        const precio = obtenerPrecioFiltro(paquete);

        if (
            filtros.precioMinimo !== null &&
            (precio === null || precio < filtros.precioMinimo)
        ) {
            return false;
        }

        if (
            filtros.precioMaximo !== null &&
            (precio === null || precio > filtros.precioMaximo)
        ) {
            return false;
        }

        if (filtros.fecha) {
            const fechas = obtenerFechasFiltro(paquete);

            if (!fechas.some((fecha) => fecha.startsWith(filtros.fecha))) {
                return false;
            }
        }

        return true;
    });
}

function ordenarPaquetes(paquetes, orden) {
    const resultado = [...paquetes];

    switch (orden) {
        case "price-asc":
        case "precio-asc":
            return resultado.sort((a, b) => {
                const precioA = obtenerPrecioFiltro(a) ?? Infinity;
                const precioB = obtenerPrecioFiltro(b) ?? Infinity;
                return precioA - precioB;
            });

        case "price-desc":
        case "precio-desc":
            return resultado.sort((a, b) => {
                const precioA = obtenerPrecioFiltro(a) ?? -Infinity;
                const precioB = obtenerPrecioFiltro(b) ?? -Infinity;
                return precioB - precioA;
            });

        case "capacity-desc":
        case "capacidad":
            return resultado.sort(
                (a, b) => obtenerCapacidadFiltro(b) -
                          obtenerCapacidadFiltro(a)
            );

        default:
            return resultado;
    }
}

function obtenerFiltrosActuales() {
    const destino = document.querySelector("#destinationSearch");
    const fecha = document.querySelector("#departureDate");
    const minimo = document.querySelector("#minPrice");
    const maximo = document.querySelector("#maxPrice");
    const orden = document.querySelector("#sortPackages");

    const precioMinimo =
        minimo && minimo.value.trim() !== ""
            ? Number(minimo.value)
            : null;

    const precioMaximo =
        maximo && maximo.value.trim() !== ""
            ? Number(maximo.value)
            : null;

    return {
        destino: destino?.value.trim() ?? "",
        fecha: fecha?.value ?? "",
        precioMinimo,
        precioMaximo,
        orden: orden?.value ?? "default"
    };
}

/* =========================================
   2. CARGAR Y MOSTRAR PAQUETES
   ========================================= */

async function buscarPaquetes() {
    if (!searchForm) return;

    limpiarMensaje(searchMessage);

    const filtros = obtenerFiltrosActuales();

    if (
        filtros.precioMinimo !== null &&
        (!Number.isFinite(filtros.precioMinimo) ||
         filtros.precioMinimo < 0)
    ) {
        mostrarMensaje(
            searchMessage,
            "Introduce un precio mínimo válido, igual o mayor que cero.",
            "error"
        );
        return;
    }

    if (
        filtros.precioMaximo !== null &&
        (!Number.isFinite(filtros.precioMaximo) ||
         filtros.precioMaximo < 0)
    ) {
        mostrarMensaje(
            searchMessage,
            "Introduce un precio máximo válido, igual o mayor que cero.",
            "error"
        );
        return;
    }

    if (
        filtros.precioMinimo !== null &&
        filtros.precioMaximo !== null &&
        filtros.precioMinimo > filtros.precioMaximo
    ) {
        mostrarMensaje(
            searchMessage,
            "El precio mínimo no puede superar al precio máximo.",
            "error"
        );
        return;
    }

    const boton = searchForm.querySelector('button[type="submit"]');

    if (boton) {
        establecerEstadoCargando(boton, true, "Buscando...");
    }

    try {
        const parametros = new URLSearchParams();

        if (filtros.destino) {
            parametros.set("destino", filtros.destino);
        }

        if (filtros.fecha) {
            parametros.set("fecha", filtros.fecha);
        }

        if (filtros.precioMinimo !== null) {
            parametros.set("precio_min", String(filtros.precioMinimo));
        }

        if (filtros.precioMaximo !== null) {
            parametros.set("precio_max", String(filtros.precioMaximo));
        }

        if (filtros.orden !== "default") {
            parametros.set("orden", filtros.orden);
        }

        const query = parametros.toString();

        const ruta = query
            ? `${API_ROUTES.packages}?${query}`
            : API_ROUTES.packages;

        const respuesta = await solicitarAPI(ruta, {
            method: "GET",
            headers: {}
        });

        const paquetes = Array.isArray(respuesta)
            ? respuesta
            : respuesta?.paquetes;

        if (!Array.isArray(paquetes)) {
            throw new Error(
                "El servidor no devolvió una lista válida de paquetes."
            );
        }

        paquetesDisponibles = paquetes;

        const filtrados = aplicarFiltrosLocales(
            paquetesDisponibles,
            filtros
        );

        const ordenados = ordenarPaquetes(
            filtrados,
            filtros.orden
        );

        renderizarPaquetes(ordenados);

        mostrarMensaje(
            searchMessage,
            `Se encontraron ${ordenados.length} paquete(s).`,
            "success"
        );
    } catch (error) {
        console.error("Error al buscar paquetes:", error);

        renderizarPaquetes([]);

        const mensaje = String(error.message ?? "");

        mostrarMensaje(
            searchMessage,
            mensaje.includes("Failed to fetch")
                ? "No se pudo conectar con el backend. Comprueba que esté ejecutándose y que exista la ruta /api/paquetes."
                : mensaje,
            "error"
        );
    } finally {
        if (boton) {
            establecerEstadoCargando(boton, false);
        }
    }
}

/* =========================================
   3. EVENTO DEL FORMULARIO DE BÚSQUEDA
   ========================================= */

searchForm?.addEventListener("submit", (evento) => {
    evento.preventDefault();
    buscarPaquetes();
});

/* =========================================
   4. LIMPIAR FILTROS
   ========================================= */

const clearSearchBtn = document.querySelector("#clearSearchBtn");

clearSearchBtn?.addEventListener("click", async () => {
    searchForm?.reset();
    limpiarMensaje(searchMessage);
    await buscarPaquetes();
});

/* =========================================
   5. BOTONES DE DESTINOS
   ========================================= */

document.querySelectorAll(".reserve-btn").forEach((boton) => {
    boton.addEventListener("click", () => {
        const destino = boton.dataset.destination;

        const campoBusqueda =
            document.querySelector("#destinationSearch");

        if (campoBusqueda && destino) {
            campoBusqueda.value = destino;
        }

        document.querySelector("#buscar")?.scrollIntoView({
            behavior: "smooth"
        });

        mostrarMensaje(
            searchMessage,
            `Destino seleccionado: ${destino}. Pulsa "Buscar paquetes" para ver los resultados.`,
            "info"
        );
    });
});