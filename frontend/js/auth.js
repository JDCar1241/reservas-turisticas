"use strict";

/* auth.js | Ventanas de sesión, inicio de sesión, registro y cierre de sesión */

function abrirDialogo(dialogo) {
    if (!dialogo) return;

    if (typeof dialogo.showModal === "function") {
        dialogo.showModal();
        document.body.classList.add("dialog-open");
    } else {
        mostrarEstado("Tu navegador no admite esta ventana de diálogo.");
    }
}

function cerrarDialogo(dialogo) {
    if (dialogo?.open) {
        dialogo.close();
    }
}

function actualizarEstadoVentanas() {
    const hayVentanaAbierta =
        Boolean(loginDialog?.open) ||
        Boolean(registerDialog?.open);

    document.body.classList.toggle("dialog-open", hayVentanaAbierta);
}

[loginDialog, registerDialog].forEach((dialogo) => {
    if (!dialogo) return;

    dialogo.addEventListener("close", actualizarEstadoVentanas);

    // Cerrar al hacer clic en el fondo de la ventana.
    dialogo.addEventListener("click", (evento) => {
        if (evento.target === dialogo) {
            cerrarDialogo(dialogo);
        }
    });
});

// Un fallo de red del navegador (servidor apagado, URL o puerto incorrectos, CORS).
function esErrorDeRed(error) {
    return error instanceof TypeError ||
        String(error?.message || "").includes("Failed to fetch");
}

// Muestra los botones según haya o no una sesión iniciada.
function mostrarBotonesDeSesion(haySesion) {
    loginBtn?.classList.toggle("hidden", haySesion);
    registerBtn?.classList.toggle("hidden", haySesion);
    logoutBtn?.classList.toggle("hidden", !haySesion);
}

// Al recargar la página, se recupera el estado visual de la sesión.
if (obtenerToken() && obtenerUsuarioGuardado()) {
    mostrarBotonesDeSesion(true);
}

/* =========================================
   2. ABRIR Y CERRAR VENTANAS
   ========================================= */

loginBtn?.addEventListener("click", () => {
    limpiarMensaje(loginMessage);
    abrirDialogo(loginDialog);
});

registerBtn?.addEventListener("click", () => {
    limpiarMensaje(registerMessage);
    abrirDialogo(registerDialog);
});

document.querySelectorAll("[data-close]").forEach((boton) => {
    boton.addEventListener("click", () => {
        const dialogo = document.getElementById(boton.dataset.close);
        cerrarDialogo(dialogo);
    });
});

document.querySelector("#switchToRegister")?.addEventListener("click", () => {
    cerrarDialogo(loginDialog);
    limpiarMensaje(registerMessage);
    abrirDialogo(registerDialog);
});

document.querySelector("#switchToLogin")?.addEventListener("click", () => {
    cerrarDialogo(registerDialog);
    limpiarMensaje(loginMessage);
    abrirDialogo(loginDialog);
});

/* =========================================
   3. INICIO DE SESIÓN
   ========================================= */

loginForm?.addEventListener("submit", async (evento) => {
    evento.preventDefault();
    limpiarMensaje(loginMessage);

    if (!loginForm.reportValidity()) return;

    const correo = document.querySelector("#loginEmail").value
        .trim()
        .toLowerCase();

    const contrasena = document.querySelector("#loginPassword").value;
    const boton = loginForm.querySelector('button[type="submit"]');

    establecerEstadoCargando(boton, true, "Verificando...");

    try {
        // El backend espera los campos "correo" y "contrasena".
        const resultado = await solicitarAPI(API_ROUTES.login, {
            method: "POST",
            body: JSON.stringify({ correo, contrasena })
        });

        const usuario = resultado.usuario ?? resultado.session?.usuario;
        const token = resultado.session?.access_token;

        if (!token || !usuario) {
            throw new Error("La respuesta del servidor no incluye la sesión.");
        }

        // Se guarda el token para las siguientes peticiones.
        guardarSesion(token, usuario);

        // Un solo login: según el rol que devuelve el backend, cada rol del personal
        // va a su propio panel y los clientes se quedan en el sitio público.
        if (esPersonal(usuario.rol)) {
            window.location.href = panelPorRol(usuario.rol);
            return;
        }

        cerrarDialogo(loginDialog);
        loginForm.reset();
        mostrarBotonesDeSesion(true);

        mostrarEstado(
            `Sesión iniciada${usuario.nombre ? `: ${usuario.nombre}` : ""}.`
        );
    } catch (error) {
        mostrarMensaje(
            loginMessage,
            esErrorDeRed(error)
                ? "No se pudo conectar con el backend. Comprueba que el servidor esté activo y que la dirección de la API sea correcta."
                : error.message,
            "error"
        );
    } finally {
        establecerEstadoCargando(boton, false);
    }
});

/* =========================================
   4. REGISTRO DE USUARIOS
   =========================================
   OJO: el backend todavía no tiene POST /api/auth/register.
   Hasta crearlo, esta pantalla mostrará "Ruta no encontrada". */

registerForm?.addEventListener("submit", async (evento) => {
    evento.preventDefault();
    limpiarMensaje(registerMessage);

    if (!registerForm.reportValidity()) return;

    const nombres = document.querySelector("#registerNames")
        .value.trim();

    const apellidos = document.querySelector("#registerLastNames")
        .value.trim();

    const dni = document.querySelector("#registerDni")
        .value.trim();

    const telefono = document.querySelector("#registerPhone")
        .value.trim();

    const correo = document.querySelector("#registerEmail")
        .value.trim()
        .toLowerCase();

    const contrasena = document.querySelector("#registerPassword").value;

    const confirmarContrasena =
        document.querySelector("#registerPasswordConfirm").value;

    if (!/^[0-9]{8}$/.test(dni)) {
        mostrarMensaje(
            registerMessage,
            "El DNI debe contener exactamente 8 dígitos numéricos.",
            "error"
        );
        return;
    }

    if (contrasena.length < 8) {
        mostrarMensaje(
            registerMessage,
            "La contraseña debe tener al menos 8 caracteres.",
            "error"
        );
        return;
    }

    if (contrasena !== confirmarContrasena) {
        mostrarMensaje(
            registerMessage,
            "Las contraseñas no coinciden.",
            "error"
        );
        return;
    }

    const boton = registerForm.querySelector('button[type="submit"]');

    establecerEstadoCargando(boton, true, "Creando cuenta...");

    try {
        await solicitarAPI(API_ROUTES.register, {
            method: "POST",
            body: JSON.stringify({
                nombres,
                apellidos,
                dni,
                telefono,
                correo,
                contrasena
            })
        });

        registerForm.reset();
        cerrarDialogo(registerDialog);

        mostrarEstado(
            "Registro completado. Ya puedes iniciar sesión."
        );

        abrirDialogo(loginDialog);
        mostrarMensaje(
            loginMessage,
            "Cuenta creada. Inicia sesión con tus credenciales.",
            "success"
        );
    } catch (error) {
        mostrarMensaje(
            registerMessage,
            esErrorDeRed(error)
                ? "No se pudo conectar con el backend. Verifica que esté activo."
                : error.message,
            "error"
        );
    } finally {
        establecerEstadoCargando(boton, false);
    }
});

/* =========================================
   5. CERRAR SESIÓN
   ========================================= */

logoutBtn?.addEventListener("click", async () => {
    logoutBtn.disabled = true;

    try {
        await solicitarAPI(API_ROUTES.logout, {
            method: "POST",
            body: JSON.stringify({})
        });

        mostrarEstado("Has cerrado sesión correctamente.");
    } catch (error) {
        // Un token vencido (401) ya no sirve: se puede cerrar la sesión local.
        if (error.status !== 401) {
            /*
             * No afirmamos que la sesión fue invalidada si el servidor
             * no confirmó el cierre.
             */
            mostrarEstado(
                `No se pudo confirmar el cierre de sesión: ${error.message}`
            );
            logoutBtn.disabled = false;
            return;
        }

        mostrarEstado("Tu sesión ya había expirado.");
    }

    limpiarSesion();
    mostrarBotonesDeSesion(false);
    logoutBtn.disabled = false;
});

/* =========================================
   6. MOSTRAR / OCULTAR CONTRASEÑA
   ========================================= */

function restablecerCamposContrasena(dialogo) {
    dialogo?.querySelectorAll(".toggle-password").forEach((boton) => {
        const campo = document.getElementById(boton.dataset.target);
        if (campo) campo.type = "password";
        boton.textContent = "Mostrar";
        boton.setAttribute("aria-pressed", "false");
    });
}

document.querySelectorAll(".toggle-password").forEach((boton) => {
    boton.addEventListener("click", () => {
        const campo = document.getElementById(boton.dataset.target);
        if (!campo) return;

        const mostrar = campo.type === "password";
        campo.type = mostrar ? "text" : "password";
        boton.textContent = mostrar ? "Ocultar" : "Mostrar";
        boton.setAttribute("aria-pressed", String(mostrar));
    });
});

[loginDialog, registerDialog].forEach((dialogo) => {
    dialogo?.addEventListener("close", () => restablecerCamposContrasena(dialogo));
});

// Si una página protegida (panel de la empresa) pide iniciar sesión, abre el login.
if (new URLSearchParams(window.location.search).has("acceso")) {
    limpiarMensaje(loginMessage);
    abrirDialogo(loginDialog);
}