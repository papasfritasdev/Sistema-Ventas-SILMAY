// =============================================================================
// PROYECTO: SEGURIDAD INFORMÁTICA - MINA SILMAY
// LÓGICA DEL CLIENTE (app.js)
// =============================================================================

document.addEventListener('DOMContentLoaded', () => {

  // ---------------------------------------------------------------------------
  // 1. MANEJO DE PESTAÑAS (TABS)
  // ---------------------------------------------------------------------------
  const tabButtons = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');

  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      tabButtons.forEach(b => b.classList.remove('active'));
      tabContents.forEach(c => c.classList.remove('active'));

      btn.classList.add('active');
      const targetId = btn.getAttribute('data-tab');
      const targetContent = document.getElementById(targetId);
      if (targetContent) {
        targetContent.classList.add('active');
      }

      if (targetId === 'tab-resumen') {
        cargarResumen();
        cargarVentas();
      } else if (targetId === 'tab-auditoria') {
        cargarAuditoria();
      }
    });
  });

  // ---------------------------------------------------------------------------
  // 2. FUNCIÓN PARA MOSTRAR MENSAJES DE ALERTA
  // ---------------------------------------------------------------------------
  const alertaBox = document.getElementById('alerta-box');

  function mostrarAlerta(mensaje, esExito = true) {
    alertaBox.textContent = mensaje;
    alertaBox.className = `alerta ${esExito ? 'alerta-exito' : 'alerta-error'}`;
    alertaBox.style.display = 'block';

    setTimeout(() => {
      alertaBox.style.display = 'none';
    }, 6000);
  }

  // ---------------------------------------------------------------------------
  // 3. ENVÍO DE FORMULARIO DE VENTAS (POST /api/ventas)
  // ---------------------------------------------------------------------------
  const formVenta = document.getElementById('form-venta');
  const usuarioActivoSelect = document.getElementById('usuario-activo');

  formVenta.addEventListener('submit', async (e) => {
    e.preventDefault();

    const usuario = usuarioActivoSelect.value;
    const material = document.getElementById('venta-material').value;
    const cantidad_m3 = parseFloat(document.getElementById('venta-cantidad').value);
    const total = parseFloat(document.getElementById('venta-total').value);

    try {
      const response = await fetch('/api/ventas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuario, material, cantidad_m3, total })
      });

      const data = await response.json();

      if (response.ok) {
        mostrarAlerta(`Venta registrada con éxito (ID: ${data.data.id}) y auditada en logs_movimientos.`, true);
        formVenta.reset();
        cargarResumen();
        cargarVentas();
      } else {
        mostrarAlerta(`${data.mensaje} | Detalle: ${data.error}`, false);
      }
    } catch (err) {
      mostrarAlerta(`Error de conexión al registrar venta: ${err.message}`, false);
    }
  });

  // Botón para simular error rápido (valor negativo) en Ventas
  const btnDemoErrorVenta = document.getElementById('btn-demo-error-venta');
  if (btnDemoErrorVenta) {
    btnDemoErrorVenta.addEventListener('click', () => {
      document.getElementById('venta-material').value = 'Arena';
      document.getElementById('venta-cantidad').value = '-10.00';
      document.getElementById('venta-total').value = '100.00';
      formVenta.requestSubmit();
    });
  }

  // ---------------------------------------------------------------------------
  // 4. ENVÍO DE FORMULARIO DE GASTOS (POST /api/gastos)
  // ---------------------------------------------------------------------------
  const formGasto = document.getElementById('form-gasto');

  formGasto.addEventListener('submit', async (e) => {
    e.preventDefault();

    const usuario = usuarioActivoSelect.value;
    const descripcion = document.getElementById('gasto-descripcion').value;
    const monto = parseFloat(document.getElementById('gasto-monto').value);

    try {
      const response = await fetch('/api/gastos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuario, descripcion, monto })
      });

      const data = await response.json();

      if (response.ok) {
        mostrarAlerta(`Gasto registrado con éxito (ID: ${data.data.id}) y auditado en logs_movimientos.`, true);
        formGasto.reset();
        cargarResumen();
      } else {
        mostrarAlerta(`${data.mensaje} | Detalle: ${data.error}`, false);
      }
    } catch (err) {
      mostrarAlerta(`Error de conexión al registrar gasto: ${err.message}`, false);
    }
  });

  // Botón para simular error rápido (monto negativo) en Gastos
  const btnDemoErrorGasto = document.getElementById('btn-demo-error-gasto');
  if (btnDemoErrorGasto) {
    btnDemoErrorGasto.addEventListener('click', () => {
      document.getElementById('gasto-descripcion').value = 'Combustible (Prueba CHECK)';
      document.getElementById('gasto-monto').value = '-50.00';
      formGasto.requestSubmit();
    });
  }

  // ---------------------------------------------------------------------------
  // 5. CARGA DE RESUMEN FINANCIERO (GET /api/resumen)
  // ---------------------------------------------------------------------------
  const elVentas = document.getElementById('resumen-ventas');
  const elGastos = document.getElementById('resumen-gastos');
  const elSaldo = document.getElementById('resumen-saldo');
  const btnRecargarResumen = document.getElementById('btn-recargar-resumen');

  async function cargarResumen() {
    try {
      const res = await fetch('/api/resumen');
      if (!res.ok) {
        console.error('El servidor respondió con error al consultar resumen:', res.status);
        return;
      }
      const data = await res.json();

      elVentas.textContent = `$${Number(data.total_ventas).toFixed(2)}`;
      elGastos.textContent = `$${Number(data.total_gastos).toFixed(2)}`;
      elSaldo.textContent = `$${Number(data.saldo).toFixed(2)}`;

      if (data.saldo < 0) {
        elSaldo.style.color = 'red';
        elSaldo.parentElement.style.borderColor = 'red';
      } else {
        elSaldo.style.color = 'blue';
        elSaldo.parentElement.style.borderColor = 'blue';
      }
    } catch (err) {
      console.error('Error al consultar resumen:', err.message);
    }
  }

  if (btnRecargarResumen) {
    btnRecargarResumen.addEventListener('click', cargarResumen);
  }

  // ---------------------------------------------------------------------------
  // 5.1 HISTORIAL DE VENTAS Y FILTROS POR DÍA, MES Y AÑO (GET /api/ventas)
  // ---------------------------------------------------------------------------
  let listaVentas = [];
  const tbodyVentas = document.getElementById('tbody-ventas');
  const filtroAnio = document.getElementById('filtro-anio');
  const filtroMes = document.getElementById('filtro-mes');
  const filtroDia = document.getElementById('filtro-dia');
  const btnLimpiarFiltros = document.getElementById('btn-limpiar-filtros');
  const btnRecargarVentas = document.getElementById('btn-recargar-ventas');

  function inicializarDias() {
    if (!filtroDia) return;
    filtroDia.innerHTML = '<option value="">Todos</option>';
    for (let d = 1; d <= 31; d++) {
      const opt = document.createElement('option');
      opt.value = d;
      opt.textContent = d;
      filtroDia.appendChild(opt);
    }
  }
  inicializarDias();

  function actualizarOpcionesAnios(ventas) {
    if (!filtroAnio) return;
    const aniosSet = new Set();
    const anioActual = new Date().getFullYear();
    aniosSet.add(anioActual);
    ventas.forEach(v => {
      if (v.anio) aniosSet.add(v.anio);
    });

    const valorSeleccionado = filtroAnio.value;
    filtroAnio.innerHTML = '<option value="">Todos</option>';
    Array.from(aniosSet).sort((a, b) => b - a).forEach(a => {
      const opt = document.createElement('option');
      opt.value = a;
      opt.textContent = a;
      filtroAnio.appendChild(opt);
    });
    filtroAnio.value = valorSeleccionado;
  }

  function renderizarVentas() {
    if (!tbodyVentas) return;

    const anioVal = filtroAnio.value;
    const mesVal = filtroMes.value;
    const diaVal = filtroDia.value;

    const ventasFiltradas = listaVentas.filter(v => {
      if (anioVal && String(v.anio) !== String(anioVal)) return false;
      if (mesVal && String(v.mes) !== String(mesVal)) return false;
      if (diaVal && String(v.dia) !== String(diaVal)) return false;
      return true;
    });

    if (ventasFiltradas.length === 0) {
      tbodyVentas.innerHTML = '<tr><td colspan="6" class="text-center">No hay ventas registradas con el filtro seleccionado.</td></tr>';
      return;
    }

    tbodyVentas.innerHTML = ventasFiltradas.map(v => `
      <tr>
        <td><strong>#${v.id}</strong></td>
        <td>${escapeHtml(v.material)}</td>
        <td>${Number(v.cantidad_m3).toFixed(2)}</td>
        <td>$${Number(v.total).toFixed(2)}</td>
        <td>${v.fecha}</td>
        <td>${v.hora}</td>
      </tr>
    `).join('');
  }

  async function cargarVentas() {
    try {
      const res = await fetch('/api/ventas');
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(res.status === 404 
          ? 'Ruta no encontrada (404). Debes reiniciar el servidor en tu terminal (Ctrl+C y npm start).'
          : `Error del servidor (${res.status}): ${errorText}`);
      }
      const data = await res.json();
      listaVentas = Array.isArray(data) ? data : [];
      actualizarOpcionesAnios(listaVentas);
      renderizarVentas();
    } catch (err) {
      console.error('Error de conexión al cargar ventas:', err.message);
      if (tbodyVentas) {
        tbodyVentas.innerHTML = `<tr><td colspan="6" class="text-center" style="color: red;">${escapeHtml(err.message)}</td></tr>`;
      }
    }
  }

  if (filtroAnio) filtroAnio.addEventListener('change', renderizarVentas);
  if (filtroMes) filtroMes.addEventListener('change', renderizarVentas);
  if (filtroDia) filtroDia.addEventListener('change', renderizarVentas);

  if (btnLimpiarFiltros) {
    btnLimpiarFiltros.addEventListener('click', () => {
      filtroAnio.value = '';
      filtroMes.value = '';
      filtroDia.value = '';
      renderizarVentas();
    });
  }

  if (btnRecargarVentas) {
    btnRecargarVentas.addEventListener('click', cargarVentas);
  }

  // ---------------------------------------------------------------------------
  // 6. CARGA DE TABLAS DE AUDITORÍA (GET /api/auditoria)
  // ---------------------------------------------------------------------------
  const tbodyMovimientos = document.getElementById('tbody-movimientos');
  const tbodyErrores = document.getElementById('tbody-errores');
  const btnRecargarAuditoria = document.getElementById('btn-recargar-auditoria');

  async function cargarAuditoria() {
    try {
      const res = await fetch('/api/auditoria');
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Error al obtener datos');
      }

      // Tabla de Movimientos Exitosos (TRY)
      if (!data.movimientos || data.movimientos.length === 0) {
        tbodyMovimientos.innerHTML = '<tr><td colspan="6" class="text-center">No hay registros de movimientos exitosos aún.</td></tr>';
      } else {
        tbodyMovimientos.innerHTML = data.movimientos.map(m => `
          <tr>
            <td><strong>#${m.id}</strong></td>
            <td>${escapeHtml(m.usuario)}</td>
            <td>${m.fecha}</td>
            <td>${m.hora}</td>
            <td style="color: green; font-weight: bold;">${escapeHtml(m.accion_realizada)}</td>
            <td>${escapeHtml(m.ip)}</td>
          </tr>
        `).join('');
      }

      // Tabla de Errores e Incidentes (CATCH)
      if (!data.errores || data.errores.length === 0) {
        tbodyErrores.innerHTML = '<tr><td colspan="7" class="text-center">No hay incidentes o errores registrados aún.</td></tr>';
      } else {
        tbodyErrores.innerHTML = data.errores.map(e => `
          <tr>
            <td><strong>#${e.id}</strong></td>
            <td>${escapeHtml(e.usuario)}</td>
            <td>${e.fecha}</td>
            <td>${e.hora}</td>
            <td style="color: red; font-weight: bold;">${escapeHtml(e.accion_realizada)}</td>
            <td style="color: red;">${escapeHtml(e.mensaje_error)}</td>
            <td>${escapeHtml(e.ip)}</td>
          </tr>
        `).join('');
      }

    } catch (err) {
      tbodyMovimientos.innerHTML = `<tr><td colspan="6" class="text-center" style="color: red;">Error al cargar datos: ${err.message}</td></tr>`;
      tbodyErrores.innerHTML = `<tr><td colspan="7" class="text-center" style="color: red;">Error al cargar datos: ${err.message}</td></tr>`;
    }
  }

  if (btnRecargarAuditoria) {
    btnRecargarAuditoria.addEventListener('click', cargarAuditoria);
  }

  function escapeHtml(texto) {
    if (!texto) return '';
    return String(texto)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  cargarResumen();
  cargarVentas();
});
