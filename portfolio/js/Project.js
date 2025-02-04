export default class Project {
  #id;
  #naam;
  #url;
  #thumbnail;
  #beschrijving;

  constructor(id, naam, url, thumbnail, beschrijving) {
    this.#naam = naam;
    this.#url = url;
    this.#thumbnail = thumbnail;
    this.#beschrijving = beschrijving;
    this.#id = id;
  }

  get id() {
    return this.#id;
  }

  get naam() {
    return this.#naam;
  }
  get url() {
    return this.#url;
  }
  get thumbnail() {
    return this.#thumbnail;
  }
  get beschrijving() {
    return this.#beschrijving;
  }
}
