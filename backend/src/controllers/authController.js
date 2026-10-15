// Ubicación: src/controllers/authController.js
const { createClient } = require("@supabase/supabase-js");
const pool = require("../config/db");

// Inicializar Supabase Auth (sin guardar sesiones en el servidor)
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

const PERFIL_SQL = `
  SELECT p.id, p.correo, p.rol,
         c.id AS cliente_id, c.nombres, c.apellido_paterno
  FROM perfiles p
  LEFT JOIN clientes c ON c.perfil_id = p.id
  WHERE p.id = $1;
`;

// Datos del usuario que se envían al frontend.
function armarUsuario(perfil) {
  return {
    id: perfil.id,
    correo: perfil.correo,
    rol: perfil.rol, // Cliente, Guía Turístico, Recepcionista o Gerente
    nombre: perfil.nombres
      ? `${perfil.nombres} ${perfil.apellido_paterno || ""}`.trim()
      : "Empleado"
  };
}

const login = async (req, res) => {
  const correo = String(req.body?.correo || "").trim().toLowerCase();
  const contrasena = req.body?.contrasena;

  // 1. Validar formato de correo y que la contraseña no esté vacía
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!correo || !emailRegex.test(correo)) {
    return res.status(400).json({
      ok: false,
      mensaje: "Debe ingresar un formato de correo electrónico válido."
    });
  }
  if (typeof contrasena !== "string" || contrasena.trim() === "") {
    return res.status(400).json({
      ok: false,
      mensaje: "La contraseña no puede estar vacía."
    });
  }

  try {
    // 2. Autenticación con Supabase
    const { data: authData, error: authError } =
      await supabase.auth.signInWithPassword({
        email: correo,
        password: contrasena
      });

    // 3. Credenciales incorrectas
    if (authError || !authData?.user || !authData?.session) {
      return res.status(401).json({
        ok: false,
        mensaje:
          "Credenciales incorrectas. El correo y la contraseña no coinciden con nuestros registros."
      });
    }

    // 4. Consultar el perfil en la base de datos para obtener el rol
    const perfilRes = await pool.query(PERFIL_SQL, [authData.user.id]);

    if (perfilRes.rows.length === 0) {
      return res.status(404).json({
        ok: false,
        mensaje: "Perfil no encontrado en el sistema."
      });
    }

    const usuario = armarUsuario(perfilRes.rows[0]);

    // 5. Acceso según el rol. Se devuelve "usuario" y también dentro de "session".
    res.status(200).json({
      ok: true,
      mensaje: "Inicio de sesión exitoso.",
      usuario,
      session: {
        access_token: authData.session.access_token,
        usuario
      }
    });
  } catch (error) {
    console.error("Error en el inicio de sesión:", error.message);
    res.status(500).json({
      ok: false,
      mensaje: "Error interno del servidor al procesar el inicio de sesión."
    });
  }
};

// Devuelve el usuario de la sesión actual a partir del token Bearer.
const me = async (req, res) => {
  const token = (req.headers.authorization || "")
    .replace(/^Bearer\s+/i, "")
    .trim();

  if (!token) {
    return res.status(401).json({
      ok: false,
      mensaje: "Falta el token de sesión."
    });
  }

  try {
    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data?.user) {
      return res.status(401).json({
        ok: false,
        mensaje: "Sesión inválida o expirada."
      });
    }

    const perfilRes = await pool.query(PERFIL_SQL, [data.user.id]);

    if (perfilRes.rows.length === 0) {
      return res.status(404).json({
        ok: false,
        mensaje: "Perfil no encontrado en el sistema."
      });
    }

    res.json({ ok: true, usuario: armarUsuario(perfilRes.rows[0]) });
  } catch (error) {
    console.error("Error en /me:", error.message);
    res.status(500).json({
      ok: false,
      mensaje: "Error interno del servidor."
    });
  }
};

// El token es de Supabase y no se guarda en el servidor: el cliente lo descarta.
const logout = async (req, res) => {
  res.json({ ok: true, mensaje: "Sesión cerrada." });
};

module.exports = { login, me, logout };