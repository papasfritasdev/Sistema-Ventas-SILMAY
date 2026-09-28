// =============================================================================
// PROYECTO: SEGURIDAD INFORMÁTICA - MINA SILMAY (ESPOCH)
// SERVIDOR BACKEND (server.js)
// =============================================================================

const express = require('express');
const { Pool } = require('pg');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware para procesar cuerpos JSON y servir la carpeta estática 'public'
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// -----------------------------------------------------------------------------
// CONFIGURACIÓN DE CONEXIÓN A POSTGRESQL
// -----------------------------------------------------------------------------
const pool = new Pool({
  host: '127.0.0.1',
  user: 'postgres',
  password: 'admin123',
  database: 'mina_petreos',
  port: 5432,
});

// Comprobar estado de conexión a la base de datos de manera amigable
pool.connect((err, client, release) => {
  if (err) {
    console.warn('\n⚠️ [AVISO DE BASE DE DATOS]: No se pudo conectar a PostgreSQL.');
    console.warn('   Detalle:', err.message);
    console.warn('   Recuerda crear la base de datos "mina_petreos" y ejecutar database.sql.');
    console.warn('   Puedes configurar variables PGHOST, PGUSER, PGPASSWORD, PGDATABASE, PGPORT si usas otras credenciales.\n');
  } else {
    release();
    console.log('✅ [BASE DE DATOS]: Conexión exitosa con PostgreSQL.');
  }
});

// -----------------------------------------------------------------------------
// FUNCIÓN AUXILIAR: OBTENER IP DEL CLIENTE
// -----------------------------------------------------------------------------
// Garantiza que la IP (IPv4 o IPv6 como ::1 en localhost) no supere 45 caracteres (VARCHAR(45))
function obtenerIpCliente(req) {
  const rawIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || req.ip || '127.0.0.1';
  // Si viene con proxies encadenados, tomamos la primera
  const ipLimpia = String(rawIp).split(',')[0].trim();
  return ipLimpia.substring(0, 45);
}

// -----------------------------------------------------------------------------
// FUNCIÓN AUXILIAR: REGISTRO SEGURO DE ERRORES EN AUDITORÍA
// -----------------------------------------------------------------------------
// Envuelve el insert a auditoria.logs_errores en su propio try/catch para asegurar
// que un fallo en el log nunca congele la petición ni impida responder al frontend.
async function registrarErrorAudit(usuario, accion, mensajeError, ip) {
  try {
    await pool.query(
      `INSERT INTO auditoria.logs_errores (usuario, accion_realizada, mensaje_error, ip)
       VALUES ($1, $2, $3, $4)`,
      [usuario || 'desconocido', accion, mensajeError, ip]
    );
    console.log(`[AUDITORÍA ERROR] ${accion} registrado para IP ${ip}`);
  } catch (auditErr) {
    // Si la BD falla por completo, se muestra en consola sin tumbar el proceso
    console.error('❌ Error crítico al escribir en auditoria.logs_errores:', auditErr.message);
  }
}

// -----------------------------------------------------------------------------
// ENDPOINTS DE LA API
// -----------------------------------------------------------------------------

/**
 * POST /api/ventas
 * Registra una venta de material pétreo (Arena, Ripio, etc.)
 * Try: Inserta en operaciones.ventas y en auditoria.logs_movimientos (VENTA_REGISTRADA)
 * Catch: Captura violaciones de CHECK (cantidad_m3 <= 0 o total <= 0) y registra en auditoria.logs_errores (FALLO_VENTA)
 */
app.post('/api/ventas', async (req, res) => {
  const ip = obtenerIpCliente(req);
  const usuario = req.body.usuario || 'operador';
  const { material, cantidad_m3, total } = req.body;

  try {
    // 1. Insertar registro de venta en operaciones.ventas
    const queryVenta = `
      INSERT INTO operaciones.ventas (material, cantidad_m3, total)
      VALUES ($1, $2, $3)
      RETURNING *;
    `;
    const resultadoVenta = await pool.query(queryVenta, [material, cantidad_m3, total]);

    // 2. Registro exitoso en auditoria.logs_movimientos (Bloque TRY)
    const queryAudit = `
      INSERT INTO auditoria.logs_movimientos (usuario, accion_realizada, ip)
      VALUES ($1, 'VENTA_REGISTRADA', $2);
    `;
    await pool.query(queryAudit, [usuario, ip]);

    return res.status(201).json({
      success: true,
      mensaje: 'Venta registrada con éxito y auditada en logs_movimientos.',
      data: resultadoVenta.rows[0],
    });
  } catch (error) {
    // 3. Captura de fallo en auditoria.logs_errores (Bloque CATCH)
    await registrarErrorAudit(usuario, 'FALLO_VENTA', error.message, ip);

    return res.status(400).json({
      success: false,
      mensaje: 'No se pudo registrar la venta (restricción o error de datos). Incidente auditado en logs_errores.',
      error: error.message,
    });
  }
});

/**
 * POST /api/gastos
 * Registra un egreso de la mina (mantenimiento, combustible, herramientas)
 * Try: Inserta en finanzas.gastos y en auditoria.logs_movimientos (GASTO_REGISTRADO)
 * Catch: Captura violaciones de CHECK (monto <= 0) y registra en auditoria.logs_errores (FALLO_GASTO)
 */
app.post('/api/gastos', async (req, res) => {
  const ip = obtenerIpCliente(req);
  const usuario = req.body.usuario || 'operador';
  const { descripcion, monto } = req.body;

  try {
    // 1. Insertar registro de gasto en finanzas.gastos
    const queryGasto = `
      INSERT INTO finanzas.gastos (descripcion, monto)
      VALUES ($1, $2)
      RETURNING *;
    `;
    const resultadoGasto = await pool.query(queryGasto, [descripcion, monto]);

    // 2. Registro exitoso en auditoria.logs_movimientos (Bloque TRY)
    const queryAudit = `
      INSERT INTO auditoria.logs_movimientos (usuario, accion_realizada, ip)
      VALUES ($1, 'GASTO_REGISTRADO', $2);
    `;
    await pool.query(queryAudit, [usuario, ip]);

    return res.status(201).json({
      success: true,
      mensaje: 'Gasto registrado con éxito y auditado en logs_movimientos.',
      data: resultadoGasto.rows[0],
    });
  } catch (error) {
    // 3. Captura de fallo en auditoria.logs_errores (Bloque CATCH)
    await registrarErrorAudit(usuario, 'FALLO_GASTO', error.message, ip);

    return res.status(400).json({
      success: false,
      mensaje: 'No se pudo registrar el gasto (restricción o error de datos). Incidente auditado en logs_errores.',
      error: error.message,
    });
  }
});

/**
 * GET /api/resumen
 * Devuelve el total acumulado de ventas, gastos y saldo disponible
 */
app.get('/api/resumen', async (req, res) => {
  try {
    const ventasResult = await pool.query('SELECT COALESCE(SUM(total), 0) AS total_ventas FROM operaciones.ventas;');
    const gastosResult = await pool.query('SELECT COALESCE(SUM(monto), 0) AS total_gastos FROM finanzas.gastos;');

    const totalVentas = parseFloat(ventasResult.rows[0].total_ventas);
    const totalGastos = parseFloat(gastosResult.rows[0].total_gastos);
    const saldo = totalVentas - totalGastos;

    return res.json({
      total_ventas: totalVentas,
      total_gastos: totalGastos,
      saldo: saldo,
    });
  } catch (error) {
    return res.status(500).json({
      error: 'Error al consultar resumen financiero',
      detalle: error.message,
    });
  }
});

/**
 * GET /api/ventas
 * Devuelve el listado de todas las ventas de operaciones.ventas con fecha, hora, día, mes y año
 */
app.get('/api/ventas', async (req, res) => {
  try {
    const query = `
      SELECT id, material, cantidad_m3, total,
             TO_CHAR(COALESCE(fecha_registro, CURRENT_TIMESTAMP), 'YYYY-MM-DD') AS fecha,
             TO_CHAR(COALESCE(fecha_registro, CURRENT_TIMESTAMP), 'HH24:MI:SS') AS hora,
             EXTRACT(DAY FROM COALESCE(fecha_registro, CURRENT_TIMESTAMP))::INT AS dia,
             EXTRACT(MONTH FROM COALESCE(fecha_registro, CURRENT_TIMESTAMP))::INT AS mes,
             EXTRACT(YEAR FROM COALESCE(fecha_registro, CURRENT_TIMESTAMP))::INT AS anio
      FROM operaciones.ventas
      ORDER BY id DESC;
    `;
    const resultado = await pool.query(query);
    return res.json(resultado.rows);
  } catch (error) {
    return res.status(500).json({
      error: 'Error al consultar lista de ventas',
      detalle: error.message,
    });
  }
});

/**
 * GET /api/auditoria
 * Devuelve los registros de ambas tablas de auditoría (éxitos y errores)
 */
app.get('/api/auditoria', async (req, res) => {
  try {
    const movimientosResult = await pool.query(`
      SELECT id, usuario, TO_CHAR(fecha, 'YYYY-MM-DD') AS fecha, TO_CHAR(hora, 'HH24:MI:SS') AS hora, accion_realizada, ip
      FROM auditoria.logs_movimientos
      ORDER BY id DESC
      LIMIT 100;
    `);

    const erroresResult = await pool.query(`
      SELECT id, usuario, TO_CHAR(fecha, 'YYYY-MM-DD') AS fecha, TO_CHAR(hora, 'HH24:MI:SS') AS hora, accion_realizada, mensaje_error, ip
      FROM auditoria.logs_errores
      ORDER BY id DESC
      LIMIT 100;
    `);

    return res.json({
      movimientos: movimientosResult.rows,
      errores: erroresResult.rows,
    });
  } catch (error) {
    return res.status(500).json({
      error: 'Error al consultar tablas de auditoría',
      detalle: error.message,
    });
  }
});

// -----------------------------------------------------------------------------
// INICIO DEL SERVIDOR
// -----------------------------------------------------------------------------
app.listen(PORT, () => {
  console.log(`🚀 Servidor ejecutándose en http://localhost:${PORT}`);
  console.log(`📂 Sirviendo interfaz web desde carpeta 'public'`);
});
