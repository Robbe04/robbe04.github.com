/**
 * Stats Analyzer
 * Geavanceerde statistieken en luisteranalyse voor MusicAlert
 */
class StatsAnalyzer {
    constructor() {
        this.listeningHistory = JSON.parse(localStorage.getItem('listeningHistory') || '[]');
        this.artistPlayCounts = JSON.parse(localStorage.getItem('artistPlayCounts') || '{}');
        this.genrePreferences = {};
        this.initialized = false;
        this.listeningTimes = JSON.parse(localStorage.getItem('listeningTimes') || '[]');
    }
    
    /**
     * Initialiseer de stats analyzer
     */
    init() {
        if (this.initialized) return;
        
        try {
            // Bereken genre voorkeuren op basis van luistergeschiedenis
            this.calculateGenrePreferences();
            
            // Luister naar play events voor tijd tracking
            this.setupTimeTracking();
            
            this.initialized = true;
            return true;
        } catch (error) {
            console.error('Fout bij initialiseren Stats Analyzer:', error);
            return false;
        }
    }
    
    /**
     * Houd bij wanneer de gebruiker luistert
     */
    setupTimeTracking() {
        document.addEventListener('play', (e) => {
            if (e.target.tagName === 'AUDIO' && e.target.classList.contains('audio-player')) {
                const currentTime = new Date();
                const entry = {
                    artistId: e.target.dataset.artistId || 'unknown',
                    trackId: e.target.dataset.trackId || 'unknown',
                    hour: currentTime.getHours(),
                    weekday: currentTime.getDay(), // 0 = zondag, 6 = zaterdag
                    timestamp: currentTime.getTime()
                };
                
                this.listeningTimes.push(entry);
                
                // Bewaar maximaal 500 entries
                if (this.listeningTimes.length > 500) {
                    this.listeningTimes = this.listeningTimes.slice(-500);
                }
                
                localStorage.setItem('listeningTimes', JSON.stringify(this.listeningTimes));
            }
        }, true);
    }
    
    /**
     * Bereken genre voorkeuren op basis van luistergeschiedenis
     */
    calculateGenrePreferences() {
        // Reset huidige voorkeuren
        this.genrePreferences = {};
        
        // Verzamel alle artiesten uit de luistergeschiedenis
        const listeningArtists = this.listeningHistory.map(entry => entry.artistId);
        
        // Haal favoriete artiesten op
        const favorites = JSON.parse(localStorage.getItem('spotifyFavorites') || '[]');
        
        // Tel genres van beluisterde artiesten
        for (const artistId of listeningArtists) {
            const artist = favorites.find(fav => fav.id === artistId);
            if (artist && artist.genres) {
                artist.genres.forEach(genre => {
                    this.genrePreferences[genre] = (this.genrePreferences[genre] || 0) + 1;
                });
            }
        }
    }
    
    /**
     * Haal top genres op
     * @param {number} limit - Maximum aantal genres om terug te geven
     * @returns {Array} Top genres
     */
    getTopGenres(limit = 5) {
        return Object.entries(this.genrePreferences)
            .sort((a, b) => b[1] - a[1])
            .slice(0, limit)
            .map(([genre, count]) => ({
                name: genre,
                count,
                formattedName: this.formatGenreName(genre)
            }));
    }
    
    /**
     * Geef naam van genre beter weer
     * @param {string} genre - Ruwe genrenaam
     * @returns {string} Geformatteerde genrenaam
     */
    formatGenreName(genre) {
        return genre
            .split('-')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }
    
    /**
     * Haal favoriete luistertijden op
     * @returns {Object} Favoriete luistertijden
     */
    getFavoriteListeningTimes() {
        if (this.listeningTimes.length === 0) {
            return { hours: [], weekdays: [] };
        }
        
        // Analyseer per uur
        const hourCounts = Array(24).fill(0);
        this.listeningTimes.forEach(entry => {
            hourCounts[entry.hour]++;
        });
        
        // Vind de top 3 luisteruren
        const topHours = hourCounts
            .map((count, hour) => ({ hour, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 3)
            .map(entry => ({
                hour: entry.hour,
                count: entry.count,
                label: `${entry.hour}:00 - ${entry.hour + 1}:00`
            }));
            
        // Analyseer per weekdag
        const weekdayCounts = Array(7).fill(0);
        this.listeningTimes.forEach(entry => {
            weekdayCounts[entry.weekday]++;
        });
        
        // Weekdagen in Nederlands
        const weekdayNames = ['Zondag', 'Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrijdag', 'Zaterdag'];
        
        const topWeekdays = weekdayCounts
            .map((count, day) => ({ day, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 3)
            .map(entry => ({
                day: entry.day,
                count: entry.count,
                label: weekdayNames[entry.day]
            }));
        
        return {
            hours: topHours,
            weekdays: topWeekdays
        };
    }
    
    /**
     * Bereken statistieken over luistergewoontes
     * @returns {Object} Luisterstatistieken
     */
    getListeningStats() {
        if (this.listeningHistory.length === 0) {
            return {
                totalTracks: 0,
                uniqueTracks: 0,
                uniqueArtists: 0,
                topArtists: [],
                topGenres: [],
                recentActivity: [],
                totalPlays: 0,
                favoriteTimes: { hours: [], weekdays: [] }
            };
        }
        
        // Bereken unieke tracks en artiesten
        const uniqueTracks = new Set(this.listeningHistory.map(entry => entry.trackId));
        const uniqueArtists = new Set(this.listeningHistory.map(entry => entry.artistId));
        
        // Haal favoriete artiesten op
        const favorites = JSON.parse(localStorage.getItem('spotifyFavorites') || '[]');
        
        // Bereken top artiesten
        const topArtists = Object.entries(this.artistPlayCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([id, count]) => {
                const artist = favorites.find(fav => fav.id === id);
                return {
                    id,
                    name: artist ? artist.name : 'Onbekende artiest',
                    count,
                    image: artist ? artist.img : null
                };
            });
            
        // Bereken top genres
        const topGenres = this.getTopGenres();
        
        // Haal recente activiteit op
        const recentActivity = this.listeningHistory
            .slice(-10)
            .reverse()
            .map(entry => {
                const artist = favorites.find(fav => fav.id === entry.artistId);
                return {
                    artistName: artist ? artist.name : 'Onbekende artiest',
                    trackName: entry.trackName || 'Onbekend nummer',
                    albumName: entry.albumName || '',
                    timestamp: entry.timestamp,
                    relativeTime: this.getRelativeTime(entry.timestamp)
                };
            });
            
        // Bereken totaal aantal plays
        const totalPlays = Object.values(this.artistPlayCounts).reduce((sum, count) => sum + count, 0);
        
        // Bereken favoriete luistertijden
        const favoriteTimes = this.getFavoriteListeningTimes();
        
        return {
            totalTracks: this.listeningHistory.length,
            uniqueTracks: uniqueTracks.size,
            uniqueArtists: uniqueArtists.size,
            topArtists,
            topGenres,
            recentActivity,
            totalPlays,
            favoriteTimes
        };
    }
    
    /**
     * Krijg relatieve tijd (bijv. "2 uur geleden")
     * @param {number} timestamp - Unix timestamp
     * @returns {string} Relatieve tijd
     */
    getRelativeTime(timestamp) {
        const now = Date.now();
        const diff = now - timestamp;
        
        // Minder dan een minuut
        if (diff < 60 * 1000) {
            return 'Zojuist';
        }
        
        // Minder dan een uur
        if (diff < 60 * 60 * 1000) {
            const minutes = Math.floor(diff / (60 * 1000));
            return `${minutes} ${minutes === 1 ? 'minuut' : 'minuten'} geleden`;
        }
        
        // Minder dan een dag
        if (diff < 24 * 60 * 60 * 1000) {
            const hours = Math.floor(diff / (60 * 60 * 1000));
            return `${hours} ${hours === 1 ? 'uur' : 'uur'} geleden`;
        }
        
        // Minder dan een week
        if (diff < 7 * 24 * 60 * 60 * 1000) {
            const days = Math.floor(diff / (24 * 60 * 60 * 1000));
            return `${days} ${days === 1 ? 'dag' : 'dagen'} geleden`;
        }
        
        // Anders gebruik gewoon de datum
        return new Date(timestamp).toLocaleDateString('nl-NL');
    }
    
    /**
     * Maak luistergeschiedenis leeg
     * @returns {boolean} Succes
     */
    clearListeningHistory() {
        try {
            this.listeningHistory = [];
            this.artistPlayCounts = {};
            this.listeningTimes = [];
            this.genrePreferences = {};
            
            localStorage.setItem('listeningHistory', JSON.stringify(this.listeningHistory));
            localStorage.setItem('artistPlayCounts', JSON.stringify(this.artistPlayCounts));
            localStorage.setItem('listeningTimes', JSON.stringify(this.listeningTimes));
            
            return true;
        } catch (error) {
            console.error('Fout bij wissen luistergeschiedenis:', error);
            return false;
        }
    }
}

// Initialiseer de stats analyzer
const statsAnalyzer = new StatsAnalyzer();
document.addEventListener('DOMContentLoaded', () => {
    statsAnalyzer.init();
});