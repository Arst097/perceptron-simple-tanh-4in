/**
 * entrenador.js
 * Conoce el problema: contiene la tabla de verdad, la Neurona
 * y el estado del entrenamiento (fila actual, iteración actual).
 * Expone un único método público: darUnPaso().
 */

const TABLA_VERDAD = [
  // [x1, x2, x3, x4,  d]
  [-1, -1, -1, -1, -1],
  [-1, -1, -1,  1, -1],
  [-1, -1,  1, -1, -1],
  [-1, -1,  1,  1, -1],
  [-1,  1, -1, -1, -1],
  [-1,  1, -1,  1, -1],
  [-1,  1,  1, -1, -1],
  [-1,  1,  1,  1, -1],
  [ 1, -1, -1, -1, -1],
  [ 1, -1, -1,  1,  1],
  [ 1, -1,  1, -1,  1],
  [ 1, -1,  1,  1,  1],
  [ 1,  1, -1, -1,  1],
  [ 1,  1, -1,  1,  1],
  [ 1,  1,  1, -1,  1],
  [ 1,  1,  1,  1,  1]
];

const TOPE_ITERACIONES = 999;

class Entrenador {
  constructor() {
    this.neurona      = new Neurona();
    this.iteracion    = 0;   // iteraciones completadas (cada una termina en corrección)
    this.filaActual   = 0;   // índice 0-15 de la fila que se va a evaluar ahora
    this.terminado    = false;
    this.convergio    = false;
    this.filasOkEnIteracionActual = 0; // filas sin error en la iteracion actual
    this.ultimoError  = null;  // último error != 0 (para el resumen final)
    this.pesosIniciales = null; // snapshot al arrancar
  }

  /** Reinicia el entrenador (nueva Neurona ya inicializada externamente) */
  reiniciar() {
    this.iteracion    = 0;
    this.filaActual   = 0;
    this.terminado    = false;
    this.convergio    = false;
    this.filasOkEnIteracionActual = 0;
    this.ultimoError  = null;
    this.pesosIniciales = this.neurona.copiarPesos();
  }

  /**
   * Evalúa la fila actual y devuelve un objeto simple con toda
   * la información necesaria para que la Interfaz dibuje el paso.
   *
   * Estados posibles del objeto devuelto:
   *   'continua'       – error = 0, pasamos a la fila siguiente
   *   'corrigio'       – error ≠ 0, se corrigió y termina la iteración
   *   'convergio'      – la pasada completa (16 filas) no tuvo errores
   *   'sinConvergencia'– se agotaron las 999 iteraciones
   *   'yaTerminado'    – llamada después de que el entrenamiento finalizó
   */
  darUnPaso() {
    if (this.terminado) {
      return { estado: 'yaTerminado' };
    }

    const fila  = TABLA_VERDAD[this.filaActual];
    const x     = [fila[0], fila[1], fila[2], fila[3]];
    const d     = fila[4];

    const pesosAntes = this.neurona.copiarPesos();
    const net        = this.neurona.sumatoria(x);
    const y          = this.neurona.activacion(net);  // tanh(net)
    const Y          = y >= 0 ? 1 : -1;               // función a trozos
    const error      = d - Y;                          // 0, 2 ó -2

    let estado;
    let pesosDespues = null;

    if (error === 0) {
      // ── Fila correcta: avanzar ──────────────────────────────────
      this.filasOkEnIteracionActual++;

      if (this.filasOkEnIteracionActual === TABLA_VERDAD.length) {
        // ¡Convergió! Todas las filas de esta pasada sin error.
        this.terminado = true;
        this.convergio = true;
        estado = 'convergio';
      } else {
        this.filaActual = (this.filaActual + 1) % TABLA_VERDAD.length;
        estado = 'continua';
      }

    } else {
      // ── Error: corregir y empezar nueva iteración ───────────────
      this.ultimoError = error;
      this.neurona.corregir(error, x);
      pesosDespues = this.neurona.copiarPesos();

      this.iteracion++;
      if (this.iteracion >= TOPE_ITERACIONES) {
        this.terminado = true;
        this.convergio = false;
        estado = 'sinConvergencia';
      } else {
        estado = 'corrigio';
        this.filaActual = 0;
        this.filasOkEnIteracionActual = 0;
      }
    }

    return {
      estado,
      // indiceFila es el índice 0-15 de la fila que SE EVALUÓ en este paso
      // (se captura antes de que filaActual pueda cambiar)
      indiceFila:  TABLA_VERDAD.indexOf(fila),
      x,
      d,
      net,
      y,
      Y,
      error,
      pesosAntes,
      pesosDespues,
      iteracion:        this.iteracion,       // correcciones acumuladas
      iteracionEnCurso: this.iteracion + 1,   // iteracion que SE ESTÁ ejecutando
      filaActual:  this.filaActual,
      filasOk:     this.filasOkEnIteracionActual,
      ultimoError: this.ultimoError,
      eta:         this.neurona.eta
    };
  }

  /** Expone la tabla de verdad (solo lectura) */
  get tabla() {
    return TABLA_VERDAD;
  }
}
