function changeLanguage(language) {
  fetch("languages/" + language + ".json")
    .then((response) => response.json())
    .then((data) => {
      haalDocumentGetElementByIdOp("callOfDutyAPI", data.callOfDutyAPI);
      haalDocumentGetElementByIdOp("anAPIOfEveryCOD", data.anAPIOfEveryCOD);
      haalDocumentGetElementByIdOp(
        "ApiCanBeDowloadHere",
        data.ApiCanBeDowloadHere
      );
    })
    .catch((error) =>
      console.error("Error fetching language resource: ", error)
    );
}

// Knoppen op de index pagina die ofwel Engels of Nederlands kiezen
document.getElementById("engels").addEventListener("click", () => {
  changeLanguage("en");
});

document.getElementById("nederlands").addEventListener("click", () => {
  changeLanguage("nl");
});

function haalDocumentGetElementByIdOp(id, dataWoord) {
  return (document.getElementById(id).innerHTML = dataWoord);
}

// Standaardtaal instellen
changeLanguage("nl");
