# MusicAlert

MusicAlert is een geavanceerde web applicatie waarmee gebruikers hun favoriete DJ's en artiesten kunnen volgen en notificaties ontvangen wanneer zij nieuwe muziek uitbrengen.

![MusicAlert Screenshot](img/screenshot.png)

## Functionaliteiten

- **Uitgebreide DJ/Artiest Zoekfunctie**: Zoek naar artiesten en filter op genre
- **Favorieten Beheren**: Voeg artiesten toe aan je volglijst en sla deze lokaal op
- **Nieuwe Release Meldingen**: Ontvang meldingen wanneer gevolgde artiesten nieuwe muziek uitbrengen
- **Muziek Previews**: Luister naar previews van nummers direct in de app
- **Interactieve Audio Visualizer**: Visuele weergave van afgespeelde muziek
- **Aanbevelingen**: Krijg aanbevelingen voor nieuwe artiesten gebaseerd op je voorkeuren
- **Genre Filtering**: Filter artiesten op specifieke genres

## Installatie en Setup

### Vereisten
- Moderne webbrowser
- Spotify Developer account (voor de API-toegang)

### Spotify API Configuratie

1. Ga naar [Spotify Developer Dashboard](https://developer.spotify.com/dashboard) en log in met je Spotify account
2. Klik op "Create an App"
3. Vul een naam en beschrijving in voor je app
4. Kopieer de "Client ID" en "Client Secret" en update deze in het bestand `js/api.js`

**Opmerking**: Deze app gebruikt de Client Credentials Flow voor authenticatie bij de Spotify API. In productie-omgevingen zou de Client Secret niet in frontend code moeten worden opgeslagen. Overweeg voor een productieoplossing het gebruik van een backend service die de API-aanroepen afhandelt.

### Lokaal Gebruik

1. Clone de repository: `git clone https://github.com/jouw-gebruikersnaam/musicalert.git`
2. Open `index.html` in je browser

Of gebruik een lokale server zoals Live Server in VS Code voor de beste ervaring.

## Technologie

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **UI Framework**: Tailwind CSS
- **Animaties**: Animate.css
- **Iconen**: Font Awesome
- **API**: Spotify Web API
- **Dataopslag**: LocalStorage

## Projectstructuur

```
musicalert/
├── css/
│   └── styles.css
├── js/
│   ├── api.js       # Spotify API interacties
│   ├── ui.js        # UI-gerelateerde functies
│   └── app.js       # Hoofdapplicatielogica
├── img/
│   ├── hero-bg.jpg
│   ├── vinyl-record.png
│   └── musicalert-logo.png
├── index.html
├── spotify-setup-guide.html
└── README.md
```

## Toekomstplannen

- Implementatie van push notificaties via een service worker
- Mobiele app versie (PWA)
- E-mailnotificaties voor nieuwe releases
- Gebruikersaccounts met cloudopslag van voorkeuren
- Sociale functies zoals het delen van favorieten en nieuwe releases
- Uitgebreide muziekstatistieken en analyses

## Bijdragen

Bijdragen zijn welkom! Voel je vrij om een issue te openen of een pull request in te dienen.

## Licentie

MIT License
