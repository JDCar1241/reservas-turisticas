"use strict";

/* admin-reservas.js | Gestión de reservas (administración y recepción) */

// Rutas previstas (personal autenticado: administrador, trabajador y recepcionista):
//   GET   /api/admin/reservas             -> lista de reservas
//   PATCH /api/admin/reservas/:id/estado  -> body { estado: "pendiente" | "confirmada" | "cancelada" }
// Cada reserva: { id, codigo, cliente, correo, paquete, destino, fecha_salida,
//                 cantidad_personas, importe, estado }
// Los datos vienen siempre del servidor: la pantalla no inventa ni guarda reservas.
const RESERVAS_ADMIN_ROUTE = "/api/admin/reservas";

let reservas = [];
let errorCarga = false;
const enProceso = new Set(); // ids con un cambio en curso (evita dobles clics)

const cuerpo = document.querySelector("#resBody");
const buscador = document.querySelector("#resSearch");
const filtroEstado = document.querySelector("#resStatus");
const contador = document.querySelector("#resCount");
const vacio = document.querySelector("#resEmpty");
const aviso = document.querySelector("#resStatusMsg");

document.querySelector("#menuToggle")?.addEventListener("click", () => {
    document.querySelector("#sidebar")?.classList.toggle("open");
});

const formatoFecha = new Intl.DateTimeFormat("es-PE", { day: "2-digit", month: "short", year: "numeric" });
function fechaLegible(valor) {
    const texto = String(valor ?? "");
    const f = new Date(/^\d{4}-\d{2}-\d{2}$/.test(texto) ? `${texto}T00:00:00` : texto);
    return Number.isNaN(f.getTime()) ? "—" : formatoFecha.format(f);
}
const dinero = (n) => `S/ ${Number(n || 0).toLocaleString("es-PE", { minimumFractionDigits: 2 })}`;
const capitalizar = (t) => t.charAt(0).toUpperCase() + t.slice(1);

function normalizar(r) {
    return {
        id: r.id ?? r.reserva_id,
        codigo: r.codigo ?? String(r.id ?? ""),
        cliente: r.cliente ?? r.cliente_nombre ?? "",
        correo: r.correo ?? r.email ?? "",
        paquete: r.paquete ?? r.paquete_nombre ?? "",
        destino: r.destino ?? "",
        salida: r.fecha_salida ?? r.salida,
        pasajeros: r.cantidad_personas ?? r.pasajeros ?? "—",
        importe: r.importe ?? r.total ?? 0,
        estado: String(r.estado ?? "pendiente").toLowerCase()
    };
}

function celda(...nodos) {
    const td = document.createElement("td");
    td.append(...nodos);
    return td;
}

function textoDoble(principal, secundario) {
    const a = document.createElement("strong");
    a.textContent = principal;
    const b = document.createElement("small");
    b.textContent = secundario;
    return [a, b];
}

function boton(texto, clase, accion, deshabilitado) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = `btn-xs ${clase}`;
    b.textContent = texto;
    b.disabled = deshabilitado;
    b.addEventListener("click", accion);
    return b;
}

function mensajeError(error) {
    return error.message.includes("Failed to fetch")
        ? "No se pudo conectar con el backend. Comprueba que el servidor esté activo."
        : error.message;
}

async function cargarReservas() {
    limpiarMensaje(aviso);

    try {
        const resultado = await solicitarAPI(RESERVAS_ADMIN_ROUTE, { method: "GET", headers: {} });
        const lista = Array.isArray(resultado) ? resultado : resultado.reservas;

        if (!Array.isArray(lista)) {
            throw new Error("La respuesta del servidor no contiene una lista de reservas válida.");
        }
        reservas = lista.map(normalizar);
        errorCarga = false;
    } catch (error) {
        reservas = [];
        errorCarga = true;
        mostrarMensaje(aviso, mensajeError(error), "error");
    }
    pintar();
}

const TEXTOS_ESTADO = { confirmada: "confirmada", cancelada: "cancelada", pendiente: "reabierta (pendiente)" };

async function cambiarEstado(reserva, nuevo) {
    if (enProceso.has(reserva.id)) return;

    if (nuevo === "cancelada" &&
        !window.confirm(`¿Cancelar la reserva ${reserva.codigo} de ${reserva.cliente}?`)) {
        return;
    }

    enProceso.add(reserva.id);
    pintar();

    try {
        // La tabla solo cambia cuando el servidor confirma (y valida cupos y permisos).
        await solicitarAPI(`${RESERVAS_ADMIN_ROUTE}/${encodeURIComponent(reserva.id)}/estado`, {
            method: "PATCH",
            body: JSON.stringify({ estado: nuevo })
        });
        await cargarReservas();
        if (!errorCarga) {
            mostrarMensaje(aviso, `Reserva ${reserva.codigo} ${TEXTOS_ESTADO[nuevo]}.`, "success");
        }
    } catch (error) {
        mostrarMensaje(aviso, `No se pudo actualizar la reserva ${reserva.codigo}: ${mensajeError(error)}`, "error");
    } finally {
        enProceso.delete(reserva.id);
        pintar();
    }
}

function filaReserva(r) {
    const tr = document.createElement("tr");
    const ocupada = enProceso.has(r.id);

    const estado = document.createElement("span");
    estado.className = `badge ${["pendiente", "confirmada", "cancelada"].includes(r.estado) ? r.estado : "inactivo"}`;
    estado.textContent = capitalizar(r.estado);

    const acciones = document.createElement("div");
    acciones.className = "actions";
    if (r.estado === "pendiente") {
        acciones.append(
            boton("Confirmar", "ok", () => cambiarEstado(r, "confirmada"), ocupada),
            boton("Cancelar", "danger", () => cambiarEstado(r, "cancelada"), ocupada)
        );
    } else if (r.estado === "confirmada") {
        acciones.append(boton("Cancelar", "danger", () => cambiarEstado(r, "cancelada"), ocupada));
    } else if (r.estado === "cancelada") {
        acciones.append(boton("Reabrir", "", () => cambiarEstado(r, "pendiente"), ocupada));
    }

    const pasajeros = celda(String(r.pasajeros));
    pasajeros.className = "num";
    const importe = celda(dinero(r.importe));
    importe.className = "num";
    const codigo = document.createElement("strong");
    codigo.textContent = r.codigo;

    tr.append(
        celda(codigo),
        celda(...textoDoble(r.cliente || "—", r.correo)),
        celda(...textoDoble(r.paquete || "—", r.destino)),
        celda(r.salida ? fechaLegible(r.salida) : "—"),
        pasajeros,
        importe,
        celda(estado),
        celda(acciones)
    );
    return tr;
}

function pintar() {
    const q = buscador.value.trim().toLowerCase();
    const estado = filtroEstado.value;

    const lista = reservas.filter((r) =>
        (estado === "todas" || r.estado === estado) &&
        [r.codigo, r.cliente, r.correo, r.paquete, r.destino].some((c) => c.toLowerCase().includes(q))
    );

    cuerpo.replaceChildren(...lista.map(filaReserva));
    vacio.textContent = errorCarga
        ? "No se pudieron cargar las reservas. Revisa la conexión con el servidor."
        : reservas.length === 0
            ? "Aún no hay reservas registradas."
            : "No hay reservas que coincidan con la búsqueda.";
    vacio.classList.toggle("hidden", lista.length > 0);
    contador.textContent = `Mostrando ${lista.length} de ${reservas.length} reservas`;
}

buscador.addEventListener("input", pintar);
filtroEstado.addEventListener("change", pintar);

pintar();
cargarReservas();