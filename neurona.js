/**
 * neurona.js
 * Modelo matemático del perceptrón simple.
 * Guarda pesos w1..w4, bias b y tasa de aprendizaje η.
 */

/* ── Rangos configurables ─────────────────────────────────────── */
const RANGO_PESOS   = { min: 0,   max: 1   }; // pesos y bias
const RANGO_ETA     = { min: 0.1, max: 1   }; // factor de aprendizaje

/* Genera un número real aleatorio en [min, max] */
function aleatorioEnRango(min, max) {
  return min + Math.random() * (max - min);
}

class Neurona {
  constructor() {
    this.w1 = 0;
    this.w2 = 0;
    this.w3 = 0;
    this.w4 = 0;
    this.b  = 0;
    this.eta = 0; // factor de aprendizaje η
  }

  /** Asigna valores aleatorios a pesos, bias y η */
  inicializarAleatorio() {
    this.w1  = aleatorioEnRango(RANGO_PESOS.min, RANGO_PESOS.max);
    this.w2  = aleatorioEnRango(RANGO_PESOS.min, RANGO_PESOS.max);
    this.w3  = aleatorioEnRango(RANGO_PESOS.min, RANGO_PESOS.max);
    this.w4  = aleatorioEnRango(RANGO_PESOS.min, RANGO_PESOS.max);
    this.b   = aleatorioEnRango(RANGO_PESOS.min, RANGO_PESOS.max);
    this.eta = aleatorioEnRango(RANGO_ETA.min, RANGO_ETA.max);
  }

  /**
   * Sumatoria con bias:
   *   net = w1·x1 + w2·x2 + w3·x3 + w4·x4 + b
   * @param {number[]} x  arreglo [x1, x2, x3, x4]
   * @returns {number} net
   */
  sumatoria(x) {
    return this.w1 * x[0]
         + this.w2 * x[1]
         + this.w3 * x[2]
         + this.w4 * x[3]
         + this.b;
  }

  /**
   * Función de activación tanh.
   * @param {number} net
   * @returns {number} tanh(net)
   */
  activacion(net) {
    return Math.tanh(net);
  }

  /**
   * Función a trozos: convierte tanh(net) a salida bipolar ±1.
   * Si net = 0 → y = 0 → Y = 1.
   * @param {number[]} x  arreglo [x1, x2, x3, x4]
   * @returns {number} 1 ó -1
   */
  salida(x) {
    const net = this.sumatoria(x);
    const y   = this.activacion(net);
    return y >= 0 ? 1 : -1;
  }

  /**
   * Actualiza pesos y bias usando la regla del perceptrón simple.
   *   wi = wi + η · error · xi
   *   b  = b  + η · error
   * @param {number}   error  (d - Y), puede ser 0, 2 ó -2
   * @param {number[]} x      arreglo [x1, x2, x3, x4]
   */
  corregir(error, x) {
    this.w1 += this.eta * error * x[0];
    this.w2 += this.eta * error * x[1];
    this.w3 += this.eta * error * x[2];
    this.w4 += this.eta * error * x[3];
    this.b  += this.eta * error;
  }

  /** Devuelve una copia instantánea de los pesos actuales */
  copiarPesos() {
    return {
      w1: this.w1,
      w2: this.w2,
      w3: this.w3,
      w4: this.w4,
      b:  this.b
    };
  }
}
