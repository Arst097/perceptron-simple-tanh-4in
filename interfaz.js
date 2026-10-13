/**
 * interfaz.js
 * Clase principal de la UI. Maneja botones, tabla, paneles y
 * cajas de prueba. No hace cálculos: delega en Entrenador y dibuja.
 */

/* ── Pausa entre pasos automáticos (ms) ─────────────────────── */
const PAUSA_MS = 600;

/* ── Precisión de visualización ─────────────────────────────── */
/**
 * Formatea un número con alta precisión.
 * Usa notación científica si el valor absoluto es < 1e-4 y ≠ 0.
 */
function fmt(n) {
  if (n === null || n === undefined) return '—';
  if (!isFinite(n)) return String(n);
  const abs = Math.abs(n);
  if (abs !== 0 && abs < 1e-4) return n.toExponential(6);
  return parseFloat(n.toPrecision(10)).toString();
}

/** Convierte la cadena de una caja de prueba a número (acepta coma o punto) */
function parsearEntrada(str) {
  const val = Number(str.trim().replace(',', '.'));
  return isNaN(val) ? NaN : val;
}

class Interfaz {
  constructor() {
    /* ── Referencias al DOM ───────────────────────────────────── */
    this.btnGenerar       = document.getElementById('btn-generar');
    this.btnEntrenar      = document.getElementById('btn-entrenar');
    this.btnPausar        = document.getElementById('btn-pausar');
    this.btnPaso          = document.getElementById('btn-paso');
    this.btnReentrenar    = document.getElementById('btn-reentrenar');

    this.panelAleatorios  = document.getElementById('panel-aleatorios');
    this.panelPasos       = document.getElementById('panel-pasos');
    this.panelResultado   = document.getElementById('panel-resultado');
    this.panelPrueba      = document.getElementById('panel-prueba');

    this.cuerpoTabla      = document.getElementById('cuerpo-tabla');

    /* Colapsable del panel de entrenamiento */
    this.btnColapsarPasos        = document.getElementById('btn-colapsar-pasos');
    this.cuerpoEntrenamiento     = document.getElementById('cuerpo-entrenamiento');
    this.bannerEstadoEntrenamiento = document.getElementById('banner-estado-entrenamiento');
    this.iconoColapso            = document.getElementById('icono-colapso');

    /* Prueba */
    this.btnProbar        = document.getElementById('btn-probar');
    this.btnLimpiarPrueba = document.getElementById('btn-limpiar-prueba');
    this.cajasEntrada     = [
      document.getElementById('inp-x1'),
      document.getElementById('inp-x2'),
      document.getElementById('inp-x3'),
      document.getElementById('inp-x4')
    ];
    this.divResultadoPrueba = document.getElementById('resultado-prueba');

    /* ── Estado interno ───────────────────────────────────────── */
    this.entrenador     = new Entrenador();
    this.corriendo      = false;
    this.pausado        = false;
    this.timerId        = null;
    this.pesosInicialesMostrados = null;
    this.etaInicial     = null;
    this._panelColapsado = false;

    /* ── Bind de eventos ─────────────────────────────────────── */
    this.btnGenerar.addEventListener('click',       () => this._accionGenerar());
    this.btnEntrenar.addEventListener('click',      () => this._accionEntrenar());
    this.btnPausar.addEventListener('click',        () => this._accionPausar());
    this.btnPaso.addEventListener('click',          () => this._accionPaso());
    this.btnReentrenar.addEventListener('click',    () => this._accionReentrenar());
    this.btnProbar.addEventListener('click',        () => this._accionProbar());
    this.btnLimpiarPrueba.addEventListener('click', () => this._accionLimpiarPrueba());
    this.btnColapsarPasos.addEventListener('click', () => this._toggleColapso());

    /* ── Estado inicial ──────────────────────────────────────── */
    this._resetearBotones();
    this._dibujarTabla();
  }

  /* ════════════════════════════════════════════════════════════
     ACCIONES DE BOTONES
     ════════════════════════════════════════════════════════════ */

  _accionGenerar() {
    this._detenerTimer();
    this.entrenador.neurona.inicializarAleatorio();
    this.entrenador.reiniciar();
    this.pesosInicialesMostrados = this.entrenador.neurona.copiarPesos();
    this.etaInicial = this.entrenador.neurona.eta;

    // Mostrar aleatorios en col-derecha
    this._mostrarAleatorios();

    // Limpiar centro
    this._expandirPasos();           // asegurarse de que el panel esté abierto
    this._limpiarPanelPasos();
    this._limpiarPanelResultado();
    this._ocultarPrueba();
    this._ocultarBannerEntrenamiento();
    this._dibujarTabla();

    this.btnEntrenar.disabled   = false;
    this.btnReentrenar.disabled = false;
    this.btnPausar.disabled     = true;
    this.btnPaso.disabled       = false;
    this.corriendo = false;
    this.pausado   = false;
  }

  _accionEntrenar() {
    if (this.entrenador.terminado) return;
    this.corriendo = true;
    this.pausado   = false;
    this.btnEntrenar.disabled = true;
    this.btnPausar.disabled   = false;
    this.btnPaso.disabled     = true;
    this._ejecutarAutomatico();
  }

  _accionPausar() {
    if (!this.corriendo) return;
    if (!this.pausado) {
      this.pausado = true;
      this._detenerTimer();
      this.btnPausar.textContent = 'Continuar';
      this.btnPaso.disabled      = false;
    } else {
      this.pausado = false;
      this.btnPausar.textContent = 'Pausar';
      this.btnPaso.disabled      = true;
      this._ejecutarAutomatico();
    }
  }

  _accionPaso() {
    if (this.entrenador.terminado) return;
    this._detenerTimer();
    this._ejecutarPaso();
  }

  _accionReentrenar() {
    this._detenerTimer();
    this._accionGenerar();
  }

  _accionProbar() {
    const valores = this.cajasEntrada.map(c => parsearEntrada(c.value));
    for (let i = 0; i < valores.length; i++) {
      if (isNaN(valores[i])) {
        this._mostrarResultadoPrueba(
          `<span class="error-msg">Error: la caja X${i + 1} está vacía o tiene un valor inválido.</span>`
        );
        return;
      }
    }

    const neurona = this.entrenador.neurona;
    const net = neurona.sumatoria(valores);
    const y   = neurona.activacion(net);
    const Y   = y >= 0 ? 1 : -1;

    const sonBipolares = valores.every(v => v === 1 || v === -1);
    let esperadaHTML = '';
    if (sonBipolares) {
      const fila = TABLA_VERDAD.find(
        f => f[0] === valores[0] && f[1] === valores[1]
          && f[2] === valores[2] && f[3] === valores[3]
      );
      if (fila) {
        const dEsp = fila[4];
        const ok   = Y === dEsp;
        esperadaHTML = `
          <tr><td>Y esperada (tabla)</td><td>${dEsp}</td></tr>
          <tr><td>¿Coincide con Y obtenida?</td>
              <td class="${ok ? 'ok' : 'error-val'}">${ok ? 'Sí ✔' : 'No ✘'}</td></tr>`;
      }
    }

    const region = Y === 1 ? 'Región positiva (Y = 1)' : 'Región negativa (Y = -1)';

    // Resultado esperado según el signo de cada entrada (igual que la tabla de verdad)
    // La función es: Y = X1 AND (X2 OR X3 OR X4)
    // En bipolar: positivo = verdadero, negativo = falso
    // Solo aplica si ninguna entrada es exactamente 0
    const hayAlgunCero = valores.some(v => v === 0);
    let notaCasoBorde = '';

    if (!hayAlgunCero) {
      const s = valores.map(v => v > 0 ? 1 : -1); // signos como ±1
      // Buscar en la tabla la fila con esos signos
      const filaEsperada = TABLA_VERDAD.find(
        f => f[0] === s[0] && f[1] === s[1] && f[2] === s[2] && f[3] === s[3]
      );
      if (filaEsperada) {
        const dEsperado = filaEsperada[4];
        const concuerda = Y === dEsperado;
        if (!concuerda) {
          notaCasoBorde = `<p class="nota-caso-borde">
            ℹ️ Por el signo de las entradas la tabla de verdad
            esperaría <strong>Y = ${dEsperado}</strong>, pero el perceptrón obtuvo
            <strong>Y = ${Y}</strong>. El bias aprendido
            (<strong>b = ${fmt(neurona.b)}</strong>) domina la sumatoria con estas
            magnitudes y arrastra la salida a la otra región.
            Esto es matemáticamente correcto dado el entrenamiento — prueba con
            entradas más cercanas a ±1 para ver la clasificación esperada.
          </p>`;
        }
      }
    }

    this._mostrarResultadoPrueba(`
      ${notaCasoBorde}
      <table class="tabla-prueba-resultado">
        <tr><th>Concepto</th><th>Valor</th></tr>
        <tr><td>Entradas (X1, X2, X3, X4)</td><td>${valores.map(fmt).join(', ')}</td></tr>
        <tr><td>net = sumatoria</td><td>${fmt(net)}</td></tr>
        <tr><td>y = tanh(net)</td><td>${fmt(y)}</td></tr>
        <tr><td>Y (función a trozos)</td><td><strong>${Y}</strong></td></tr>
        <tr><td>Clasificación</td><td>${region}</td></tr>
        ${esperadaHTML}
      </table>`);
  }

  _accionLimpiarPrueba() {
    this.cajasEntrada.forEach(c => c.value = '');
    this._mostrarResultadoPrueba('');
  }

  /* ════════════════════════════════════════════════════════════
     LÓGICA DE EJECUCIÓN
     ════════════════════════════════════════════════════════════ */

  _ejecutarAutomatico() {
    if (this.pausado || !this.corriendo) return;
    this._ejecutarPaso();
    if (!this.entrenador.terminado && !this.pausado) {
      this.timerId = setTimeout(() => this._ejecutarAutomatico(), PAUSA_MS);
    }
  }

  _ejecutarPaso() {
    const resultado = this.entrenador.darUnPaso();
    this._dibujarPaso(resultado);
    this._resaltarTabla(resultado);

    if (resultado.estado === 'convergio' || resultado.estado === 'sinConvergencia') {
      this._finalizarEntrenamiento(resultado);
    }
  }

  _detenerTimer() {
    if (this.timerId !== null) { clearTimeout(this.timerId); this.timerId = null; }
  }

  /* ════════════════════════════════════════════════════════════
     COLAPSO DEL PANEL DE ENTRENAMIENTO
     ════════════════════════════════════════════════════════════ */

  _toggleColapso() {
    if (this._panelColapsado) {
      this._expandirPasos();
    } else {
      this._colapsarPasos();
    }
  }

  _colapsarPasos() {
    this._panelColapsado = true;
    this.cuerpoEntrenamiento.classList.add('colapsado');
    this.iconoColapso.style.transform = 'rotate(180deg)';
  }

  _expandirPasos() {
    this._panelColapsado = false;
    this.cuerpoEntrenamiento.classList.remove('colapsado');
    this.iconoColapso.style.transform = 'rotate(0deg)';
  }

  /** Muestra el banner de resumen de una línea dentro de la cabecera del panel */
  _mostrarBannerEntrenamiento(texto, tipo) {
    this.bannerEstadoEntrenamiento.textContent = texto;
    this.bannerEstadoEntrenamiento.className   = tipo; // 'convergio' | 'sin-conv' | 'en-curso'
    this.bannerEstadoEntrenamiento.classList.remove('oculto');
  }

  _ocultarBannerEntrenamiento() {
    this.bannerEstadoEntrenamiento.classList.add('oculto');
    this.bannerEstadoEntrenamiento.className = 'oculto';
  }

  /* ════════════════════════════════════════════════════════════
     DIBUJO DE PASOS
     ════════════════════════════════════════════════════════════ */

  _dibujarPaso(r) {
    if (r.estado === 'yaTerminado') return;

    const p = r.pesosAntes;
    const x = r.x;

    /* Paso 1 */
    const html1 = `
      <div class="bloque-paso">
        <h4>Paso 1 — Entradas de la fila ${r.indiceFila + 1} y pesos vigentes</h4>
        <table class="tabla-paso">
          <tr><th></th><th>X1</th><th>X2</th><th>X3</th><th>X4</th><th>b</th></tr>
          <tr>
            <td>Entradas</td>
            <td>${x[0]}</td><td>${x[1]}</td><td>${x[2]}</td><td>${x[3]}</td><td>—</td>
          </tr>
          <tr>
            <td>Pesos</td>
            <td>${fmt(p.w1)}</td><td>${fmt(p.w2)}</td>
            <td>${fmt(p.w3)}</td><td>${fmt(p.w4)}</td><td>${fmt(p.b)}</td>
          </tr>
        </table>
      </div>`;

    /* Paso 2 */
    const ec = `net = (${fmt(p.w1)})·(${x[0]}) + (${fmt(p.w2)})·(${x[1]}) `
             + `+ (${fmt(p.w3)})·(${x[2]}) + (${fmt(p.w4)})·(${x[3]}) + (${fmt(p.b)})`;
    const html2 = `
      <div class="bloque-paso">
        <h4>Paso 2 — Sumatoria</h4>
        <p class="ecuacion">${ec}</p>
        <p class="ecuacion resultado">net = <strong>${fmt(r.net)}</strong></p>
      </div>`;

    /* Paso 3 */
    const signoY = r.Y >= 0 ? '≥ 0' : '< 0';
    const html3 = `
      <div class="bloque-paso">
        <h4>Paso 3 — Activación (tanh) y función a trozos</h4>
        <p class="ecuacion">y = tanh(${fmt(r.net)}) = <strong>${fmt(r.y)}</strong></p>
        <p class="ecuacion">y = ${fmt(r.y)} ${signoY}  →  <strong>Y = ${r.Y}</strong></p>
      </div>`;

    /* Paso 4 */
    const claseErr = r.error !== 0 ? 'error-val' : 'ok';
    const html4 = `
      <div class="bloque-paso">
        <h4>Paso 4 — Error</h4>
        <table class="tabla-paso">
          <tr><th>d (deseada)</th><th>Y (obtenida)</th><th>error = d − Y</th></tr>
          <tr>
            <td>${r.d}</td><td>${r.Y}</td>
            <td class="${claseErr}"><strong>${r.error}</strong></td>
          </tr>
        </table>
      </div>`;

    /* Paso 5 */
    let html5 = '';
    if (r.error !== 0 && r.pesosDespues) {
      const dp  = r.pesosDespues;
      const eta = fmt(r.eta);
      const e   = r.error;
      html5 = `
        <div class="bloque-paso correccion">
          <h4>Paso 5 — Reajuste de pesos (error ≠ 0)</h4>
          <table class="tabla-paso">
            <tr><th>Peso</th><th>Ecuación</th><th>Valor nuevo</th></tr>
            <tr><td>w1</td><td>w1 = ${fmt(p.w1)} + ${eta}·(${e})·(${x[0]})</td><td>${fmt(dp.w1)}</td></tr>
            <tr><td>w2</td><td>w2 = ${fmt(p.w2)} + ${eta}·(${e})·(${x[1]})</td><td>${fmt(dp.w2)}</td></tr>
            <tr><td>w3</td><td>w3 = ${fmt(p.w3)} + ${eta}·(${e})·(${x[2]})</td><td>${fmt(dp.w3)}</td></tr>
            <tr><td>w4</td><td>w4 = ${fmt(p.w4)} + ${eta}·(${e})·(${x[3]})</td><td>${fmt(dp.w4)}</td></tr>
            <tr><td>b</td><td>b = ${fmt(p.b)} + ${eta}·(${e})</td><td>${fmt(dp.b)}</td></tr>
          </table>
          <p class="aviso-nueva-iteracion">⟳ Se inicia la iteración ${r.iteracion + 1} desde la fila 1.</p>
        </div>`;
    } else if (r.estado === 'continua') {
      html5 = `<div class="bloque-paso ok-paso"><p>✔ Error = 0 — se avanza a la fila ${r.filaActual + 1}.</p></div>`;
    }

    let estadoBanner = '';
    if (r.estado === 'convergio') {
      estadoBanner = `<div class="banner convergio">✔ ¡Convergió! Todas las filas superadas sin error.</div>`;
    } else if (r.estado === 'sinConvergencia') {
      estadoBanner = `<div class="banner sin-conv">✘ No convergió en ${TOPE_ITERACIONES} iteraciones.</div>`;
    }

    const titulo = `<h3 class="titulo-iteracion">Iteración ${r.iteracionEnCurso} — Fila ${r.indiceFila + 1}</h3>`;

    const bloque = document.createElement('div');
    bloque.className = 'bloque-iteracion';
    bloque.innerHTML = estadoBanner + titulo + html1 + html2 + html3 + html4 + html5;
    this.panelPasos.prepend(bloque);
  }

  /* ════════════════════════════════════════════════════════════
     TABLA DE VERDAD
     ════════════════════════════════════════════════════════════ */

  _dibujarTabla(indiceFila = -1, filasOk = 0, indiceError = -1) {
    let html = '';
    for (let i = 0; i < TABLA_VERDAD.length; i++) {
      const f = TABLA_VERDAD[i];
      let clase = '';
      if (i === indiceError)     clase = 'fila-error';
      else if (i === indiceFila) clase = 'fila-actual';
      else if (i < filasOk)      clase = 'fila-ok';
      html += `<tr class="${clase}">
        <td>${f[0]}</td><td>${f[1]}</td><td>${f[2]}</td><td>${f[3]}</td><td>${f[4]}</td>
      </tr>`;
    }
    this.cuerpoTabla.innerHTML = html;
  }

  _resaltarTabla(r) {
    const indiceError = r.error !== 0 ? r.indiceFila : -1;
    this._dibujarTabla(r.indiceFila, r.filasOk, indiceError);
  }

  /* ════════════════════════════════════════════════════════════
     PANEL DE VALORES ALEATORIOS (col derecha)
     ════════════════════════════════════════════════════════════ */

  _mostrarAleatorios() {
    const n = this.entrenador.neurona;
    this.panelAleatorios.innerHTML = `
      <h3>Valores iniciales</h3>
      <table class="tabla-paso">
        <tr><th>Param.</th><th>Valor</th></tr>
        <tr><td>w1</td><td>${fmt(n.w1)}</td></tr>
        <tr><td>w2</td><td>${fmt(n.w2)}</td></tr>
        <tr><td>w3</td><td>${fmt(n.w3)}</td></tr>
        <tr><td>w4</td><td>${fmt(n.w4)}</td></tr>
        <tr><td>b</td><td>${fmt(n.b)}</td></tr>
        <tr><td>η</td><td>${fmt(n.eta)}</td></tr>
      </table>`;
    this.panelAleatorios.classList.remove('oculto');
  }

  /* ════════════════════════════════════════════════════════════
     PANEL DE RESULTADO (col centro, debajo del entrenamiento)
     ════════════════════════════════════════════════════════════ */

  _finalizarEntrenamiento(r) {
    this._detenerTimer();
    this.corriendo = false;
    this.btnEntrenar.disabled  = true;
    this.btnPausar.disabled    = true;
    this.btnPaso.disabled      = true;
    this.btnPausar.textContent = 'Pausar';

    const convergio = r.estado === 'convergio';

    /* Colapsar el panel de pasos y mostrar banner de una línea */
    this._colapsarPasos();
    if (convergio) {
      this._mostrarBannerEntrenamiento(
        `✔ Convergió en ${this.entrenador.iteracion} corrección(es). Haz clic para ver el detalle.`,
        'convergio'
      );
    } else {
      this._mostrarBannerEntrenamiento(
        `✘ No convergió en ${TOPE_ITERACIONES} iteraciones. Haz clic para ver el detalle.`,
        'sin-conv'
      );
    }

    const n   = this.entrenador.neurona;
    const ini = this.pesosInicialesMostrados;
    const ultimoErr = this.entrenador.ultimoError !== null
      ? this.entrenador.ultimoError
      : 'ninguno (los pesos iniciales ya clasificaban bien)';

    const tituloH3 = convergio
      ? `<h3 class="convergio">✔ Convergencia alcanzada</h3>`
      : `<h3 class="sin-conv">✘ No convergió en ${TOPE_ITERACIONES} iteraciones</h3>`;

    const nota = convergio
      ? `<p class="nota">La última iteración recorrió las 16 filas sin ningún error.</p>`
      : '';

    /* Dos tablas de pesos en horizontal */
    const tablaIni = `
      <div class="bloque-tabla">
        <h4>Pesos iniciales aleatorios</h4>
        <table class="tabla-paso">
          <tr><th>Param.</th><th>Valor</th></tr>
          <tr><td>w1</td><td>${fmt(ini.w1)}</td></tr>
          <tr><td>w2</td><td>${fmt(ini.w2)}</td></tr>
          <tr><td>w3</td><td>${fmt(ini.w3)}</td></tr>
          <tr><td>w4</td><td>${fmt(ini.w4)}</td></tr>
          <tr><td>b</td><td>${fmt(ini.b)}</td></tr>
          <tr><td>η</td><td>${fmt(this.etaInicial)}</td></tr>
        </table>
      </div>`;

    const tablaFin = `
      <div class="bloque-tabla">
        <h4>Pesos finales obtenidos</h4>
        <table class="tabla-paso">
          <tr><th>Param.</th><th>Valor</th></tr>
          <tr><td>w1</td><td>${fmt(n.w1)}</td></tr>
          <tr><td>w2</td><td>${fmt(n.w2)}</td></tr>
          <tr><td>w3</td><td>${fmt(n.w3)}</td></tr>
          <tr><td>w4</td><td>${fmt(n.w4)}</td></tr>
          <tr><td>b</td><td>${fmt(n.b)}</td></tr>
        </table>
      </div>`;

    this.panelResultado.innerHTML = `
      <div class="resultado-encabezado">
        ${tituloH3}
        ${nota}
      </div>
      <div class="tablas-pesos">
        ${tablaIni}
        ${tablaFin}
      </div>
      <div class="resultado-meta">
        <p><strong>Correcciones realizadas:</strong> ${this.entrenador.iteracion}</p>
        <p><strong>Último error ≠ 0:</strong> ${ultimoErr}</p>
      </div>`;

    this.panelResultado.classList.remove('oculto');

    if (convergio) this._habilitarPrueba();
  }

  /* ════════════════════════════════════════════════════════════
     ZONA DE PRUEBA
     ════════════════════════════════════════════════════════════ */

  _habilitarPrueba() {
    this.panelPrueba.classList.remove('oculto');
    this.btnProbar.disabled = false;
  }

  _ocultarPrueba() {
    this.panelPrueba.classList.add('oculto');
    this.btnProbar.disabled = true;
    this._mostrarResultadoPrueba('');
    this.cajasEntrada.forEach(c => c.value = '');
  }

  _mostrarResultadoPrueba(html) {
    this.divResultadoPrueba.innerHTML = html;
  }

  /* ════════════════════════════════════════════════════════════
     LIMPIEZA
     ════════════════════════════════════════════════════════════ */

  _limpiarPanelPasos() {
    this.panelPasos.innerHTML = '<p class="hint">Haz clic en <strong>Generar aleatorios</strong> para comenzar.</p>';
  }

  _limpiarPanelResultado() {
    this.panelResultado.innerHTML = '';
    this.panelResultado.classList.add('oculto');
  }

  _resetearBotones() {
    this.btnEntrenar.disabled   = true;
    this.btnPausar.disabled     = true;
    this.btnPaso.disabled       = true;
    this.btnReentrenar.disabled = true;
    this.btnProbar.disabled     = true;
    this.btnPausar.textContent  = 'Pausar';
  }
}

/* ── Arrancar al cargar el DOM ───────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => { new Interfaz(); });
