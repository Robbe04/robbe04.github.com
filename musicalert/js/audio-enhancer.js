/**
 * Audio Enhancer Module
 * Voegt geavanceerde audio-mogelijkheden toe aan MusicAlert
 */
class AudioEnhancer {
    constructor() {
        this.audioContext = null;
        this.analyser = null;
        this.gainNode = null;
        this.equalizerBands = {};
        this.currentSource = null;
        this.offlineTracks = JSON.parse(localStorage.getItem('offlineTracks') || '[]');
        this.maxOfflineStorage = 50 * 1024 * 1024; // 50MB limiet
    }
    
    /**
     * Initialiseer de audio context en nodes
     */
    init() {
        try {
            // AudioContext moet worden geïnitialiseerd na een gebruikersinteractie
            const initAudio = () => {
                if (this.audioContext) return;
                
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
                this.analyser = this.audioContext.createAnalyser();
                this.gainNode = this.audioContext.createGain();
                
                // Verbind de nodes
                this.gainNode.connect(this.analyser);
                this.analyser.connect(this.audioContext.destination);
                
                // Configureer de analyser voor visualisaties
                this.analyser.fftSize = 256;
                
                // Initialiseer de equalizer
                this.setupEqualizer();
                
                document.removeEventListener('click', initAudio);
                console.log('Audio Enhancer geïnitialiseerd');
            };
            
            document.addEventListener('click', initAudio);
            
            // Onderschep standaard audio-elementen om ze te verbeteren
            this.setupAudioInterception();
            
            // Check opgeslagen offline tracks
            this.cleanupExpiredOfflineTracks();
            
            return true;
        } catch (error) {
            console.error('Fout bij initialiseren Audio Enhancer:', error);
            return false;
        }
    }
    
    /**
     * Configureer een eenvoudige equalizer met 3 banden
     */
    setupEqualizer() {
        if (!this.audioContext) return;
        
        // Maak filters voor lage, midden en hoge frequenties
        const bass = this.audioContext.createBiquadFilter();
        bass.type = 'lowshelf';
        bass.frequency.value = 200;
        
        const mid = this.audioContext.createBiquadFilter();
        mid.type = 'peaking';
        mid.frequency.value = 1000;
        mid.Q.value = 0.5;
        
        const treble = this.audioContext.createBiquadFilter();
        treble.type = 'highshelf';
        treble.frequency.value = 3000;
        
        // Verbind de filters in serie
        bass.connect(mid);
        mid.connect(treble);
        treble.connect(this.gainNode);
        
        // Sla de banden op voor later gebruik
        this.equalizerBands = {
            bass,
            mid,
            treble
        };
        
        // Stel standaardwaarden in
        this.setEqualizerBand('bass', 0);
        this.setEqualizerBand('mid', 0);
        this.setEqualizerBand('treble', 0);
    }
    
    /**
     * Pas de gain van een equalizer band aan
     * @param {string} band - 'bass', 'mid', of 'treble'
     * @param {number} value - Gain waarde van -10 tot 10
     */
    setEqualizerBand(band, value) {
        if (!this.equalizerBands[band]) return;
        this.equalizerBands[band].gain.value = value;
    }
    
    /**
     * Pas het volume aan
     * @param {number} value - Volume van 0 tot 1
     */
    setVolume(value) {
        if (!this.gainNode) return;
        this.gainNode.gain.value = Math.max(0, Math.min(1, value));
    }
    
    /**
     * Verbeter een standaard audio element met onze functies
     * @param {HTMLAudioElement} audioElement - Het te verbeteren audio element
     */
    enhanceAudio(audioElement) {
        if (!this.audioContext || !audioElement) return;
        
        // Indien er al een actieve source is, ontkoppel deze
        if (this.currentSource) {
            this.currentSource.disconnect();
        }
        
        // Maak een nieuwe media source
        try {
            const source = this.audioContext.createMediaElementSource(audioElement);
            
            // Verbind met de equalizer
            source.connect(this.equalizerBands.bass);
            
            // Sla de huidige source op
            this.currentSource = source;
            
            console.log('Audio element verbeterd');
            return true;
        } catch (error) {
            console.error('Fout bij verbeteren audio:', error);
            return false;
        }
    }
    
    /**
     * Onderschep het aanmaken van nieuwe audio elementen om ze te verbeteren
     */
    setupAudioInterception() {
        // Voor nieuwe audio elementen via createAudio functie
        document.addEventListener('playbackstarted', (e) => {
            if (e.detail && e.detail.audio) {
                this.enhanceAudio(e.detail.audio);
            }
        });
        
        // Observeer audio elementen die direct in de DOM worden ingevoegd
        const observer = new MutationObserver((mutations) => {
            mutations.forEach(mutation => {
                if (mutation.addedNodes) {
                    mutation.addedNodes.forEach(node => {
                        if (node.tagName === 'AUDIO') {
                            this.enhanceAudio(node);
                        }
                    });
                }
            });
        });
        
        observer.observe(document.body, { 
            childList: true, 
            subtree: true 
        });
    }
    
    /**
     * Haal frequentiedata op voor visualisatie
     * @returns {Uint8Array} Frequentiedata
     */
    getFrequencyData() {
        if (!this.analyser) return null;
        
        const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
        this.analyser.getByteFrequencyData(dataArray);
        return dataArray;
    }
    
    /**
     * Sla een track op voor offline luisteren
     * @param {string} trackId - ID van de track
     * @param {string} url - URL van de audio
     * @param {Object} metadata - Metadata van de track
     */
    async saveTrackOffline(trackId, url, metadata) {
        try {
            // Check of we al aan de limiet zitten
            const currentSize = this.getOfflineStorageSize();
            if (currentSize >= this.maxOfflineStorage) {
                throw new Error('Offline opslaglimiet bereikt. Verwijder eerst enkele tracks.');
            }
            
            // Check of de track al offline is
            if (this.isTrackAvailableOffline(trackId)) {
                return true;
            }
            
            // Download de audio
            const response = await fetch(url);
            const blob = await response.blob();
            
            // Zet de blob om naar base64
            const reader = new FileReader();
            reader.readAsDataURL(blob);
            
            return new Promise((resolve, reject) => {
                reader.onloadend = () => {
                    try {
                        const base64data = reader.result;
                        
                        // Voeg toe aan opgeslagen tracks
                        this.offlineTracks.push({
                            id: trackId,
                            data: base64data,
                            size: blob.size,
                            metadata: metadata,
                            savedAt: Date.now(),
                            expiresAt: Date.now() + (7 * 24 * 60 * 60 * 1000) // 7 dagen geldig
                        });
                        
                        // Sla op in localStorage
                        localStorage.setItem('offlineTracks', JSON.stringify(this.offlineTracks));
                        
                        resolve(true);
                    } catch (error) {
                        reject(error);
                    }
                };
                
                reader.onerror = () => {
                    reject(new Error('Fout bij lezen van audio data'));
                };
            });
        } catch (error) {
            console.error('Fout bij opslaan track offline:', error);
            throw error;
        }
    }
    
    /**
     * Check of een track offline beschikbaar is
     * @param {string} trackId - ID van de track
     * @returns {boolean} Offline beschikbaarheid
     */
    isTrackAvailableOffline(trackId) {
        return this.offlineTracks.some(track => track.id === trackId);
    }
    
    /**
     * Haal een offline track op
     * @param {string} trackId - ID van de track
     * @returns {Object|null} Track object of null
     */
    getOfflineTrack(trackId) {
        return this.offlineTracks.find(track => track.id === trackId) || null;
    }
    
    /**
     * Verwijder een offline track
     * @param {string} trackId - ID van de track
     * @returns {boolean} Succes
     */
    removeOfflineTrack(trackId) {
        const initialLength = this.offlineTracks.length;
        this.offlineTracks = this.offlineTracks.filter(track => track.id !== trackId);
        
        if (this.offlineTracks.length < initialLength) {
            localStorage.setItem('offlineTracks', JSON.stringify(this.offlineTracks));
            return true;
        }
        
        return false;
    }
    
    /**
     * Haal de grootte van de offline opslag op
     * @returns {number} Grootte in bytes
     */
    getOfflineStorageSize() {
        return this.offlineTracks.reduce((total, track) => total + (track.size || 0), 0);
    }
    
    /**
     * Verwijder verlopen offline tracks
     */
    cleanupExpiredOfflineTracks() {
        const now = Date.now();
        const initialLength = this.offlineTracks.length;
        
        this.offlineTracks = this.offlineTracks.filter(track => {
            return !track.expiresAt || track.expiresAt > now;
        });
        
        if (this.offlineTracks.length < initialLength) {
            localStorage.setItem('offlineTracks', JSON.stringify(this.offlineTracks));
            console.log(`${initialLength - this.offlineTracks.length} verlopen offline tracks verwijderd`);
        }
    }
}

// Initialiseer de audio enhancer
const audioEnhancer = new AudioEnhancer();
document.addEventListener('DOMContentLoaded', () => {
    audioEnhancer.init();
});