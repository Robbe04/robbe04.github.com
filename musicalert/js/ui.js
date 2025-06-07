/**
 * Basis UI Service
 * Behandelt algemene UI functionaliteiten zoals loading, berichten, en basisnavigatie
 */
class UIService {
    constructor() {
        this.currentTheme = localStorage.getItem('theme') || 'light';
        this.activeGenreFilters = [];
        this.audioVisualizers = new Map();
        this.preSearchGenreFilters = [];
        this.initializeTheme();
    }

    /**
     * Initialiseer UI elementen
     */
    async initialize() {
        // Wacht tot alle UI modules geladen zijn
        await this.waitForModules();
        
        // Initialiseer alle UI modules
        if (window.gevolgdeDJsUI) {
            window.gevolgdeDJsUI.initializeSortingAndFiltering();
        }
        if (window.nieuweReleasesUI) {
            window.nieuweReleasesUI.initializeSortingAndFiltering();
        }
        if (window.aankomendeReleasesUI) {
            // Aankomende releases heeft geen sorting/filtering
            console.log('Aankomende releases UI loaded');
        }
        if (window.evenementenUI) {
            window.evenementenUI.initialize();
        }

        this.setupBasicUIElements();
        this.setupLiveSearch();
        this.initializeMobileMenu();
        this.setupAudioVisualizerObserver();
        this.loadGenreFilters();
    }

    /**
     * Initialiseer sorteer- en filterfunctionaliteiten
     * Deze functie wordt aangeroepen vanuit app.js
     */
    initializeSortingAndFiltering() {
        // Deze functie bestaat voor backwards compatibility
        // De daadwerkelijke initialisatie gebeurt nu in de individuele modules
        console.log('UI sorting and filtering initialized');
    }

    /**
     * Wacht tot alle UI modules geladen zijn
     */
    async waitForModules() {
        const maxWait = 5000; // 5 seconden maximum wachttijd
        const startTime = Date.now();
        
        while (Date.now() - startTime < maxWait) {
            if (window.gevolgdeDJsUI && 
                window.nieuweReleasesUI && 
                window.aankomendeReleasesUI && 
                window.evenementenUI) {
                console.log('All UI modules loaded successfully');
                return;
            }
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        console.warn('Some UI modules may not have loaded within timeout');
    }

    /**
     * Setup basis UI elementen
     */
    setupBasicUIElements() {
        // Smooth scroll voor navigatie
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function(e) {
                e.preventDefault();
                const target = document.querySelector(this.getAttribute('href'));
                if (target) {
                    window.scrollTo({
                        top: target.offsetTop,
                        behavior: 'smooth'
                    });
                }
            });
        });
    }

    /**
     * Setup live search met debounce
     */
    setupLiveSearch() {
        const searchInput = document.getElementById('artistInput');
        const suggestionsContainer = document.getElementById('artistSuggestions');
        
        if (!searchInput || !suggestionsContainer) return;
        
        let debounceTimer;
        
        // Luister naar input in zoekvenster
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.trim();
            
            // Wis bestaande timer
            clearTimeout(debounceTimer);
            
            // Verberg suggesties als query leeg is
            if (query.length < 2) {
                suggestionsContainer.classList.add('hidden');
                return;
            }
            
            // Debounce de zoekopdracht om te veel API-calls te voorkomen
            debounceTimer = setTimeout(async () => {
                try {
                    // Voer zoekopdracht uit en toon suggesties
                    const artists = await api.searchArtists(query, 10);
                    app.lastSearchResults = artists;
                    this.displayArtistSuggestions(artists);
                } catch (error) {
                    console.error('Error in live search:', error);
                }
            }, 300); // Wacht 300ms na laatste toetsaanslag
        });
        
        // Verberg suggesties bij klikken buiten
        document.addEventListener('click', (e) => {
            if (!suggestionsContainer.contains(e.target) && e.target !== searchInput) {
                suggestionsContainer.classList.add('hidden');
            }
        });
        
        // Toon suggesties bij focus op zoekvenster als er content is
        searchInput.addEventListener('focus', () => {
            if (searchInput.value.trim().length >= 2 && app.lastSearchResults.length > 0) {
                this.displayArtistSuggestions(app.lastSearchResults);
            }
        });
    }

    /**
     * Toon artist suggesties onder zoekvenster
     */
    displayArtistSuggestions(artists) {
        const container = document.getElementById('artistSuggestions');
        
        if (!artists || artists.length === 0) {
            container.classList.add('hidden');
            return;
        }
        
        let html = '';
        
        artists.forEach(artist => {
            const artistImg = artist.images.length > 0 ? artist.images[0].url : '';
            const genres = artist.genres.length > 0 ? 
                this.formatGenreName(artist.genres[0]) : 'DJ / Producer';
            
            html += `
                <div class="artist-suggestion p-3 hover:bg-gray-100 cursor-pointer transition flex items-center border-b border-gray-100" 
                     onclick="app.getLatestTracks('${artist.id}')">
                    <div class="w-12 h-12 rounded-full overflow-hidden mr-3 flex-shrink-0">
                        ${artistImg ? 
                            `<img src="${artistImg}" alt="${artist.name}" class="w-full h-full object-cover">` : 
                            `<div class="w-full h-full flex items-center justify-center bg-gradient-to-r from-primary to-secondary text-white">
                                <i class="fas fa-music"></i>
                            </div>`
                        }
                    </div>
                    <div class="flex-1 min-w-0">
                        <p class="font-medium truncate">${artist.name}</p>
                        <p class="text-xs text-gray-500 truncate">${genres}</p>
                    </div>
                    <div class="flex-shrink-0 ml-2">
                        <span class="text-xs bg-gray-200 text-gray-800 px-2 py-1 rounded-full">
                            ${artist.popularity}%
                        </span>
                    </div>
                </div>
            `;
        });
        
        container.innerHTML = html;
        container.classList.remove('hidden');
    }

    /**
     * Toon laatste tracks van artiest
     */
    displayLatestTracks(artist, albums, relatedArtists = []) {
        const resultsContainer = document.getElementById('results');
        const artistImg = artist.images.length > 0 ? artist.images[0].url : '';
        const artistGenres = artist.genres.length ? 
            artist.genres.map(genre => this.formatGenreName(genre)).join(', ') : 
            'DJ / Producer';
        const isFavorite = app.favorites.some(fav => fav.id === artist.id);
        
        let html = `
            <div class="animate__animated animate__fadeIn">
                <div class="flex flex-col md:flex-row items-center md:items-start gap-6 mb-8">
                    <div class="w-48 h-48 rounded-xl overflow-hidden flex-shrink-0 relative">
                        ${isFavorite ? 
                            `<div class="is-favorite">
                                <i class="fas fa-heart"></i> Gevolgd
                            </div>` : ''
                        }
                        ${artistImg ? 
                            `<img src="${artistImg}" alt="${artist.name}" class="w-full h-full object-cover">` : 
                            `<div class="w-full h-full flex items-center justify-center bg-gradient-to-r from-primary to-secondary text-white">
                                <i class="fas fa-music text-4xl"></i>
                            </div>`
                        }
                    </div>
                    <div class="flex-1 text-center md:text-left">
                        <div class="flex flex-col md:flex-row md:justify-between md:items-center mb-4">
                            <h2 class="text-3xl font-bold text-primary mb-2 md:mb-0">${artist.name}</h2>
                            <button onclick="app.toggleFavorite('${artist.id}', '${artist.name}', '${artistImg}')" 
                                class="inline-flex items-center justify-center px-4 py-2 rounded-lg ${isFavorite ? 'bg-red-500 hover:bg-red-600' : 'bg-primary hover:bg-primary-dark'} text-white transition self-center md:self-auto">
                                <i class="fas ${isFavorite ? 'fa-heart-broken' : 'fa-heart'} mr-2"></i>
                                ${isFavorite ? 'Niet meer volgen' : 'Volgen'}
                            </button>
                        </div>
                        <p class="text-gray-600 mb-4">${artistGenres}</p>
                        <div class="flex items-center justify-center md:justify-start mb-4">
                            <div class="text-yellow-500 mr-2">
                                ${this.getPopularityStars(artist.popularity)}
                            </div>
                            <span class="text-sm text-gray-600">${artist.popularity}% populariteit</span>
                        </div>
                        <p class="text-gray-600">
                            ${artist.followers.total.toLocaleString('nl-NL')} volgers op Spotify
                        </p>
                        <div class="mt-4">
                            <a href="${artist.external_urls.spotify}" target="_blank" 
                               class="inline-flex items-center text-center bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition">
                               <i class="fab fa-spotify mr-2"></i>Bekijk op Spotify
                            </a>
                        </div>
                    </div>
                </div>
                <h3 class="text-2xl font-bold mb-6 text-primary">Nieuwste Releases</h3>
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        `;
        
        albums.forEach(album => {
            const releaseDate = new Date(album.release_date).toLocaleDateString('nl-NL');
            const previewTrack = album.tracks.items.find(track => track.preview_url);
            const hasMultipleTracks = album.total_tracks > 1;
            
            html += `
                <div class="album-card bg-white rounded-xl overflow-hidden shadow-md transition-all duration-300 animate__animated animate__fadeIn">
                    <div class="relative h-48 bg-gray-200 overflow-hidden">
                        ${album.images.length ? 
                            `<img src="${album.images[0].url}" alt="${album.name}" class="w-full h-full object-cover">` : 
                            `<div class="w-full h-full flex items-center justify-center bg-gradient-to-r from-primary to-secondary text-white">
                                <i class="fas fa-music text-4xl"></i>
                            </div>`
                        }
                        <div class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-4">
                            <span class="text-xs font-medium text-white bg-primary bg-opacity-90 rounded-full px-2 py-1">
                                ${album.album_type.toUpperCase()}
                            </span>
                            <span class="text-xs font-medium text-white ml-2">${releaseDate}</span>
                            ${hasMultipleTracks ? 
                                `<span class="text-xs font-medium text-white ml-2">
                                    <i class="fas fa-list-ul mr-1"></i>${album.total_tracks} tracks
                                </span>` : ''
                            }
                        </div>
                    </div>
                    <div class="p-4">
                        <h4 class="font-bold text-lg mb-1">${album.name}</h4>
                        <p class="text-gray-600 text-sm mb-3">${album.total_tracks} ${album.total_tracks === 1 ? 'nummer' : 'nummers'}</p>
                        ${previewTrack ? `
                            <div class="mb-4">
                                <div class="flex justify-between items-center mb-1">
                                    <span class="text-xs text-gray-500">${previewTrack.name}</span>
                                    <span class="text-xs text-gray-500 track-duration">${this.formatDuration(previewTrack.duration_ms)}</span>
                                </div>
                                <div class="audio-visualizer" id="visualizer-${previewTrack.id}" data-track-id="${previewTrack.id}">
                                    ${Array(20).fill().map(() => `<div class="audio-bar" style="height: ${5 + Math.random() * 25}px;"></div>`).join('')}
                                </div>
                                <div class="audio-container">
                                    <audio 
                                        id="audio-${previewTrack.id}" 
                                        class="w-full audio-player" 
                                        src="${previewTrack.preview_url}" 
                                        data-track-id="${previewTrack.id}"
                                        data-track-duration="${previewTrack.duration_ms}"
                                        controls
                                        data-artist-id="${artist.id}"
                                        data-album-name="${album.name}"
                                        data-track-name="${previewTrack.name}"
                                    ></audio>
                                </div>
                            </div>
                        ` : `
                            <p class="text-red-500 mb-4 text-sm">Preview niet beschikbaar</p>
                        `}
                        <div class="flex gap-2 mb-2">
                            <a href="${album.external_urls.spotify}" target="_blank" 
                               class="flex-1 text-center bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg transition">
                               <i class="fab fa-spotify mr-2"></i>Beluisteren
                            </a>
                            <button onclick="app.shareRelease('${artist.name}', '${album.name}', '${album.external_urls.spotify}')" 
                               class="bg-blue-500 hover:bg-blue-600 text-white p-2 rounded-lg transition">
                               <i class="fas fa-share-alt"></i>
                            </button>
                        </div>
                        ${hasMultipleTracks ? `
                            <button onclick="ui.showAlbumTracks('${album.id}', '${album.name}', '${artist.name}')" 
                               class="w-full mt-2 bg-gray-200 hover:bg-gray-300 text-gray-800 py-2 rounded-lg transition flex items-center justify-center">
                               <i class="fas fa-list mr-2"></i>Bekijk alle ${album.total_tracks} tracks
                            </button>
                        ` : ''}
                    </div>
                </div>
            `;
        });
        
        html += `</div>`;
        
        resultsContainer.innerHTML = html;
        
        // Initialiseer audio visualizers
        this.initAudioVisualizers();
    }

    /**
     * Formatteer track duratie van milliseconden naar MM:SS formaat
     */
    formatDuration(ms) {
        if (!ms) return "0:00";
        const minutes = Math.floor(ms / 60000);
        const seconds = Math.floor((ms % 60000) / 1000);
        return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
    }

    /**
     * Genereer ster rating op basis van populariteit
     */
    getPopularityStars(popularity) {
        const starCount = Math.round(popularity / 20);
        let stars = '';
        
        for (let i = 0; i < 5; i++) {
            if (i < starCount) {
                stars += '<i class="fas fa-star"></i>';
            } else {
                stars += '<i class="far fa-star"></i>';
            }
        }
        
        return stars;
    }

    /**
     * Formatteer genre naam voor weergave
     */
    formatGenreName(genre) {
        return genre
            .split('-')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }

    /**
     * Initialiseer audio visualizers voor tracks
     */
    initAudioVisualizers() {
        document.querySelectorAll('.audio-player').forEach(audio => {
            const trackId = audio.dataset.trackId;
            const visualizer = document.getElementById(`visualizer-${trackId}`);
            
            if (!visualizer) return;
            
            audio.addEventListener('play', () => {
                this.startVisualizer(trackId);
                
                // Pauzeer andere audio spelers
                document.querySelectorAll('.audio-player').forEach(otherAudio => {
                    if (otherAudio !== audio && !otherAudio.paused) {
                        otherAudio.pause();
                    }
                });
            });
            
            audio.addEventListener('pause', () => {
                this.stopVisualizer(trackId);
            });
            
            audio.addEventListener('ended', () => {
                this.stopVisualizer(trackId);
            });
        });
    }

    /**
     * Setup mutation observer voor audio visualizers
     */
    setupAudioVisualizerObserver() {
        // Kijk naar nieuwe audio spelers die aan de DOM worden toegevoegd
        const observer = new MutationObserver((mutations) => {
            mutations.forEach(mutation => {
                if (mutation.addedNodes.length) {
                    mutation.addedNodes.forEach(node => {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            const audioPlayers = node.querySelectorAll('.audio-player');
                            if (audioPlayers.length) {
                                this.initAudioVisualizers();
                            }
                        }
                    });
                }
            });
        });
        
        observer.observe(document.body, { childList: true, subtree: true });
    }

    /**
     * Start audio visualizer animatie
     */
    startVisualizer(trackId) {
        const visualizer = document.getElementById(`visualizer-${trackId}`);
        if (!visualizer) return;
        
        const bars = visualizer.querySelectorAll('.audio-bar');
        
        // Stop bestaande animatie als die er is
        if (this.audioVisualizers.has(trackId)) {
            cancelAnimationFrame(this.audioVisualizers.get(trackId));
        }
        
        const animate = () => {
            bars.forEach(bar => {
                const height = 5 + Math.random() * 25;
                bar.style.height = `${height}px`;
            });
            this.audioVisualizers.set(trackId, requestAnimationFrame(animate));
        };
        
        this.audioVisualizers.set(trackId, requestAnimationFrame(animate));
    }

    /**
     * Stop audio visualizer animatie
     */
    stopVisualizer(trackId) {
        if (this.audioVisualizers.has(trackId)) {
            cancelAnimationFrame(this.audioVisualizers.get(trackId));
            this.audioVisualizers.delete(trackId);
            
            // Reset visualizer bars
            const visualizer = document.getElementById(`visualizer-${trackId}`);
            if (visualizer) {
                const bars = visualizer.querySelectorAll('.audio-bar');
                bars.forEach(bar => {
                    bar.style.height = '5px';
                });
            }
        }
    }

    /**
     * Laad en toon genre filters
     */
    async loadGenreFilters() {
        const container = document.getElementById('genreFilters');
        
        if (!container) return;
        
        try {
            const genres = await api.getGenres();
            
            // Filter om vooral elektronische en DJ-gerelateerde genres te krijgen
            const relevantGenres = [
                'house', 'techno', 'electronic', 'edm', 'dance', 'deep-house', 
                'electro', 'drum-and-bass', 'dubstep', 'trance', 'progressive-house',
                'ambient', 'trap', 'hip-hop', 'r-n-b', 'pop', 'club', 'detroit-techno',
                'disco', 'minimal-techno', 'tech-house'
            ];
            
            const genresToShow = genres.filter(genre => 
                relevantGenres.some(relevantGenre => genre.includes(relevantGenre))
            ).slice(0, 12);
            
            container.innerHTML = '';
            
            genresToShow.forEach(genre => {
                const button = document.createElement('button');
                button.className = 'px-3 py-1 text-sm rounded-full bg-gray-200 hover:bg-gray-300 transition';
                button.textContent = this.formatGenreName(genre);
                button.dataset.genre = genre;
                button.addEventListener('click', () => this.toggleGenreFilter(button));
                container.appendChild(button);
            });
        } catch (error) {
            container.innerHTML = '<span class="text-red-500">Fout bij het laden van genres</span>';
            console.error('Error loading genres:', error);
        }
    }

    /**
     * Toggle een genre filter display
     */
    toggleGenreFilter(button) {
        const genre = button.dataset.genre;
        
        if (this.activeGenreFilters.includes(genre)) {
            this.activeGenreFilters = this.activeGenreFilters.filter(g => g !== genre);
            button.classList.remove('bg-primary', 'text-white');
            button.classList.add('bg-gray-200');
        } else {
            this.activeGenreFilters.push(genre);
            button.classList.remove('bg-gray-200');
            button.classList.add('bg-primary', 'text-white');
        }
        
        // Als we artiest zoekresultaten hebben, filter ze
        if (app.lastSearchResults && app.lastSearchResults.length) {
            this.displayArtistSuggestions(app.lastSearchResults);
        }
    }

    /**
     * Toon loading indicator
     */
    showLoading(message = 'Laden...') {
        const overlay = document.getElementById('loading-overlay');
        const text = document.getElementById('loading-text');
        if (text) text.textContent = message;
        if (overlay) overlay.classList.remove('hidden');
    }

    /**
     * Verberg loading indicator
     */
    hideLoading() {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) overlay.classList.add('hidden');
    }

    /**
     * Toon foutmelding
     */
    showError(message) {
        alert(message);
    }

    /**
     * Toon bericht toast
     */
    showMessage(message, type = 'info') {
        // Maak toast aan als deze niet bestaat
        let toast = document.getElementById('toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'toast';
            toast.className = 'fixed bottom-4 left-1/2 transform -translate-x-1/2 px-4 py-2 rounded-lg text-white shadow-lg transition-opacity duration-300 z-50 opacity-0 max-w-sm text-center text-sm';
            document.body.appendChild(toast);
        }
        
        // Stel bericht en kleur in
        toast.textContent = message;
        toast.className = toast.className.replace(/bg-\w+-500/g, '');
        
        if (type === 'error') {
            toast.classList.add('bg-red-500');
        } else if (type === 'success') {
            toast.classList.add('bg-green-500');
        } else {
            toast.classList.add('bg-blue-500');
        }
        
        // Toon toast
        setTimeout(() => toast.classList.add('opacity-100'), 10);
        
        // Verberg toast na 4 seconden (iets langer voor langere berichten)
        setTimeout(() => {
            toast.classList.remove('opacity-100');
            setTimeout(() => toast.classList.add('opacity-0'), 300);
        }, 4000);
    }

    /**
     * Update notification toggle
     */
    updateNotificationToggle(isSubscribed) {
        const notificationToggle = document.getElementById('notification-toggle');
        const notificationSettings = document.getElementById('notification-settings');
        
        if (notificationToggle) {
            if (isSubscribed) {
                notificationToggle.innerHTML = '<i class="fas fa-bell mr-2"></i>Notificaties uitschakelen';
                notificationToggle.classList.remove('bg-primary');
                notificationToggle.classList.add('bg-gray-500');
            } else {
                notificationToggle.innerHTML = '<i class="far fa-bell mr-2"></i>Notificaties inschakelen';
                notificationToggle.classList.remove('bg-gray-500');
                notificationToggle.classList.add('bg-primary');
            }
        }
        
        if (notificationSettings) {
            if (isSubscribed) {
                notificationSettings.innerHTML = '<i class="fas fa-bell mr-2"></i>Notificaties Uitschakelen';
                notificationSettings.classList.remove('bg-primary');
                notificationSettings.classList.add('bg-gray-500');
            } else {
                notificationSettings.innerHTML = '<i class="far fa-bell mr-2"></i>Notificaties Inschakelen';
                notificationSettings.classList.remove('bg-gray-500');
                notificationSettings.classList.add('bg-primary');
            }
        }
        
        // Update mobile button
        this.updateMobileNotificationButton(isSubscribed);
    }

    /**
     * Update mobile notification button
     */
    updateMobileNotificationButton(isSubscribed) {
        const mobileIcon = document.getElementById('mobile-notification-icon');
        const mobileText = document.getElementById('mobile-notification-text');
        
        if (mobileIcon && mobileText) {
            if (isSubscribed) {
                mobileIcon.className = 'fas fa-bell mr-3 text-blue-500';
                mobileText.textContent = 'Notificaties Uitschakelen';
            } else {
                mobileIcon.className = 'far fa-bell mr-3 text-blue-500';
                mobileText.textContent = 'Notificaties Inschakelen';
            }
        }
    }

    /**
     * Initialiseer mobiel menu
     */
    initializeMobileMenu() {
        const mobileButton = document.getElementById('mobile-quick-actions');
        const mobileMenu = document.getElementById('mobile-menu');
        
        if (mobileButton && mobileMenu) {
            document.addEventListener('click', (e) => {
                if (!mobileMenu.contains(e.target) && 
                    e.target !== mobileButton &&
                    !mobileButton.contains(e.target) && 
                    !mobileMenu.classList.contains('hidden')) {
                    app.closeQuickActions();
                }
            });
        }
    }

    /**
     * Initialiseer thema
     */
    initializeTheme() {
        if (this.currentTheme === 'dark') {
            document.documentElement.classList.add('dark');
        } else if (this.currentTheme === 'system') {
            if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
                document.documentElement.classList.add('dark');
            }
            
            window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
                if (this.currentTheme === 'system') {
                    if (e.matches) {
                        document.documentElement.classList.add('dark');
                    } else {
                        document.documentElement.classList.remove('dark');
                    }
                }
            });
        }
    }

    /**
     * Update thema
     */
    updateTheme(theme) {
        this.currentTheme = theme;
        localStorage.setItem('theme', theme);
        
        if (theme === 'dark') {
            document.documentElement.classList.add('dark');
        } else if (theme === 'light') {
            document.documentElement.classList.remove('dark');
        } else if (theme === 'system') {
            if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
                document.documentElement.classList.add('dark');
            } else {
                document.documentElement.classList.remove('dark');
            }
        }
        
        const themeText = theme === 'system' ? 'systeemvoorkeur' : theme === 'dark' ? 'donker' : 'licht';
        this.showMessage(`Thema gewijzigd naar ${themeText}`, 'success');
    }

    /**
     * Toon alle tracks van een album in een popup
     * @param {string} albumId - Album ID
     * @param {string} albumName - Album naam
     * @param {string} artistName - Artiest naam
     */
    async showAlbumTracks(albumId, albumName, artistName) {
        try {
            ui.showLoading('Album tracks laden...');
            
            // Get album details
            const album = await api.getAlbum(albumId);
            
            ui.hideLoading();
            
            // Create modal
            const modal = this._createAlbumTracksModal(album, artistName);
            document.body.appendChild(modal);
            
            // Show modal
            setTimeout(() => {
                modal.classList.remove('opacity-0');
                modal.classList.add('opacity-100');
            }, 10);
            
            // Setup close handlers
            this._setupAlbumModalCloseHandlers(modal);
            
        } catch (error) {
            ui.hideLoading();
            console.error('Error loading album tracks:', error);
            ui.showMessage('Fout bij het laden van album tracks', 'error');
        }
    }

    /**
     * Maak album tracks modal
     * @param {Object} album - Album object
     * @param {string} artistName - Artist name
     * @returns {HTMLElement} Modal element
     * @private
     */
    _createAlbumTracksModal(album, artistName) {
        const modal = document.createElement('div');
        modal.id = 'album-tracks-modal';
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 opacity-0 transition-opacity duration-300';
        
        const albumImg = album.images.length ? album.images[0].url : '';
        const releaseDate = new Date(album.release_date).toLocaleDateString('nl-NL');
        
        modal.innerHTML = `
            <div class="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-hidden animate__animated animate__fadeInUp">
                <!-- Header -->
                <div class="bg-gradient-to-r from-primary to-secondary text-white p-6">
                    <div class="flex items-start gap-4">
                        <div class="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 bg-white bg-opacity-20">
                            ${albumImg ? 
                                `<img src="${albumImg}" alt="${album.name}" class="w-full h-full object-cover">` : 
                                `<div class="w-full h-full flex items-center justify-center">
                                    <i class="fas fa-music text-2xl"></i>
                                </div>`
                            }
                        </div>
                        <div class="flex-1 min-w-0">
                            <h2 class="text-xl font-bold mb-1 truncate">${album.name}</h2>
                            <p class="text-white text-opacity-90 mb-2">${artistName}</p>
                            <div class="flex items-center gap-4 text-sm text-white text-opacity-75">
                                <span><i class="fas fa-calendar mr-1"></i>${releaseDate}</span>
                                <span><i class="fas fa-music mr-1"></i>${album.total_tracks} tracks</span>
                                <span class="capitalize">${album.album_type}</span>
                            </div>
                        </div>
                        <button onclick="this.closest('#album-tracks-modal').remove()" 
                            class="text-white hover:text-gray-200 transition p-1">
                            <i class="fas fa-times text-xl"></i>
                        </button>
                    </div>
                </div>
                
                <!-- Tracks List -->
                <div class="overflow-y-auto max-h-96 p-4">
                    <div class="space-y-2">
                        ${album.tracks.items.map((track, index) => this._generateTrackItem(track, index + 1, album)).join('')}
                    </div>
                </div>
                
                <!-- Footer -->
                <div class="bg-gray-50 px-6 py-4 flex gap-3">
                    <a href="${album.external_urls.spotify}" target="_blank" 
                       class="flex-1 text-center bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg transition">
                       <i class="fab fa-spotify mr-2"></i>Open in Spotify
                    </a>
                    <button onclick="app.shareRelease('${artistName}', '${album.name}', '${album.external_urls.spotify}')" 
                       class="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition">
                       <i class="fas fa-share-alt mr-2"></i>Delen
                    </button>
                    <button onclick="this.closest('#album-tracks-modal').remove()" 
                       class="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition">
                       Sluiten
                    </button>
                </div>
            </div>
        `;
        
        return modal;
    }

    /**
     * Genereer track item voor album modal
     * @param {Object} track - Track object
     * @param {number} trackNumber - Track number
     * @param {Object} album - Album object
     * @returns {string} HTML string
     * @private
     */
    _generateTrackItem(track, trackNumber, album) {
        const duration = this.formatDuration(track.duration_ms);
        const hasPreview = track.preview_url;
        const isExplicit = track.explicit;
        
        return `
            <div class="track-item flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition group">
                <div class="flex-shrink-0 w-8 text-center">
                    ${hasPreview ? `
                        <button onclick="this.playTrackPreview('${track.preview_url}', this)" 
                            class="play-btn w-8 h-8 rounded-full bg-primary text-white hover:bg-primary-dark transition opacity-0 group-hover:opacity-100">
                            <i class="fas fa-play text-xs"></i>
                        </button>
                        <span class="track-number text-gray-500 text-sm group-hover:hidden">${trackNumber}</span>
                    ` : `
                        <span class="track-number text-gray-500 text-sm">${trackNumber}</span>
                    `}
                </div>
                
                <div class="flex-1 min-w-0">
                    <h4 class="font-medium truncate">${track.name}</h4>
                    <p class="text-sm text-gray-500 truncate">
                        ${track.artists.map(artist => artist.name).join(', ')}
                        ${isExplicit ? '<span class="ml-2 text-xs bg-gray-200 text-gray-800 px-1 rounded">E</span>' : ''}
                    </p>
                </div>
                
                <div class="flex items-center gap-2 text-sm text-gray-500">
                    ${hasPreview ? `
                        <i class="fas fa-volume-up text-xs" title="Preview beschikbaar"></i>
                    ` : ''}
                    <span>${duration}</span>
                </div>
                
                <div class="flex gap-1 opacity-0 group-hover:opacity-100 transition">
                    <a href="${track.external_urls.spotify}" target="_blank" 
                       class="text-green-600 hover:text-green-700 p-1" title="Open in Spotify">
                        <i class="fab fa-spotify text-sm"></i>
                    </a>
                </div>
            </div>
        `;
    }

    /**
     * Setup close handlers voor album modal
     * @param {HTMLElement} modal - Modal element
     * @private
     */
    _setupAlbumModalCloseHandlers(modal) {
        // Close on background click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.add('opacity-0');
                setTimeout(() => modal.remove(), 300);
            }
        });
        
        // Close on Escape key
        const handleKeyPress = (e) => {
            if (e.key === 'Escape') {
                modal.classList.add('opacity-0');
                setTimeout(() => modal.remove(), 300);
                document.removeEventListener('keydown', handleKeyPress);
            }
        };
        document.addEventListener('keydown', handleKeyPress);
    }
}

// Initialiseer UI service
const ui = new UIService();