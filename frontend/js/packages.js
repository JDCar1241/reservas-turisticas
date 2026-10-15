"use strict";

/* packages.js | Renderizado y selección de paquetes */

function renderizarPaquetes(paquetes) {
    if (!packageResults) return;

    packageResults.replaceChildren();

    if (paquetes.length === 0) {
        const mensaje = document.createElement("p");
        mensaje.className = "empty-message";
        mensaje.textContent =
            "No hay paquetes para mostrar con estos criterios.";
        packageResults.appendChild(mensaje);
        actualizarSelectorPaquetes([]);
        return;
    }

    paquetes.forEach((paquete) => {
        const tarjeta = document.createElement("article");
        tarjeta.className = "package-card";

        const contenido = document.createElement("div");
        contenido.className = "package-card-content";

        const titulo = document.createElement("h3");
        titulo.textContent =
            paquete.nombre || paquete.titulo || "Paquete turístico";

        const descripcion = document.createElement("p");
        descripcion.textContent =
            paquete.descripcion || "Descubre este destino del Perú.";

        const destino = document.createElement("p");
        destino.textContent =
            `Destino: ${paquete.destino || "Por confirmar"}`;

        const precio = document.createElement("p");
        precio.className = "package-price";

        const valorPrecio = Number(paquete.precio);

        precio.textContent = Number.isFinite(valorPrecio)
            ? `S/ ${valorPrecio.toFixed(2)}`
            : "Precio por confirmar";

        const capacidad = document.createElement("p");
        capacidad.className = "package-capacity";

        const cupos = paquete.cupos_disponibles ??
            paquete.capacidad_disponible;

        capacidad.textContent = cupos !== undefined
            ? `Cupos disponibles: ${cupos}`
            : "Disponibilidad por confirmar";

        const boton = document.createElement("button");
        boton.type = "button";
        boton.className = "btn";
        boton.textContent = "Seleccionar paquete";

        boton.addEventListener("click", () => {
            const identificador = paquete.id ?? paquete.paquete_id;

            if (identificador === undefined || identificador === null) {
                mostrarEstado(
                    "Este paquete no incluye un identificador válido."
                );
                return;
            }

            bookingPackage.value = String(identificador);

            document.querySelector("#reservas")?.scrollIntoView({
                behavior: "smooth"
            });

            mostrarMensaje(
                bookingMessage,
                `Paquete seleccionado: ${titulo.textContent}. Selecciona una fecha de salida.`,
                "info"
            );
        });

        contenido.append(
            titulo,
            descripcion,
            destino,
            precio,
            capacidad,
            boton
        );

        tarjeta.appendChild(contenido);
        packageResults.appendChild(tarjeta);
    });

    actualizarSelectorPaquetes(paquetes);
}

function actualizarSelectorPaquetes(paquetes) {
    if (!bookingPackage) return;

    const seleccionAnterior = bookingPackage.value;

    bookingPackage.replaceChildren();

    const opcionInicial = document.createElement("option");
    opcionInicial.value = "";
    opcionInicial.textContent = "Selecciona un paquete";
    bookingPackage.appendChild(opcionInicial);

    paquetes.forEach((paquete) => {
        const identificador = paquete.id ?? paquete.paquete_id;

        if (identificador === undefined || identificador === null) {
            return;
        }

        const opcion = document.createElement("option");
        opcion.value = String(identificador);
        opcion.textContent =
            paquete.nombre || paquete.titulo || "Paquete turístico";

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