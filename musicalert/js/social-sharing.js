/**
 * Social Sharing Module
 * Verbeterde sociale interacties en playlist-delen
 */
class SocialSharing {
    constructor() {
        this.sharedPlaylists = JSON.parse(localStorage.getItem('sharedPlaylists') || '[]');
        this.collaborativePlaylists = JSON.parse(localStorage.getItem('collaborativePlaylists') || '[]');
        this.initialized = false;
    }
    
    /**
     * Initialiseer de social sharing module
     */
    init() {
        if (this.initialized) return;
        
        try {
            // Check of webshare API beschikbaar is
            this.webShareAvailable = !!navigator.share;
            
            // Verwijder verlopen shared playlists
            this.cleanupExpiredPlaylists();
            
            this.initialized = true;
            return true;
        } catch (error) {
            console.error('Fout bij initialiseren Social Sharing:', error);
            return false;
        }
    }
    
    /**
     * Genereer een hash code voor een string
     * @param {string} str - De string om te hashen
     * @returns {string} Hash code
     */
    hashCode(str) {
        let hash = 0;
        if (str.length === 0) return hash.toString();
        
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Converteer naar 32bit integer
        }
        
        return hash.toString(16); // Converteer naar hex
    }
    
    /**
     * Genereer een unieke code voor een playlist
     * @param {string} name - Naam van de playlist
     * @param {Array} tracks - Tracks in de playlist
     * @returns {string} Unieke code
     */
    generatePlaylistCode(name, tracks) {
        const timestamp = Date.now();
        const tracksString = tracks.map(t => t.id).join(',');
        const dataToHash = `${name}|${tracksString}|${timestamp}`;
        
        return this.hashCode(dataToHash);
    }
    
    /**
     * Maak een nieuwe gedeelde playlist
     * @param {string} name - Naam van de playlist
     * @param {Array} tracks - Tracks in de playlist
     * @param {string} description - Beschrijving van de playlist
     * @param {boolean} isCollaborative - Of de playlist bewerkbaar is door anderen
     * @returns {Object} De nieuwe playlist
     */
    createSharedPlaylist(name, tracks, description = '', isCollaborative = false) {
        try {
            if (!name || !tracks || tracks.length === 0) {
                throw new Error('Naam en tracks zijn vereist voor een playlist');
            }
            
            const playlistCode = this.generatePlaylistCode(name, tracks);
            
            // Bereid playlist data voor
            const playlist = {
                id: `pl_${playlistCode}`,
                name,
                description,
                tracks,
                isCollaborative,
                createdAt: Date.now(),
                expiresAt: Date.now() + (30 * 24 * 60 * 60 * 1000), // 30 dagen geldig
                createdBy: 'me', // In een echte app zou dit een gebruikers-ID zijn
                collaborators: [],
                views: 0,
                shareUrl: `${window.location.origin}${window.location.pathname}?share=playlist&id=pl_${playlistCode}`
            };
            
            // Sla op in de juiste lijst
            if (isCollaborative) {
                this.collaborativePlaylists.push(playlist);
                localStorage.setItem('collaborativePlaylists', JSON.stringify(this.collaborativePlaylists));
            } else {
                this.sharedPlaylists.push(playlist);
                localStorage.setItem('sharedPlaylists', JSON.stringify(this.sharedPlaylists));
            }
            
            return playlist;
        } catch (error) {
            console.error('Fout bij maken van gedeelde playlist:', error);
            throw error;
        }
    }
    
    /**
     * Deel een playlist via de Web Share API of kopieer de URL
     * @param {Object} playlist - De playlist om te delen
     * @returns {boolean} Succes
     */
    async sharePlaylist(playlist) {
        try {
            if (this.webShareAvailable) {
                await navigator.share({
                    title: `MusicAlert Playlist: ${playlist.name}`,
                    text: playlist.description || `Check deze playlist met ${playlist.tracks.length} DJ tracks!`,
                    url: playlist.shareUrl
                });
                
                return true;
            } else {
                // Fallback: kopieer de URL naar het klembord
                await navigator.clipboard.writeText(playlist.shareUrl);
                return true;
            }
        } catch (error) {
            if (error.name !== 'AbortError') {
                console.error('Fout bij delen playlist:', error);
                
                // Probeer fallback als web share API faalt
                try {
                    await navigator.clipboard.writeText(playlist.shareUrl);
                    return true;
                } catch (clipboardError) {
                    console.error('Fout bij kopiëren naar klembord:', clipboardError);
                    return false;
                }
            }
            return false;
        }
    }
    
    /**
     * Haal een gedeelde playlist op met de ID
     * @param {string} playlistId - ID van de playlist
     * @returns {Object|null} Playlist object of null
     */
    getSharedPlaylist(playlistId) {
        // Zoek eerst in normale gedeelde playlists
        let playlist = this.sharedPlaylists.find(p => p.id === playlistId);
        
        // Als niet gevonden, zoek in collaborative playlists
        if (!playlist) {
            playlist = this.collaborativePlaylists.find(p => p.id === playlistId);
        }
        
        if (playlist) {
            // Verhoog het aantal views
            playlist.views++;
            
            // Update de playlist in de juiste lijst
            if (playlist.isCollaborative) {
                const index = this.collaborativePlaylists.findIndex(p => p.id === playlistId);
                if (index >= 0) {
                    this.collaborativePlaylists[index] = playlist;
                    localStorage.setItem('collaborativePlaylists', JSON.stringify(this.collaborativePlaylists));
                }
            } else {
                const index = this.sharedPlaylists.findIndex(p => p.id === playlistId);
                if (index >= 0) {
                    this.sharedPlaylists[index] = playlist;
                    localStorage.setItem('sharedPlaylists', JSON.stringify(this.sharedPlaylists));
                }
            }
        }
        
        return playlist;
    }
    
    /**
     * Voeg tracks toe aan een collaborative playlist
     * @param {string} playlistId - ID van de playlist
     * @param {Array} newTracks - Tracks om toe te voegen
     * @returns {boolean} Succes
     */
    addTracksToCollaborativePlaylist(playlistId, newTracks) {
        try {
            const index = this.collaborativePlaylists.findIndex(p => p.id === playlistId);
            
            if (index < 0) return false;
            
            const playlist = this.collaborativePlaylists[index];
            
            // Alleen toevoegen als het echt een collaborative playlist is
            if (!playlist.isCollaborative) return false;
            
            // Filter duplicaten
            const existingTrackIds = playlist.tracks.map(t => t.id);
            const uniqueNewTracks = newTracks.filter(track => !existingTrackIds.includes(track.id));
            
            // Voeg nieuwe tracks toe
            playlist.tracks = [...playlist.tracks, ...uniqueNewTracks];
            
            // Update laatste wijziging
            playlist.lastModified = Date.now();
            
            // Sla veranderingen op
            this.collaborativePlaylists[index] = playlist;
            localStorage.setItem('collaborativePlaylists', JSON.stringify(this.collaborativePlaylists));
            
            return true;
        } catch (error) {
            console.error('Fout bij toevoegen tracks aan collaborative playlist:', error);
            return false;
        }
    }
    
    /**
     * Converteer een normale gedeelde playlist naar een collaborative playlist
     * @param {string} playlistId - ID van de playlist
     * @returns {boolean} Succes
     */
    makePlaylistCollaborative(playlistId) {
        try {
            // Zoek de playlist in de normale gedeelde playlists
            const index = this.sharedPlaylists.findIndex(p => p.id === playlistId);
            
            if (index < 0) return false;
            
            // Haal de playlist op en zet isCollaborative op true
            const playlist = this.sharedPlaylists[index];
            playlist.isCollaborative = true;
            
            // Voeg toe aan collaborative playlists
            this.collaborativePlaylists.push(playlist);
            
            // Verwijder uit normale gedeelde playlists
            this.sharedPlaylists.splice(index, 1);
            
            // Sla beide lijsten op
            localStorage.setItem('sharedPlaylists', JSON.stringify(this.sharedPlaylists));
            localStorage.setItem('collaborativePlaylists', JSON.stringify(this.collaborativePlaylists));
            
            return true;
        } catch (error) {
            console.error('Fout bij omzetten naar collaborative playlist:', error);
            return false;
        }
    }
    
    /**
     * Genereer een collaboratieve playlist QR code
     * @param {string} playlistId - ID van de playlist
     * @returns {string} URL voor QR code generatie
     */
    getPlaylistQRCode(playlistId) {
        const playlist = this.getSharedPlaylist(playlistId);
        
        if (!playlist) return null;
        
        // Gebruik een externe QR code generator service
        // In een echte app zou je dit waarschijnlijk zelf genereren
        return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(playlist.shareUrl)}`;
    }
    
    /**
     * Verwijder verlopen playlists
     */
    cleanupExpiredPlaylists() {
        try {
            const now = Date.now();
            
            // Filter verlopen playlists uit gedeelde playlists
            this.sharedPlaylists = this.sharedPlaylists.filter(playlist => {
                return !playlist.expiresAt || playlist.expiresAt > now;
            });
            
            // Filter verlopen playlists uit collaborative playlists
            this.collaborativePlaylists = this.collaborativePlaylists.filter(playlist => {
                return !playlist.expiresAt || playlist.expiresAt > now;
            });
            
            // Sla de gefilterde lijsten op
            localStorage.setItem('sharedPlaylists', JSON.stringify(this.sharedPlaylists));
            localStorage.setItem('collaborativePlaylists', JSON.stringify(this.collaborativePlaylists));
        } catch (error) {
            console.error('Fout bij opschonen playlists:', error);
        }
    }
}

// Initialiseer de social sharing module
const socialSharing = new SocialSharing();
document.addEventListener('DOMContentLoaded', () => {
    socialSharing.init();
});
