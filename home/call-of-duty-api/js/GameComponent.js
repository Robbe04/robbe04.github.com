import GameRepository from "./GameRepository.js";

export default class GameComponent {
  #storage;
  #gameRepository;

  constructor() {
    this.#storage = localStorage;
    this.#gameRepository = new GameRepository();
    this.#initialiseerHTML();
  }

  async #initialiseerHTML() {
    await this.#getGameData();
    // this.#gamesToHTML();
    // this.#gamesToHTMLBonus();
    this.#filterMenu();
    // this.#getItemsFromStorage();
    // this.#producentenToHTML();
    // this.#gamesVanTreyarchToHTML();
    // this.#aantalGamesZombiesDoorInfinityWard();
  }

  async #getGameData() {
    try {
      const response = await fetch("./data/data.json");
      if (!response.ok)
        throw new Error(`Fout bij ophalen games: ${response.status}`);
      const json = await response.json();
      json.forEach(
        ({
          id,
          title,
          releaseDate,
          description,
          studio,
          ageToPlay,
          stars,
          modes,
          coverArt,
          genre,
          bonus,
        }) =>
          this.#gameRepository.voegGameToe(
            id,
            title,
            releaseDate,
            coverArt,
            description,
            genre,
            studio,
            ageToPlay,
            stars,
            modes,
            bonus
          )
      );
    } catch (error) {
      console.log(error);
    }
  }

  #geefTotaalAantalGames(aantalZoekresultaat1 = 0, aantalZoekresultaat2 = 0) {
    let totaalGames = aantalZoekresultaat1 + aantalZoekresultaat2;
    return `Totaal aantal games met het zoekresultaat: ${totaalGames}`;
  }

  #gamesToHTML(teFilterenMethode) {
    console.log(teFilterenMethode);
    const gamesContainer = document.getElementById("games");
    gamesContainer.innerHTML = "";
    teFilterenMethode.forEach((game) => {
      // totaal aantal games per filter
      const totaalGames = teFilterenMethode.length;
      document.getElementById("aantalGames").innerText =
        this.#geefTotaalAantalGames(totaalGames);

      const gameCard = document.createElement("div");
      gameCard.classList.add("game-card");
      // elke kaart heeft een uniek id
      gameCard.id = game.id;

      gameCard.innerHTML = `
                <img src="${game.coverArt}" alt="${game.titel} cover art">
                <div class="game-card-content">
                    <div class="game-card-title">${game.titel}</div>
                    <div class="game-card-details">Studio: ${
                      game.producent
                    }</div>
                    <div class="game-card-details">Release Date: ${
                      game.uitbrengdatum
                    }</div>
                    <div class="game-card-details">Rating: ${
                      game.rating
                    } stars</div>
                    <div class="game-card-details">Age: ${
                      game.leeftijdsCategorie
                    }+</div>
                    <div class="game-card-details">Genres: ${game.genre}</div>
                    <div class="game-card-details">Modes: ${game.modes
                      .map((el) => el.charAt(0).toUpperCase() + el.slice(1))
                      .join(" - ")}</div>

                    <div class="game-card-description">${
                      game.beschrijving
                    }</div>
                </div>
            `;
      gamesContainer.appendChild(gameCard);
    });
  }

  #gamesToHTMLBonus(teFilterenMethode) {
    const gamesContainer = document.getElementById("gamesRemasteredBonus");
    gamesContainer.innerHTML = "";
    teFilterenMethode.forEach((game) => {
      const totaalGames = teFilterenMethode.length;
      this.#geefTotaalAantalGames(0, totaalGames);
      const gameCard = document.createElement("div");
      gameCard.classList.add("game-card");
      // elke kaart heeft een uniek id
      gameCard.id = game.id;

      gameCard.innerHTML = `
                <img src="${game.coverArt}" alt="${game.titel} cover art">
                <div class="game-card-content">
                    <div class="game-card-title">${game.titel}</div>
                    <div class="game-card-details">Studio: ${
                      game.producent
                    }</div>
                    <div class="game-card-details">Release Date: ${
                      game.uitbrengdatum
                    }</div>
                    <div class="game-card-details">Rating: ${
                      game.rating
                    } stars</div>
                    <div class="game-card-details">Age: ${
                      game.leeftijdsCategorie
                    }+</div>
                    <div class="game-card-details">Genres: ${game.genre}</div>
                    <div class="game-card-details">Modes: ${game.modes
                      .map((el) => el.charAt(0).toUpperCase() + el.slice(1))
                      .join(" - ")}</div>


                    <div class="game-card-description">${
                      game.beschrijving
                    }</div>
                </div>
            `;
      gamesContainer.appendChild(gameCard);
    });
  }

  #filterMenu() {
    // Initiele opstart van de filter zodat je de pagina niet moet refreshen voor je data krijgt
    this.#gamesToHTML(this.#gameRepository.geefGames());
    this.#gamesToHTMLBonus(this.#gameRepository.geefGames("true"));

    // Aanpassingen in het filterselect
    const hoofdSelect = document.getElementById("Codfilter");
    hoofdSelect.onchange = () => {
      switch (hoofdSelect.value) {
        case "Filter":
          this.#gamesToHTML(this.#gameRepository.geefGames());
          this.#gamesToHTMLBonus(this.#gameRepository.geefGames("true"));
          break;
        case "Treyarch":
          this.#gamesToHTML(
            this.#gameRepository.geefGamesMetEenBepaaldeProducent("Treyarch")
          );
          this.#gamesToHTMLBonus(
            this.#gameRepository.geefGamesMetEenBepaaldeProducent(
              "Treyarch",
              "true"
            )
          );
          break;
        case "Infinity Ward":
          this.#gamesToHTML(
            this.#gameRepository.geefGamesMetEenBepaaldeProducent(
              "Infinity Ward"
            )
          );
          this.#gamesToHTMLBonus(
            this.#gameRepository.geefGamesMetEenBepaaldeProducent(
              "Infinity Ward",
              "true"
            )
          );
          break;
        case "Sledgehammer":
          this.#gamesToHTML(
            this.#gameRepository.geefGamesMetEenBepaaldeProducent(
              "Sledgehammer"
            )
          );
          this.#gamesToHTMLBonus(
            this.#gameRepository.geefGamesMetEenBepaaldeProducent(
              "Sledgehammer",
              "true"
            )
          );
          break;
        case "zombies":
          this.#gamesToHTML(
            this.#gameRepository.geefGamesMetEenBepaaldeMode("Zombies")
          );
          this.#gamesToHTMLBonus(
            this.#gameRepository.geefGamesMetEenBepaaldeMode("Zombies", "true")
          );
          break;
        case "specops":
          this.#gamesToHTML(
            this.#gameRepository.geefGamesMetEenBepaaldeMode("Spec Ops")
          );
          this.#gamesToHTMLBonus(
            this.#gameRepository.geefGamesMetEenBepaaldeMode("Spec Ops", "true")
          );
          break;
        case "warzone1":
        case "warzone2":
          const mode =
            hoofdSelect.value === "warzone1" ? "warzone" : "warzone 2.0";
          this.#gamesToHTML(
            this.#gameRepository.geefGamesMetEenBepaaldeMode(mode)
          );
          this.#gamesToHTMLBonus(
            this.#gameRepository.geefGamesMetEenBepaaldeMode(mode, "true")
          );
          break;
        default:
          console.warn(`Onbekende filteroptie: ${hoofdSelect.value}`);
          break;
      }
    };
  }
}
