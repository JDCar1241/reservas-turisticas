const pool = require("../config/db");

const crearReservaPresencial = async (req, res) => {
  const {
    salida_id,
    cliente: { dni, nombres, apellido_paterno, apellido_materno, correo, telefono },
    acompanantes = []
  } = req.body;

  // 1. Validaciones requeridas de campos obligatorios
  if (!salida_id || !dni || !nombres || !apellido_paterno || !apellido_materno || !correo || !telefono) {
    return res.status(400).json({
      ok: false,
      mensaje: "Todos los campos del cliente titular y la salida son obligatorios."
    });
  }

  const totalPersonas = 1 + acompanantes.length;
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // 2. Verificar y bloquear cupos en la salida elegida
    const querySalida = `
      SELECT id, cupos_disponibles, estado 
      FROM salidas 
      WHERE id = $1 FOR UPDATE;
    `;
    const resSalida = await client.query(querySalida, [salida_id]);

    if (resSalida.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ ok: false, mensaje: "La salida programada no existe." });
    }

    const salida = resSalida.rows[0];

    if (salida.cupos_disponibles < totalPersonas) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        ok: false,
        mensaje: `Cupos insuficientes. Disponibles: ${salida.cupos_disponibles}, solicitados: ${totalPersonas}.`
      });
    }

    // 3. Crear o actualizar cliente titular
    const queryCliente = `
      INSERT INTO clientes (dni, nombres, apellido_paterno, apellido_materno, correo, telefono)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (dni) DO UPDATE 
      SET nombres = EXCLUDED.nombres,
          apellido_paterno = EXCLUDED.apellido_paterno,
          apellido_materno = EXCLUDED.apellido_materno,
          correo = EXCLUDED.correo,
          telefono = EXCLUDED.telefono
      RETURNING id;
    `;
    const resCliente = await client.query(queryCliente, [
      dni, nombres, apellido_paterno, apellido_materno, correo, telefono
    ]);
    const clienteId = resCliente.rows[0].id;

    // --- NUEVA VALIDACIÓN: Control de Reserva Duplicada por Salida ---
    const queryVerificarReserva = `
      SELECT id FROM reservas 
      WHERE cliente_id = $1 AND salida_id = $2;
    `;
    const resVerificar = await client.query(queryVerificarReserva, [clienteId, salida_id]);

    if (resVerificar.rows.length > 0) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        ok: false,
        mensaje: "El cliente ya cuenta con una reserva registrada para esta salida programada."
      });
    }

    // 4. Generar la Reserva si no existía previa
    const queryReserva = `
      INSERT INTO reservas (cliente_id, salida_id, cantidad_personas, estado_pago, fecha_reserva)
      VALUES ($1, $2, $3, 'Pendiente', NOW())
      RETURNING id, estado_pago, fecha_reserva;
    `;
    const resReserva = await client.query(queryReserva, [clienteId, salida_id, totalPersonas]);
    const nuevaReserva = resReserva.rows[0];

    // 5. Registrar Acompañantes vinculados al UUID de la nueva reserva
    for (const acomp of acompanantes) {
      const queryAcompanante = `
        INSERT INTO acompanantes (reserva_id, dni, nombres, apellidos)
        VALUES ($1, $2, $3, $4);
      `;
      await client.query(queryAcompanante, [
        nuevaReserva.id,
        acomp.dni,
        acomp.nombres,
        acomp.apellidos
      ]);
    }

    // 6. Restar cupos en la tabla 'salidas'
    const updateCupos = `
      UPDATE salidas 
      SET cupos_disponibles = cupos_disponibles - $1
      WHERE id = $2;
    `;
    await client.query(updateCupos, [totalPersonas, salida_id]);

    await client.query("COMMIT");

    res.status(201).json({
      ok: true,
      mensaje: "Reserva presencial registrada correctamente.",
      reserva: {
        id: nuevaReserva.id,
        salida_id,
        estado_pago: nuevaReserva.estado_pago,
        cantidad_personas: totalPersonas,
        fecha_reserva: nuevaReserva.fecha_reserva
      }
    });

  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error al registrar reserva:", error.message);
    res.status(500).json({
      ok: false,
      mensaje: "Error interno en el servidor al registrar la reserva.",
      error: error.message
    });
  } finally {
    client.release();
  }
};

module.exports = { crearReservaPresencial };