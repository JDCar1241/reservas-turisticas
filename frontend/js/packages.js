
"use strict";

/* packages.js | Catálogo, detalles y selección de paquetes */

function obtenerIdentificadorPaquete(paquete) {
    return paquete.id ?? paquete.paquete_id ?? null;
}

function obtenerNombrePaquete(paquete) {
    return paquete.nombre || paquete.titulo || "Paquete turístico";
}

function obtenerPrecioPaquete(paquete) {
    const precio = Number(paquete.precio);

    return Number.isFinite(precio) && paquete.precio !== null &&
        paquete.precio !== undefined && paquete.precio !== ""
        ? `S/ ${precio.toFixed(2)}`
        : "Precio por confirmar";
}

function crearElemento(etiqueta, clase, texto) {
    const elemento = document.createElement(etiqueta);

    if (clase) {
        elemento.className = clase;
    }

    if (texto !== undefined && texto !== null) {
        elemento.textContent = texto;
    }

    return elemento;
}

function obtenerImagenPaquete(paquete) {
    return (
        paquete.imagen_url ||
        paquete.imagen ||
        paquete.foto ||
        paquete.url_imagen ||
        ""
    );
}

function renderizarPaquetes(paquetes) {
    if (!packageResults) return;

    packageResults.replaceChildren();

    if (!Array.isArray(paquetes) || paquetes.length === 0) {
        packageResults.appendChild(
            crearElemento(
                "p",
                "empty-message",
                "No hay paquetes para mostrar con estos criterios."
            )
        );

        actualizarSelectorPaquetes([]);
        return;
    }

    paquetes.forEach((paquete) => {
        const tarjeta = crearElemento("article", "package-card");
        const imagenURL = obtenerImagenPaquete(paquete);

        // Imagen del paquete
        if (imagenURL) {
            const imagen = crearElemento("img", "package-image");
            imagen.src = imagenURL;
            imagen.alt = `Imagen de ${obtenerNombrePaquete(paquete)}`;
            imagen.loading = "lazy";

            imagen.addEventListener("error", () => {
                imagen.remove();
            });

            tarjeta.appendChild(imagen);
        } else {
            const imagenAlternativa = crearElemento(
                "div",
                "package-image-placeholder",
                "Descubre el Perú"
            );

            imagenAlternativa.setAttribute("aria-label", "Imagen no disponible");
            tarjeta.appendChild(imagenAlternativa);
        }

        const contenido = crearElemento("div", "package-card-content");

        const titulo = crearElemento(
            "h3",
            "package-title",
            obtenerNombrePaquete(paquete)
        );

        const descripcion = crearElemento(
            "p",
            "package-description",
            paquete.descripcion || "Descubre este destino del Perú."
        );

        const destino = crearElemento(
            "p",
            "package-destination",
            `Destino: ${paquete.destino || "Por confirmar"}`
        );

        const precio = crearElemento(
            "p",
            "package-price",
            obtenerPrecioPaquete(paquete)
        );

        const capacidadValor =
            paquete.cupos_disponibles ??
            paquete.capacidad_disponible ??
            paquete.capacidad ??
            paquete.capacidad_maxima;

        const capacidadTexto =
            capacidadValor !== undefined && capacidadValor !== null
                ? `Capacidad: ${capacidadValor} viajeros`
                : "Capacidad por confirmar";

        const capacidad = crearElemento(
            "p",
            "package-capacity",
            capacidadTexto
        );

        const acciones = crearElemento("div", "package-actions");

        const botonDetalles = crearElemento(
            "button",
            "btn btn-outline",
            "Ver detalles"
        );

        botonDetalles.type = "button";

        botonDetalles.addEventListener("click", () => {
            mostrarDetallePaquete(paquete);
        });

        const botonSeleccionar = crearElemento(
            "button",
            "btn",
            "Reservar"
        );

        botonSeleccionar.type = "button";

        botonSeleccionar.addEventListener("click", () => {
            seleccionarPaquete(paquete);
        });

        acciones.append(botonDetalles, botonSeleccionar);

        contenido.append(
            titulo,
            descripcion,
            destino,
            precio,
            capacidad,
            acciones
        );

        tarjeta.appendChild(contenido);
        packageResults.appendChild(tarjeta);
    });

    actualizarSelectorPaquetes(paquetes);
}

// ======================================================
// SELECCIONAR UN PAQUETE PARA LA RESERVA
// ======================================================

function seleccionarPaquete(paquete) {
    if (!bookingPackage) return;

    const identificador = obtenerIdentificadorPaquete(paquete);

    if (identificador === null) {
        mostrarEstado("Este paquete no tiene un identificador válido.");
        return;
    }

    const opcionDisponible = [...bookingPackage.options].some(
        (opcion) => opcion.value === String(identificador)
    );

    if (!opcionDisponible) {
        actualizarSelectorPaquetes([paquete]);
    }

    bookingPackage.value = String(identificador);

    document.querySelector("#reservas")?.scrollIntoView({
        behavior: "smooth"
    });

    if (typeof bookingMessage !== "undefined" && bookingMessage) {
        mostrarMensaje(
            bookingMessage,
            `Paquete seleccionado: ${obtenerNombrePaquete(paquete)}. Selecciona una fecha de salida.`,
            "info"
        );
    }
}

// ======================================================
// DETALLE DEL PAQUETE
// ======================================================

function mostrarDetallePaquete(paquete) {
    let dialogo = document.getElementById("packageDetailDialog");

    // Crear la ventana si todavía no existe en index.html.
    if (!dialogo) {
        dialogo = document.createElement("dialog");
        dialogo.id = "packageDetailDialog";
        dialogo.className = "package-detail-dialog";
        dialogo.setAttribute("aria-labelledby", "packageDetailTitle");

        document.body.appendChild(dialogo);
    }

    dialogo.replaceChildren();

    const encabezado = crearElemento("div", "package-detail-header");

    const titulo = crearElemento(
        "h2",
        "",
        obtenerNombrePaquete(paquete)
    );

    titulo.id = "packageDetailTitle";

    const botonCerrar = crearElemento("button", "close-dialog", "×");
    botonCerrar.type = "button";
    botonCerrar.setAttribute("aria-label", "Cerrar detalles");
    botonCerrar.addEventListener("click", () => dialogo.close());

    encabezado.append(titulo, botonCerrar);
    dialogo.appendChild(encabezado);

    const imagenURL = obtenerImagenPaquete(paquete);

    if (imagenURL) {
        const imagen = crearElemento("img", "package-detail-image");
        imagen.src = imagenURL;
        imagen.alt = `Imagen de ${obtenerNombrePaquete(paquete)}`;
        dialogo.appendChild(imagen);
    }

    dialogo.appendChild(
        crearElemento(
            "p",
            "package-destination",
            `Destino: ${paquete.destino || "Por confirmar"}`
        )
    );

    dialogo.appendChild(
        crearElemento(
            "p",
            "package-price",
            `Precio: ${obtenerPrecioPaquete(paquete)}`
        )
    );

    const capacidad =
        paquete.cupos_disponibles ??
        paquete.capacidad_disponible ??
        paquete.capacidad ??
        paquete.capacidad_maxima;

    dialogo.appendChild(
        crearElemento(
            "p",
            "package-capacity",
            capacidad !== undefined && capacidad !== null
                ? `Capacidad disponible: ${capacidad} viajeros`
                : "Capacidad disponible: por confirmar"
        )
    );

    dialogo.appendChild(
        crearElemento(
            "h3",
            "",
            "Descripción"
        )
    );

    dialogo.appendChild(
        crearElemento(
            "p",
            "",
            paquete.descripcion || "No hay una descripción disponible."
        )
    );

    // Itinerario: acepta un arreglo de días o un texto.
    dialogo.appendChild(crearElemento("h3", "", "Itinerario"));

    const itinerario = paquete.itinerario;

    if (Array.isArray(itinerario) && itinerario.length > 0) {
        const lista = crearElemento("ol", "package-itinerary");

        itinerario.forEach((dia, indice) => {
            const textoDia =
                typeof dia === "string"
                    ? dia
                    : dia.descripcion ||
                      dia.actividad ||
                      dia.titulo ||
                      `Actividad ${indice + 1}`;

            lista.appendChild(crearElemento("li", "", textoDia));
        });

        dialogo.appendChild(lista);
    } else if (typeof itinerario === "string" && itinerario.trim()) {
        dialogo.appendChild(
            crearElemento("p", "", itinerario)
        );
    } else {
        dialogo.appendChild(
            crearElemento(
                "p",
                "empty-message",
                "El itinerario todavía no está disponible."
            )
        );
    }

    // Salidas: se muestran únicamente si el paquete las proporciona.
    dialogo.appendChild(crearElemento("h3", "", "Salidas disponibles"));

    const salidas = paquete.salidas || paquete.fechas_salida;

    if (Array.isArray(salidas) && salidas.length > 0) {
        const listaSalidas = crearElemento("ul", "package-departures");

        salidas.forEach((salida) => {
            const textoSalida =
                typeof salida === "string"
                    ? salida
                    : [
                        salida.fecha || salida.fecha_salida || "",
                        salida.hora || salida.hora_salida || "",
                        salida.cupos_disponibles !== undefined
                            ? `${salida.cupos_disponibles} cupos`
                            : ""
                    ].filter(Boolean).join(" · ");

            if (textoSalida) {
                listaSalidas.appendChild(
                    crearElemento("li", "", textoSalida)
                );
            }
        });

        if (listaSalidas.children.length > 0) {
            dialogo.appendChild(listaSalidas);
        } else {
            dialogo.appendChild(
                crearElemento("p", "", "No hay salidas publicadas.")
            );
        }
    } else {
        dialogo.appendChild(
            crearElemento(
                "p",
                "empty-message",
                "Las fechas de salida están pendientes de publicación."
            )
        );
    }

    const botonReservar = crearElemento("button", "btn", "Seleccionar este paquete");
    botonReservar.type = "button";

    botonReservar.addEventListener("click", () => {
        dialogo.close();
        seleccionarPaquete(paquete);
    });

    dialogo.appendChild(botonReservar);

    if (!dialogo.open) {
        dialogo.showModal();
    }
}

// ======================================================
// ACTUALIZAR SELECTOR DEL FORMULARIO DE RESERVA
// ======================================================

function actualizarSelectorPaquetes(paquetes) {
    if (!bookingPackage) return;

    const seleccionAnterior = bookingPackage.value;

    bookingPackage.replaceChildren();

    const opcionInicial = crearElemento(
        "option",
        "",
        "Selecciona un paquete"
    );

    opcionInicial.value = "";
    bookingPackage.appendChild(opcionInicial);

    paquetes.forEach((paquete) => {
        const identificador = obtenerIdentificadorPaquete(paquete);

        if (identificador === null) return;

        const opcion = crearElemento(
            "option",
            "",
            obtenerNombrePaquete(paquete)
        );

        opcion.value = String(identificador);
        bookingPackage.appendChild(opcion);
    });

    if (
        seleccionAnterior &&
        [...bookingPackage.options].some(
            (opcion) => opcion.value === seleccionAnterior
        )
    ) {
        bookingPackage.value = seleccionAnterior;
    }
}
