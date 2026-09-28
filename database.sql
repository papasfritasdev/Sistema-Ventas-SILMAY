-- =============================================================================
-- PROYECTO: SEGURIDAD INFORMÁTICA - MINA SILMAY (ESPOCH)
-- SCRIPT DE BASE DE DATOS POSTGRESQL (database.sql)
-- =============================================================================

-- 1. CREACIÓN DE ESQUEMAS
-- Se separan las tablas en esquemas lógicos para control de acceso y seguridad:
-- - operaciones: transacciones operativas del negocio (ventas de material pétreo)
-- - finanzas: gestión de egresos y costos operativos
-- - auditoria: trazabilidad de accesos, movimientos exitosos e incidentes/errores
CREATE SCHEMA IF NOT EXISTS operaciones;
CREATE SCHEMA IF NOT EXISTS finanzas;
CREATE SCHEMA IF NOT EXISTS auditoria;

-- -----------------------------------------------------------------------------
-- 2. TABLAS DEL NEGOCIO
-- -----------------------------------------------------------------------------

-- Esquema 'operaciones': Registro de ventas de materiales pétreos
-- Las restricciones CHECK garantizan que no se ingresen valores nulos, ceros o negativos
CREATE TABLE IF NOT EXISTS operaciones.ventas (
    id SERIAL PRIMARY KEY,
    material VARCHAR(50) NOT NULL,
    cantidad_m3 NUMERIC NOT NULL CHECK (cantidad_m3 > 0),
    total NUMERIC NOT NULL CHECK (total > 0),
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Esquema 'finanzas': Registro de gastos operativos de la mina (maquinaria, combustible, personal)
CREATE TABLE IF NOT EXISTS finanzas.gastos (
    id SERIAL PRIMARY KEY,
    descripcion VARCHAR(100) NOT NULL,
    monto NUMERIC NOT NULL CHECK (monto > 0),
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- -----------------------------------------------------------------------------
-- 3. TABLAS DE AUDITORÍA Y SEGURIDAD 
-- -----------------------------------------------------------------------------

-- Esquema 'auditoria' -> logs_movimientos:
-- Registra todas las transacciones exitosas generadas en el bloque TRY.
-- Incluye: usuario, fecha, hora, tipo de acción e IP del cliente (IPv4 o IPv6).
CREATE TABLE IF NOT EXISTS auditoria.logs_movimientos (
    id SERIAL PRIMARY KEY,
    usuario VARCHAR(50) NOT NULL,
    fecha DATE DEFAULT CURRENT_DATE,
    hora TIME DEFAULT CURRENT_TIME,
    accion_realizada VARCHAR(100) NOT NULL,
    ip VARCHAR(45) NOT NULL
);

-- Esquema 'auditoria' -> logs_errores:
-- Registra todos los intentos fallidos, infracciones a restricciones CHECK
-- o posibles anomalías capturadas en el bloque CATCH.
CREATE TABLE IF NOT EXISTS auditoria.logs_errores (
    id SERIAL PRIMARY KEY,
    usuario VARCHAR(50) NOT NULL,
    fecha DATE DEFAULT CURRENT_DATE,
    hora TIME DEFAULT CURRENT_TIME,
    accion_realizada VARCHAR(100) NOT NULL,
    mensaje_error TEXT NOT NULL,
    ip VARCHAR(45) NOT NULL
);

-- Comentarios explicativos sobre el esquema de auditoría
COMMENT ON TABLE auditoria.logs_movimientos IS 'Bitácora de auditoría para operaciones exitosas (Bloque TRY)';
COMMENT ON TABLE auditoria.logs_errores IS 'Bitácora de auditoría para violaciones de integridad y excepciones (Bloque CATCH)';
