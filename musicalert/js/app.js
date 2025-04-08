/**
 * Main Application
 * Coordinates functionality between UI and API services
 */
class MusicAlertApp {
    constructor() {
        this.favorites = JSON.parse(localStorage.getItem('spotifyFavorites')) || [];
        this.lastSearchResults = [];
        this.notificationsEnabled = false;
        this.exportImportModalOpen = false;
        this.releaseAgeDays = parseInt(localStorage.getItem('releaseAgeDays')) || 7; // Default to 7 days
    }
    
    /**
     * Initialize the application
     */
    async initialize() {
        // Initialize UI components
        await ui.initialize();
        
        // Initialize sorting and filtering
        ui.initializeSortingAndFiltering();
        
        // Initialize notifications
        if (await notifications.init()) {
            this.notificationsEnabled = await notifications.updateSubscriptionStatus();
            ui.updateNotificationToggle(this.notificationsEnabled);
        }
        
        // Display favorites and check for new releases
        this.displayFavorites();
        this.checkNewReleases();
        
        // Load recommendations based on favorites
        if (this.favorites.length) {
            this.loadRecommendations();
        }
        
        // Setup offline detection
        this.setupOfflineDetection();
        
        // Handle shared content if any
        this.handleSharedContent();
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
        }
        
        // Save to localStorage
        localStorage.setItem('spotifyFavorites', JSON.stringify(this.favorites));
        
        // Update UI
        this.displayFavorites();
        
        // Check for new releases if we added an artist
        if (existingIndex < 0) {
            this.checkNewReleases();
        }
        
        // Update recommendations
        this.loadRecommendations();
    }

    /**
     * Display favorites
     */
    displayFavorites() {
        ui.displayFavorites(this.favorites);
    }

    /**
     * Check for new releases
     * @param {boolean} background - Whether this is a background check
     */
    async checkNewReleases(background = false) {
        if (!this.favorites.length) {
            ui.displayNotifications([]);
            return;
        }
        
        try {
            if (!background) {
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
                ui.displayNotifications(newReleases);
                ui.hideLoading();
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
     * Switch between tabs (favorites, notifications, recommendations)
     */
    switchTab(tab) {
        // Update tab buttons
        document.getElementById('tab-favorites').classList.remove('tab-active', 'text-primary');
        document.getElementById('tab-favorites').classList.add('text-gray-500');
        
        document.getElementById('tab-notifications').classList.remove('tab-active', 'text-primary');
        document.getElementById('tab-notifications').classList.add('text-gray-500');
        
        document.getElementById('tab-recommendations').classList.remove('tab-active', 'text-primary');
        document.getElementById('tab-recommendations').classList.add('text-gray-500');
        
        document.getElementById(`tab-${tab}`).classList.add('tab-active', 'text-primary');
        document.getElementById(`tab-${tab}`).classList.remove('text-gray-500');
        
        // Show/hide content
        document.getElementById('favorites-content').classList.add('hidden');
        document.getElementById('notifications-content').classList.add('hidden');
        document.getElementById('recommendations-content').classList.add('hidden');
        
        document.getElementById(`${tab}-content`).classList.remove('hidden');
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
                localStorage.setItem('spotifyFavorites', JSON.stringify(this.favorites));
                
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
            
            if (shareType === 'artist') {
                // Clean URL without removing page history
                window.history.replaceState({}, document.title, window.location.pathname);
                
                // Get artist details and show them
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
}

// Initialize app
const app = new MusicAlertApp();

// When DOM is loaded, initialize the app
document.addEventListener('DOMContentLoaded', () => {
    app.initialize();
});
