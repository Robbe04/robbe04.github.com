/**
 * Events Manager
 * Beheert DJ events, festivals en optredens
 */
class EventsManager {
    constructor() {
        this.events = [];
        this.savedEvents = JSON.parse(localStorage.getItem('savedEvents') || '[]');
        this.loadingEvents = false;
        this.initialized = false;
        this.providers = [
            { name: 'ticketmaster', enabled: true },
            { name: 'songkick', enabled: true },
            { name: 'residentadvisor', enabled: true }
        ];
    }
    
    /**
     * Initialiseer de events manager
     */
    async init() {
        if (this.initialized) return true;
        
        try {
            // Laad opgeslagen configuratie
            const config = JSON.parse(localStorage.getItem('eventsConfig') || '{}');
            if (config.providers) {
                this.providers = config.providers;
            }
            
            // Verwijder verlopen events
            this.cleanupExpiredEvents();
            
            this.initialized = true;
            return true;
        } catch (error) {
            console.error('Fout bij initialiseren Events Manager:', error);
            return false;
        }
    }
    
    /**
     * Zoek events voor een artiest
     * @param {string} artistId - Spotify ID van de artiest
     * @param {string} artistName - Naam van de artiest
     * @returns {Array} Gevonden events
     */
    async findArtistEvents(artistId, artistName) {
        try {
            this.loadingEvents = true;
            
            // Check eerst de cache
            const cachedEvents = this.getCachedEvents(artistId);
            if (cachedEvents.length > 0) {
                this.loadingEvents = false;
                return cachedEvents;
            }

            // In een echte applicatie zou dit een backend API-call zijn
            // De implementatie hieronder is slechts een mockup voor demonstratiedoeleinden
            
            // Simuleer API call naar eventbronnen
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Genereer enkele gesimuleerde events
            const now = new Date();
            const events = [];
            
            // Simuleer 0-5 events voor deze artiest
            const numEvents = Math.floor(Math.random() * 6);
            
            for (let i = 0; i < numEvents; i++) {
                // Random datum in de komende 6 maanden
                const eventDate = new Date();
                eventDate.setDate(now.getDate() + Math.floor(Math.random() * 180));
                
                // Willekeurige locaties
                const locations = [
                    { name: 'Ziggo Dome', city: 'Amsterdam', country: 'Nederland' },
                    { name: 'AFAS Live', city: 'Amsterdam', country: 'Nederland' },
                    { name: 'Paradiso', city: 'Amsterdam', country: 'Nederland' },
                    { name: 'Tomorrowland', city: 'Boom', country: 'België' },
                    { name: 'Berghain', city: 'Berlijn', country: 'Duitsland' },
                    { name: 'Fabric', city: 'London', country: 'Verenigd Koninkrijk' },
                    { name: 'Shelter', city: 'Amsterdam', country: 'Nederland' },
                    { name: 'De Marktkantine', city: 'Amsterdam', country: 'Nederland' }
                ];
                
                const location = locations[Math.floor(Math.random() * locations.length)];
                
                // Event types
                const types = ['concert', 'festival', 'club night', 'livestream'];
                const type = types[Math.floor(Math.random() * types.length)];
                
                // Ticket status
                const statuses = ['on sale', 'sold out', 'presale', 'soon'];
                const ticketStatus = statuses[Math.floor(Math.random() * statuses.length)];
                
                // Genereer een ticket URL (in een echte app zou deze van de provider komen)
                const ticketUrl = `https://tickets.example.com/${type}/${artistName.toLowerCase().replace(/\s+/g, '-')}-${eventDate.toISOString().split('T')[0]}`;
                
                // Event ID
                const eventId = `evt_${artistId}_${i}_${Date.now()}`;
                
                events.push({
                    id: eventId,
                    artistId: artistId,
                    artistName: artistName,
                    name: type === 'festival' ? 
                        ['Tomorrowland', 'Awakenings', 'Dekmantel', 'ADE', 'Ultra Music Festival'][Math.floor(Math.random() * 5)] : 
                        `${artistName} ${type}`,
                    date: eventDate.toISOString(),
                    displayDate: eventDate.toLocaleDateString('nl-NL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
                    location: location,
                    type: type,
                    ticketStatus: ticketStatus,
                    ticketUrl: ticketUrl,
                    source: this.providers[Math.floor(Math.random() * this.providers.length)].name,
                    createdAt: new Date().toISOString(),
                    expiresAt: new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000)).toISOString() // Cache voor 30 dagen
                });
            }
            
            // Cache de resultaten
            if (events.length > 0) {
                this.cacheEvents(artistId, events);
            }
            
            this.loadingEvents = false;
            return events;
        } catch (error) {
            this.loadingEvents = false;
            console.error('Fout bij zoeken events:', error);
            return [];
        }
    }
    
    /**
     * Bewaar events in de cache
     * @param {string} artistId - ID van de artiest
     * @param {Array} events - Events om op te slaan
     */
    cacheEvents(artistId, events) {
        try {
            // Haal huidige cache op
            const eventsCache = JSON.parse(localStorage.getItem('eventsCache') || '{}');
            
            // Update cache met nieuwe events
            eventsCache[artistId] = {
                events: events,
                updatedAt: new Date().toISOString()
            };
            
            // Sla cache op
            localStorage.setItem('eventsCache', JSON.stringify(eventsCache));
        } catch (error) {
            console.error('Fout bij cachen events:', error);
        }
    }
    
    /**
     * Haal gecachede events op
     * @param {string} artistId - ID van de artiest
     * @returns {Array} Gecachede events
     */
    getCachedEvents(artistId) {
        try {
            const eventsCache = JSON.parse(localStorage.getItem('eventsCache') || '{}');
            
            if (eventsCache[artistId]) {
                const cachedData = eventsCache[artistId];
                const updatedAt = new Date(cachedData.updatedAt);
                const now = new Date();
                
                // Cache is geldig voor 24 uur
                if ((now - updatedAt) < (24 * 60 * 60 * 1000)) {
                    return cachedData.events;
                }
            }
            
            return [];
        } catch (error) {
            console.error('Fout bij ophalen cache:', error);
            return [];
        }
    }
    
    /**
     * Markeer een event als opgeslagen/interessant
     * @param {Object} event - Het event om op te slaan
     * @returns {boolean} Succes
     */
    saveEvent(event) {
        try {
            // Check of het event al is opgeslagen
            if (this.savedEvents.some(e => e.id === event.id)) {
                return true;
            }
            
            // Voeg event toe aan opgeslagen events
            this.savedEvents.push({
                ...event,
                savedAt: new Date().toISOString()
            });
            
            // Sla op in localStorage
            localStorage.setItem('savedEvents', JSON.stringify(this.savedEvents));
            
            return true;
        } catch (error) {
            console.error('Fout bij opslaan event:', error);
            return false;
        }
    }
    
    /**
     * Verwijder een opgeslagen event
     * @param {string} eventId - ID van het event
     * @returns {boolean} Succes
     */
    unsaveEvent(eventId) {
        try {
            const initialLength = this.savedEvents.length;
            this.savedEvents = this.savedEvents.filter(event => event.id !== eventId);
            
            if (this.savedEvents.length < initialLength) {
                localStorage.setItem('savedEvents', JSON.stringify(this.savedEvents));
                return true;
            }
            
            return false;
        } catch (error) {
            console.error('Fout bij verwijderen event:', error);
            return false;
        }
    }
    
    /**
     * Haal alle opgeslagen events op
     * @returns {Array} Opgeslagen events
     */
    getSavedEvents() {
        return this.savedEvents;
    }
    
    /**
     * Haal aankomende events op voor favoriete artiesten
     * @param {Array} favoriteArtists - Lijst met favoriete artiesten
     * @returns {Array} Events
     */
    async getUpcomingEvents(favoriteArtists) {
        try {
            if (!favoriteArtists || favoriteArtists.length === 0) {
                return [];
            }
            
            // Verzamel alle events
            let allEvents = [];
            
            // Begin met opgeslagen events
            const savedEvents = this.getSavedEvents();
            allEvents = [...savedEvents];
            
            // Haal ook events uit de cache
            const eventsCache = JSON.parse(localStorage.getItem('eventsCache') || '{}');
            for (const artistId in eventsCache) {
                if (favoriteArtists.some(artist => artist.id === artistId)) {
                    allEvents = [...allEvents, ...eventsCache[artistId].events];
                }
            }
            
            // Verwijder duplicaten
            const uniqueEvents = [];
            const eventIds = new Set();
            
            for (const event of allEvents) {
                if (!eventIds.has(event.id)) {
                    eventIds.add(event.id);
                    uniqueEvents.push(event);
                }
            }
            
            // Sorteer op datum (eerst aankomende events)
            uniqueEvents.sort((a, b) => new Date(a.date) - new Date(b.date));
            
            // Filter events die al voorbij zijn
            const now = new Date();
            return uniqueEvents.filter(event => new Date(event.date) > now);
        } catch (error) {
            console.error('Fout bij ophalen aankomende events:', error);
            return [];
        }
    }
    
    /**
     * Verwijder verlopen events
     */
    cleanupExpiredEvents() {
        try {
            const now = new Date();
            
            // Verwijder verlopen events uit opgeslagen events
            const initialSavedLength = this.savedEvents.length;
            this.savedEvents = this.savedEvents.filter(event => {
                return new Date(event.date) > now;
            });
            
            if (this.savedEvents.length < initialSavedLength) {
                localStorage.setItem('savedEvents', JSON.stringify(this.savedEvents));
            }
            
            // Verwijder verlopen events uit cache
            const eventsCache = JSON.parse(localStorage.getItem('eventsCache') || '{}');
            let cacheChanged = false;
            
            for (const artistId in eventsCache) {
                const cachedData = eventsCache[artistId];
                const initialLength = cachedData.events.length;
                
                cachedData.events = cachedData.events.filter(event => {
                    return new Date(event.date) > now || new Date(event.expiresAt) > now;
                });
                
                if (cachedData.events.length < initialLength) {
                    eventsCache[artistId] = cachedData;
                    cacheChanged = true;
                }
            }
            
            if (cacheChanged) {
                localStorage.setItem('eventsCache', JSON.stringify(eventsCache));
            }
        } catch (error) {
            console.error('Fout bij opschonen events:', error);
        }
    }
}

// Initialiseer de events manager
const eventsManager = new EventsManager();
document.addEventListener('DOMContentLoaded', () => {
    eventsManager.init();
});
