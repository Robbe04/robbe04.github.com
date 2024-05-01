export default class Personage {
  #name;
  #health;
  #attack;
  #defence;

  constructor(name, health, attack, defence) {
    this.#name = name;
    this.#health = health;
    this.#attack = attack;
    this.#defence = defence;
  }

  set name(name) {
    this.#name = name;
  }

  set health(health) {
    this.#health = health;
  }

  set attack(attack) {
    this.#attack = attack;
  }

  set defence(defence) {
    this.#defence = defence;
  }

  get name() {
    return this.#name;
  }

  get health() {
    return this.#health;
  }

  get attack() {
    return this.#attack;
  }

  get defence() {
    return this.#defence;
  }
}
