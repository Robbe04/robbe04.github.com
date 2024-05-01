import Personage from "./personage.js";

export default class PersonageComponent {
  #speler;
  #enemy;

  constructor() {
    this.#speler = new Personage("Stefaan De Ridder", 10, 0, 1);
    this.#enemy = new Personage("Hades", 100, 0, 1);

    console.log(this.#speler);
    console.log(this.#enemy);

    document.getElementById("valAan").addEventListener("click", () => {
      this.#attackVanSpeler();
    });
    console.log(this.#attackVanSpeler());
  }

  #attackVanSpeler() {
    const damage = Math.floor(Math.random() * 10);

    const seeDamage = document.getElementById("damageToHades");
    if (damage === 0) {
      const divEl = document.createElement("div");
      divEl.innerHTML = this.#randomTextNulDamage();
      seeDamage.appendChild(divEl);
    } else if (damage <= 5) {
      const divEl = document.createElement("div");
      divEl.innerHTML = this.#randomTextLessThenFive();
      seeDamage.appendChild(divEl);
    } else if (damage <= 9) {
      const divEl = document.createElement("div");
      divEl.innerHTML = this.#randomTextLessThenNine();
      seeDamage.appendChild(divEl);
    } else if (damage === 10) {
      const divEl = document.createElement("div");
      divEl.innerHTML = "Wow what a shot!";
      seeDamage.appendChild(divEl);
    } else if (this.#enemy.health <= 0) {
      const divEl = document.createElement("div");
      divEl.innerHTML = "I did it! Hades is dead";
      seeDamage.appendChild(divEl);
    }

    const divEl2 = document.createElement("div");
    divEl2.innerHTML = `${(this.#enemy.health = this.#enemy.health - damage)}`;
    seeDamage.appendChild(divEl2);
  }

  #randomTextNulDamage = () => {
    const kans = Math.floor(Math.random() * 3 + 1);
    if (kans === 1) {
      return "You got to be kidding me";
    } else if (kans === 2) {
      return "I missed?";
    } else {
      return "NO, HOW??";
    }
  };

  #randomTextLessThenFive = () => {
    const kans = Math.floor(Math.random() * 3 + 1);
    if (kans === 1) {
      return "Not bad";
    } else if (kans === 2) {
      return "Bether than nothing";
    }
  };

  #randomTextLessThenNine = () => {
    const kans = Math.floor(Math.random() * 2 + 1);
    if (kans === 1) {
      return "Wow";
    } else if (kans === 2) {
      return "What a shot";
    }
  };
}
