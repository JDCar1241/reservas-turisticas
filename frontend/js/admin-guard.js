"use strict";

/* admin-guard.js | Comprueba que quien abre el panel es personal de la empresa.
   OJO: esto solo mejora la experiencia. La seguridad real la da el backend, que debe
   rechazar (401/403) cualquier petición a /api/admin/* sin sesión o sin rol de personal. */

(async function protegerPanel() {
    const ACCESO = "../index.html?acceso=1";   // sitio público con el login abierto
    const SITIO = "../index.html";             // área de clientes

    try {
        const resultado = await solicitarAPI(API_ROUTES.me, { method: "GET", headers: {} });
        const usuario = resultado.usuario ?? resultado;

        if (!esPersonal(usuario.rol)) {
            // Sesión de cliente (o rol desconocido): no corresponde a ningún panel.
            console.warn("[admin-guard] El rol «" + usuario.rol + "» no es de personal. Roles permitidos:", ROLES_PERSONAL);
            window.location.replace(usuario.rol ? SITIO : ACCESO);
            return;
        }

        // Cada página declara qué roles pueden verla: <body data-roles="a,b">.
        const permitidos = (document.body.dataset.roles || "").split(",").filter(Boolean);
        if (permitidos.length && !permitidos.includes(usuario.rol)) {
            console.warn("[admin-guard] El rol «" + usuario.rol + "» no puede ver esta área. Lo llevo a su panel.");
            window.location.replace("../" + panelPorRol(usuario.rol));
            return;
        }

        const rol = document.querySelector(".sidebar .role");
        const etiqueta = usuario.nombre || usuario.email;
        if (rol && etiqueta) rol.textContent = etiqueta;
    } catch (error) {
        const sinServidor = error.message.includes("Failed to fetch");

        if (sinServidor && MODO_DESARROLLO) {
            const aviso = document.createElement("p");
            aviso.className = "demo-banner";
            aviso.textContent = "Modo desarrollo: no hay backend, la sesión no se verifica.";
            document.querySelector(".admin-main")?.prepend(aviso);
            return;
        }
        console.warn("[admin-guard] La sesión no se pudo verificar. Estado:", error.status ?? "sin respuesta", "-", error.message);
        window.location.replace(ACCESO);
    }
})();

// Cerrar sesión: solo se sale cuando el servidor confirma el cierre.
document.querySelector("#staffLogout")?.addEventListener("click", async (evento) => {
    evento.preventDefault();

    try {
        await solicitarAPI(API_ROUTES.logout, { method: "POST", body: JSON.stringify({}) });
        window.location.href = "../index.html";
    } catch (error) {
        window.alert(`No se pudo confirmar el cierre de sesión: ${error.message}`);
    }
});