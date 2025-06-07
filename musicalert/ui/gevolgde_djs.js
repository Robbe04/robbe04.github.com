/**
 * Gevolgde DJ's UI Module
 * Behandelt het weergeven en beheren van gevolgde artiesten
 */
class GevolgdeDJsUI {
    constructor() {
        this.favorites = [];
    }

    /**
     * Toon de lijst van gevolgde DJ's met sorteer- en filteropties
     * @param {Array} favorites - Array van gevolgde artiesten
     */
    displayFavorites(favorites) {
        this.favorites = favorites;
        const container = document.getElementById('favorites');
        const filterContainer = document.getElementById('favorites-filter-container');
        
        // Update DJ count in header
        this.updateDJCount(favorites.length);
        
        // Als er geen favorieten zijn, toon een lege staat
        if (!favorites.length) {
            this._showEmptyState(container, filterContainer);
            return;
        }

        // Toon filteropties wanneer we favorieten hebben
        if (filterContainer) filterContainer.classList.remove('hidden');
        
        // Sorteer en filter de favorieten op basis van gebruikersinstellingen
        const processedFavorites = this._processAndFilterFavorites(favorites);
        
        // Als geen resultaten na filteren, toon "geen resultaten" bericht
        if (processedFavorites.length === 0) {
            this._showNoResultsState(container);
            return;
        }
        
        // Genereer HTML voor favorieten
        const html = this._generateFavoritesHTML(processedFavorites);
        container.innerHTML = html;
        
        // Setup quick actions
        this._setupQuickActions();
    }

    /**
     * Update DJ count display in header
     * @param {number} count - Number of followed DJs
     */
    updateDJCount(count) {
        // Update in main header if exists
        const headerCount = document.getElementById('dj-count');
        if (headerCount) {
            headerCount.textContent = count;
        }
        
        // Update in tab if exists
        const tabCount = document.getElementById('favorites-count');
        if (tabCount) {
            tabCount.textContent = count;
        }
        
        // Add count to tab text if it doesn't exist
        const favoritesTab = document.getElementById('tab-favorites');
        if (favoritesTab && !tabCount) {
            const icon = favoritesTab.querySelector('i');
            const text = favoritesTab.querySelector('.tab-text');
            if (text) {
                text.innerHTML = `Gevolgde DJ's <span id="favorites-count" class="bg-primary text-white text-xs rounded-full px-2 ml-1">${count}</span>`;
            }
        }
    }

    /**
     * Toon lege staat wanneer er geen favorieten zijn
     * @private
     */
    _showEmptyState(container, filterContainer) {
        container.innerHTML = `
            <div class="col-span-full text-center py-12">
                <div class="text-gray-400 mb-6">
                    <i class="fas fa-heart text-6xl"></i>
                </div>
                <h3 class="text-xl font-bold text-gray-700 mb-3">Nog geen DJ's gevolgd</h3>
                <p class="text-gray-500 mb-6">Zoek naar je favoriete artiesten en volg ze om op de hoogte te blijven van nieuwe releases</p>
                <button onclick="app.goToSearch()" class="bg-primary hover:bg-primary-dark text-white px-6 py-3 rounded-lg transition">
                    <i class="fas fa-search mr-2"></i>Begin met zoeken
                </button>
            </div>
        `;
        
        // Verberg filteropties wanneer er geen favorieten zijn
        if (filterContainer) filterContainer.classList.add('hidden');
    }

    /**
     * Toon "geen resultaten" staat na filteren
     * @private
     */
    _showNoResultsState(container) {
        const searchQuery = document.getElementById('favorites-search')?.value?.trim();
        container.innerHTML = `
            <div class="col-span-full text-center py-12">
                <div class="text-gray-400 mb-6">
                    <i class="fas fa-search text-5xl"></i>
                </div>
                <h3 class="text-xl font-bold text-gray-700 mb-3">Geen DJ's gevonden</h3>
                <p class="text-gray-500 mb-4">Geen DJ's gevonden die overeenkomen met "${searchQuery}"</p>
                <button onclick="document.getElementById('favorites-search').value = ''; app.displayFavorites();" 
                        class="text-primary hover:text-primary-dark transition">
                    <i class="fas fa-times mr-1"></i>Filter wissen
                </button>
            </div>
        `;
    }

    /**
     * Verwerk en filter favorieten op basis van gebruikersinstellingen
     * @param {Array} favorites - Originele lijst van favorieten
     * @returns {Array} Gesorteerde en gefilterde favorieten
     * @private
     */
    _processAndFilterFavorites(favorites) {
        // Maak een diepe kopie om originele array niet te wijzigen
        let processed = JSON.parse(JSON.stringify(favorites));
        
        // Sorteer op basis van geselecteerde optie
        processed = this._sortFavorites(processed);
        
        // Filter op basis van zoekterm
        processed = this._filterFavoritesBySearch(processed);
        
        return processed;
    }

    /**
     * Sorteer favorieten op basis van geselecteerde sorteeroptie
     * @param {Array} favorites - Favorieten om te sorteren
     * @returns {Array} Gesorteerde favorieten
     * @private
     */
    _sortFavorites(favorites) {
        const sortOrder = document.getElementById('favorites-sort')?.value || 'name-asc';
        
        switch (sortOrder) {
            case 'name-asc':
                return favorites.sort((a, b) => a.name.localeCompare(b.name));
            case 'name-desc':
                return favorites.sort((a, b) => b.name.localeCompare(a.name));
            case 'recent':
                // Sorteer op toegevoegd tijdstip (nieuwste eerst)
                return favorites.sort((a, b) => (b.addedAt || 0) - (a.addedAt || 0));
            default:
                return favorites.sort((a, b) => a.name.localeCompare(b.name));
        }
    }

    /**
     * Filter favorieten op basis van zoekterm
     * @param {Array} favorites - Favorieten om te filteren
     * @returns {Array} Gefilterde favorieten
     * @private
     */
    _filterFavoritesBySearch(favorites) {
        const searchQuery = document.getElementById('favorites-search')?.value?.trim().toLowerCase();
        
        if (!searchQuery) return favorites;
        
        return favorites.filter(artist => 
            artist.name.toLowerCase().includes(searchQuery)
        );
    }

    /**
     * Genereer HTML voor de lijst van favorieten
     * @param {Array} favorites - Favorieten om weer te geven
     * @returns {string} HTML string
     * @private
     */
    _generateFavoritesHTML(favorites) {
        return favorites.map(artist => this._generateArtistCard(artist)).join('');
    }

    /**
     * Genereer HTML voor één artiest kaart
     * @param {Object} artist - Artiest object
     * @returns {string} HTML string voor artiest kaart
     * @private
     */
    _generateArtistCard(artist) {
        const genreText = artist.genres ? 
            this._formatGenreName(artist.genres[0] || '') : 
            'DJ / Producer';

        const addedDate = artist.addedAt ? 
            new Date(artist.addedAt).toLocaleDateString('nl-NL', { 
                day: 'numeric', 
                month: 'short' 
            }) : '';

        return `
            <div class="artist-card bg-white rounded-xl overflow-hidden shadow-md hover:shadow-lg transition-all duration-300 flex flex-col animate__animated animate__fadeIn group">
                <div class="h-40 bg-gray-200 overflow-hidden relative">
                    <div class="is-favorite">
                        <i class="fas fa-heart"></i> Gevolgd
                    </div>
                    ${this._generateArtistImage(artist)}
                    <div class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent h-20"></div>
                    
                    <!-- Quick actions overlay -->
                    <div class="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                        <div class="flex gap-2">
                            <button onclick="app.getLatestTracks('${artist.id}')" 
                                class="bg-white text-gray-800 p-2 rounded-full hover:bg-gray-100 transition" 
                                title="Bekijk muziek">
                                <i class="fas fa-play"></i>
                            </button>
                            <button onclick="app.shareArtist('${artist.id}', '${artist.name}')" 
                                class="bg-white text-gray-800 p-2 rounded-full hover:bg-gray-100 transition"
                                title="Delen">
                                <i class="fas fa-share-alt"></i>
                            </button>
                        </div>
                    </div>
                </div>
                <div class="p-4 flex-grow flex flex-col">
                    <div class="flex justify-between items-start mb-2">
                        <h3 class="font-bold text-lg truncate flex-1">${artist.name}</h3>
                        ${addedDate ? `<span class="text-xs text-gray-400 ml-2">${addedDate}</span>` : ''}
                    </div>
                    <p class="text-gray-600 text-sm mb-3 truncate">${genreText}</p>
                    
                    <div class="mt-auto flex gap-2">
                        ${this._generateArtistActions(artist)}
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Genereer artiest afbeelding of placeholder
     * @param {Object} artist - Artiest object
     * @returns {string} HTML voor afbeelding
     * @private
     */
    _generateArtistImage(artist) {
        if (artist.img) {
            return `<img src="${artist.img}" alt="${artist.name}" class="w-full h-full object-cover">`;
        }
        
        return `
            <div class="w-full h-full flex items-center justify-center bg-gradient-to-r from-primary to-secondary text-white">
                <i class="fas fa-music text-4xl"></i>
            </div>
        `;
    }

    /**
     * Genereer actieknoppen voor artiest
     * @param {Object} artist - Artiest object
     * @returns {string} HTML voor actieknoppen
     * @private
     */
    _generateArtistActions(artist) {
        return `
            <button onclick="app.getLatestTracks('${artist.id}')" 
                class="flex-1 bg-primary hover:bg-primary-dark text-white py-2 rounded-lg transition flex items-center justify-center">
                <i class="fas fa-headphones mr-2"></i>Muziek
            </button>
            <button onclick="app.toggleFavorite('${artist.id}')" 
                class="bg-red-500 hover:bg-red-600 text-white p-2 rounded-lg transition">
                <i class="fas fa-heart-broken"></i>
            </button>
            <button onclick="app.shareArtist('${artist.id}', '${artist.name}')"
                class="bg-blue-500 hover:bg-blue-600 text-white p-2 rounded-lg transition">
                <i class="fas fa-share-alt"></i>
            </button>
        `;
    }

    /**
     * Formatteer genre naam voor weergave (bijv. "deep-house" -> "Deep House")
     * @param {string} genre - Genre string
     * @returns {string} Geformatteerde genre naam
     * @private
     */
    _formatGenreName(genre) {
        if (!genre) return '';
        
        return genre
            .split('-')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }

    /**
     * Setup quick actions voor artist cards
     * @private
     */
    _setupQuickActions() {
        // Deze functie kan later uitgebreid worden voor extra functionaliteit
        console.log('Quick actions setup completed');
    }

    /**
     * Initialiseer sorteer- en filterinstellingen
     */
    initializeSortingAndFiltering() {
        this._setupFavoritesSort();
        this._setupFavoritesSearch();
    }

    /**
     * Setup sorteerinstellingen voor favorieten
     * @private
     */
    _setupFavoritesSort() {
        const favoritesSort = document.getElementById('favorites-sort');
        if (favoritesSort) {
            favoritesSort.addEventListener('change', () => {
                // Herlaad favorieten met nieuwe sorteerinstelling
                if (app && app.displayFavorites) {
                    app.displayFavorites();
                }
            });
        }
    }

    /**
     * Setup zoekfunctionaliteit voor favorieten
     * @private
     */
    _setupFavoritesSearch() {
        const favoritesSearch = document.getElementById('favorites-search');
        if (favoritesSearch) {
            let debounceTimer;
            
            // Gebruik debouncing om te voorkomen dat er te veel herladingen plaatsvinden
            favoritesSearch.addEventListener('input', () => {
                clearTimeout(debounceTimer);
                debounceTimer = setTimeout(() => {
                    if (app && app.displayFavorites) {
                        app.displayFavorites();
                    }
                }, 300); // Wacht 300ms na laatste toetsaanslag
            });
        }
    }
}

// Maak globale instantie beschikbaar
window.gevolgdeDJsUI = new GevolgdeDJsUI();
