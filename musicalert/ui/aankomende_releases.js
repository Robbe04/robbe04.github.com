/**
 * Aankomende Releases UI Module
 * Behandelt het weergeven van aankomende muziekreleases (pre-releases)
 */
class AankomendeReleasesUI {
    constructor() {
        this.preReleases = [];
    }

    /**
     * Toon aankomende releases van gevolgde artiesten
     * @param {Array} preReleases - Array van aankomende releases
     */
    displayPreReleases(preReleases) {
        this.preReleases = preReleases;
        const container = document.getElementById('pre-releases');
        container.innerHTML = '';
        
        console.log(`Displaying ${preReleases?.length || 0} pre-releases`);
        
        // Toon lege staat als er geen releases zijn
        if (!preReleases || preReleases.length === 0) {
            this._showEmptyState(container);
            return;
        }
        
        // Filter releases die al zijn uitgekomen
        const upcomingReleases = this._filterUpcomingReleases(preReleases);
        
        // Toon bericht als alle releases zijn uitgekomen
        if (upcomingReleases.length === 0) {
            this._showAllReleasedState(container);
            return;
        }
        
        // Sorteer op release datum
        upcomingReleases.sort(this._sortByReleaseDate);
        
        // Voeg informatie header toe
        this._addInfoHeader(container, upcomingReleases.length);
        
        // Toon alle releases
        this._displayReleaseCards(container, upcomingReleases);
        
        // Voeg vernieuw knop toe
        this._addRefreshButton(container);
    }

    /**
     * Toon lege staat wanneer er geen aankomende releases zijn
     * @private
     */
    _showEmptyState(container) {
        container.innerHTML = `
            <div class="col-span-full text-center py-8">
                <div class="text-gray-400 mb-4">
                    <i class="fas fa-calendar-day text-5xl"></i>
                </div>
                <p class="text-gray-500">Geen aankomende releases gevonden</p>
                <p class="text-gray-500 text-sm mt-2">Mogelijk zijn er geen pre-releases beschikbaar of werd de API-limiet bereikt</p>
                ${this._generateTipsSection()}
                <button onclick="app.loadPreReleases(true)" class="mt-4 bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-lg transition">
                    Opnieuw zoeken
                </button>
            </div>
        `;
    }

    /**
     * Toon staat wanneer alle releases al zijn uitgekomen
     * @private
     */
    _showAllReleasedState(container) {
        container.innerHTML = `
            <div class="col-span-full text-center py-8">
                <div class="text-gray-400 mb-4">
                    <i class="fas fa-calendar-check text-5xl"></i>
                </div>
                <p class="text-gray-500">Alle eerder getoonde releases zijn nu uitgebracht</p>
                <p class="text-gray-500 text-sm mt-2">Controleer regelmatig op nieuwe aankondigingen</p>
                <button onclick="app.loadPreReleases(true)" class="mt-4 bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-lg transition">
                    Zoek nieuwe releases
                </button>
            </div>
        `;
    }

    /**
     * Genereer tips sectie voor lege staat
     * @returns {string} HTML voor tips
     * @private
     */
    _generateTipsSection() {
        return `
            <div class="mt-4 bg-yellow-50 p-3 rounded-lg text-yellow-800 text-sm">
                <p><i class="fas fa-lightbulb mr-2"></i><strong>Tips:</strong></p>
                <ul class="list-disc list-inside mt-2 space-y-1">
                    <li>Volg meer artiesten die vaak nieuwe muziek uitbrengen</li>
                    <li>Wacht 5-10 minuten en probeer opnieuw (API-limiet)</li>
                    <li>Pre-releases zijn alleen zichtbaar als artiesten ze aankondigen</li>
                </ul>
            </div>
        `;
    }

    /**
     * Filter releases die nog niet zijn uitgekomen
     * @param {Array} releases - Alle releases
     * @returns {Array} Alleen toekomstige releases
     * @private
     */
    _filterUpcomingReleases(releases) {
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Begin van vandaag
        
        const upcoming = releases.filter(release => {
            let releaseDate = release.releaseDate;
            
            // Converteer string naar Date object indien nodig
            if (typeof releaseDate === 'string') {
                releaseDate = new Date(releaseDate);
            }
            
            // Houd alleen toekomstige releases (vandaag of later)
            return releaseDate && releaseDate >= today;
        });
        
        console.log(`Filtered ${releases.length - upcoming.length} already released items from display`);
        return upcoming;
    }

    /**
     * Sorteer functie voor release datum (vroegste eerst)
     * @private
     */
    _sortByReleaseDate(a, b) {
        if (!a.releaseDate) return 1;
        if (!b.releaseDate) return -1;
        return a.releaseDate - b.releaseDate;
    }

    /**
     * Voeg informatie header toe
     * @param {HTMLElement} container - Container element
     * @param {number} releaseCount - Aantal releases
     * @private
     */
    _addInfoHeader(container, releaseCount) {
        const maxFavorites = Math.min(app.favorites.length, 12);
        
        const infoElement = document.createElement('div');
        infoElement.className = 'mb-4 p-3 bg-blue-50 text-blue-800 rounded-lg';
        infoElement.innerHTML = `
            <div class="flex items-start">
                <i class="fas fa-info-circle mr-2 mt-0.5"></i>
                <div class="text-sm">
                    <p><strong>Aankomende releases van ${maxFavorites} gevolgde artiesten</strong></p>
                    <p class="mt-1">Data wordt 4 uur gecached om API-limieten te respecteren. Releases verdwijnen automatisch na uitgifte.</p>
                </div>
            </div>
        `;
        
        container.appendChild(infoElement);
    }

    /**
     * Toon alle release kaarten
     * @param {HTMLElement} container - Container element
     * @param {Array} releases - Releases om te tonen
     * @private
     */
    _displayReleaseCards(container, releases) {
        releases.forEach(release => {
            // Sla ongeldige releases over
            if (!this._isValidRelease(release)) {
                console.warn('Invalid release data:', release);
                return;
            }
            
            const card = this._createReleaseCard(release);
            container.appendChild(card);
        });
    }

    /**
     * Controleer of release geldig is
     * @param {Object} release - Release object
     * @returns {boolean} True als release geldig is
     * @private
     */
    _isValidRelease(release) {
        return release.album && release.artist && release.releaseDate;
    }

    /**
     * Maak een release kaart element
     * @param {Object} release - Release object
     * @returns {HTMLElement} Release kaart element
     * @private
     */
    _createReleaseCard(release) {
        const releaseDate = new Date(release.releaseDate);
        const daysUntilRelease = this._calculateDaysUntilRelease(releaseDate);
        const releaseDateFormatted = this._formatReleaseDate(releaseDate);
        
        const card = document.createElement('div');
        card.className = 'bg-white rounded-lg shadow-md overflow-hidden transition-all duration-300 hover:shadow-lg flex flex-col md:flex-row mb-4';
        
        card.innerHTML = this._generateReleaseCardHTML(release, daysUntilRelease, releaseDateFormatted);
        
        return card;
    }

    /**
     * Bereken dagen tot release
     * @param {Date} releaseDate - Release datum
     * @returns {number} Aantal dagen tot release
     * @private
     */
    _calculateDaysUntilRelease(releaseDate) {
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        
        return Math.ceil((releaseDate - now) / (1000 * 60 * 60 * 24));
    }

    /**
     * Formatteer release datum voor weergave
     * @param {Date} releaseDate - Release datum
     * @returns {string} Geformatteerde datum
     * @private
     */
    _formatReleaseDate(releaseDate) {
        return releaseDate.toLocaleDateString('nl-NL', { 
            day: 'numeric', 
            month: 'long', 
            year: 'numeric' 
        });
    }

    /**
     * Genereer HTML voor release kaart
     * @param {Object} release - Release object
     * @param {number} daysUntilRelease - Dagen tot release
     * @param {string} releaseDateFormatted - Geformatteerde datum
     * @returns {string} HTML string
     * @private
     */
    _generateReleaseCardHTML(release, daysUntilRelease, releaseDateFormatted) {
        const isInFavorites = app.favorites.some(fav => fav.id === release.artist.id);
        const artistGenresJson = this._safeStringifyGenres(release.artist.genres);
        
        return `
            <div class="md:w-1/4 flex-shrink-0">
                <img src="${release.album.images[0]?.url || 'img/placeholder-album.png'}" 
                    alt="${release.album.name}" class="w-full h-48 md:h-full object-cover">
            </div>
            <div class="p-4 md:w-3/4 flex flex-col">
                ${this._generateReleaseCardHeader(release, daysUntilRelease, releaseDateFormatted)}
                ${this._generateReleaseCardActions(release, isInFavorites, artistGenresJson)}
            </div>
        `;
    }

    /**
     * Veilig stringifyen van genres array
     * @param {Array} genres - Genres array
     * @returns {string} JSON string van genres
     * @private
     */
    _safeStringifyGenres(genres) {
        try {
            return JSON.stringify(genres || []).replace(/'/g, "\\'");
        } catch (e) {
            return '[]';
        }
    }

    /**
     * Genereer header voor release kaart
     * @private
     */
    _generateReleaseCardHeader(release, daysUntilRelease, releaseDateFormatted) {
        const albumType = release.album.album_type.charAt(0).toUpperCase() + release.album.album_type.slice(1);
        const countdownText = this._generateCountdownText(daysUntilRelease);
        
        return `
            <div class="flex justify-between items-start mb-3">
                <div class="flex-1 mr-3">
                    <h3 class="font-bold text-lg">${release.album.name}</h3>
                    <p class="text-primary">${release.artist.name}</p>
                    <div class="mt-1">
                        <span class="text-sm bg-gray-100 text-gray-700 px-2 py-1 rounded-full">
                            ${albumType}
                        </span>
                        <span class="text-sm bg-gray-100 text-gray-700 px-2 py-1 rounded-full ml-2">
                            ${release.album.total_tracks} tracks
                        </span>
                    </div>
                </div>
                <div class="text-right">
                    <span class="bg-primary bg-opacity-20 text-primary px-3 py-2 rounded-full text-sm font-medium whitespace-nowrap">
                        ${countdownText}
                    </span>
                    <p class="text-sm text-gray-500 mt-1">${releaseDateFormatted}</p>
                </div>
            </div>
        `;
    }

    /**
     * Genereer countdown tekst
     * @param {number} daysUntilRelease - Dagen tot release
     * @returns {string} Countdown tekst
     * @private
     */
    _generateCountdownText(daysUntilRelease) {
        if (daysUntilRelease === 0) return 'Vandaag';
        if (daysUntilRelease === 1) return 'Morgen';
        return `Nog ${daysUntilRelease} ${daysUntilRelease === 1 ? 'dag' : 'dagen'}`;
    }

    /**
     * Genereer actieknoppen voor release kaart
     * @private
     */
    _generateReleaseCardActions(release, isInFavorites, artistGenresJson) {
        const spotifyUrl = release.album.external_urls?.spotify || '';
        const artistName = release.artist.name.replace(/'/g, "\\'");
        const albumName = release.album.name.replace(/'/g, "\\'");
        const artistImage = release.artist.images?.[0]?.url?.replace(/'/g, "\\'") || '';
        
        return `
            <div class="mt-auto flex justify-between items-center">
                <button onclick="app.toggleFavorite('${release.artist.id}', '${artistName}', '${artistImage}', ${artistGenresJson})" 
                        class="text-gray-600 hover:text-red-500 transition-colors flex items-center">
                    <i class="fas fa-heart mr-1 ${isInFavorites ? 'text-red-500' : ''}"></i>
                    <span class="text-sm">${isInFavorites ? 'Gevolgd' : 'Volgen'}</span>
                </button>
                
                <div class="flex gap-2">
                    ${spotifyUrl ? `
                        <a href="${spotifyUrl}" target="_blank" 
                           class="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg text-sm transition">
                            <i class="fab fa-spotify mr-1"></i>Pre-save
                        </a>
                    ` : ''}
                    
                    <button onclick="app.shareRelease('${artistName}', '${albumName}', '${spotifyUrl}')" 
                            class="bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded-lg text-sm transition">
                        <i class="fas fa-share-alt mr-1"></i>Delen
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Voeg vernieuw knop toe aan de onderkant
     * @param {HTMLElement} container - Container element
     * @private
     */
    _addRefreshButton(container) {
        const refreshElement = document.createElement('div');
        refreshElement.className = 'mt-6 text-center';
        refreshElement.innerHTML = `
            <button onclick="app.loadPreReleases(true)" class="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-lg transition">
                <i class="fas fa-sync-alt mr-2"></i>Vernieuw releases
            </button>
            <p class="text-xs text-gray-500 mt-2">Cache wordt elke 4 uur automatisch ververst</p>
        `;
        container.appendChild(refreshElement);
    }
}

// Maak globale instantie beschikbaar
window.aankomendeReleasesUI = new AankomendeReleasesUI();
