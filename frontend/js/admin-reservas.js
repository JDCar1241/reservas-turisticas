"use strict";

/* admin-reservas.js | Gestión de reservas */

// ---- DATOS: se llenan con GET /api/reservas cuando la base esté lista ----
// Cada reserva: { codigo, cliente, correo, paquete, destino, salida (AAAA-MM-DD),
//                 pasajeros, importe, estado: "pendiente" | "confirmada" | "cancelada" }
let reservas = [];

const cuerpo = document.querySelector("#resBody");
const buscador = document.querySelector("#resSearch");
const filtroEstado = document.querySelector("#resStatus");
const contador = document.querySelector("#resCount");
const vacio = document.querySelector("#resEmpty");

const fecha = new Intl.DateTimeFormat("es-PE", { day: "2-digit", month: "short", year: "numeric" });
const dinero = (n) => `S/ ${n.toLocaleString("es-PE", { minimumFractionDigits: 2 })}`;
const capitalizar = (t) => t.charAt(0).toUpperCase() + t.slice(1);

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

function boton(texto, clase, accion) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = `btn-xs ${clase}`;
    b.textContent = texto;
    b.addEventListener("click", accion);
    return b;
}

function cambiarEstado(reserva, nuevo) {
    // Con backend: PATCH /api/reservas/:codigo/estado y actualizar solo si responde OK.
    if (nuevo === "cancelada" &&
        !window.confirm(`¿Cancelar la reserva ${reserva.codigo} de ${reserva.cliente}?`)) {
        return;
    }
    reserva.estado = nuevo;
    pintar();
}

function filaReserva(r) {
    const tr = document.createElement("tr");

    const estado = document.createElement("span");
    estado.className = `badge ${r.estado}`;
    estado.textContent = capitalizar(r.estado);

    const acciones = document.createElement("div");
    acciones.className = "actions";
    if (r.estado === "pendiente") {
        acciones.append(
            boton("Confirmar", "ok", () => cambiarEstado(r, "confirmada")),
            boton("Cancelar", "danger", () => cambiarEstado(r, "cancelada"))
        );
    } else if (r.estado === "confirmada") {
        acciones.append(boton("Cancelar", "danger", () => cambiarEstado(r, "cancelada")));
    } else {
        acciones.append(boton("Reabrir", "", () => cambiarEstado(r, "pendiente")));
    }

    const pasajeros = celda(String(r.pasajeros));
    pasajeros.className = "num";
    const importe = celda(dinero(r.importe));
    importe.className = "num";

    tr.append(
        celda(Object.assign(document.createElement("strong"), { textContent: r.codigo })),
        celda(...textoDoble(r.cliente, r.correo)),
        celda(...textoDoble(r.paquete, r.destino)),
        celda(fecha.format(new Date(`${r.salida}T00:00:00`))),
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
        [r.codigo, r.cliente, r.paquete, r.destino].some((c) => c.toLowerCase().includes(q))
    );

    cuerpo.replaceChildren(...lista.map(filaReserva));
    vacio.textContent = reservas.length === 0
        ? "Aún no hay reservas registradas."
        : "No hay reservas que coincidan con la búsqueda.";
    vacio.classList.toggle("hidden", lista.length > 0);
    contador.textContent = `Mostrando ${lista.length} de ${reservas.length} reservas`;
}

buscador.addEventListener("input", pintar);
filtroEstado.addEventListener("change", pintar);
document.querySelector("#menuToggle")?.addEventListener("click", () => {
    document.querySelector("#sidebar")?.classList.toggle("open");
});

pintar();