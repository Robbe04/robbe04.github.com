nummers = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
dieren = [
  { naam: "Cooper", soort: "goldenRetriever", favoEten: "brokken" },
  { naam: "Cooper", soort: "borderColey", favoEten: "brokken" },
  { naam: "Barley", soort: "bernerSennen", favoEten: "alles" },
];
// Normale manier overlopen
console.log(`Normale manier: ${nummers}, nieuwe manier hieronder: `);

// nieuwe manier overlopen
console.log(...nummers);

// overlopen met forEach
nummers.forEach((nummer, index, array) => {
  console.log(`${index}/ met inhoud ${nummer}`);
});

// overlopen met filter - geef de orginele array terug met een bepaalde voorwaarde
const gefilterdeNummer = nummers.filter((element) => {
  return element > 5;
});
console.log(gefilterdeNummer);

const Cooper = dieren.filter((element) => {
  return element.naam === "Cooper";
});
console.log(Cooper);

// overlopen met map - geeft een nieuwe array terug
const gemapteNummers = nummers.map((element) => {});
const gemapteDieren = dieren.map((element) => {
  return element.favoEten;
});
console.log(gemapteDieren);

// overlopen met reduce
const reduceDieren = dieren.reduce((pv, el) => {
  el.favoEten === "brokken" ? pv + 1 : pv, 0;
});
console.log(reduceDieren);
