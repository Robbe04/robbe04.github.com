/**
 * Events Manager
 * Handles fetching and managing DJ events
 */
class EventsManager {
    constructor() {
        this.eventsCache = new Map(); // Cache events by artist ID
        this.cacheExpiration = 24 * 60 * 60 * 1000; // 24 hours
    }
    
    /**
     * Get upcoming events for a list of artists
     * @param {Array} artists - List of artist objects
     * @returns {Promise<Array>} - List of upcoming events
     */
    async getUpcomingEvents(artists) {
        if (!artists || artists.length === 0) return [];
        
        let allEvents = [];
        
        for (const artist of artists) {
            try {
                // Check if we have cached events for this artist
                const cachedEvents = this.getCachedEvents(artist.id);
                if (cachedEvents) {
                    allEvents = [...allEvents, ...cachedEvents];
                    continue;
                }
                
                // Fetch events for this artist
                const events = await this.fetchArtistEvents(artist);
                
                // Cache the events
                this.cacheEvents(artist.id, events);
                
                // Add to the result list
                allEvents = [...allEvents, ...events];
            } catch (error) {
                console.error(`Error fetching events for artist ${artist.name}:`, error);
            }
        }
        
        // Sort by date (soonest first)
        allEvents.sort((a, b) => new Date(a.date) - new Date(b.date));
        
        // Filter out past events
        const now = new Date();
        return allEvents.filter(event => new Date(event.date) > now);
    }
    
    /**
     * Get cached events for an artist if they're still valid
     * @param {string} artistId - Artist ID
     * @returns {Array|null} - List of events or null if cache is invalid
     */
    getCachedEvents(artistId) {
        if (!this.eventsCache.has(artistId)) return null;
        
        const { timestamp, events } = this.eventsCache.get(artistId);
        const now = Date.now();
        
        // Check if cache is still valid
        if (now - timestamp < this.cacheExpiration) {
            return events;
        }
        
        // Cache expired
        return null;
    }
    
    /**
     * Cache events for an artist
     * @param {string} artistId - Artist ID
     * @param {Array} events - List of events
     */
    cacheEvents(artistId, events) {
        this.eventsCache.set(artistId, {
            timestamp: Date.now(),
            events: events
        });
    }
    
    /**
     * Fetch events for an artist from various sources
     * @param {Object} artist - Artist object
     * @returns {Promise<Array>} - List of events
     */
    async fetchArtistEvents(artist) {
        // Simulated data - in a real app, this would call an API
        return this.getSimulatedEvents(artist);
    }
    
    /**
     * Generate simulated events for demo purposes
     * @param {Object} artist - Artist object
     * @returns {Array} - List of simulated events
     */
    getSimulatedEvents(artist) {
        // For demonstration purposes, we'll create some simulated events
        const today = new Date();
        const events = [];
        
        // Create between 1-4 random events for this artist
        const numEvents = Math.floor(Math.random() * 4) + 1;
        
        for (let i = 0; i < numEvents; i++) {
            // Generate a date between now and 6 months in the future
            const eventDate = new Date(today);
            eventDate.setDate(today.getDate() + Math.floor(Math.random() * 180) + 1);
            
            // Random event types
            const eventTypes = ['festival', 'club', 'concert', 'live stream'];
            const type = eventTypes[Math.floor(Math.random() * eventTypes.length)];
            
            // Random ticket statuses
            const ticketStatuses = ['on sale', 'sold out', 'soon', 'pre-sale'];
            const ticketStatus = ticketStatuses[Math.floor(Math.random() * ticketStatuses.length)];
            
            // Random locations based on type
            let location;
            if (type === 'festival') {
                const festivalLocations = [
                    { name: 'Tomorrowland', city: 'Boom, België' },
                    { name: 'Amsterdam Dance Event', city: 'Amsterdam' },
                    { name: 'Ultra Music Festival', city: 'Miami, VS' },
                    { name: 'Mysteryland', city: 'Haarlemmermeer' }
                ];
                location = festivalLocations[Math.floor(Math.random() * festivalLocations.length)];
            } else if (type === 'club') {
                const clubLocations = [
                    { name: 'Shelter', city: 'Amsterdam' },
                    { name: 'De Marktkantine', city: 'Amsterdam' },
                    { name: 'Berghain', city: 'Berlijn, Duitsland' },
                    { name: 'Fabric', city: 'Londen, VK' }
                ];
                location = clubLocations[Math.floor(Math.random() * clubLocations.length)];
            } else {
                const venueLocations = [
                    { name: 'Ziggo Dome', city: 'Amsterdam' },
                    { name: 'AFAS Live', city: 'Amsterdam' },
                    { name: 'Paradiso', city: 'Amsterdam' },
                    { name: 'TivoliVredenburg', city: 'Utrecht' }
                ];
                location = venueLocations[Math.floor(Math.random() * venueLocations.length)];
            }
            
            // Create the event
            events.push({
                id: `event-${artist.id}-${i}`,
                name: type === 'festival' ? location.name : `${artist.name} ${type === 'live stream' ? 'Live Stream' : 'Live'}`,
                artistId: artist.id,
                artistName: artist.name,
                date: eventDate.toISOString(),
                type: type,
                location: location,
                ticketStatus: ticketStatus,
                ticketUrl: ticketStatus === 'on sale' ? `https://example.com/tickets/${artist.id}-${i}` : null,
                image: artist.img
            });
        }
        
        return events;
    }
    
    /**
     * Get events by type (festival, club, etc.)
     * @param {Array} events - List of events
     * @param {string} type - Event type
     * @returns {Array} - Filtered events
     */
    filterEventsByType(events, type) {
        if (!type) return events;
        return events.filter(event => event.type === type);
    }
    
    /**
     * Search events by keyword
     * @param {Array} events - List of events
     * @param {string} keyword - Search keyword
     * @returns {Array} - Filtered events
     */
    searchEvents(events, keyword) {
        if (!keyword) return events;
        
        const lowercaseKeyword = keyword.toLowerCase();
        
        return events.filter(event => 
            event.name.toLowerCase().includes(lowercaseKeyword) ||
            event.artistName.toLowerCase().includes(lowercaseKeyword) ||
            event.location.name.toLowerCase().includes(lowercaseKeyword) ||
            event.location.city.toLowerCase().includes(lowercaseKeyword)
        );
    }
}

// Initialize the events manager
const eventsManager = new EventsManager();