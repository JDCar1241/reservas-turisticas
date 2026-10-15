"use strict";

/* admin.js | Panel de control (sin datos hasta conectar la base) */

// ---- DATOS: se llenan con las respuestas del backend cuando la base esté lista ----
let reservasRecientes = [];   // { codigo, paquete, pasajeros, estado }
let reservasPorMes = [];      // [ ["May", 14], ... ]
let viajesProximos = [];      // { paquete, fecha, pasajeros }

function mensajeVacio(contenedor, texto) {
    const p = document.createElement("p");
    p.className = "empty-message";
    p.textContent = texto;
    contenedor.replaceChildren(p);
}

function crearFila(titulo, detalle, etiqueta, claseEtiqueta) {
    const fila = document.createElement("div");
    fila.className = "row";

    const texto = document.createElement("div");
    const t = document.createElement("strong");
    t.textContent = titulo;
    const d = document.createElement("small");
    d.textContent = detalle;
    texto.append(t, d);

    const badge = document.createElement("span");
    badge.className = `badge ${claseEtiqueta}`;
    badge.textContent = etiqueta;

    fila.append(texto, badge);
    return fila;
}

function pintarPanel() {
    const recientes = document.querySelector("#recentList");
    const viajes = document.querySelector("#tripList");
    const barras = document.querySelector("#monthBars");
    if (!recientes) return;

    if (reservasRecientes.length === 0) {
        mensajeVacio(recientes, "Aún no hay reservas registradas.");
    }
    reservasRecientes.forEach((r) => {
        const estado = r.estado.charAt(0).toUpperCase() + r.estado.slice(1);
        recientes.appendChild(
            crearFila(r.paquete, `Reserva ${r.codigo} · ${r.pasajeros} pasajero(s)`, estado, r.estado)
        );
    });

    if (viajesProximos.length === 0) {
        mensajeVacio(viajes, "No hay viajes programados.");
    }
    viajesProximos.forEach((v) => {
        viajes.appendChild(
            crearFila(v.paquete, `${v.pasajeros} pasajeros`, v.fecha, "confirmada")
        );
    });

    if (reservasPorMes.length === 0) {
        barras.classList.add("is-empty");
        mensajeVacio(barras, "El gráfico aparecerá cuando haya reservas.");
    }
    const maximo = Math.max(1, ...reservasPorMes.map(([, n]) => n));
    reservasPorMes.forEach(([mes, n]) => {
        const barra = document.createElement("div");
        barra.className = "bar";
        const valor = document.createElement("b");
        valor.textContent = n;
        const col = document.createElement("i");
        col.style.height = `${Math.round((n / maximo) * 100)}%`;
        barra.append(valor, col, document.createTextNode(mes));
        barras.appendChild(barra);
    });

    document.querySelector("#menuToggle")?.addEventListener("click", () => {
        document.querySelector("#sidebar")?.classList.toggle("open");
    });
}

pintarPanel();