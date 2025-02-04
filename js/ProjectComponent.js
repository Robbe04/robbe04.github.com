import ProjectRepository from "./ProjectRepository.js";

export default class ProjectComponent {
  #storage;
  #projectRepository;

  constructor() {
    this.#storage = localStorage;
    this.#projectRepository = new ProjectRepository();
    this.#initialiseerHTML();
  }

  async #initialiseerHTML() {
    await this.#getData();
    this.#projectenToHTML();
  }

  async #getData() {
    const response = await fetch("./data/data.json");
    const json = await response.json();
    json.forEach(({ id, naam, url, beschrijving, thumbnail }) => {
      this.#projectRepository.voegProjectToe(
        id,
        naam,
        url,
        thumbnail,
        beschrijving
      );
    });
    console.log(json);
  }

  #projectenToHTML() {
    const hoofddiv = document.getElementById("projecten");
    this.#projectRepository.projecten.forEach((project) => {
      hoofddiv.insertAdjacentHTML(
        "beforeend",
        `
        <div class="project">
        
          <div class="project-naam">${project.naam}</div>
          <a href="${project.url}" target="_blank" class="project-link">
            <img src="${project.thumbnail}" alt="${project.naam} Thumbnail" class="project-thumbnail">
          </a>
          <div class="project-beschrijving">${project.beschrijving}</div>
          <div>
            <a href="${project.url}" type="button" class="project-visit-btn">Visit</a>
          </div>
        </div>
        `
      );
    });
  }
}
