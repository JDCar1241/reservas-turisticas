
"use strict";

/* =========================================
   ViajaPerú | auth.js
   Registro e inicio y cierre de sesión
   ========================================= */

function abrirDialogo(dialogo) {
    if (!dialogo) {
        console.error("No se encontró la ventana solicitada.");
        return;
    }

    if (typeof dialogo.showModal !== "function") {
        mostrarEstado("Tu navegador no admite esta ventana.");
        return;
    }

    if (!dialogo.open) {
        dialogo.showModal();
    }

    actualizarEstadoVentanas();
}

function cerrarDialogo(dialogo) {
    if (dialogo?.open) {
        dialogo.close();
    }

    actualizarEstadoVentanas();
}

function actualizarEstadoVentanas() {
    const abierta =
        Boolean(loginDialog?.open) ||
        Boolean(registerDialog?.open);

    document.body.classList.toggle("dialog-open", abierta);
}

function rutasAutenticacionDisponibles() {
    return (
        typeof API_ROUTES !== "undefined" &&
        API_ROUTES.login &&
        API_ROUTES.register &&
        API_ROUTES.logout
    );
}

/* =========================================
   1. VENTANAS DE AUTENTICACIÓN
   ========================================= */

[loginDialog, registerDialog].forEach((dialogo) => {
    if (!dialogo) return;

    dialogo.addEventListener("close", actualizarEstadoVentanas);

    dialogo.addEventListener("click", (evento) => {
        if (evento.target === dialogo) {
            cerrarDialogo(dialogo);
        }
    });
});

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
        cerrarDialogo(
            document.getElementById(boton.dataset.close)
        );
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
   2. INICIO DE SESIÓN
   ========================================= */

loginForm?.addEventListener("submit", async (evento) => {
    evento.preventDefault();
    limpiarMensaje(loginMessage);

    if (!loginForm.reportValidity()) return;

    if (!rutasAutenticacionDisponibles()) {
        mostrarMensaje(
            loginMessage,
            "Falta configurar API_ROUTES en js/data.js.",
            "error"
        );
        return;
    }

    const correo =
        document.querySelector("#loginEmail")?.value.trim().toLowerCase() || "";

    const contrasena =
        document.querySelector("#loginPassword")?.value || "";

    const boton = loginForm.querySelector('button[type="submit"]');

    if (!correo || !contrasena) {
        mostrarMensaje(
            loginMessage,
            "Ingresa tu correo y contraseña.",
            "error"
        );
        return;
    }

    establecerEstadoCargando(boton, true, "Verificando...");

    try {
        const resultado = await solicitarAPI(API_ROUTES.login, {
            method: "POST",
            body: JSON.stringify({
                email: correo,
                password: contrasena
            })
        });

        /*
         * El backend debe validar las credenciales y establecer
         * la sesión segura. No guardamos contraseñas ni tokens
         * en localStorage.
         */

        loginForm.reset();
        cerrarDialogo(loginDialog);

        loginBtn?.classList.add("hidden");
        registerBtn?.classList.add("hidden");
        logoutBtn?.classList.remove("hidden");

        const nombre = resultado?.usuario?.nombre;

        mostrarEstado(
            nombre
                ? `Sesión iniciada: ${nombre}.`
                : "Sesión iniciada correctamente."
        );

        /*
         * La navegación al dashboard se añadirá cuando definamos
         * el flujo de páginas y la validación de sesión.
         */

    } catch (error) {
        console.error("Error al iniciar sesión:", error);

        mostrarMensaje(
            loginMessage,
            error.message === "Failed to fetch"
                ? "No se pudo conectar con el backend. Comprueba que esté activo."
                : error.message || "No se pudo iniciar sesión.",
            "error"
        );
    } finally {
        establecerEstadoCargando(boton, false);
    }
});

/* =========================================
   3. REGISTRO DE USUARIOS
   ========================================= */

registerForm?.addEventListener("submit", async (evento) => {
    evento.preventDefault();
    limpiarMensaje(registerMessage);

    if (!registerForm.reportValidity()) return;

    if (!rutasAutenticacionDisponibles()) {
        mostrarMensaje(
            registerMessage,
            "Falta configurar API_ROUTES en js/data.js.",
            "error"
        );
        return;
    }

    const nombres =
        document.querySelector("#registerNames")?.value.trim() || "";

    const apellidos =
        document.querySelector("#registerLastNames")?.value.trim() || "";

    const dni =
        document.querySelector("#registerDni")?.value.trim() || "";

    const telefono =
        document.querySelector("#registerPhone")?.value.trim() || "";

    const correo =
        document.querySelector("#registerEmail")?.value.trim().toLowerCase() || "";

    const contrasena =
        document.querySelector("#registerPassword")?.value || "";

    const confirmar =
        document.querySelector("#registerPasswordConfirm")?.value || "";

    if (!nombres || !apellidos) {
        mostrarMensaje(
            registerMessage,
            "Ingresa tus nombres y apellidos.",
            "error"
        );
        return;
    }

    if (!/^[0-9]{8}$/.test(dni)) {
        mostrarMensaje(
            registerMessage,
            "El DNI debe contener exactamente 8 dígitos.",
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

    if (contrasena !== confirmar) {
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
                email: correo,
                password: contrasena
            })
        });

        registerForm.reset();
        cerrarDialogo(registerDialog);

        mostrarEstado("Registro completado. Ya puedes iniciar sesión.");

        abrirDialogo(loginDialog);

        mostrarMensaje(
            loginMessage,
            "Tu cuenta fue creada. Inicia sesión con tus credenciales.",
            "success"
        );

    } catch (error) {
        console.error("Error al registrar usuario:", error);

        mostrarMensaje(
            registerMessage,
            error.message === "Failed to fetch"
                ? "No se pudo conectar con el backend. Comprueba que esté activo."
                : error.message || "No se pudo completar el registro.",
            "error"
        );
    } finally {
        establecerEstadoCargando(boton, false);
    }
});

/* =========================================
   4. CIERRE DE SESIÓN
   ========================================= */

logoutBtn?.addEventListener("click", async () => {
    if (!rutasAutenticacionDisponibles()) {
        mostrarEstado("Falta configurar la ruta de cierre de sesión.");
        return;
    }

    logoutBtn.disabled = true;

    try {
        await solicitarAPI(API_ROUTES.logout, {
            method: "POST",
            body: JSON.stringify({})
        });

        loginBtn?.classList.remove("hidden");
        registerBtn?.classList.remove("hidden");
        logoutBtn?.classList.add("hidden");

        mostrarEstado("Has cerrado sesión correctamente.");

    } catch (error) {
        console.error("Error al cerrar sesión:", error);

        mostrarEstado(
            `No se pudo confirmar el cierre de sesión: ${error.message}`
        );
    } finally {
        logoutBtn.disabled = false;
    }
});

/* =========================================
   5. MOSTRAR Y OCULTAR CONTRASEÑAS
   ========================================= */

function restablecerCamposContrasena(dialogo) {
    dialogo?.querySelectorAll(".toggle-password").forEach((boton) => {
        const campo = document.getElementById(boton.dataset.target);

        if (campo) {
            campo.type = "password";
        }

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
    dialogo?.addEventListener("close", () => {
        restablecerCamposContrasena(dialogo);
    });
});
