
"use strict";

require("dotenv").config();

const express = require("express");
const cors = require("cors");
const { createClient } = require("@supabase/supabase-js");
const pool = require("./db");

const app = express();
const PORT = process.env.PORT || 3000;

// ======================================================
// 1. VALIDAR CONFIGURACIÓN
// ======================================================

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
    console.error(
        "ERROR: Configura SUPABASE_URL y SUPABASE_ANON_KEY en el archivo .env"
    );
    process.exit(1);
}

// ======================================================
// 2. CONFIGURAR CORS Y JSON
// ======================================================

const origenesPermitidos = [
    "http://localhost:5500",
    "http://127.0.0.1:5500"
];

app.use(
    cors({
        origin: origenesPermitidos,
        credentials: true,
        methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization"]
    })
);

app.use(express.json({ limit: "1mb" }));

// ======================================================
// 3. CONFIGURAR COOKIES DE SESIÓN
// ======================================================

const opcionesCookie = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 1000
};

function guardarCookies(res, sesion) {
    if (!sesion || !sesion.access_token || !sesion.refresh_token) {
        return;
    }

    res.cookie("vp_access", sesion.access_token, opcionesCookie);

    res.cookie("vp_refresh", sesion.refresh_token, {
        ...opcionesCookie,
        maxAge: 30 * 24 * 60 * 60 * 1000
    });
}

function borrarCookies(res) {
    const opcionesEliminar = {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/"
    };

    res.clearCookie("vp_access", opcionesEliminar);
    res.clearCookie("vp_refresh", opcionesEliminar);
}

function leerCookies(req) {
    const resultado = {};
    const cabecera = req.headers.cookie;

    if (!cabecera) {
        return resultado;
    }

    cabecera.split(";").forEach((parte) => {
        const separador = parte.indexOf("=");

        if (separador === -1) {
            return;
        }

        const nombre = parte.slice(0, separador).trim();
        const valor = parte.slice(separador + 1).trim();

        try {
            resultado[nombre] = decodeURIComponent(valor);
        } catch {
            resultado[nombre] = valor;
        }
    });

    return resultado;
}

// ======================================================
// 4. CLIENTE SUPABASE
// ======================================================

function crearClienteSupabase() {
    return createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_ANON_KEY,
        {
            auth: {
                persistSession: false,
                autoRefreshToken: false,
                detectSessionInUrl: false
            }
        }
    );
}

// ======================================================
// 5. OBTENER O CREAR PERFIL DEL USUARIO
// ======================================================

async function obtenerPerfil(id, correo) {
    const consulta = `
        INSERT INTO public.perfiles (id, correo, rol)
        VALUES ($1, $2, 'cliente'::public.rol_usuario)
        ON CONFLICT (id)
        DO UPDATE SET correo = EXCLUDED.correo
        RETURNING id, correo, rol
    `;

    const resultado = await pool.query(consulta, [
        id,
        correo || null
    ]);

    if (resultado.rows.length === 0) {
        throw new Error("No se pudo obtener el perfil del usuario.");
    }

    return resultado.rows[0];
}

// ======================================================
// 6. RUTAS GENERALES Y DIAGNÓSTICO
// ======================================================

app.get("/", (req, res) => {
    res.json({
        status: "OK",
        mensaje: "API de ViajaPerú funcionando."
    });
});

app.get("/api/health", (req, res) => {
    res.json({
        status: "OK",
        servicio: "backend",
        mensaje: "El servidor está funcionando."
    });
});

app.get("/api/db-health", async (req, res) => {
    try {
        const resultado = await pool.query("SELECT NOW() AS fecha");

        res.json({
            status: "OK",
            mensaje: "Conexión con PostgreSQL correcta.",
            fecha: resultado.rows[0].fecha
        });
    } catch (error) {
        console.error("Error de conexión con PostgreSQL:", error.message);

        res.status(500).json({
            status: "ERROR",
            mensaje: "No se pudo conectar con la base de datos."
        });
    }
});

// ======================================================
// 7. REGISTRO
// ======================================================

app.post("/api/auth/register", async (req, res) => {
    try {
        const {
            nombres,
            apellidos,
            dni,
            telefono,
            email,
            password
        } = req.body || {};

        if (
            !nombres ||
            !apellidos ||
            !dni ||
            !telefono ||
            !email ||
            !password
        ) {
            return res.status(400).json({
                status: "ERROR",
                mensaje: "Completa todos los campos obligatorios."
            });
        }

        if (!/^\d{8}$/.test(String(dni).trim())) {
            return res.status(400).json({
                status: "ERROR",
                mensaje: "El DNI debe contener exactamente 8 dígitos."
            });
        }

        if (String(password).length < 8) {
            return res.status(400).json({
                status: "ERROR",
                mensaje: "La contraseña debe tener al menos 8 caracteres."
            });
        }

        const correo = String(email).trim().toLowerCase();

        const supabase = crearClienteSupabase();

        const { data, error } = await supabase.auth.signUp({
            email: correo,
            password: String(password),
            options: {
                data: {
                    nombres: String(nombres).trim(),
                    apellidos: String(apellidos).trim(),
                    dni: String(dni).trim(),
                    telefono: String(telefono).trim()
                }
            }
        });

        if (error) {
            const mensaje = error.message || "";

            if (
                mensaje.toLowerCase().includes("already registered") ||
                mensaje.toLowerCase().includes("already exists")
            ) {
                return res.status(409).json({
                    status: "ERROR",
                    mensaje: "Este correo ya está registrado."
                });
            }

            return res.status(400).json({
                status: "ERROR",
                mensaje: "No se pudo registrar la cuenta. Verifica los datos."
            });
        }

        // Si Supabase permite iniciar sesión inmediatamente,
        // guardamos la sesión y creamos/obtenemos el perfil.
        if (data.user && data.session) {
            try {
                const perfil = await obtenerPerfil(
                    data.user.id,
                    data.user.email
                );

                guardarCookies(res, data.session);

                return res.status(201).json({
                    status: "OK",
                    mensaje: "Cuenta creada correctamente.",
                    usuario: {
                        id: data.user.id,
                        email: data.user.email,
                        rol: perfil.rol
                    }
                });
            } catch (errorPerfil) {
                console.error(
                    "Error al crear el perfil:",
                    errorPerfil.message
                );

                return res.status(500).json({
                    status: "ERROR",
                    mensaje:
                        "La cuenta se creó, pero no se pudo preparar el perfil. Contacta con el administrador."
                });
            }
        }

        // Si Supabase exige confirmar el correo, todavía no hay sesión.
        return res.status(201).json({
            status: "OK",
            mensaje:
                "Registro recibido. Revisa tu correo para confirmar la cuenta antes de iniciar sesión."
        });
    } catch (error) {
        console.error("Error en registro:", error.message);

        return res.status(500).json({
            status: "ERROR",
            mensaje: "Ocurrió un error interno durante el registro."
        });
    }
});

// ======================================================
// 8. INICIO DE SESIÓN
// ======================================================

app.post("/api/auth/login", async (req, res) => {
    try {
        const { email, password } = req.body || {};

        if (!email || !password) {
            return res.status(400).json({
                status: "ERROR",
                mensaje: "Ingresa tu correo y contraseña."
            });
        }

        const supabase = crearClienteSupabase();

        const { data, error } = await supabase.auth.signInWithPassword({
            email: String(email).trim().toLowerCase(),
            password: String(password)
        });

        if (error || !data.user || !data.session) {
            return res.status(401).json({
                status: "ERROR",
                mensaje: "Correo o contraseña incorrectos."
            });
        }

        const perfil = await obtenerPerfil(
            data.user.id,
            data.user.email
        );

        guardarCookies(res, data.session);

        return res.json({
            status: "OK",
            mensaje: "Inicio de sesión correcto.",
            usuario: {
                id: data.user.id,
                email: data.user.email,
                rol: perfil.rol
            }
        });
    } catch (error) {
        console.error("Error en inicio de sesión:", error.message);

        return res.status(500).json({
            status: "ERROR",
            mensaje:
                "No se pudo iniciar sesión. Verifica la configuración del servidor."
        });
    }
});

// ======================================================
// 9. CONSULTAR SESIÓN ACTUAL
// ======================================================

app.get("/api/auth/me", async (req, res) => {
    console.log("Ruta /api/auth/me ejecutada");

    try {
        const cookies = leerCookies(req);
        const accessToken = cookies.vp_access;
        const refreshToken = cookies.vp_refresh;

        if (!accessToken || !refreshToken) {
            borrarCookies(res);

            return res.status(401).json({
                status: "ERROR",
                mensaje: "No hay una sesión activa."
            });
        }

        const supabase = crearClienteSupabase();

        const { data: sesionData, error: sesionError } =
            await supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken
            });

        if (sesionError || !sesionData.session) {
            borrarCookies(res);

            return res.status(401).json({
                status: "ERROR",
                mensaje: "La sesión ha expirado. Inicia sesión nuevamente."
            });
        }

        // Supabase puede renovar los tokens durante setSession.
        guardarCookies(res, sesionData.session);

        const { data: usuarioData, error: usuarioError } =
            await supabase.auth.getUser(
                sesionData.session.access_token
            );

        if (usuarioError || !usuarioData.user) {
            borrarCookies(res);

            return res.status(401).json({
                status: "ERROR",
                mensaje: "No se pudo verificar la sesión."
            });
        }

        const perfil = await obtenerPerfil(
            usuarioData.user.id,
            usuarioData.user.email
        );

        return res.json({
            status: "OK",
            usuario: {
                id: usuarioData.user.id,
                email: usuarioData.user.email,
                rol: perfil.rol
            }
        });
    } catch (error) {
        console.error(
            "Error al consultar la sesión:",
            error.message
        );

        return res.status(500).json({
            status: "ERROR",
            mensaje: "No se pudo consultar la sesión actual."
        });
    }
});

// ======================================================
// 10. CERRAR SESIÓN
// ======================================================

app.post("/api/auth/logout", async (req, res) => {
    try {
        const cookies = leerCookies(req);

        // Intentamos cerrar también la sesión en Supabase.
        if (cookies.vp_access && cookies.vp_refresh) {
            try {
                const supabase = crearClienteSupabase();

                const { data } = await supabase.auth.setSession({
                    access_token: cookies.vp_access,
                    refresh_token: cookies.vp_refresh
                });

                if (data.session) {
                    await supabase.auth.signOut();
                }
            } catch (errorSesion) {
                console.warn(
                    "La sesión remota ya no estaba activa:",
                    errorSesion.message
                );
            }
        }

        borrarCookies(res);

        return res.json({
            status: "OK",
            mensaje: "Sesión cerrada correctamente."
        });
    } catch (error) {
        console.error("Error al cerrar sesión:", error.message);

        borrarCookies(res);

        return res.status(500).json({
            status: "ERROR",
            mensaje: "Ocurrió un error al cerrar la sesión."
        });
    }
});

// ======================================================
// 11. RUTA NO ENCONTRADA
// ======================================================

app.use((req, res) => {
    res.status(404).json({
        status: "ERROR",
        mensaje: `Ruta no encontrada: ${req.method} ${req.originalUrl}`
    });
});

// ======================================================
// 12. MANEJO GENERAL DE ERRORES
// ======================================================

app.use((error, req, res, next) => {
    console.error("Error del servidor:", error.message);

    if (res.headersSent) {
        return next(error);
    }

    res.status(500).json({
        status: "ERROR",
        mensaje: "Ocurrió un error interno en el servidor."
    });
});

// ======================================================
// 13. INICIAR SERVIDOR
// ======================================================

const servidor = app.listen(PORT, () => {
    console.log("-----------------------------------------");
    console.log("       BACKEND DE VIAJAPERÚ");
    console.log("-----------------------------------------");
    console.log(`Servidor: http://localhost:${PORT}`);
    console.log(`Salud:    http://localhost:${PORT}/api/health`);
    console.log(`Base de datos: http://localhost:${PORT}/api/db-health`);
    console.log("-----------------------------------------");
});

servidor.on("error", (error) => {
    if (error.code === "EADDRINUSE") {
        console.error(
            `El puerto ${PORT} ya está ocupado. Cierra el otro servidor antes de iniciar este.`
        );
    } else {
        console.error("Error al iniciar el servidor:", error.message);
    }

    process.exit(1);
});

process.on("SIGINT", async () => {
    console.log("\nCerrando servidor...");

    servidor.close(async () => {
        try {
            await pool.end();
            console.log("Conexiones cerradas correctamente.");
            process.exit(0);
        } catch (error) {
            console.error("Error al cerrar la base de datos:", error.message);
            process.exit(1);
        }
    });
});
