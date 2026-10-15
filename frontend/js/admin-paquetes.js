"use strict";

/* admin-paquetes.js | Gestión de paquetes turísticos */

// Ruta prevista del backend (solo trabajadores autenticados):
//   GET    /api/admin/paquetes             -> lista (activos e inactivos)
//   POST   /api/admin/paquetes             -> registrar un paquete nuevo
//   PUT    /api/admin/paquetes/:id         -> editar un paquete
//   PATCH  /api/admin/paquetes/:id/activo  -> activar o desactivar
const PAQUETES_ADMIN_ROUTE = "/api/admin/paquetes";

// Cada paquete: { id, nombre, destino, duracion_dias, precio, cupos_disponibles,
//                 descripcion, imagen, activo }
// La lista viene siempre del servidor: la pantalla no inventa ni guarda paquetes.
let paquetes = [];
let errorCarga = false;
let editando = null;   // paquete en edición o null si es uno nuevo

const cuerpo = document.querySelector("#pkgBody");
const buscador = document.querySelector("#pkgSearch");
const filtroEstado = document.querySelector("#pkgStatus");
const contador = document.querySelector("#pkgCount");
const vacio = document.querySelector("#pkgEmpty");
const avisoPagina = document.querySelector("#pkgStatusMsg");

const dialogo = document.querySelector("#pkgDialog");
const formulario = document.querySelector("#pkgForm");
const mensajeForm = document.querySelector("#pkgFormMessage");
const inputImagen = document.querySelector("#pkgImage");
const vistaPrevia = document.querySelector("#pkgPreview");

const dinero = (n) => `S/ ${Number(n).toLocaleString("es-PE", { minimumFractionDigits: 2 })}`;
const campo = (id) => document.querySelector(id);

// El botón se registra primero: nada de lo que falle después puede impedir que abra la ventana.
campo("#newPackageBtn")?.addEventListener("click", () => abrirFormulario());

function celda(...nodos) {
    const td = document.createElement("td");
    td.append(...nodos);
    return td;
}

function boton(texto, clase, accion) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = `btn-xs ${clase}`;
    b.textContent = texto;
    b.addEventListener("click", accion);
    return b;
}

function filaPaquete(p) {
    const tr = document.createElement("tr");

    const media = document.createElement("div");
    media.className = "cell-media";
    if (p.imagen) {
        const img = document.createElement("img");
        img.className = "thumb";
        img.src = p.imagen;
        img.alt = "";
        media.appendChild(img);
    }
    const texto = document.createElement("div");
    const nombre = document.createElement("strong");
    nombre.textContent = p.nombre;
    const destino = document.createElement("small");
    destino.textContent = p.destino;
    texto.append(nombre, destino);
    media.appendChild(texto);

    const estado = document.createElement("span");
    estado.className = `badge ${p.activo ? "confirmada" : "inactivo"}`;
    estado.textContent = p.activo ? "Activo" : "Inactivo";

    const acciones = document.createElement("div");
    acciones.className = "actions";
    acciones.append(
        boton("Editar", "", () => abrirFormulario(p)),
        p.activo
            ? boton("Desactivar", "danger", () => cambiarActivo(p, false))
            : boton("Activar", "ok", () => cambiarActivo(p, true))
    );

    const precio = celda(dinero(p.precio));
    precio.className = "num";
    const cupos = celda(String(p.cupos_disponibles));
    cupos.className = "num";

    tr.append(celda(media), celda(`${p.duracion_dias} día(s)`), precio, cupos, celda(estado), celda(acciones));
    return tr;
}

function pintar() {
    const q = buscador.value.trim().toLowerCase();
    const estado = filtroEstado.value;

    const lista = paquetes.filter((p) =>
        (estado === "todos" || (estado === "activo") === p.activo) &&
        [p.nombre, p.destino].some((c) => c.toLowerCase().includes(q))
    );

    cuerpo.replaceChildren(...lista.map(filaPaquete));
    vacio.textContent = errorCarga
        ? "No se pudieron cargar los paquetes. Revisa la conexión con el servidor."
        : paquetes.length === 0
            ? "Aún no hay paquetes registrados. Crea el primero con «Nuevo paquete»."
            : "No hay paquetes que coincidan con la búsqueda.";
    vacio.classList.toggle("hidden", lista.length > 0);
    contador.textContent = `Mostrando ${lista.length} de ${paquetes.length} paquetes`;
}

async function cargarPaquetes() {
    limpiarMensaje(avisoPagina);

    try {
        const resultado = await solicitarAPI(PAQUETES_ADMIN_ROUTE, { method: "GET", headers: {} });
        const lista = Array.isArray(resultado) ? resultado : resultado.paquetes;

        if (!Array.isArray(lista)) {
            throw new Error("La respuesta del servidor no contiene una lista de paquetes válida.");
        }
        paquetes = lista;
        errorCarga = false;
    } catch (error) {
        paquetes = [];
        errorCarga = true;
        mostrarMensaje(
            avisoPagina,
            error.message.includes("Failed to fetch")
                ? "No se pudo conectar con el backend. Comprueba que el servidor esté activo."
                : error.message,
            "error"
        );
    }
    pintar();
}

async function cambiarActivo(paquete, activo) {
    if (!activo && !window.confirm(`¿Desactivar «${paquete.nombre}»? Dejará de mostrarse a los clientes.`)) {
        return;
    }

    try {
        await solicitarAPI(`${PAQUETES_ADMIN_ROUTE}/${encodeURIComponent(paquete.id)}/activo`, {
            method: "PATCH",
            body: JSON.stringify({ activo })
        });
        await cargarPaquetes();
        mostrarMensaje(avisoPagina, activo ? "Paquete activado." : "Paquete desactivado.", "success");
    } catch (error) {
        mostrarMensaje(avisoPagina, `No se pudo actualizar el paquete: ${error.message}`, "error");
    }
}

function abrirFormulario(paquete = null) {
    editando = paquete;
    formulario.reset();
    limpiarMensaje(mensajeForm);
    vistaPrevia.classList.add("hidden");
    vistaPrevia.removeAttribute("src");

    campo("#pkgDialogTitle").textContent = paquete ? "Editar paquete" : "Nuevo paquete";

    if (paquete) {
        campo("#pkgName").value = paquete.nombre;
        campo("#pkgDestination").value = paquete.destino;
        campo("#pkgDays").value = paquete.duracion_dias;
        campo("#pkgPrice").value = paquete.precio;
        campo("#pkgSeats").value = paquete.cupos_disponibles;
        campo("#pkgDescription").value = paquete.descripcion || "";
        campo("#pkgActive").checked = paquete.activo;
        if (paquete.imagen) {
            vistaPrevia.src = paquete.imagen;
            vistaPrevia.classList.remove("hidden");
        }
    }
    if (typeof dialogo?.showModal !== "function") {
        mostrarMensaje(avisoPagina, "Tu navegador no admite esta ventana de diálogo.", "error");
        return;
    }
    dialogo.showModal();
}

inputImagen?.addEventListener("change", () => {
    const archivo = inputImagen.files[0];
    if (!archivo) return;

    const tiposValidos = ["image/jpeg", "image/png", "image/webp"];
    if (!tiposValidos.includes(archivo.type) || archivo.size > 5 * 1024 * 1024) {
        inputImagen.value = "";
        mostrarMensaje(mensajeForm, "La imagen debe ser JPG, PNG o WebP y pesar máximo 5 MB.", "error");
        return;
    }
    limpiarMensaje(mensajeForm);
    vistaPrevia.src = URL.createObjectURL(archivo);
    vistaPrevia.classList.remove("hidden");
});

formulario.addEventListener("submit", async (evento) => {
    evento.preventDefault();
    limpiarMensaje(mensajeForm);

    if (!formulario.reportValidity()) return;

    const nombre = campo("#pkgName").value.trim();
    const destino = campo("#pkgDestination").value.trim();
    const duracion = Number(campo("#pkgDays").value);
    const cupos = Number(campo("#pkgSeats").value);

    if (!nombre || !destino) {
        mostrarMensaje(mensajeForm, "El nombre y el destino no pueden estar vacíos.", "error");
        return;
    }
    if (!Number.isInteger(duracion) || !Number.isInteger(cupos)) {
        mostrarMensaje(mensajeForm, "La duración y los cupos deben ser números enteros.", "error");
        return;
    }

    // Se envía como FormData para poder adjuntar la imagen (multipart).
    const datos = new FormData();
    datos.append("nombre", nombre);
    datos.append("destino", destino);
    datos.append("duracion_dias", String(duracion));
    datos.append("precio", campo("#pkgPrice").value);
    datos.append("cupos_disponibles", String(cupos));
    datos.append("descripcion", campo("#pkgDescription").value.trim());
    datos.append("activo", String(campo("#pkgActive").checked));
    if (inputImagen.files[0]) datos.append("imagen", inputImagen.files[0]);

    const esEdicion = Boolean(editando);
    const ruta = esEdicion
        ? `${PAQUETES_ADMIN_ROUTE}/${encodeURIComponent(editando.id)}`
        : PAQUETES_ADMIN_ROUTE;

    const boton = formulario.querySelector('button[type="submit"]');
    establecerEstadoCargando(boton, true, "Guardando...");

    try {
        // El paquete solo aparece en la lista cuando el servidor confirma el registro.
        const resultado = await solicitarAPI(ruta, {
            method: esEdicion ? "PUT" : "POST",
            body: datos
        });

        dialogo.close();
        await cargarPaquetes();
        mostrarMensaje(
            avisoPagina,
            resultado.mensaje || (esEdicion ? "Paquete actualizado correctamente." : "Paquete registrado correctamente."),
            "success"
        );
    } catch (error) {
        mostrarMensaje(
            mensajeForm,
            error.message.includes("Failed to fetch")
                ? "No se pudo conectar con el backend. El paquete no se ha guardado."
                : error.message,
            "error"
        );
    } finally {
        establecerEstadoCargando(boton, false);
    }
});

campo("#pkgCancel")?.addEventListener("click", () => dialogo.close());
campo("#pkgClose")?.addEventListener("click", () => dialogo.close());
dialogo.addEventListener("click", (e) => { if (e.target === dialogo) dialogo.close(); });
buscador.addEventListener("input", pintar);
filtroEstado.addEventListener("change", pintar);
campo("#menuToggle")?.addEventListener("click", () => {
    campo("#sidebar")?.classList.toggle("open");
});

pintar();
cargarPaquetes();