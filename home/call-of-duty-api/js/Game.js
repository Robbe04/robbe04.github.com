export default class Game {
  #id;
  #titel;
  #uitbrengdatum;
  #coverArt;
  #beschrijving;
  #genre;
  #producent;
  #leeftijdsCategorie;
  #rating;
  #modes = [];
  #isbonus;

  constructor(
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
    this.#id = id;
    this.#titel = titel;
    this.#uitbrengdatum = uitbrengdatum;
    this.#coverArt = coverArt;
    this.#beschrijving = beschrijving;
    this.#genre = genre;
    this.#producent = producent;
    this.#leeftijdsCategorie = leeftijdsCategorie;
    this.#rating = rating;
    this.#modes = modes;
    this.#isbonus = isbonus;
  }

  get id() {
    return this.#id;
  }

  get titel() {
    return this.#titel;
  }

  get uitbrengdatum() {
    return this.#uitbrengdatum;
  }

  get coverArt() {
    return this.#coverArt;
  }
  get beschrijving() {
    return this.#beschrijving;
  }
  get genre() {
    return this.#genre;
  }
  get producent() {
    return this.#producent;
  }
  get leeftijdsCategorie() {
    return this.#leeftijdsCategorie;
  }
  get rating() {
    return this.#rating;
  }
  get modes() {
    return this.#modes;
  }

  get isbonus() {
    return this.#isbonus;
  }
}
