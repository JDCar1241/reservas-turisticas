"use strict";

/* admin-clientes.js | Consulta de clientes e historial de reservas */

// Rutas previstas del backend (solo trabajadores autenticados):
//   GET /api/admin/clientes       -> lista de clientes
//   GET /api/admin/clientes/:id   -> detalle del cliente con su historial de reservas
const CLIENTES_ADMIN_ROUTE = "/api/admin/clientes";

// Cada cliente: { id, nombres, apellidos, email, telefono, total_reservas, fecha_registro }
// Detalle: el cliente + dni, y "reservas": [{ codigo, paquete, destino, fecha_salida,
//          cantidad_personas, importe, estado, observaciones }]
// Los datos vienen siempre del servidor: la pantalla no inventa ni guarda clientes.
let clientes = [];
let errorCarga = false;
let peticionDetalle = 0; // evita mostrar la respuesta de un cliente que ya se cerró

const cuerpo = document.querySelector("#cliBody");
const buscador = document.querySelector("#cliSearch");
const contador = document.querySelector("#cliCount");
const vacio = document.querySelector("#cliEmpty");
const avisoPagina = document.querySelector("#cliStatusMsg");

const dialogo = document.querySelector("#cliDialog");
const mensajeDetalle = document.querySelector("#cliDetailMessage");
const datosCliente = document.querySelector("#cliData");
const historial = document.querySelector("#cliHistory");

const campo = (id) => document.querySelector(id);
const capitalizar = (t) => t.charAt(0).toUpperCase() + t.slice(1);
const nombreCompleto = (c) => `${c.nombres ?? ""} ${c.apellidos ?? ""}`.trim() || "Sin nombre";
const dinero = (n) => `S/ ${Number(n).toLocaleString("es-PE", { minimumFractionDigits: 2 })}`;

const formatoFecha = new Intl.DateTimeFormat("es-PE", { day: "2-digit", month: "short", year: "numeric" });
function fechaLegible(valor) {
    const f = new Date(valor);
    return Number.isNaN(f.getTime()) ? "—" : formatoFecha.format(f);
}

// El botón se registra primero: nada de lo que falle después puede impedir que abra.
campo("#menuToggle")?.addEventListener("click", () => campo("#sidebar")?.classList.toggle("open"));

function celda(...nodos) {
    const td = document.createElement("td");
    td.append(...nodos);
    return td;
}

function filaCliente(c) {
    const tr = document.createElement("tr");

    const nombre = document.createElement("strong");
    nombre.textContent = nombreCompleto(c);
    const correo = document.createElement("small");
    correo.textContent = c.email ?? "";

    const reservas = celda(String(c.total_reservas ?? 0));
    reservas.className = "num";

    const ver = document.createElement("button");
    ver.type = "button";
    ver.className = "btn-xs";
    ver.textContent = "Ver detalle";
    ver.addEventListener("click", () => abrirDetalle(c));

    tr.append(
        celda(nombre, correo),
        celda(c.telefono || "—"),
        reservas,
        celda(c.fecha_registro ? fechaLegible(c.fecha_registro) : "—"),
        celda(ver)
    );
    return tr;
}

function pintar() {
    const q = buscador.value.trim().toLowerCase();

    const lista = clientes.filter((c) =>
        [nombreCompleto(c), c.email ?? ""].some((t) => t.toLowerCase().includes(q))
    );

    cuerpo.replaceChildren(...lista.map(filaCliente));
    vacio.textContent = errorCarga
        ? "No se pudieron cargar los clientes. Revisa la conexión con el servidor."
        : clientes.length === 0
            ? "Aún no hay clientes registrados."
            : "No hay clientes que coincidan con la búsqueda.";
    vacio.classList.toggle("hidden", lista.length > 0);
    contador.textContent = `Mostrando ${lista.length} de ${clientes.length} clientes`;
}

async function cargarClientes() {
    limpiarMensaje(avisoPagina);

    try {
        const resultado = await solicitarAPI(CLIENTES_ADMIN_ROUTE, { method: "GET", headers: {} });
        const lista = Array.isArray(resultado) ? resultado : resultado.clientes;

        if (!Array.isArray(lista)) {
            throw new Error("La respuesta del servidor no contiene una lista de clientes válida.");
        }
        clientes = lista;
        errorCarga = false;
    } catch (error) {
        clientes = [];
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

function agregarDato(titulo, valor) {
    const dt = document.createElement("dt");
    dt.textContent = titulo;
    const dd = document.createElement("dd");
    dd.textContent = valor || "—";
    datosCliente.append(dt, dd);
}

function filaHistorial(r) {
    const fila = document.createElement("div");
    fila.className = "row";

    const texto = document.createElement("div");
    const titulo = document.createElement("strong");
    titulo.textContent = `${r.paquete ?? "Paquete"}${r.destino ? ` · ${r.destino}` : ""}`;
    const detalle = document.createElement("small");
    detalle.textContent =
        `Reserva ${r.codigo ?? "—"} · salida ${r.fecha_salida ? fechaLegible(r.fecha_salida) : "—"}` +
        ` · ${r.cantidad_personas ?? "—"} pasajero(s)` +
        (r.importe !== undefined && r.importe !== null ? ` · ${dinero(r.importe)}` : "");
    texto.append(titulo, detalle);

    if (r.observaciones) {
        const nota = document.createElement("span");
        nota.className = "history-note";
        nota.textContent = `Observaciones: ${r.observaciones}`;
        texto.appendChild(nota);
    }

    const estado = String(r.estado ?? "pendiente").toLowerCase();
    const badge = document.createElement("span");
    badge.className = `badge ${["pendiente", "confirmada", "cancelada"].includes(estado) ? estado : "inactivo"}`;
    badge.textContent = capitalizar(estado);

    fila.append(texto, badge);
    return fila;
}

async function abrirDetalle(cliente) {
    if (typeof dialogo?.showModal !== "function") {
        mostrarMensaje(avisoPagina, "Tu navegador no admite esta ventana de diálogo.", "error");
        return;
    }

    const turno = ++peticionDetalle;
    campo("#cliDialogTitle").textContent = nombreCompleto(cliente);
    limpiarMensaje(mensajeDetalle);
    datosCliente.replaceChildren();
    historial.replaceChildren();
    mostrarMensaje(mensajeDetalle, "Cargando información del cliente...", "info");
    dialogo.showModal();

    try {
        const resultado = await solicitarAPI(`${CLIENTES_ADMIN_ROUTE}/${encodeURIComponent(cliente.id)}`, {
            method: "GET",
            headers: {}
        });
        if (turno !== peticionDetalle) return;

        const detalle = resultado.cliente ?? resultado;
        const reservas = Array.isArray(resultado.reservas) ? resultado.reservas
            : Array.isArray(detalle.reservas) ? detalle.reservas : [];

        limpiarMensaje(mensajeDetalle);
        const registro = detalle.fecha_registro ?? cliente.fecha_registro;
        agregarDato("Correo electrónico", detalle.email ?? cliente.email);
        agregarDato("Teléfono", detalle.telefono ?? cliente.telefono);
        agregarDato("DNI", detalle.dni);
        agregarDato("Cliente desde", registro ? fechaLegible(registro) : "");

        if (reservas.length === 0) {
            const p = document.createElement("p");
            p.className = "empty-message";
            p.textContent = "Este cliente aún no tiene reservas.";
            historial.appendChild(p);
        } else {
            reservas.forEach((r) => historial.appendChild(filaHistorial(r)));
        }
    } catch (error) {
        if (turno !== peticionDetalle) return;
        mostrarMensaje(
            mensajeDetalle,
            error.message.includes("Failed to fetch")
                ? "No se pudo conectar con el backend. No se pudo cargar el detalle."
                : error.message,
            "error"
        );
    }
}

buscador.addEventListener("input", pintar);
campo("#cliClose")?.addEventListener("click", () => dialogo.close());
campo("#cliCloseBtn")?.addEventListener("click", () => dialogo.close());
dialogo.addEventListener("click", (e) => { if (e.target === dialogo) dialogo.close(); });
dialogo.addEventListener("close", () => { peticionDetalle++; });

pintar();
cargarClientes();