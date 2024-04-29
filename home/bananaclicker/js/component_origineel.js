import LabelKlicker from "./labelKlicker.js";

export default class LabelKlickerComponent {
  #storage;
  #labelKlicker;

  constructor() {
    // Onthouden van het nummer
    this.#labelKlicker = new LabelKlicker();
    this.#storage = window.localStorage;

    // Vragen naar de gebruikersnaam
    this.#vraagNaarGebruikersnaam();

    // Opslaan van het nummer in JSON zodra erop geklikt wordt
    document.getElementById("Nummer").addEventListener("change", () => {
      this.#getGetalFromStorage();
      this.#setGetalInStorage();
    });

    // Methoden voor het klikken in de constructor
    this.#telOp();
    this.#reset();
    this.#stop();
    this.#startInterval();

    // this.#triggerEventRandomPunten();
  }

  // Logica van de methoden in de constructor
  #telOp() {
    document.getElementById("add").addEventListener("click", () => {
      this.#labelKlicker.som+=20; 
      this.#labelKlicker.aantal++;
      document.getElementById("Nummer").textContent = `${this.#labelKlicker.som}`;
      this.#triggerEvent100Punten();
      this.#triggerEventRandomPunten();
      this.#startInterval();

    });
  }

  #triggerEvent100Punten(){
    if (this.#labelKlicker.som >= 100 && this.#labelKlicker.som <= 150) {
      const divEl = document.createElement("div");
      divEl.innerHTML = "Score is nu dubbel waard!";
      divEl.classList = "scoreUpdate";
  
      const updatesOnScore = document.getElementById("updatesOnScore"); 
      if (updatesOnScore) { 
        updatesOnScore.innerHTML = ""; 
        updatesOnScore.appendChild(divEl);
  
        // Event listener toevoegen voor het verhogen met 2 punten
        document.getElementById("add").addEventListener("click", this.#verhoogMetTwee);
      } 
    } else {
      // Event listener verwijderen voor het verhogen met 2 punten als de score niet meer gelijk is aan 100
      document.getElementById("add").removeEventListener("click", this.#verhoogMetTwee);
      updatesOnScore.innerHTML = "";

    }
  }

  #verhoogMetTwee = () => {
    this.#labelKlicker.som ++; 
    document.getElementById("Nummer").textContent = `${this.#labelKlicker.som}`;
  }

  #triggerEventRandomPunten(){
    // score tussen 300 en 600 krijgen een random multiplier
    const randomPunten = Math.floor(Math.random() * 300 + 300);
    // const randomAantalExtraPunten = Math.floor(Math.random() * 50 + 50 );
    const randomMultiplier = Math.floor(Math.random() * 5) +1;

    // als de score groten is dan een aantal punten en het is kleiner dan het aantal extra punten dat je kan verdienen, genereer een random multiplier
    // if (this.#labelKlicker.som > randomPunten && this.#labelKlicker.som <= this.#labelKlicker.som + 200){
      if (this.#labelKlicker.som > randomPunten){
        this.#labelKlicker.som+=randomMultiplier;
        const hoofdDiv = document.getElementById("updatesOnScore");
        const divEl = document.createElement("div");
        divEl.classList = "scoreUpdate";
        divEl.innerHTML = `Scoremultiplier is nu ${randomMultiplier} waard`;
        hoofdDiv.appendChild(divEl); 
        
        if (this.#labelKlicker.som >= 1000){
          this.#labelKlicker.som +=1;
          console.log("De score is groter dan 1000");
          if(hoofdDiv){
            const hoofdDiv2 = document.getElementById("updatesOnScore").innerHTML = "";
          }
          const hoofdDiv3 = document.getElementById("updatesOnScore");
          const divEl2 = document.createElement("div");
          divEl2.classList = "scoreUpdate";
          divEl2.innerHTML = `Scoremultiplier is gedaan!`
          hoofdDiv3.appendChild(divEl2);
        }
      }
    // }
  }

#startInterval() {
    if (this.#labelKlicker.som >= 1000) {
        console.log("Hier begint een farm");
        const divFarms = document.getElementById("DivFarms");
        const divEl = document.createElement("div");

        const pEl = document.createElement("p");
        pEl.innerHTML = "Je hebt farms unlocked";
        divFarms.appendChild(pEl);

        const imgEl = document.createElement("img");
        imgEl.src = "./img/bananenfarm.jpg";
        imgEl.width = 200;
        imgEl.height = 150;
        divFarms.appendChild(imgEl);
        divFarms.appendChild(divEl);

        setInterval(() => {
            this.#labelKlicker.som++; // Verhoog de som met 1
            console.log("Huidige som:", this.#labelKlicker.som); // Log de huidige waarde van de som naar de console
        }, 1000); // 1000 milliseconden = 1 seconde
    }
}

#reset() {
  // zet score op 0 
  document.getElementById("reset").addEventListener("click", () => {
      this.#labelKlicker.som = 0;
      document.getElementById("Nummer").textContent = `${this.#labelKlicker.som}`;

      // Verwijder de score-update div
      const updatesOnScore = document.getElementById("updatesOnScore");
      if (updatesOnScore) {
          updatesOnScore.innerHTML = "";
      }

      // Verwijder de totaleScore-update div
      const totaleScore = document.getElementById("totaleScore");
      if (totaleScore) {
          totaleScore.innerHTML = "";
      }
  });
}

  #stop() {
    // score bepalen aan de hand van aantal keer geklikt
    document.getElementById("Stop").addEventListener("click", () => {
      const aantalkeer = document.getElementById("aantalKeerGeklikt");
      switch (true) {
        case this.#labelKlicker.aantal <= 100:
          aantalkeer.textContent = `Je hebt ${
            this.#labelKlicker.aantal
          } keer het getal verhoogd. Dat is zeer weinig, vind je niet?`;
          break;
        case this.#labelKlicker.aantal >= 200:
          aantalkeer.textContent = `Je hebt ${
            this.#labelKlicker.aantal
          } keer het getal verhoogd. Kan je niet meer?`;
          break;
        case this.#labelKlicker.aantal >= 300:
          aantalkeer.textContent = `Je hebt ${
            this.#labelKlicker.aantal
          } keer het getal verhoogd. Dat begint erop te lijken.`;
          break;
        case this.#labelKlicker.aantal >= 400:
          aantalkeer.textContent = `Je hebt ${
            this.#labelKlicker.aantal
          } keer het getal verhoogd. Klik nog wat meer! Je was zo goed bezig.`;
          break;
        case this.#labelKlicker.aantal >= 500:
          aantalkeer.textContent = `Je hebt ${
            this.#labelKlicker.aantal
          } keer het getal verhoogd. Je bent er bijna, haal de 1000!`;
          break;
        case this.#labelKlicker.aantal > 1000:
          let aantalTeveel = this.#labelKlicker.aantal - 1000;
          aantalkeer.textContent = `Je hebt ${
            this.#labelKlicker.aantal
          } keer het getal verhoogd. Je hebt het spel uitgespeeld! Je hebt zelf ${aantalTeveel} keer geklikt.`;
          break;
      }
      // getal op 0 zetten + aantal op deze knop
      this.#labelKlicker.som = 0;
      this.#labelKlicker.aantal = 0;
      document.getElementById("Nummer").textContent = `${
        this.#labelKlicker.som
      }`;

      // miltiplier veranderen
      this.#resetMultiplier();

      // Verwijder de score-update div
      const updatesOnScore = document.getElementById("updatesOnScore");
      if (updatesOnScore) {
        updatesOnScore.innerHTML = "";
      }

      // totale score
      this.#toonTotaleScore();
    });
  }

  #toonTotaleScore(){
    let totaleScore = document.getElementById("Nummer").textContent = `${this.#labelKlicker.som}`

    // totale score
    const hoofdDiv = document.getElementById("aantalKeerGeklikt");

    const strongEl = document.createElement("strong");
    strongEl.innerHTML = `<br>Je totale score was ${totaleScore}`;
    strongEl.id = "totaleScore";
    hoofdDiv.appendChild(strongEl);
  }

  // resetten van aanwezige mulipliers
  #resetMultiplier(){
    this.#labelKlicker.som = 0;
    this.#labelKlicker.aantal = 0;
  }

  // vragen via een prompt hoe de gebruiker heet
  #vraagNaarGebruikersnaam() {
    const gebruikerjs = prompt("Hallo gebruiker, hoe heet je?").trim();
    if (gebruikerjs == "") {
      document.getElementById(
        "Gebruiker"
      ).textContent = "Herlaad de pagina en vul je naam in";
    } else {
      document.getElementById("Gebruiker").textContent = `${gebruikerjs}`;
    }
  }

  // Methodes voor het opslaan van het nummer
  #getGetalFromStorage() {
    if (this.#storage.getItem("getal")) {
      document.getElementById("Nummer") = this.#storage.getItem("getal");
    }
  }

  #setGetalInStorage() {
    this.#storage.setItem("getal", document.getElementById("Nummer"));
  }
}