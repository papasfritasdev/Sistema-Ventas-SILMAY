# Mina SILMAY — Segmentación de Base de Datos y Auditoría de Seguridad

> **Escuela Superior Politécnica de Chimborazo (ESPOCH)**  
> **Asignatura:** Seguridad Informática  
> **Tema:** Segmentación de base de datos en esquemas según módulos del software e implementación de bitácora de auditoría (Try / Catch).

---

## 🎥 Enlace al Video Demostrativo (3 a 5 minutos)

> 🔗 **Video en YouTube / Google Drive:**  
> **[PEGA_AQUÍ_EL_ENLACE_DE_TU_VIDEO]**

*(Reemplaza la línea anterior con el enlace de tu video compartido para la entrega).*

---

## 📋 Descripción del Deber

El objetivo de esta práctica es aplicar los principios de **seguridad informática** y **menor privilegio** en un sistema de información simulado para una mina de materiales pétreos (**Mina SILMAY**).

En lugar de almacenar todas las tablas en el esquema por defecto `public`, la base de datos se encuentra **segmentada en esquemas lógicos e independientes**. Adicionalmente, cuenta con un esquema dedicado de **auditoría** que registra:
1. **Operaciones legítimas y aprobadas (Bloque `Try`):** Almacenadas en `auditoria.logs_movimientos`.
2. **Excepciones, fallos e intentos de infracción (Bloque `Catch`):** Almacenadas en `auditoria.logs_errores` con el mensaje exacto de error emitido por PostgreSQL.

---

## 🗄️ Arquitectura de la Base de Datos (PostgreSQL)

La base de datos `mina_petreos` se organiza en 3 esquemas:

```
mina_petreos (Base de Datos)
│
├── 📁 operaciones (Módulo Operativo)
│   └── 📄 ventas
│       ├── id (SERIAL PRIMARY KEY)
│       ├── material (VARCHAR)
│       ├── cantidad_m3 (NUMERIC CHECK > 0)
│       ├── total (NUMERIC CHECK > 0)
│       └── fecha_registro (TIMESTAMP)
│
├── 📁 finanzas (Módulo Contable)
│   └── 📄 gastos
│       ├── id (SERIAL PRIMARY KEY)
│       ├── descripcion (VARCHAR)
│       ├── monto (NUMERIC CHECK > 0)
│       └── fecha_registro (TIMESTAMP)
│
└── 📁 auditoria (Módulo de Trazabilidad y Seguridad)
    ├── 📄 logs_movimientos  <-- Bloque TRY (Éxito)
    │   ├── id (SERIAL PRIMARY KEY)
    │   ├── usuario (VARCHAR)
    │   ├── fecha (DATE)
    │   ├── hora (TIME)
    │   ├── accion_realizada (VARCHAR)
    │   └── ip (VARCHAR(45) - IPv4/IPv6)
    │
    └── 📄 logs_errores      <-- Bloque CATCH (Fallo / Violación CHECK)
        ├── id (SERIAL PRIMARY KEY)
        ├── usuario (VARCHAR)
        ├── fecha (DATE)
        ├── hora (TIME)
        ├── accion_realizada (VARCHAR)
        ├── mensaje_error (TEXT)
        └── ip (VARCHAR(45) - IPv4/IPv6)
```

---

## 🛠️ Tecnologías Utilizadas

- **Base de Datos:** PostgreSQL con soporte de esquemas nativos y restricciones `CHECK`.
- **Backend:** Node.js con Express y el driver nativo `pg` (Pool de conexiones).
- **Frontend:** HTML5 semántico, CSS3 sin frameworks pesados y JavaScript Vanilla (`fetch`).

---

## 🚀 Instrucciones para Ejecución Local

### 1. Prerrequisitos
- Node.js (versión 18 o superior).
- PostgreSQL (pgAdmin 4 o terminal `psql`).

### 2. Configurar la Base de Datos
1. Abre pgAdmin o tu terminal `psql` y crea la base de datos:
   ```sql
   CREATE DATABASE mina_petreos;
   ```
2. Ejecuta el script [database.sql](database.sql) dentro de la base de datos `mina_petreos`.

### 3. Configurar Variables de Entorno
Crea un archivo `.env` en la raíz del proyecto tomando como guía [.env.example](.env.example):
```env
PGHOST=localhost
PGUSER=postgres
PGPASSWORD=tu_contraseña
PGDATABASE=mina_petreos
PGPORT=5432
PORT=3000
```

### 4. Instalar Dependencias y Arrancar el Servidor
```bash
npm install
npm start
```

### 5. Acceder a la Aplicación
Abre tu navegador en:
```
http://localhost:3000
```

---

## 🧪 Casos de Prueba para la Demostración

1. **Prueba de Éxito (Bloque Try):**
   - Ve a la pestaña **1. Registrar Venta**, ingresa un material (ej. *Ripio*), cantidad `15` y total `180`.
   - Presiona **Guardar Venta**.
   - En la pestaña **4. Bitácora de Auditoría**, constata que la transacción se registró en la tabla verde (`auditoria.logs_movimientos`) con usuario, fecha, hora, acción e IP.

2. **Prueba de Error / Violación de Integridad (Bloque Catch):**
   - En la pestaña **1. Registrar Venta**, presiona el botón **Simular Error (m³ Negativo)** (ingresa `-10`).
   - Presiona **Guardar Venta**.
   - La restricción `CHECK (cantidad_m3 > 0)` rechazará la inserción.
   - En la pestaña **4. Bitácora de Auditoría**, constata que el incidente se capturó en la tabla roja (`auditoria.logs_errores`) con el mensaje exacto de PostgreSQL.

3. **Verificación Directa en PostgreSQL:**
   ```sql
   SELECT * FROM operaciones.ventas;
   SELECT * FROM auditoria.logs_movimientos;
   SELECT * FROM auditoria.logs_errores;
   ```
