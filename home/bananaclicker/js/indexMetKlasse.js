export default class labelClicker {
  #storage;
  #aantal;
  #som;
  #nummer;

  constructor() {
    this.#storage = window.localStorage;

    const nummer = document.getElementById("Nummer");
    const subtract = document.getElementById("subtract");
    const reset = document.getElementById("reset");
    const add = document.getElementById("add");
    const stop = document.getElementById("Stop");

    subtract.onclick = () => {
      this.#som--;
      this.#nummer.textContent = this.#som;
    };

    reset.onclick = () => {
      this.#nummer.textContent = this.#som = 0;
    };

    add.onclick = () => {
      this.#som++;
      this.#aantal++;
      this.#nummer.textContent = this.#som;
    };

    stop.onclick = () => {
      const aantalkeer = document.getElementById("aantalKeerGeklikt");
      this.#nummer.textContent = this.#som = 0;
      switch (true) {
        case this.#aantal <= 100:
          aantalkeer.textContent = `Je hebt ${
            this.#aantal
          } keer het getal verhoogd. Dat is zeer weinig vind je niet?`;
          break;
        case this.#aantal >= 200:
          aantalkeer.textContent = `Je hebt ${
            this.#aantal
          } keer het getal verhoogd. Kan je niet meer?`;
          break;
        case this.#aantal >= 300:
          aantalkeer.textContent = `Je hebt ${
            this.#aantal
          } keer het getal verhoogd. Dat begint er op te lijken`;
          break;
        case this.#aantal >= 400:
          aantalkeer.textContent = `Je hebt ${
            this.#aantal
          } keer het getal verhoogd. Klik nog wat meer! Je was zo goed bezig`;
          break;
        case this.#aantal >= 500:
          aantalkeer.textContent = `Je hebt ${
            this.#aantal
          } keer het getal verhoogd. Je bent er bijna, haal de 1000!`;
          break;
        case this.#aantal > 1000:
          let aantalTeveel = this.#aantal - 1000;
          aantalkeer.textContent = `Je hebt ${
            this.#aantal
          } keer het getal verhoogd. Je hebt het spel uitgespeeld! Je hebt zelf ${aantalTeveel} keer geklikt`;
          break;
      }
      this.#aantal = 0;
    };

    this.#nummer.onchange = () => {
      this.#getNummerfromStorage(this.#nummer);
      this.#setNummerInStorage();
    };
  }

  get som() {
    return this.#som;
  }
  get aantal() {
    return this.#aantal;
  }

  #getNummerfromStorage(nummer) {
    if (this.#storage.getItem("getal")) {
      nummer.value = this.#storage.getItem("getal");
    }
  }

  #setNummerInStorage() {
    this.#storage.setItem("getal", this.#nummer.value);
  }
}
