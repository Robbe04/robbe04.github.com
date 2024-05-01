# Use Case 1: Knop Val Aan

1: De gebruiker drukt op de aanvalsknop  
2: Er wordt een random getal gegenereerd dat de schade bepaalt naar de vijand toe volgens SCHADE_DR  
3: De vijand ontvangt de schade en verliest dat deel van zijn HealtPoints  
4: Er bestaat een mogelijkheid volgens SPEAK_DR dat de vijand zal spreken  
5: De aanval is gedaan, de vijand valt jou nu aan volgens VIJANDSCHADEAANSPELER_DR  
6: Beide aanvallen zijn gedaan en de aanvalspoging keert terug naar de speler

## SCHADE_DR:

Schade wordt **random** bepaalt tussen 0 (mis) en 10 (maxschade)

## SPEAK_DR

Aan de hand van hoeveel HealthPoints de vijand heeft bestaat er een kans dat hij iets zal zeggen:

- 100:
- 50:
- 10:
- 0: "No it can't be, how is this possible

Hier kan hetzelfde gebeuren met de speler, hij kan **random** bepaalde slagzinnen zeggen

- "Got ya good now"
- "I missed?"
- "Yes"
- ...

## VIJANDSCHADEAANSPELER_DR

De speler heeft 10 HP displayed in 5 hartjes  
De vijand kan slechts 1HP (0.5 hartje) of 2HP(1 hartje) van jou afdoen

# Use Case 2: Knop Verdedig

1: De speler drukt op de verdedigknop  
2: VERDIGHOEVEELHEID_DR bepaalt hoe goed je verdedigt wordt  
3: De vijand doet zijn aanval en de speler verliest wel geen hartjes aan de hand van hoe goed de verdediging was

## VERDIGHOEVEELHEID_DR

Hier wordt **random** bepaalt hoe goed je verdediging werkt:

- De speler zijn verdediging kan de helft van de schade oplopen van wat de vijand zou kunnen doen
- De speler kan helemaal geen schade oplopen
- De speler neemt geen schade op en reflecteert -1 toe via zijn schild naar de vijand toe

# Use Case 3: Knop healing potion

1: De speler drukt op de potion-knop
2: De speler krijgt de effecten van het drankje volgens POTIONEFFECTION_DR

## POTIONEFFECTION_DR

- De speler krijgt 40% van zijn HP terug
- De speler kan dit opnieuw krijgen na 60 seconden wachten en een minimum van 2 beurten van beide partijen die zijn gespeeld
