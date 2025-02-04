import Project from "./Project.js";

export default class ProjectRepository {
  #projecten = [];

  get projecten() {
    return this.#projecten;
  }

  voegProjectToe(id, naam, url, thumbnail, beschrijving) {
    this.#projecten.push(new Project(id, naam, url, thumbnail, beschrijving));
  }
}
