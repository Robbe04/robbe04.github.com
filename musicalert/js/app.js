/**
 * Main Application
 * Coordinates functionality between UI and API services
 */
class MusicAlertApp {
    constructor() {
        // Use localStorage with a persistent approach to prevent data loss
        this.favorites = this.loadFavoritesFromStorage() || [];
        this.lastSearchResults = [];
        this.notificationsEnabled = false;
        this.exportImportModalOpen = false;
        this.statsModalOpen = false;
        this.releaseAgeDays = parseInt(localStorage.getItem('releaseAgeDays')) || 7; // Default to 7 days
    }
    
    /**
     * Load favorites from storage with protection against data loss
     */
    loadFavoritesFromStorage() {
        try {
            // Attempt to load from localStorage
            const storedFavorites = localStorage.getItem('spotifyFavorites');
            if (storedFavorites) {
                return JSON.parse(storedFavorites);
            }
            
            // If localStorage is empty, try to recover from backup
            const backupFavorites = localStorage.getItem('spotifyFavoritesBackup');
            if (backupFavorites) {
                // Restore from backup
                const favorites = JSON.parse(backupFavorites);
                localStorage.setItem('spotifyFavorites', JSON.stringify(favorites));
                return favorites;
            }
            
            return [];
        } catch (error) {
            console.error('Error loading favorites:', error);
            return [];
        }
    }
    
    /**
     * Save favorites with backup to prevent data loss
     */
    saveFavoritesToStorage() {
        try {
            // Save to primary storage
            localStorage.setItem('spotifyFavorites', JSON.stringify(this.favorites));
            
            // Also save to backup storage
            localStorage.setItem('spotifyFavoritesBackup', JSON.stringify(this.favorites));
            
            // Set a timestamp to track when favorites were last saved
            localStorage.setItem('favoritesLastSaved', Date.now().toString());
        } catch (error) {
            console.error('Error saving favorites:', error);
            ui.showMessage('Er is een fout opgetreden bij het opslaan van je favorieten', 'error');
        }
    }
    
    /**
     * Initialize the application
     */
    async initialize() {
        // Initialize UI components
        await ui.initialize();
        
        // Check if favorites might have been lost and attempt recovery
        this.checkFavoritesIntegrity();
        
        // Initialize sorting and filtering
        ui.initializeSortingAndFiltering();
        
        // Initialize notifications (niet direct API-aanroepen doen)
        const notificationsInitialized = await notifications.init();
        
        // Display favorites first (dit gebruikt geen API)
        this.displayFavorites();
        
        // Load nieuwe releases EERST als we favorieten hebben
        if (this.favorites.length) {
            try {
                // Switch to notifications tab to show loading immediately (nieuwe releases)
                this.switchTab('notifications');
                
                // Check for new releases first with highest priority
                await this.checkNewReleases();
                
                // Vertraag andere API-intensieve operaties
                setTimeout(async () => {
                    // Then load pre-releases (secondary priority)
                    await this.loadPreReleases(true);
                    
                    // Complete notifications initialization
                    if (notificationsInitialized) {
                        this.notificationsEnabled = await notifications.updateSubscriptionStatus();
                        ui.updateNotificationToggle(this.notificationsEnabled);
                    }
                    
                    // Vertraag de minst belangrijke API-aanroepen nog verder
                    setTimeout(async () => {
                        // Load recommendations (lowest priority)
                        await this.loadRecommendations();
                        await this.loadTrackRecommendations();
                    }, 2000); // wacht 2 seconden voor de minst belangrijke API-aanroepen
                }, 1000); // wacht 1 seconde voor secundaire prioriteitsaanroepen
            } catch (error) {
                console.error('Error in initialization sequence:', error);
                ui.showMessage('Er is een fout opgetreden bij het initialiseren van de app', 'error');
            }
        }
        
        // Setup offline detection
        this.setupOfflineDetection();
        
        // Handle shared content if any
        this.handleSharedContent();
        
        // Setup audio player listeners for stats tracking
        this.setupAudioPlayerTracking();
    }
    
    /**
     * Check favorites integrity and attempt recovery if needed
     */
    checkFavoritesIntegrity() {
        try {
            // Check if favorites might have been lost
            const lastSaved = parseInt(localStorage.getItem('favoritesLastSaved')) || 0;
            const now = Date.now();
            const daysSinceLastSave = (now - lastSaved) / (1000 * 60 * 60 * 24);
            
            // If it's been more than a day since last save and we have no favorites
            // but we do have a backup, restore from backup
            if (daysSinceLastSave > 1 && this.favorites.length === 0) {
                const backupFavorites = localStorage.getItem('spotifyFavoritesBackup');
                if (backupFavorites) {
                    const backup = JSON.parse(backupFavorites);
                    if (backup && backup.length > 0) {
                        this.favorites = backup;
                        this.saveFavoritesToStorage();
                        ui.showMessage('Je gevolgde DJ\'s zijn hersteld', 'success');
                    }
                }
            }
            
            // Always update the last saved timestamp to prevent unnecessary recovery attempts
            localStorage.setItem('favoritesLastSaved', now.toString());
        } catch (error) {
            console.error('Error checking favorites integrity:', error);
        }
    }
    
    /**
     * Setup audio player tracking for statistics
     */
    setupAudioPlayerTracking() {
        // Use event delegation to catch all audio player events
        document.addEventListener('play', (e) => {
            if (e.target.tagName === 'AUDIO' && e.target.classList.contains('audio-player')) {
                const artistId = e.target.dataset.artistId;
                const trackId = e.target.dataset.trackId;
                const trackName = e.target.dataset.trackName;
                const albumName = e.target.dataset.albumName;
                
                if (artistId && trackId) {
                    this.trackListening(artistId, trackId, trackName, albumName);
                }
            }
        }, true);
    }

    /**
     * Setup offline detection
     */
    setupOfflineDetection() {
        const handleConnectionChange = () => {
            if (!navigator.onLine) {
                // User is offline
                let offlineIndicator = document.getElementById('offline-indicator');
                if (!offlineIndicator) {
                    offlineIndicator = document.createElement('div');
                    offlineIndicator.id = 'offline-indicator';
                    offlineIndicator.className = 'offline-indicator';
                    offlineIndicator.innerHTML = '<i class="fas fa-wifi-slash"></i> Je bent offline';
                    document.body.appendChild(offlineIndicator);
                    
                    // Allow users to dismiss the indicator
                    offlineIndicator.addEventListener('click', () => {
                        offlineIndicator.remove();
                    });
                }
                
                // Show the indicator
                setTimeout(() => {
                    offlineIndicator.classList.add('visible');
                }, 100);
            } else {
                // User is back online
                const offlineIndicator = document.getElementById('offline-indicator');
                if (offlineIndicator) {
                    offlineIndicator.classList.remove('visible');
                    setTimeout(() => {
                        offlineIndicator.remove();
                    }, 300);
                }
                
                // Show back online message
                ui.showMessage('Je bent weer online', 'success');
            }
        };
        
        window.addEventListener('online', handleConnectionChange);
        window.addEventListener('offline', handleConnectionChange);
        
        // Check initial state
        if (!navigator.onLine) {
            handleConnectionChange();
        }
    }

    /**
     * Search for artists
     * Note: This is now called automatically by the live search in UI service
     */
    async searchArtist() {
        const query = document.getElementById('artistInput').value.trim();
        if (!query) return;
        
        try {
            const artists = await api.searchArtists(query);
            this.lastSearchResults = artists;
            
            // Display suggestions
            ui.displayArtistSuggestions(artists);
        } catch (error) {
            console.error('Error in searchArtist:', error);
        }
    }

    /**
     * Get latest tracks from an artist
     */
    async getLatestTracks(artistId) {
        if (!artistId) return;
        
        try {
            // Get artist details
            const artist = await api.getArtist(artistId);
            
            // Get latest releases
            const albums = await api.getArtistReleases(artistId);
            
            // Get related artists
            const relatedArtists = await api.getRelatedArtists(artistId);
            
            // Display the results
            ui.displayLatestTracks(artist, albums, relatedArtists);
            
            // Add preview functionality to all track items
            this.setupTrackPreviewButtons();
            
            // Scroll to results
            document.getElementById('results').scrollIntoView({ behavior: 'smooth' });
        } catch (error) {
            console.error('Error in getLatestTracks:', error);
        }
    }

    /**
     * Toggle artist as favorite
     */
    async toggleFavorite(artistId, artistName, artistImg, genres) {
        if (!artistId) return;
        
        const existingIndex = this.favorites.findIndex(fav => fav.id === artistId);
        
        if (existingIndex >= 0) {
            // Remove from favorites
            this.favorites.splice(existingIndex, 1);
            ui.showMessage(`${artistName} is niet meer gevolgd`, 'info');
        } else {
            // If we don't have complete artist info, fetch it
            if (!artistName || !artistImg) {
                try {
                    const artist = await api.getArtist(artistId);
                    artistName = artist.name;
                    artistImg = artist.images.length ? artist.images[0].url : '';
                    genres = artist.genres;
                } catch (error) {
                    console.error('Error fetching artist details:', error);
                }
            }
            
            // Add to favorites with timestamp
            this.favorites.push({ 
                id: artistId, 
                name: artistName, 
                img: artistImg,
                genres: genres,
                addedAt: Date.now() // Add timestamp for sorting by recently added
            });
            
            ui.showMessage(`${artistName} is nu gevolgd`, 'success');
        }
        
        // Save to localStorage with backup
        this.saveFavoritesToStorage();
        
        // Update UI - ALTIJD na wijzigingen
        this.displayFavorites();
        
        // Update artist details view if we're currently viewing this artist
        const resultsContainer = document.getElementById('results');
        if (resultsContainer && resultsContainer.innerHTML.includes(artistId)) {
            // Re-render the artist details to update the favorite status
            this.getLatestTracks(artistId);
        }
        
        // Check for new releases if we added an artist
        if (existingIndex < 0) {
            this.checkNewReleases();
            
            // Clear events cache for this artist to refresh events
            if (window.eventsManager) {
                eventsManager.eventsCache.delete(artistId);
            }
        }
        
        // Update recommendations
        this.loadRecommendations();
    }

    /** 
     * Display favorites
     */
    displayFavorites() {
        // Debug logging
        console.log('displayFavorites called with', this.favorites.length, 'favorites');
        console.log('gevolgdeDJsUI available:', !!window.gevolgdeDJsUI);
        
        // Controleer of de module geladen is
        if (window.gevolgdeDJsUI) {
            try {
                window.gevolgdeDJsUI.displayFavorites(this.favorites);
            } catch (error) {
                console.error('Error in gevolgdeDJsUI.displayFavorites:', error);
                this._fallbackDisplayFavorites();
            }
        } else {
            console.error('gevolgdeDJsUI module not loaded');
            // Fallback: toon een simpele lijst
            this._fallbackDisplayFavorites();
        }
    }

    /**
     * Fallback voor als de module niet geladen is
     */
    _fallbackDisplayFavorites() {
        const container = document.getElementById('favorites');
        if (container) {
            if (!this.favorites.length) {
                container.innerHTML = `
                    <div class="col-span-full text-center py-8">
                        <div class="text-gray-400 mb-4">
                            <i class="fas fa-heart text-5xl"></i>
                        </div>
                        <p class="text-gray-500">Je hebt nog geen DJ's gevolgd</p>
                        <p class="text-gray-500 text-sm mt-2">Zoek naar artiesten en voeg ze toe aan je favorieten</p>
                    </div>
                `;
            } else {
                // Toon een simpele lijst van favorieten
                const html = this.favorites.map(artist => `
                    <div class="artist-card bg-white rounded-xl overflow-hidden shadow-md hover:shadow-lg transition-all duration-300 flex flex-col">
                        <div class="h-40 bg-gray-200 overflow-hidden relative">
                            <div class="is-favorite">
                                <i class="fas fa-heart"></i> Gevolgd
                            </div>
                            ${artist.img ? 
                                `<img src="${artist.img}" alt="${artist.name}" class="w-full h-full object-cover">` : 
                                `<div class="w-full h-full flex items-center justify-center bg-gradient-to-r from-primary to-secondary text-white">
                                    <i class="fas fa-music text-4xl"></i>
                                </div>`
                            }
                        </div>
                        <div class="p-4 flex-grow flex flex-col">
                            <h3 class="font-bold text-lg mb-1 truncate">${artist.name}</h3>
                            <p class="text-gray-600 text-sm mb-3 truncate">DJ / Producer</p>
                            <div class="mt-auto flex gap-2">
                                <button onclick="app.getLatestTracks('${artist.id}')" 
                                    class="flex-1 bg-primary hover:bg-primary-dark text-white py-2 rounded-lg transition flex items-center justify-center">
                                    <i class="fas fa-headphones mr-2"></i>Muziek
                                </button>
                                <button onclick="app.toggleFavorite('${artist.id}')" 
                                    class="bg-red-500 hover:bg-red-600 text-white p-2 rounded-lg transition">
                                    <i class="fas fa-heart-broken"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                `).join('');
                
                container.innerHTML = html;
            }
        }
    }

    /**
     * Check for new releases
     * @param {boolean} background - Whether this is a background check
     */
    async checkNewReleases(background = false) {
        // Debug logging
        console.log('checkNewReleases called, background:', background);
        console.log('nieuweReleasesUI available:', !!window.nieuweReleasesUI);
        
        if (!this.favorites.length) {
            // Controleer of de module geladen is
            if (window.nieuweReleasesUI) {
                try {
                    window.nieuweReleasesUI.displayNotifications([]);
                } catch (error) {
                    console.error('Error in nieuweReleasesUI.displayNotifications:', error);
                }
            } else {
                console.error('nieuweReleasesUI module not loaded');
            }
            return;
        }
        
        try {
            if (!background) {
                // Show loading skeletons instead of basic loading
                if (window.nieuweReleasesUI) {
                    try {
                        window.nieuweReleasesUI.showLoadingSkeletons();
                    } catch (error) {
                        console.error('Error in showLoadingSkeletons:', error);
                    }
                }
                ui.showLoading('Nieuwe releases controleren...');
            }
            
            // Pass the releaseAgeDays parameter to the API call
            const newReleases = await api.checkNewReleases(this.favorites, this.releaseAgeDays);
            
            // If this is a background check and we have new releases, send notifications
            if (background && newReleases.length > 0 && this.notificationsEnabled) {
                this.sendNewReleasesNotifications(newReleases);
            }
            
            // Only update UI if not a background check
            if (!background) {
                console.log(`Displaying ${newReleases.length} new releases in the UI`);
                // Controleer of de module geladen is
                if (window.nieuweReleasesUI) {
                    try {
                        window.nieuweReleasesUI.displayNotifications(newReleases);
                    } catch (error) {
                        console.error('Error in nieuweReleasesUI.displayNotifications:', error);
                    }
                } else {
                    console.error('nieuweReleasesUI module not loaded');
                }
                ui.hideLoading();
                
                // Show success notification
                if (newReleases.length > 0) {
                    ui.showMessage(`${newReleases.length} nieuwe release${newReleases.length === 1 ? '' : 's'} gevonden!`, 'success');
                }
            }
            
            return newReleases;
        } catch (error) {
            if (!background) {
                ui.hideLoading();
                ui.showError('Er is een fout opgetreden bij het controleren op nieuwe releases.');
            }
            console.error('Error checking new releases:', error);
            return [];
        }
    }

    /**
     * Send notifications for new releases
     */
    async sendNewReleasesNotifications(releases) {
        if (!releases || releases.length === 0) return;
        
        for (const release of releases) {
            const { artist, album } = release;
            
            // Check if this release notification has been sent before
            const sentNotifications = JSON.parse(localStorage.getItem('sentNotifications') || '[]');
            const notificationKey = `${artist.id}_${album.id}`;
            
            if (!sentNotifications.includes(notificationKey)) {
                // Send notification
                if (Notification.permission === 'granted') {
                    const notification = new Notification(`Nieuwe release van ${artist.name}`, {
                        body: album.name,
                        icon: album.images[0]?.url || 'img/icons/icon-192x192.png',
                        badge: 'img/icons/icon-72x72.png',
                        data: {
                            url: album.external_urls.spotify
                        }
                    });
                    
                    notification.onclick = function() {
                        window.focus();
                        window.open(album.external_urls.spotify, '_blank');
                        notification.close();
                    };
                    
                    // Mark this notification as sent
                    sentNotifications.push(notificationKey);
                    localStorage.setItem('sentNotifications', JSON.stringify(sentNotifications));
                }
            }
        }
    }

    /**
     * Toggle push notifications
     */
    async toggleNotifications() {
        if (this.notificationsEnabled) {
            // Unsubscribe
            const success = await notifications.unsubscribe();
            if (success) {
                this.notificationsEnabled = false;
                ui.updateNotificationToggle(false);
                ui.showMessage('Notificaties zijn uitgeschakeld');
            }
        } else {
            // Subscribe
            const success = await notifications.subscribe();
            if (success) {
                this.notificationsEnabled = true;
                ui.updateNotificationToggle(true);
                ui.showMessage('Notificaties zijn ingeschakeld. Je ontvangt nu meldingen wanneer een DJ nieuwe muziek uitbrengt, zelfs als je de app niet geopend hebt.');
                
                // Send test notification
                setTimeout(() => {
                    notifications.sendTestNotification();
                }, 1000);
            } else {
                ui.showMessage('Er is een fout opgetreden bij het inschakelen van notificaties. Controleer of je de juiste toestemmingen hebt gegeven.');
            }
        }
    }

    /**
     * Load recommendations based on favorites
     */
    async loadRecommendations() {
        if (!this.favorites.length) {
            ui.displayRecommendations([]);
            return;
        }
        
        try {
            const artistIds = this.favorites.map(fav => fav.id);
            const recommendations = await api.getRecommendations(artistIds);
            ui.displayRecommendations(recommendations);
        } catch (error) {
            console.error('Error loading recommendations:', error);
        }
    }

    /**
     * Load pre-releases for favorite artists
     * @param {boolean} highPriority - Whether to load with high priority
     */
    async loadPreReleases(highPriority = false) {
        if (!this.favorites.length) {
            if (window.aankomendeReleasesUI) {
                window.aankomendeReleasesUI.displayPreReleases([]);
            } else {
                console.error('aankomendeReleasesUI module not loaded');
            }
            return;
        }
        
        try {
            if (!highPriority) {
                ui.showLoading('Presave mogelijkheden laden...');
            }
            
            const container = document.getElementById('pre-releases');
            if (container) {
                container.innerHTML = `
                    <div class="text-center py-8">
                        <div class="text-gray-400 mb-4">
                            <i class="fas fa-spinner fa-spin text-3xl loading-spinner"></i>
                        </div>
                        <p class="text-gray-500">Presave mogelijkheden laden...</p>
                        <p class="text-gray-500 text-xs mt-2">Zoekt naar releases in de komende week</p>
                        <div class="mt-4 bg-blue-50 p-3 rounded-lg text-blue-800 text-sm">
                            <p><i class="fas fa-info-circle mr-2"></i>We controleren je eerste ${Math.min(this.favorites.length, 25)} gevolgde artiesten</p>
                            <p class="mt-1 text-xs">Alleen releases van vandaag tot 1 week vooruit (presave venster)</p>
                            <p class="mt-1 text-xs">Tip: Voeg ?refresh toe aan de URL om cache te vernieuwen</p>
                        </div>
                    </div>
                `;
            }
            
            console.log('Fetching presave opportunities for the next week...');
            console.log('Favorites to check:', this.favorites.map(f => f.name));
            
            const forceRefresh = new URLSearchParams(window.location.search).has('refresh');
            if (forceRefresh) {
                localStorage.removeItem('pre-releases-cache');
                localStorage.removeItem('pre-releases-cache-expiry');
                console.log('Forcing refresh of presave cache');
            }
            
            // Get all presave opportunities
            const preReleases = await api.getPreReleases(this.favorites, 100, highPriority);
            console.log(`Received ${preReleases?.length || 0} presave opportunities from API`);
            
            if (!preReleases || preReleases.length === 0) {
                ui.showMessage('Geen presave mogelijkheden gevonden in de komende week.', 'info');
            } else if (preReleases.length > 0) {
                ui.showMessage(`${preReleases.length} presave mogelijkheden gevonden in de komende week`, 'success');
                
                // Log examples
                console.log('Presave opportunities:');
                preReleases.forEach(release => {
                    console.log(`- ${release.album.name} by ${release.artist.name} on ${release.album.release_date}`);
                });
            }

            if (window.aankomendeReleasesUI) {
                window.aankomendeReleasesUI.displayPreReleases(preReleases);
            } else {
                console.error('aankomendeReleasesUI module not loaded');
            }
            
            if (!highPriority) {
                ui.hideLoading();
            }
            
            return preReleases;
        } catch (error) {
            if (!highPriority) {
                ui.hideLoading();
            }
            console.error('Error loading pre-releases:', error);
            
            const container = document.getElementById('pre-releases');
            if (container) {
                container.innerHTML = `
                    <div class="col-span-full text-center py-8">
                        <div class="text-gray-400 mb-4">
                            <i class="fas fa-exclamation-triangle text-5xl"></i>
                        </div>
                        <p class="text-gray-700">Er is een fout opgetreden bij het laden van presave mogelijkheden</p>
                        <p class="text-gray-500 text-sm mt-2">Dit kan gebeuren door API-beperkingen. Probeer het over 5-10 minuten opnieuw.</p>
                        <div class="mt-4 space-y-2">
                            <button onclick="app.loadPreReleases()" class="bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-lg transition">
                                Opnieuw proberen
                            </button>
                            <a href="?refresh" class="block bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition">
                                <i class="fas fa-refresh mr-2"></i>Cache vernieuwen
                            </a>
                            <p class="text-xs text-gray-400">
                                Cache wordt 1 uur bewaard om API-verzoeken te beperken
                            </p>
                        </div>
                    </div>
                `;
            }
            
            ui.showMessage('API-limiet bereikt. Wacht 5-10 minuten voordat je het opnieuw probeert.', 'error');
        }
    }

    /**
     * Load track recommendations based on favorites
     */
    async loadTrackRecommendations() {
        if (!this.favorites.length) {
            ui.displayTrackRecommendations([]);
            return;
        }
        
        try {
            const artistIds = this.favorites.map(fav => fav.id);
            const recommendedTracks = await api.getTrackRecommendations(artistIds, 12);
            ui.displayTrackRecommendations(recommendedTracks);
        } catch (error) {
            console.error('Error loading track recommendations:', error);
        }
    }

    /**
     * Switch between tabs (favorites, notifications, pre-releases)
     */
    switchTab(tab) {
        // Update tab buttons
        document.getElementById('tab-favorites').classList.remove('tab-active', 'text-primary');
        document.getElementById('tab-favorites').classList.add('text-gray-500');
        
        document.getElementById('tab-notifications').classList.remove('tab-active', 'text-primary');
        document.getElementById('tab-notifications').classList.add('text-gray-500');
        
        document.getElementById('tab-pre-releases').classList.remove('tab-active', 'text-primary');
        document.getElementById('tab-pre-releases').classList.add('text-gray-500');
        
        // Handle events tab separately as it opens a modal
        document.getElementById('tab-events').classList.remove('tab-active', 'text-primary');
        document.getElementById('tab-events').classList.add('text-gray-500');
        
        document.getElementById(`tab-${tab}`).classList.add('tab-active', 'text-primary');
        document.getElementById(`tab-${tab}`).classList.remove('text-gray-500');
        
        // Show/hide content
        document.getElementById('favorites-content').classList.add('hidden');
        document.getElementById('notifications-content').classList.add('hidden');
        document.getElementById('pre-releases-content').classList.add('hidden');
        
        document.getElementById(`${tab}-content`).classList.remove('hidden');
        
        // Load tab-specific content if needed
        if (tab === 'favorites') {
            // Refresh favorites when switching to the tab
            this.displayFavorites();
        } else if (tab === 'notifications') {
            this.checkNewReleases();
        } else if (tab === 'pre-releases') {
            this.loadPreReleases();
        }
    }
    
    /**
     * Show the events panel
     */
    showEventsPanel() {
        // If the showEventsPanel function exists in the global scope, call it
        if (typeof window.showEventsPanel === 'function') {
            window.showEventsPanel();
        }
    }

    /**
     * Export favorites to a JSON file
     */
    exportFavorites() {
        if (!this.favorites.length) {
            ui.showMessage('Je hebt geen favorieten om te exporteren', 'error');
            return;
        }

        const exportData = {
            favorites: this.favorites,
            exportDate: new Date().toISOString(),
            appVersion: '1.0.0'
        };

        const dataStr = JSON.stringify(exportData, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
        
        const exportFileDefaultName = `musicalert-favoriten-${new Date().toISOString().slice(0, 10)}.json`;
        
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
        
        ui.showMessage('Je favorieten zijn geëxporteerd', 'success');
    }

    /**
     * Import favorites from a JSON file
     */
    importFavorites(file) {
        if (!file) {
            ui.showMessage('Geen bestand geselecteerd', 'error');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const importData = JSON.parse(e.target.result);
                
                if (!importData.favorites || !Array.isArray(importData.favorites)) {
                    throw new Error('Invalid file format');
                }

                // Confirm before importing
                const overwrite = document.getElementById('import-overwrite').checked;
                const existingIds = this.favorites.map(fav => fav.id);
                
                if (overwrite) {
                    // Replace all favorites
                    this.favorites = [...importData.favorites];
                } else {
                    // Merge favorites (avoiding duplicates)
                    const newFavorites = importData.favorites.filter(fav => !existingIds.includes(fav.id));
                    this.favorites = [...this.favorites, ...newFavorites];
                }
                
                // Save to localStorage
                this.saveFavoritesToStorage();
                
                // Update UI
                this.displayFavorites();
                this.checkNewReleases();
                this.loadRecommendations();
                
                // Close the modal
                this.toggleExportImportModal();
                
                const importCount = overwrite ? importData.favorites.length : 
                    importData.favorites.filter(fav => !existingIds.includes(fav.id)).length;
                
                ui.showMessage(`${importCount} favorieten ${overwrite ? 'vervangen' : 'toegevoegd'}`, 'success');
            } catch (error) {
                console.error('Error importing favorites:', error);
                ui.showMessage('Het bestand heeft een ongeldig formaat', 'error');
            }
        };
        reader.readAsText(file);
    }

    /**
     * Toggle export/import modal
     */
    toggleExportImportModal() {
        const modal = document.getElementById('export-import-modal');
        if (modal) {
            if (this.exportImportModalOpen) {
                modal.classList.add('hidden');
            } else {
                modal.classList.remove('hidden');
                // Update favorite count display
                document.getElementById('export-count').textContent = this.favorites.length;
            }
            this.exportImportModalOpen = !this.exportImportModalOpen;
        }
    }

    /**
     * Go to search section
     */
    goToSearch() {
        const searchSection = document.querySelector('.max-w-4xl.mx-auto.bg-white.rounded-xl.md\\:rounded-2xl.shadow-lg.p-4.md\\:p-8.mb-6.md\\:mb-12');
        if (searchSection) {
            searchSection.scrollIntoView({ behavior: 'smooth' });
            // Focus on the search input
            setTimeout(() => {
                document.getElementById('artistInput').focus();
            }, 500);
        }
        this.closeQuickActions();
    }

    /**
     * Close quick actions menu
     */
    closeQuickActions() {
        const mobileMenu = document.getElementById('mobile-menu');
        if (mobileMenu) {
            mobileMenu.classList.add('hidden');
        }
    }

    /**
     * Toggle quick actions menu
     */
    toggleQuickActions() {
        const mobileMenu = document.getElementById('mobile-menu');
        if (mobileMenu) {
            mobileMenu.classList.toggle('hidden');
            
            // Update theme text when opening the menu
            if (!mobileMenu.classList.contains('hidden')) {
                const currentTheme = localStorage.getItem('theme') || 'light';
                const mobileThemeText = document.getElementById('mobile-theme-text');
                if (mobileThemeText) {
                    mobileThemeText.textContent = currentTheme === 'light' ? 'Donkere Modus' : 'Lichte Modus';
                }
            }
        }
    }

    /**
     * Toggle theme from mobile menu
     */
    toggleThemeFromMobile() {
        // Get the current theme
        const currentTheme = localStorage.getItem('theme') || 'light';
        
        // Toggle between light and dark
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        
        // Update theme
        ui.updateTheme(newTheme);
        
        // Update mobile menu button text
        const mobileThemeText = document.getElementById('mobile-theme-text');
        if (mobileThemeText) {
            mobileThemeText.textContent = newTheme === 'light' ? 'Donkere Modus' : 'Lichte Modus';
        }
    }

    /**
     * Clear search
     */
    clearSearch() {
        const searchInput = document.getElementById('artistInput');
        if (searchInput) {
            searchInput.value = '';
            document.getElementById('artistSuggestions')?.classList.add('hidden');
        }
    }

    /**
     * Reset app (only for testing/development)
     */
    resetApp() {
        if (confirm('Weet je zeker dat je de app wilt resetten? Dit verwijdert al je favorieten en instellingen.')) {
            localStorage.clear();
            window.location.reload();
        }
    }

    /**
     * Track listening event for statistics
     */
    trackListening(artistId, trackId, trackName, albumName) {
        // Get or initialize listening history
        const listeningHistory = JSON.parse(localStorage.getItem('listeningHistory') || '[]');
        
        // Add new entry
        listeningHistory.push({
            artistId,
            trackId,
            trackName,
            albumName,
            timestamp: Date.now()
        });
        
        // Keep only the last 100 entries
        if (listeningHistory.length > 100) {
            listeningHistory.splice(0, listeningHistory.length - 100);
        }
        
        // Save back to localStorage
        localStorage.setItem('listeningHistory', JSON.stringify(listeningHistory));
        
        // Update play count for this artist
        this.updateArtistPlayCount(artistId);
    }
    
    /**
     * Update artist play count
     */
    updateArtistPlayCount(artistId) {
        const playCounts = JSON.parse(localStorage.getItem('artistPlayCounts') || '{}');
        
        // Increment play count
        playCounts[artistId] = (playCounts[artistId] || 0) + 1;
        
        // Save back to localStorage
        localStorage.setItem('artistPlayCounts', JSON.stringify(playCounts));
    }
    
    /**
     * Get listening statistics
     */
    getListeningStats() {
        const playCounts = JSON.parse(localStorage.getItem('artistPlayCounts') || '{}');
        const listeningHistory = JSON.parse(localStorage.getItem('listeningHistory') || '[]');
        
        // Get top artists by play count 
        const topArtists = Object.entries(playCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([id, count]) => {
                const artist = this.favorites.find(fav => fav.id === id);
                return {
                    id,
                    name: artist ? artist.name : 'Onbekende artiest',
                    count
                };
            });
        
        // Get recent listening activity 
        const recentActivity = listeningHistory
            .slice(-10)
            .reverse()
            .map(entry => {
                const artist = this.favorites.find(fav => fav.id === entry.artistId);
                return {
                    artistName: artist ? artist.name : 'Onbekende artiest',
                    trackName: entry.trackName,
                    albumName: entry.albumName,
                    timestamp: entry.timestamp
                };
            });
        
        // Calculate total listening count
        const totalPlays = Object.values(playCounts).reduce((sum, count) => sum + count, 0);
        
        return {
            topArtists,
            recentActivity,
            totalPlays
        };
    }
    
    /**
     * Show statistics modal
     */
    showStatsModal() {
        const stats = this.getListeningStats();
        ui.displayStatsModal(stats);
        this.statsModalOpen = true;
    }
    
    /**
     * Share an artist with friends
     */
    shareArtist(artistId, artistName) {
        if (!navigator.share) {
            ui.showMessage('Delen wordt niet ondersteund in deze browser', 'error');
            return;
        }
        
        const shareUrl = `${window.location.origin}${window.location.pathname}?share=artist&id=${artistId}`;
        
        navigator.share({
            title: `Check ${artistName} op MusicAlert`,
            text: `Ik heb ${artistName} ontdekt via MusicAlert. Bekijk hun muziek!`,
            url: shareUrl
        })
        .then(() => ui.showMessage('Succesvol gedeeld!', 'success'))
        .catch(error => {
            if (error.name !== 'AbortError') {
                console.error('Error sharing:', error);
                ui.showMessage('Er is iets misgegaan bij het delen', 'error');
            }
        });
    }
    
    /**
     * Share a release with friends
     */
    shareRelease(artistName, albumName, albumUrl) {
        if (!navigator.share) {
            // Fallback for browsers that don't support Web Share API
            this.copyToClipboard(albumUrl);
            ui.showMessage('Link gekopieerd naar klembord', 'success');
            return;
        }
        
        navigator.share({
            title: `Nieuwe release van ${artistName} - ${albumName}`,
            text: `Luister naar de nieuwe release van ${artistName} - ${albumName}`,
            url: albumUrl
        })
        .then(() => ui.showMessage('Succesvol gedeeld!', 'success'))
        .catch(error => {
            if (error.name !== 'AbortError') {
                // Copy to clipboard as fallback if sharing fails
                this.copyToClipboard(albumUrl);
                ui.showMessage('Link gekopieerd naar klembord', 'success');
            }
        });
    }
    
    /**
     * Copy text to clipboard
     */
    copyToClipboard(text) {
        navigator.clipboard.writeText(text)
            .catch(err => {
                console.error('Could not copy text: ', err);
            });
    }

    /**
     * Handle shared content when app opens
     */
    handleSharedContent() {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.has('share') && urlParams.has('id')) {
            const shareType = urlParams.get('share');
            const id = urlParams.get('id');
            
            // Clean URL without removing page history
            window.history.replaceState({}, document.title, window.location.pathname);
            
            // Get artist details and show them
            if (shareType === 'artist') {
                this.getLatestTracks(id);
            }
        }
    }
    
    /**
     * Set the number of days to consider a release as "new"
     * @param {number} days - Number of days (1-14)
     */
    setReleaseAgeDays(days) {
        // Validate the input
        days = parseInt(days);
        if (isNaN(days) || days < 1) {
            days = 7; // Default to 7 if invalid
        } else if (days > 14) {
            days = 14; // Cap at 14 days
        }
        
        this.releaseAgeDays = days;
        localStorage.setItem('releaseAgeDays', days.toString());
        
        // Refresh notifications with new setting
        this.checkNewReleases();
        
        ui.showMessage(`Je ziet nu releases van de afgelopen ${days} dagen`, 'success');
    }

    /**
     * Play preview of a track
     * @param {string} previewUrl - URL of the preview audio
     * @param {Object} track - Track data object
     */
    playPreview(previewUrl, track) {
        if (!previewUrl) {
            ui.showMessage('Geen preview beschikbaar voor dit nummer', 'info');
            return;
        }
        
        ui.createPreviewPlayer(track);
        
        // Track this listening event for statistics if it's not already tracked
        if (track.id && track.artists && track.artists[0]) {
            this.trackListening(
                track.artists[0].id,
                track.id,
                track.name,
                track.album?.name || 'Onbekend album'
            );
        }
    }
    
    /**
     * Setup track preview buttons after displaying tracks
     */
    setupTrackPreviewButtons() {
        // Select all preview buttons that don't already have event listeners
        const previewButtons = document.querySelectorAll('.preview-play-btn:not([data-initialized])');
        
        previewButtons.forEach(button => {
            // Mark as initialized to avoid duplicate event listeners
            button.setAttribute('data-initialized', 'true');
            
            // Add click event
            button.addEventListener('click', (e) => {
                e.stopPropagation();
                
                const previewUrl = button.dataset.previewUrl;
                const trackId = button.dataset.trackId;
                const trackName = button.dataset.trackName;
                const artistName = button.dataset.artistName;
                const artistId = button.dataset.artistId;
                const albumName = button.dataset.albumName;
                const albumId = button.dataset.albumId;
                const albumImage = button.dataset.albumImage;
                const trackDuration = button.dataset.trackDuration;
                
                // Create track object to pass to the preview player
                const track = {
                    id: trackId,
                    name: trackName,
                    preview_url: previewUrl,
                    duration_ms: trackDuration,
                    artists: [{ id: artistId, name: artistName }],
                    album: {
                        id: albumId,
                        name: albumName,
                        images: [{ url: albumImage }]
                    }
                };
                
                this.playPreview(previewUrl, track);
            });
        });
    }
}

// Initialize app
const app = new MusicAlertApp();

// When DOM is loaded, initialize the app
document.addEventListener('DOMContentLoaded', () => {
    app.initialize();
});

// Add event listeners for audio players
document.addEventListener('DOMContentLoaded', () => {
    // Monitor for audio play events to track statistics
    document.addEventListener('play', (e) => {
        if (e.target.tagName === 'AUDIO' && e.target.classList.contains('audio-player')) {
            // Details about what is being played are stored in data attributes
            const artistId = e.target.dataset.artistId;
            const trackId = e.target.dataset.trackId;
            const trackName = e.target.dataset.trackName;
            const albumName = e.target.dataset.albumName;
            
            if (artistId && trackId) {
                // Track this for statistics
                app.trackListening(artistId, trackId, trackName, albumName);
            }
        }
    }, true);
});