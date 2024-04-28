export default class LabelKlicker {
  #som;
  #aantal;

  constructor(som, aantal) {
    this.som = 0;
    this.aantal = 0;
  }

  get som() {
    return this.#som;
  }

  get aantal() {
    return this.#aantal;
  }

  set som(som) {
    this.#som = som;
  }

  set aantal(aantal) {
    this.#aantal = aantal;
  }
}
