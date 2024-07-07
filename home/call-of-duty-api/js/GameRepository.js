import Game from "./Game.js";

export default class GameRepository {
  #games = [];

  constructor() {}

  get games() {
    return this.#games;
  }

  set games(games) {
    this.#games = games;
  }

  voegGameToe(
    id,
    titel,
    uitbrengdatum,
    coverArt,
    beschrijving,
    genre,
    producent,
    leeftijdsCategorie,
    rating,
    modes,
    isbonus
  ) {
    this.#games.push(
      new Game(
        id,
        titel,
        uitbrengdatum,
        coverArt,
        beschrijving,
        genre,
        producent,
        leeftijdsCategorie,
        rating,
        modes,
        isbonus
      )
    );
  }

  // Filterwaarde = filter / standaard
  geefGames(filterBonus = null) {
    if (filterBonus !== null) {
      return this.#games
        .filter(
          (el) =>
            String(el.isbonus).toLowerCase() ===
            String(filterBonus).toLowerCase()
        )
        .sort((a, b) => a.uitbrengdatum - b.uitbrengdatum);
    }
    return this.#games
      .filter((el) => !el.isbonus)
      .sort((a, b) => a.uitbrengdatum - b.uitbrengdatum);
  }

  // filterwaarde op producent
  geefGamesMetEenBepaaldeProducent(studio, filterBonus = null) {
    // we filteren op de gamedevelopers
    let filteredGames = this.#games
      .filter(
        (el) =>
          el.producent.toLowerCase() === studio.toLowerCase() && !el.isbonus
      )
      .sort((a, b) => a.uitbrengdatum - b.uitbrengdatum);

    // we filteren of we de bonus/remastered games in de lus mogen steken
    if (filterBonus !== null) {
      return this.#games
        .filter((el) => el.producent.toLowerCase() === studio.toLowerCase())
        .filter(
          (el) =>
            String(el.isbonus).toLowerCase() ===
            String(filterBonus).toLowerCase()
        )
        .sort((a, b) => a.uitbrengdatum - b.uitbrengdatum);
    }
    return filteredGames;
  }

  geefGamesMetEenBepaaldeMode(mode, filterBonus = null) {
    // mainline games filteren (geen bonus games)
    let mainlineGames = this.#games
      .filter((el) => el.modes.includes(mode.toLowerCase()) && !el.isbonus)
      .sort((a, b) => a.uitbrengdatum - b.uitbrengdatum);

    // bonus games filteren indien filterBonus is ingesteld op "true"
    if (filterBonus !== null && filterBonus.toLowerCase() === "true") {
      let bonusGames = this.#games
        .filter((el) => el.modes.includes(mode.toLowerCase()) && el.isbonus)
        .sort((a, b) => a.uitbrengdatum - b.uitbrengdatum);

      return bonusGames;
    }

    // Als filterBonus niet is ingesteld op "true", retourneer alleen mainline games
    return mainlineGames;
  }
}
