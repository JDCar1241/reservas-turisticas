"use strict";

/* admin.js | Dashboards (administración y recepción) */

// Ruta prevista (personal autenticado):
//   GET /api/admin/resumen -> {
//     reservas_totales, reservas_pendientes, paquetes_activos, ingresos,
//     reservas_hoy, salidas_proximas, clientes_registrados,
//     reservas_recientes:   [{ codigo, paquete, cantidad_personas, estado }],
//     reservas_por_atender: [{ codigo, paquete, cantidad_personas, estado }],   // pendientes
//     reservas_por_mes:     [{ mes: "May", total: 14 }],
//     viajes_proximos:      [{ paquete, fecha_salida, pasajeros }]
//   }
// Los datos vienen siempre del servidor: la pantalla no inventa cifras.
const RESUMEN_ROUTE = "/api/admin/resumen";
const ES_RECEPCION = document.body.dataset.panel === "recepcion";

// data-stat del HTML -> campo de la respuesta
const CAMPOS_STAT = {
    total: "reservas_totales",
    pendientes: "reservas_pendientes",
    paquetes: "paquetes_activos",
    ingresos: "ingresos",
    hoy: "reservas_hoy",
    salidas: "salidas_proximas",
    clientes: "clientes_registrados"
};

const recientes = document.querySelector("#recentList");
const viajes = document.querySelector("#tripList");
const barras = document.querySelector("#monthBars");

document.querySelector("#menuToggle")?.addEventListener("click", () => {
    document.querySelector("#sidebar")?.classList.toggle("open");
});

const formatoCorto = new Intl.DateTimeFormat("es-PE", { day: "2-digit", month: "short" });
function fechaCorta(valor) {
    const texto = String(valor ?? "");
    const f = new Date(/^\d{4}-\d{2}-\d{2}$/.test(texto) ? `${texto}T00:00:00` : texto);
    return Number.isNaN(f.getTime()) ? "—" : formatoCorto.format(f);
}

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

function pintarCifras(datos) {
    document.querySelectorAll("[data-stat]").forEach((el) => {
        const clave = CAMPOS_STAT[el.dataset.stat];
        const valor = datos?.[clave];
        const nota = el.parentElement.querySelector("small");

        if (valor === undefined || valor === null) {
            el.textContent = "—";
            return;
        }
        el.textContent = clave === "ingresos"
            ? `S/ ${Number(valor).toLocaleString("es-PE", { minimumFractionDigits: 2 })}`
            : Number(valor).toLocaleString("es-PE");
        if (nota) nota.textContent = "";
    });
}

function pintarReservas(lista) {
    if (!recientes) return;
    recientes.replaceChildren();

    if (!Array.isArray(lista) || lista.length === 0) {
        mensajeVacio(recientes, ES_RECEPCION ? "No hay reservas por atender." : "Aún no hay reservas registradas.");
        return;
    }
    lista.forEach((r) => {
        const estado = String(r.estado ?? "pendiente").toLowerCase();
        recientes.appendChild(crearFila(
            r.paquete ?? "Paquete",
            `Reserva ${r.codigo ?? "—"} · ${r.cantidad_personas ?? "—"} pasajero(s)`,
            estado.charAt(0).toUpperCase() + estado.slice(1),
            ["pendiente", "confirmada", "cancelada"].includes(estado) ? estado : "inactivo"
        ));
    });
}

function pintarViajes(lista) {
    if (!viajes) return;
    viajes.replaceChildren();

    if (!Array.isArray(lista) || lista.length === 0) {
        mensajeVacio(viajes, "No hay viajes programados.");
        return;
    }
    lista.forEach((v) => {
        viajes.appendChild(crearFila(
            v.paquete ?? "Paquete",
            `${v.pasajeros ?? 0} pasajeros`,
            fechaCorta(v.fecha_salida),
            "confirmada"
        ));
    });
}

function pintarGrafico(meses) {
    if (!barras) return;
    barras.replaceChildren();

    if (!Array.isArray(meses) || meses.length === 0) {
        barras.classList.add("is-empty");
        mensajeVacio(barras, "El gráfico aparecerá cuando haya reservas.");
        return;
    }
    barras.classList.remove("is-empty");

    const maximo = Math.max(1, ...meses.map((m) => Number(m.total) || 0));
    meses.forEach((m) => {
        const barra = document.createElement("div");
        barra.className = "bar";
        const valor = document.createElement("b");
        valor.textContent = m.total;
        const col = document.createElement("i");
        col.style.height = `${Math.round(((Number(m.total) || 0) / maximo) * 100)}%`;
        barra.append(valor, col, document.createTextNode(m.mes));
        barras.appendChild(barra);
    });
}

function pintarPanel(datos) {
    pintarCifras(datos);
    pintarReservas(ES_RECEPCION ? datos?.reservas_por_atender : datos?.reservas_recientes);
    pintarViajes(datos?.viajes_proximos);
    pintarGrafico(datos?.reservas_por_mes);
}

async function cargarResumen() {
    const aviso = document.createElement("p");
    aviso.className = "form-message";
    aviso.setAttribute("aria-live", "polite");
    document.querySelector(".topbar")?.after(aviso);

    try {
        pintarPanel(await solicitarAPI(RESUMEN_ROUTE, { method: "GET", headers: {} }));
    } catch (error) {
        pintarPanel(null);
        mostrarMensaje(
            aviso,
            error.message.includes("Failed to fetch")
                ? "No se pudo conectar con el backend. Comprueba que el servidor esté activo."
                : `No se pudo cargar el resumen: ${error.message}`,
            "error"
        );
    }
}

cargarResumen();