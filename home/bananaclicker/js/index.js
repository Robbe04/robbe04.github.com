import labelClicker from "./indexMetKlasse.js";

function init() {
  const gebruiker = document.getElementById("Gebruiker");
  const gebruikerjs = prompt("Wat is je username?").trim();
  gebruiker.textContent = gebruikerjs
    ? gebruikerjs
    : "Herlaad de pagina en vul je naam in.";
  new LabelClicker();
}

window.onload = init;
