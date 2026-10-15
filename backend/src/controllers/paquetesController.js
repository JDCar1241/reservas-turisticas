const pool = require("../config/db");

const obtenerPaquetesConSalidas = async (req, res) => {
  try {
    const query = `
      SELECT 
        p.id AS paquete_id,
        p.codigo,
        p.nombre,
        p.foto_url,
        p.costo,
        p.capacidad_maxima,
        p.itinerario,
        p.aclaraciones,
        s.id AS salida_id,
        s.tipo_salida,
        s.fecha_inicio_viaje,
        s.fecha_finalizacion,
        s.cupos_disponibles
      FROM paquetes p
      INNER JOIN salidas s ON s.paquete_id = p.id
      WHERE s.cupos_disponibles > 0 
        AND s.estado = 'Activa' -- <-- Cambiar a 'Activa' para coincidir con el CHECK constraint
      ORDER BY p.costo ASC, s.fecha_inicio_viaje ASC;
    `;

    const resultado = await pool.query(query);

    res.status(200).json({
      ok: true,
      paquetesConSalidas: resultado.rows
    });
  } catch (error) {
    console.error("Error al obtener catálogo:", error.message);
    res.status(500).json({
      ok: false,
      mensaje: "Error interno al consultar paquetes turísticos"
    });
  }
};

module.exports = { obtenerPaquetesConSalidas };