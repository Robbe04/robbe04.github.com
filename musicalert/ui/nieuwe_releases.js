/**
 * Nieuwe Releases UI Module
 * Behandelt het weergeven van nieuwe releases van gevolgde artiesten
 */
class NieuweReleasesUI {
    constructor() {
        this.releases = [];
    }

    /**
     * Toon loading skeletons
     */
    showLoadingSkeletons() {
        const container = document.getElementById('notifications');
        if (!container) return;
        
        const skeletons = Array(6).fill().map(() => `
            <div class="release-card bg-white rounded-xl overflow-hidden shadow-md animate-pulse">
                <div class="flex">
                    <div class="w-16 h-16 bg-gray-300 flex-shrink-0"></div>
                    <div class="flex-1 p-4">
                        <div class="flex justify-between items-start mb-2">
                            <div class="flex-1">
                                <div class="h-4 bg-gray-300 rounded mb-2 w-3/4"></div>
                                <div class="h-3 bg-gray-200 rounded w-1/2"></div>
                            </div>
                            <div class="w-16 h-6 bg-gray-200 rounded-full ml-4"></div>
                        </div>
                        <div class="flex gap-2 mt-3">
                            <div class="h-8 bg-gray-300 rounded flex-1"></div>
                            <div class="h-8 w-8 bg-gray-300 rounded"></div>
                            <div class="h-8 w-8 bg-gray-300 rounded"></div>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
        
        container.innerHTML = `
            <div class="space-y-4">
                <div class="text-center py-4">
                    <div class="inline-flex items-center text-primary">
                        <div class="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent mr-3"></div>
                        <span class="font-medium">Nieuwe releases controleren...</span>
                    </div>
                    <p class="text-sm text-gray-500 mt-2">We doorzoeken je gevolgde DJ's voor verse tracks</p>
                </div>
                ${skeletons}
            </div>
        `;
    }

    /**
     * Verwerk en filter releases voor weergave
     * @param {Array} releases - Originele releases
     * @returns {Array} Verwerkte releases
     * @private
     */
    _processAndFilterReleases(releases) {
        // Start met de releases zoals ze van de API komen (al gesorteerd op release datum)
        let processed = [...releases];
        
        // Controleer of er een sorteeroptie is geselecteerd
        const sortOption = document.getElementById('releases-sort')?.value;
        if (sortOption) {
            processed = this._sortReleases(processed, sortOption);
        }
        
        // Filter op basis van zoekterm als die er is
        const searchQuery = document.getElementById('releases-search')?.value?.trim().toLowerCase();
        if (searchQuery) {
            processed = processed.filter(release => 
                release.artist.name.toLowerCase().includes(searchQuery) ||
                release.album.name.toLowerCase().includes(searchQuery)
            );
        }
        
        return processed;
    }

    /**
     * Sorteer releases op basis van geselecteerde optie
     * @param {Array} releases - Releases om te sorteren
     * @param {string} sortOption - Sorteeroptie
     * @returns {Array} Gesorteerde releases
     * @private
     */
    _sortReleases(releases, sortOption) {
        switch (sortOption) {
            case 'date-desc':
                // Nieuwste eerst (default van API)
                return releases.sort((a, b) => 
                    new Date(b.album.release_date).getTime() - new Date(a.album.release_date).getTime()
                );
            case 'date-asc':
                // Oudste eerst
                return releases.sort((a, b) => 
                    new Date(a.album.release_date).getTime() - new Date(b.album.release_date).getTime()
                );
            case 'artist-asc':
                // Artiest A-Z
                return releases.sort((a, b) => 
                    a.artist.name.localeCompare(b.artist.name)
                );
            case 'artist-desc':
                // Artiest Z-A
                return releases.sort((a, b) => 
                    b.artist.name.localeCompare(a.artist.name)
                );
            case 'album-asc':
                // Album naam A-Z
                return releases.sort((a, b) => 
                    a.album.name.localeCompare(b.album.name)
                );
            case 'album-desc':
                // Album naam Z-A
                return releases.sort((a, b) => 
                    b.album.name.localeCompare(a.album.name)
                );
            default:
                // Default: nieuwste eerst
                return releases.sort((a, b) => 
                    new Date(b.album.release_date).getTime() - new Date(a.album.release_date).getTime()
                );
        }
    }

    /**
     * Genereer HTML voor alle releases
     * @param {Array} releases - Releases om weer te geven
     * @returns {string} HTML string
     * @private
     */
    _generateReleasesHTML(releases) {
        return `
            <div class="space-y-4">
                ${releases.map(release => this._generateReleaseCard(release)).join('')}
            </div>
        `;
    }

    /**
     * Genereer HTML voor één release
     * @param {Object} release - Release object
     * @returns {string} HTML string voor release
     * @private
     */
    _generateReleaseCard(release) {
        const { artist, album, collaborationInfo } = release;
        const releaseDate = new Date(album.release_date).toLocaleDateString('nl-NL', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
        
        // Calculate how many hours/days ago this was released
        const now = new Date();
        const releaseDateObj = new Date(album.release_date);
        const timeDiff = now.getTime() - releaseDateObj.getTime();
        const hoursAgo = Math.floor(timeDiff / (1000 * 60 * 60));
        const daysAgo = Math.floor(hoursAgo / 24);
        
        let timeAgoText = '';
        if (daysAgo === 0) {
            if (hoursAgo < 1) {
                timeAgoText = 'Zojuist uitgebracht';
            } else {
                timeAgoText = `${hoursAgo} uur geleden`;
            }
        } else if (daysAgo === 1) {
            timeAgoText = 'Gisteren';
        } else {
            timeAgoText = `${daysAgo} dagen geleden`;
        }
        
        const albumImg = album.images.length ? album.images[0].url : '';
        const isMultiTrack = album.total_tracks > 1;
        const isFavoriteRelease = this._isReleaseInFavorites(album.id);
        
        return `
            <div class="release-card bg-white rounded-xl overflow-hidden shadow-md hover:shadow-lg transition-all duration-300 animate__animated animate__fadeIn">
                <div class="flex">
                    <div class="w-16 h-16 md:w-20 md:h-20 flex-shrink-0 bg-gray-200 overflow-hidden relative">
                        ${albumImg ? 
                            `<img src="${albumImg}" alt="${album.name}" class="w-full h-full object-cover">` : 
                            `<div class="w-full h-full flex items-center justify-center bg-gradient-to-r from-primary to-secondary text-white">
                                <i class="fas fa-music"></i>
                            </div>`
                        }
                        <div class="absolute top-1 right-1">
                            <button onclick="window.nieuweReleasesUI.toggleFavoriteRelease('${album.id}')" 
                                class="text-white hover:text-red-400 transition ${isFavoriteRelease ? 'text-red-400' : 'text-gray-400'}"
                                title="${isFavoriteRelease ? 'Verwijder uit favorieten' : 'Toevoegen aan favorieten'}">
                                <i class="fas fa-heart text-xs"></i>
                            </button>
                        </div>
                        ${daysAgo === 0 ? `
                            <div class="absolute bottom-1 left-1">
                                <span class="bg-red-500 text-white text-xs px-1 rounded-full animate-pulse">
                                    NIEUW
                                </span>
                            </div>
                        ` : ''}
                    </div>
                    <div class="flex-1 p-3 md:p-4 min-w-0">
                        <div class="flex justify-between items-start mb-2">
                            <div class="min-w-0 flex-1">
                                <h4 class="font-bold text-sm md:text-base truncate">${album.name}</h4>
                                <p class="text-gray-600 text-xs md:text-sm">
                                    ${artist.name}
                                    ${collaborationInfo && collaborationInfo.isCollaboration ? 
                                        ` <span class="text-primary">ft. ${collaborationInfo.collaboratingArtists.join(', ')}</span>` : ''
                                    }
                                </p>
                            </div>
                            <div class="flex flex-col items-end gap-1 ml-2 flex-shrink-0">
                                <span class="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full whitespace-nowrap">
                                    ${releaseDate}
                                </span>
                                <span class="text-xs text-blue-600 font-medium">
                                    ${timeAgoText}
                                </span>
                                ${album.album_type === 'single' ? 
                                    '<span class="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">Single</span>' : 
                                    '<span class="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">Album</span>'
                                }
                            </div>
                        </div>
                        
                        ${collaborationInfo && collaborationInfo.isCollaboration ? `
                            <div class="mb-2">
                                <span class="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded-full">
                                    <i class="fas fa-users mr-1"></i>Collaboration
                                </span>
                            </div>
                        ` : ''}
                        
                        <div class="flex gap-2 text-xs md:text-sm">
                            <a href="${album.external_urls.spotify}" target="_blank" 
                               class="flex-1 text-center bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg transition">
                               <i class="fab fa-spotify mr-1"></i>Beluisteren
                            </a>
                            <button onclick="app.getLatestTracks('${artist.id}')" 
                               class="bg-purple-500 hover:bg-purple-600 text-white p-2 rounded-lg transition" title="Bekijk DJ profiel">
                               <i class="fas fa-user"></i>
                            </button>
                            <button onclick="app.shareRelease('${artist.name}', '${album.name}', '${album.external_urls.spotify}')" 
                               class="bg-blue-500 hover:bg-blue-600 text-white p-2 rounded-lg transition" title="Delen">
                               <i class="fas fa-share-alt"></i>
                            </button>
                            ${isMultiTrack ? `
                                <button onclick="ui.showAlbumTracks('${album.id}', '${album.name}', '${artist.name}')" 
                                   class="bg-gray-500 hover:bg-gray-600 text-white p-2 rounded-lg transition" title="Alle tracks">
                                   <i class="fas fa-list"></i>
                                </button>
                            ` : ''}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Check if release is in favorites
     * @param {string} albumId - Album ID
     * @returns {boolean} True if in favorites
     * @private
     */
    _isReleaseInFavorites(albumId) {
        const favoriteReleases = JSON.parse(localStorage.getItem('favoriteReleases') || '[]');
        return favoriteReleases.includes(albumId);
    }

    /**
     * Toggle favorite status of a release
     * @param {string} albumId - Album ID
     */
    toggleFavoriteRelease(albumId) {
        const favoriteReleases = JSON.parse(localStorage.getItem('favoriteReleases') || '[]');
        const index = favoriteReleases.indexOf(albumId);
        
        if (index >= 0) {
            favoriteReleases.splice(index, 1);
            ui.showMessage('Release verwijderd uit favorieten', 'info');
        } else {
            favoriteReleases.push(albumId);
            ui.showMessage('Release toegevoegd aan favorieten', 'success');
        }
        
        localStorage.setItem('favoriteReleases', JSON.stringify(favoriteReleases));
        
        // Update UI
        const heartButton = document.querySelector(`button[onclick*="${albumId}"] i`);
        if (heartButton) {
            const button = heartButton.parentElement;
            if (index >= 0) {
                button.classList.remove('text-red-400');
                button.classList.add('text-gray-400');
                button.title = 'Toevoegen aan favorieten';
            } else {
                button.classList.remove('text-gray-400');
                button.classList.add('text-red-400');
                button.title = 'Verwijder uit favorieten';
            }
        }
    }

    /**
     * Setup favorite releases functionality
     * @private
     */
    _setupFavoriteReleases() {
        // This is handled in the HTML generation
        console.log('Favorite releases functionality setup completed');
    }

    /**
     * Initialiseer sorteer- en filterinstellingen
     */
    initializeSortingAndFiltering() {
        this._setupReleasesSort();
        this._setupReleasesSearch();
    }

    /**
     * Setup sorteerinstellingen voor releases
     * @private
     */
    _setupReleasesSort() {
        const releasesSort = document.getElementById('releases-sort');
        if (releasesSort) {
            releasesSort.addEventListener('change', () => {
                // Herlaad releases met nieuwe sorteerinstelling
                if (app && app.checkNewReleases) {
                    // Re-process current releases instead of fetching new ones
                    if (this.releases && this.releases.length > 0) {
                        this.displayNotifications(this.releases);
                    }
                }
            });
        }
    }

    /**
     * Setup zoekfunctionaliteit voor releases
     * @private
     */
    _setupReleasesSearch() {
        const releasesSearch = document.getElementById('releases-search');
        if (releasesSearch) {
            let debounceTimer;
            
            releasesSearch.addEventListener('input', () => {
                clearTimeout(debounceTimer);
                debounceTimer = setTimeout(() => {
                    if (this.releases && this.releases.length > 0) {
                        this.displayNotifications(this.releases);
                    }
                }, 300);
            });
        }
    }

    /**
     * Toon nieuwe releases
     * @param {Array} releases - Array van nieuwe releases
     */
    displayNotifications(releases) {
        // Store releases for sorting/filtering
        this.releases = releases;
        
        const container = document.getElementById('notifications');
        
        if (!releases.length) {
            this._showEmptyState(container);
            return;
        }
        
        // Process releases for display
        const processedReleases = this._processAndFilterReleases(releases);
        
        if (processedReleases.length === 0) {
            this._showNoResultsState(container);
            return;
        }
        
        const html = this._generateReleasesHTML(processedReleases);
        container.innerHTML = html;
        
        // Add favorite functionality
        this._setupFavoriteReleases();
    }

    /**
     * Toon lege staat wanneer er geen releases zijn
     * @private
     */
    _showEmptyState(container) {
        container.innerHTML = `
            <div class="text-center py-12">
                <div class="text-gray-400 mb-6">
                    <i class="fas fa-music text-6xl"></i>
                </div>
                <h3 class="text-xl font-bold text-gray-700 mb-3">Geen nieuwe releases</h3>
                <p class="text-gray-500 mb-6">Je gevolgde DJ's hebben recent geen nieuwe muziek uitgebracht</p>
                <button onclick="app.checkNewReleases()" class="bg-primary hover:bg-primary-dark text-white px-6 py-3 rounded-lg transition">
                    <i class="fas fa-refresh mr-2"></i>Opnieuw controleren
                </button>
            </div>
        `;
    }

    /**
     * Toon "geen resultaten" staat na filteren
     * @private
     */
    _showNoResultsState(container) {
        container.innerHTML = `
            <div class="text-center py-12">
                <div class="text-gray-400 mb-6">
                    <i class="fas fa-filter text-5xl"></i>
                </div>
                <h3 class="text-xl font-bold text-gray-700 mb-3">Geen releases gevonden</h3>
                <p class="text-gray-500 mb-4">Geen releases gevonden met de huidige filters</p>
            </div>
        `;
    }
}

// Maak globale instantie beschikbaar
window.nieuweReleasesUI = new NieuweReleasesUI();
