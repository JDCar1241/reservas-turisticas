// Ubicación: src/controllers/authController.js
const { createClient } = require("@supabase/supabase-js");
const pool = require("../config/db");

// Inicializar Supabase Auth
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

const login = async (req, res) => {
  const { correo, contrasena } = req.body;

  // 1. Criterio de Aceptación: Validar formato de correo y que la contraseña no esté vacía
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!correo || !emailRegex.test(correo)) {
    return res.status(400).json({
      ok: false,
      mensaje: "Debe ingresar un formato de correo electrónico válido."
    });
  }
  if (!contrasena || contrasena.trim() === "") {
    return res.status(400).json({
      ok: false,
      mensaje: "La contraseña no puede estar vacía."
    });
  }

  try {
    // 2. Autenticación con Supabase
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: correo,
      password: contrasena
    });

    // 3. Criterio de Aceptación: Mostrar mensaje de credenciales incorrectas[cite: 6]
    if (authError || !authData.user) {
      return res.status(401).json({
        ok: false,
        mensaje: "Credenciales incorrectas. El correo y la contraseña no coinciden con nuestros registros."
      });
    }

    const userId = authData.user.id;

    // 4. Consultar el perfil en la Base de Datos para obtener el Rol[cite: 6]
    const perfilQuery = `
      SELECT p.id, p.correo, p.rol, 
             c.id AS cliente_id, c.nombres, c.apellido_paterno
      FROM perfiles p
      LEFT JOIN clientes c ON c.perfil_id = p.id
      WHERE p.id = $1;
    `;
    const perfilRes = await pool.query(perfilQuery, [userId]);

    if (perfilRes.rows.length === 0) {
      return res.status(404).json({
        ok: false,
        mensaje: "Perfil no encontrado en el sistema."
      });
    }

    const perfil = perfilRes.rows[0];

    // 5. Criterio de Aceptación: Otorgar acceso con las HU correspondientes al rol[cite: 6]
    res.status(200).json({
      ok: true,
      mensaje: "Inicio de sesión exitoso.",
      session: {
        access_token: authData.session.access_token,
        usuario: {
          id: perfil.id,
          correo: perfil.correo,
          rol: perfil.rol, // Puede ser: Cliente, Guía Turístico, Recepcionista o Gerente[cite: 6]
          nombre: perfil.nombres ? `${perfil.nombres} ${perfil.apellido_paterno}` : "Empleado"
        }
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

module.exports = { login };