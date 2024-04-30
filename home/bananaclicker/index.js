"use strict";
const nummer = document.getElementById("Nummer");
const subtract = document.getElementById("subtract");
const reset = document.getElementById("reset");
const add = document.getElementById("add");
const stop = document.getElementById("Stop");
let som = 0;
let aantal = 0;

subtract.onclick = () => {
  som--;
  nummer.textContent = som;
};

reset.onclick = () => {
  nummer.textContent = som = 0;
};

add.onclick = () => {
  som++;
  aantal++;
  nummer.textContent = som;
};

stop.onclick = () => {
  const aantalkeer = document.getElementById("aantalKeerGeklikt");
  nummer.textContent = som = 0;
  switch (true) {
    case aantal <= 100:
      aantalkeer.textContent = `Je hebt ${aantal} keer het getal verhoogt. Dat is zeer weinig vind je niet?`;
      break;
    case aantal >= 200:
      aantalkeer.textContent = `Je hebt ${aantal} keer het getal verhoogt. Kan je niet meer?`;
      break;
    case aantal >= 300:
      aantalkeer.textContent = `Je hebt ${aantal} keer het getal verhoogt. Dat begint er op te lijken`;
      break;
    case aantal >= 400:
      aantalkeer.textContent = `Je hebt ${aantal} keer het getal verhoogt. Klik nog wat meer! Je was zo goed bezig`;
      break;
    case aantal >= 500:
      aantalkeer.textContent = `Je hebt ${aantal} keer het getal verhoogt. Je bent er bijna, haal de 1000!`;
      break;
    case aantal > 1000:
      let aantalTeveel = aantal - 1000;
      aantalkeer.textContent = `Je hebt ${aantal} keer het getal verhoogt. Je hebt het spel uitgespeeld! Je hebt zelf ${aantalTeveel} gelikt`;
      break;
  }
  aantal = 0;
};

const getalUitStorage = () => {
  if (this.#storage.getItem("jaarGefietsteKilometer")) {
    document.getElementById("jaar").value = this.#storage.getItem(
      "jaarGefietsteKilometer"
    );
  }
};
const getalInStorage = () => {
  this.#storage.setItem(
    "jaarGefietsteKilometer",
    document.getElementById("jaar").value
  );
};

const init = () => {
  const gebruiker = document.getElementById("Gebruiker");
  const gebruikerjs = prompt("Wat is je username?").trim();
  gebruiker.textContent = `${gebruikerjs}`;
  // if (gebruikerjs === "Robbe") {
  //   gebruiker.textContent = `${gebruikerjs}, Welkom Admin!`;
  // }
  if (gebruikerjs === null) {
    gebruiker.textContent = `Herlaad de pagina en vul je naam in.`;
  }
};

window.onload(init());
