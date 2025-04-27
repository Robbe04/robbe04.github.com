/**
 * Spotify API Service
 * Handles all communication with the Spotify Web API
 */
class SpotifyApiService {
    constructor() {
        this.clientId = '22db16be6a25441e977dd4d2d6617d71';
        this.clientSecret = 'c7db95f32a9347919b2899d72b4f2bc5';
        this.token = '';
        this.tokenExpiresAt = 0;
    }

    /**
     * Get a new access token using client credentials
     */
    async getToken() {
        try {
            // Check if we already have a valid token
            if (this.token && Date.now() < this.tokenExpiresAt) {
                return this.token;
            }

            ui.showLoading('Verbinding maken met Spotify...');
            
            const response = await fetch('https://accounts.spotify.com/api/token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: `grant_type=client_credentials&client_id=${this.clientId}&client_secret=${this.clientSecret}`
            });
            
            const data = await response.json();
            
            if (data.error) {
                throw new Error(`Authentication error: ${data.error}`);
            }
            
            this.token = data.access_token;
            // Set token expiration (subtract 60 seconds as buffer)
            this.tokenExpiresAt = Date.now() + (data.expires_in - 60) * 1000;
            
            ui.hideLoading();
            return this.token;
        } catch (error) {
            ui.hideLoading();
            ui.showError('Er is een fout opgetreden bij het verbinden met Spotify. Probeer de pagina te vernieuwen.');
            console.error('Error getting token:', error);
            throw error;
        }
    }

    /**
     * Get headers with authorization token
     */
    async getHeaders() {
        try {
            const token = await this.getToken();
            return {
                'Authorization': `Bearer ${token}`
            };
        } catch (error) {
            console.error('Error getting headers:', error);
            throw new Error('Kon geen verbinding maken met de Spotify API');
        }
    }

    /**
     * Search for artists
     */
    async searchArtists(query, limit = 10) {
        try {
            ui.showLoading('Artiesten zoeken...');
            
            const headers = await this.getHeaders();
            const response = await fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=artist&limit=${limit}`, {
                headers
            });
            
            const data = await response.json();
            
            if (data.error) {
                throw new Error(`API error: ${data.error.message}`);
            }
            
            ui.hideLoading();
            return data.artists.items;
        } catch (error) {
            ui.hideLoading();
            ui.showError('Er is een fout opgetreden bij het zoeken. Probeer het opnieuw.');
            console.error('Error searching artists:', error);
            throw error;
        }
    }

    /**
     * Get available genres
     */
    async getGenres() {
        try {
            const headers = await this.getHeaders();
            const response = await fetch('https://api.spotify.com/v1/recommendations/available-genre-seeds', {
                headers
            });
            
            const data = await response.json();
            
            if (data.error) {
                throw new Error(`API error: ${data.error.message}`);
            }
            
            return data.genres;
        } catch (error) {
            console.error('Error fetching genres:', error);
            return [];
        }
    }

    /**
     * Get artist details
     */
    async getArtist(artistId) {
        try {
            const headers = await this.getHeaders();
            const response = await fetch(`https://api.spotify.com/v1/artists/${artistId}`, {
                headers
            });
            
            const data = await response.json();
            
            if (data.error) {
                throw new Error(`API error: ${data.error.message}`);
            }
            
            return data;
        } catch (error) {
            console.error('Error fetching artist:', error);
            throw error;
        }
    }

    /**
     * Get related artists
     */
    async getRelatedArtists(artistId) {
        try {
            const headers = await this.getHeaders();
            const response = await fetch(`https://api.spotify.com/v1/artists/${artistId}/related-artists`, {
                headers
            });
            
            const data = await response.json();
            
            if (data.error) {
                throw new Error(`API error: ${data.error.message}`);
            }
            
            return data.artists.slice(0, 5); // Return top 5 related artists
        } catch (error) {
            console.error('Error fetching related artists:', error);
            return [];
        }
    }

    /**
     * Get latest releases from an artist
     */
    async getArtistReleases(artistId, limit = 6) {
        try {
            ui.showLoading('Releases ophalen...');
            
            const headers = await this.getHeaders();
            
            // First, get both albums and singles
            const response = await fetch(`https://api.spotify.com/v1/artists/${artistId}/albums?include_groups=single,album&limit=20&market=NL`, {
                headers
            });
            
            const data = await response.json();
            
            if (data.error) {
                throw new Error(`API error: ${data.error.message}`);
            }
            
            // Sort releases by release date (newest first)
            const sortedReleases = data.items.sort((a, b) => {
                return new Date(b.release_date) - new Date(a.release_date);
            });
            
            // Create a map to track the most recent release for each title
            // This helps eliminate duplicate releases (e.g., same album in different regions)
            const uniqueReleases = new Map();
            
            // Filter out duplicates and prioritize singles over albums when they have the same name
            sortedReleases.forEach(release => {
                const normalizedTitle = release.name.toLowerCase().trim();
                
                if (!uniqueReleases.has(normalizedTitle)) {
                    uniqueReleases.set(normalizedTitle, release);
                } else {
                    // If we already have this title and the current item is a single while the stored is an album,
                    // or if it's newer than what we have, replace it
                    const existingRelease = uniqueReleases.get(normalizedTitle);
                    const existingReleaseDate = new Date(existingRelease.release_date);
                    const currentReleaseDate = new Date(release.release_date);
                    
                    // Prioritize singles over albums, or newer releases
                    if ((release.album_type === 'single' && existingRelease.album_type === 'album') ||
                        (currentReleaseDate > existingReleaseDate)) {
                        uniqueReleases.set(normalizedTitle, release);
                    }
                }
            });
            
            // Take the most recent unique releases
            const latestReleases = Array.from(uniqueReleases.values()).slice(0, limit);
            
            // Get full album details with tracks
            const albumsWithTracks = await Promise.all(latestReleases.map(async (album) => {
                const albumResponse = await fetch(`https://api.spotify.com/v1/albums/${album.id}`, { headers });
                return await albumResponse.json();
            }));
            
            ui.hideLoading();
            return albumsWithTracks;
        } catch (error) {
            ui.hideLoading();
            ui.showError('Er is een fout opgetreden bij het ophalen van releases. Probeer het opnieuw.');
            console.error('Error fetching artist releases:', error);
            throw error;
        }
    }

    /**
     * Get recommendations based on artists
     */
    async getRecommendations(artistIds, limit = 6) {
        try {
            if (!artistIds.length) return [];
            
            ui.showLoading('Aanbevelingen laden...');
            
            const headers = await this.getHeaders();
            // Use up to 5 seed artists
            const seedArtists = artistIds.slice(0, 5).join(',');
            
            const response = await fetch(`https://api.spotify.com/v1/recommendations?seed_artists=${seedArtists}&limit=${limit}&market=NL`, {
                headers
            });
            
            const data = await response.json();
            
            if (data.error) {
                throw new Error(`API error: ${data.error.message}`);
            }
            
            // Get full artist details for each recommendation
            const artistsDetails = new Set();
            for (const track of data.tracks) {
                for (const artist of track.artists) {
                    if (!artistIds.includes(artist.id)) {
                        artistsDetails.add(artist.id);
                    }
                }
            }
            
            const recommendedArtists = await Promise.all(
                [...artistsDetails].slice(0, 6).map(async (id) => {
                    return await this.getArtist(id);
                })
            );
            
            ui.hideLoading();
            return recommendedArtists;
        } catch (error) {
            ui.hideLoading();
            console.error('Error fetching recommendations:', error);
            return [];
        }
    }

    /**
     * Check for new releases from favorite artists
     * @param {Array} favorites - List of favorite artists
     * @param {number} days - Number of days to look back (default: 7)
     */
    async checkNewReleases(favorites, days = 7) {
        try {
            if (!favorites.length) return [];
            
            const headers = await this.getHeaders();
            const now = Date.now();
            
            // Look back X days (in milliseconds) based on parameter
            const lookBackPeriod = days * 24 * 60 * 60 * 1000;
            
            let newReleases = [];
            let processedAlbumIds = new Set(); // Track album IDs to prevent duplicates
            
            for (const artist of favorites) {
                const response = await fetch(`https://api.spotify.com/v1/artists/${artist.id}/albums?include_groups=single,album&limit=10&market=NL`, {
                    headers
                });
                
                const data = await response.json();
                
                if (data.error) continue;
                
                // Find albums released within the specified period
                const artistNewReleases = data.items.filter(album => {
                    const releaseDate = new Date(album.release_date).getTime();
                    const ageInMs = now - releaseDate;
                    // Check if album is within specified period and not already processed
                    return ageInMs <= lookBackPeriod && !processedAlbumIds.has(album.id);
                });
                
                for (const album of artistNewReleases) {
                    // Mark this album as processed
                    processedAlbumIds.add(album.id);
                    
                    // Check if this is a collaboration by looking at all artists on the album
                    const collaboratingArtists = album.artists.map(a => a.id);
                    
                    // Find primary artist (the first favorite artist that's on this album)
                    let primaryArtist = artist;
                    
                    // If this is a collab with another favorite artist, use the one with earlier position in favorites
                    if (collaboratingArtists.length > 1) {
                        const favoriteCollaborators = favorites.filter(fav => 
                            collaboratingArtists.includes(fav.id) && fav.id !== artist.id
                        );
                        
                        if (favoriteCollaborators.length > 0) {
                            // Use first favorite artist in the list as primary
                            const firstFavoriteIndex = Math.min(
                                favorites.findIndex(f => f.id === artist.id),
                                ...favoriteCollaborators.map(fc => favorites.findIndex(f => f.id === fc.id))
                            );
                            primaryArtist = favorites[firstFavoriteIndex];
                        }
                    }
                    
                    // Get all collaborating artist names for display
                    let collaborationInfo = null;
                    if (album.artists.length > 1) {
                        const otherArtistNames = album.artists
                            .filter(a => a.id !== primaryArtist.id)
                            .map(a => a.name);
                        
                        if (otherArtistNames.length > 0) {
                            collaborationInfo = {
                                isCollaboration: true,
                                collaboratingArtists: otherArtistNames
                            };
                        }
                    }
                    
                    newReleases.push({
                        artist: primaryArtist,
                        album: album,
                        collaborationInfo: collaborationInfo
                    });
                }
            }
            
            ui.hideLoading();
            return newReleases;
        } catch (error) {
            ui.hideLoading();
            console.error('Error checking for new releases:', error);
            return [];
        }
    }

    /**
     * Get upcoming pre-releases that are not yet released
     * @param {Array} favorites - List of favorite artists
     * @param {number} limit - Maximum number of pre-releases to fetch
     * @param {boolean} isPriority - Whether this is a priority request that should use more generous rate limits
     */
    async getPreReleases(favorites, limit = 10, isPriority = false) {
        try {
            if (!favorites || !favorites.length) {
                console.log("No favorites provided");
                return [];
            }
            
            console.log(`Getting pre-releases for ${favorites.length} favorite artists${isPriority ? ' (priority request)' : ''}`);
            
            // Better error handling for API connection issues
            let headers;
            try {
                headers = await this.getHeaders();
            } catch (error) {
                console.error('Failed to get headers for pre-releases:', error);
                return []; // Return empty array rather than crashing
            }
            
            let preReleases = [];
            
            // Try to get data from cache first, but skip if this is a priority request with forced refresh
            if (!isPriority || !new URLSearchParams(window.location.search).has('refresh')) {
                const cacheKey = 'pre-releases-cache';
                const cacheExpiryKey = 'pre-releases-cache-expiry';
                
                try {
                    const cachedData = localStorage.getItem(cacheKey);
                    const cacheExpiry = localStorage.getItem(cacheExpiryKey);
                    
                    // Use cache if it exists and is less than 6 hours old
                    if (cachedData && cacheExpiry && parseInt(cacheExpiry) > Date.now()) {
                        console.log('Using cached pre-releases data');
                        const parsedData = JSON.parse(cachedData);
                        
                        // Restore Date objects from JSON strings
                        parsedData.forEach(release => {
                            if (typeof release.releaseDate === 'string') {
                                release.releaseDate = new Date(release.releaseDate);
                            }
                        });
                        
                        if (parsedData.length > 0) {
                            return parsedData;
                        }
                    }
                } catch (e) {
                    console.error('Error with cache handling:', e);
                    try {
                        localStorage.removeItem(cacheKey);
                        localStorage.removeItem(cacheExpiryKey);
                    } catch (e) {
                        console.error('Failed to clear cache:', e);
                    }
                }
            }
            
            // To avoid rate limiting, process a subset of artists
            // For priority requests (initial load), we can process more artists
            const maxArtistsToProcess = isPriority ? Math.min(10, favorites.length) : Math.min(5, favorites.length);
            const artistsToProcess = favorites.slice(0, maxArtistsToProcess);
            const processedAlbumIds = new Set();
            
            // Show a message about the API limitations
            if (favorites.length > maxArtistsToProcess) {
                ui.showMessage(`API-limiet: Alleen de eerste ${maxArtistsToProcess} artiesten worden gecontroleerd`, 'info');
            }
            
            // For priority requests, use a more aggressive approach to get results
            const delayBetweenRequests = isPriority ? 800 : 1500; // Shorter delay for priority
            const detailsThreshold = isPriority ? 5 : 3; // Process more details for priority
            
            // Process artists one by one with delay between requests to avoid rate limiting
            for (let i = 0; i < artistsToProcess.length; i++) {
                const artist = artistsToProcess[i];
                
                try {
                    console.log(`Checking releases for: ${artist.name} (${i+1}/${artistsToProcess.length})`);
                    
                    // Add delay between requests to avoid rate limiting
                    if (i > 0) {
                        await new Promise(resolve => setTimeout(resolve, delayBetweenRequests));
                    }
                    
                    // Handle null or undefined artist ID
                    if (!artist.id) {
                        console.error('Artist has no ID:', artist);
                        continue;
                    }
                    
                    // Better error handling for fetch
                    let response;
                    try {
                        response = await fetch(
                            `https://api.spotify.com/v1/artists/${artist.id}/albums?include_groups=album,single&market=NL&limit=5`,
                            { headers }
                        );
                    } catch (fetchError) {
                        console.error(`Network error fetching releases for ${artist.name}:`, fetchError);
                        continue;
                    }
                    
                    if (!response.ok) {
                        console.error(`API error for artist ${artist.name} (${artist.id}): ${response.status}`);
                        
                        if (response.status === 429 || response.status === 502 || response.status === 503) {
                            const retryAfter = parseInt(response.headers.get('Retry-After') || '10');
                            console.log(`Rate limited for artist ${artist.name}. Waiting ${retryAfter+5}s before continuing`);
                            await new Promise(resolve => setTimeout(resolve, (retryAfter + 5) * 1000));
                        }
                        
                        continue;
                    }
                    
                    // Handle JSON parsing errors
                    let data;
                    try {
                        data = await response.json();
                    } catch (jsonError) {
                        console.error(`Failed to parse JSON for ${artist.name}:`, jsonError);
                        continue;
                    }
                    
                    if (!data || !data.items) {
                        console.error(`Invalid data format for ${artist.name}:`, data);
                        continue;
                    }
                    
                    // Process each album to find future releases
                    for (const album of data.items) {
                        // Skip invalid albums or ones we've already processed
                        if (!album || !album.id || processedAlbumIds.has(album.id)) {
                            continue;
                        }
                        
                        processedAlbumIds.add(album.id);
                        
                        // Parse release date
                        let releaseDate;
                        try {
                            if (!album.release_date) {
                                console.warn(`Album ${album.name} has no release date`);
                                continue;
                            }
                            
                            if (album.release_date_precision === 'day') {
                                releaseDate = new Date(album.release_date);
                            } else if (album.release_date_precision === 'month') {
                                releaseDate = new Date(`${album.release_date}-01`);
                            } else {
                                releaseDate = new Date(album.release_date);
                            }
                            
                            // Set time to midnight for consistent comparison
                            releaseDate.setHours(0, 0, 0, 0);
                            
                        } catch (e) {
                            console.error(`Error parsing date: ${album.release_date}`, e);
                            continue;
                        }
                        
                        // Skip invalid dates
                        if (isNaN(releaseDate.getTime())) {
                            console.error(`Invalid date for album ${album.name}: ${album.release_date}`);
                            continue;
                        }
                        
                        // Check if this is a future release (tomorrow or later)
                        const tomorrow = new Date();
                        tomorrow.setDate(tomorrow.getDate() + 1);
                        tomorrow.setHours(0, 0, 0, 0);
                        
                        if (releaseDate >= tomorrow) {
                            console.log(`Found upcoming release: ${album.name} by ${artist.name}, date: ${releaseDate.toISOString()}`);
                            
                            // Make sure the artist object is fully shaped
                            const artistForRelease = {
                                id: artist.id,
                                name: artist.name,
                                img: artist.img || (artist.images && artist.images.length > 0 ? artist.images[0].url : null),
                                genres: artist.genres || []
                            };
                            
                            preReleases.push({
                                artist: artistForRelease,
                                album: album,
                                releaseDate: releaseDate,
                                isPreRelease: true
                            });
                        }
                    }
                } catch (error) {
                    console.error(`Error processing artist ${artist.name}:`, error);
                }
            }
            
            // Sort by release date (closest first)
            preReleases = preReleases.filter(release => release && release.releaseDate);
            preReleases.sort((a, b) => a.releaseDate - b.releaseDate);
            
            console.log(`Found ${preReleases.length} upcoming releases in total`);
            
            // For small number of releases, don't bother with details
            if (preReleases.length === 0) {
                return [];
            }
            
            // Get detailed information for each upcoming release
            const detailedReleases = [];
            
            // Process releases with delay between requests
            const releasesToProcess = Math.min(preReleases.length, limit);
            for (let i = 0; i < releasesToProcess; i++) {
                const release = preReleases[i];
                
                try {
                    // Add delay between requests
                    if (i > 0) {
                        await new Promise(resolve => setTimeout(resolve, isPriority ? 500 : 1000));
                    }
                    
                    // Skip fetching details if we hit errors earlier - just return basic info
                    if (i >= detailsThreshold && detailedReleases.length === 0) {
                        console.log("Too many errors fetching album details, using basic info for remaining releases");
                        detailedReleases.push(...preReleases.slice(i));
                        break;
                    }
                    
                    // Get full album details
                    let albumResponse;
                    try {
                        albumResponse = await fetch(
                            `https://api.spotify.com/v1/albums/${release.album.id}`,
                            { headers }
                        );
                    } catch (fetchError) {
                        console.error(`Network error fetching album details for ${release.album.name}:`, fetchError);
                        detailedReleases.push(release); // Use basic info
                        continue;
                    }
                    
                    // If we get a successful response, enhance the release with full album details
                    if (albumResponse.ok) {
                        try {
                            const fullAlbum = await albumResponse.json();
                            detailedReleases.push({
                                ...release,
                                album: fullAlbum
                            });
                        } catch (jsonError) {
                            console.error(`Error parsing album JSON for ${release.album.name}:`, jsonError);
                            detailedReleases.push(release); // Use basic info
                        }
                    } else {
                        // If the request failed, use the basic info
                        console.log(`Could not get full details for ${release.album.name}, using basic info`);
                        detailedReleases.push(release);
                    }
                } catch (error) {
                    console.error(`Error processing album details for ${release.album.name}:`, error);
                    detailedReleases.push(release); // Use basic info if error occurs
                }
            }
            
            console.log(`Returning ${detailedReleases.length} detailed upcoming releases`);
            
            // Cache the results for 6 hours
            if (detailedReleases.length > 0) {
                try {
                    const cacheKey = 'pre-releases-cache';
                    const cacheExpiryKey = 'pre-releases-cache-expiry';
                    localStorage.setItem(cacheKey, JSON.stringify(detailedReleases));
                    localStorage.setItem(cacheExpiryKey, (Date.now() + 6 * 60 * 60 * 1000).toString()); // 6 hours
                } catch (e) {
                    console.error('Error saving to cache:', e);
                }
            }
            
            return detailedReleases.length > 0 ? detailedReleases : preReleases;
        } catch (error) {
            console.error('Error in getPreReleases:', error);
            return [];
        }
    }

    /**
     * Fetch with retry for rate limited requests
     * @param {string} url - URL to fetch
     * @param {Object} options - Fetch options
     * @param {number} maxRetries - Maximum number of retries
     * @returns {Promise<Response>} - Fetch response
     */
    async fetchWithRetry(url, options = {}, maxRetries = 3) {
        let retries = 0;
        
        while (retries < maxRetries) {
            try {
                const response = await fetch(url, options);
                
                if (response.ok) {
                    return response;
                }
                
                // If rate limited, wait and retry
                if (response.status === 429) {
                    const retryAfter = parseInt(response.headers.get('Retry-After') || '5');
                    console.log(`Rate limited. Waiting ${retryAfter}s before retry ${retries + 1}/${maxRetries}`);
                    
                    // Wait for the specified amount of time
                    await new Promise(resolve => setTimeout(resolve, retryAfter * 1000 + 500));
                    retries++;
                } else {
                    // For other errors, just return the response
                    return response;
                }
            } catch (error) {
                console.error(`Network error (retry ${retries + 1}/${maxRetries}):`, error);
                retries++;
                
                // Wait before retry
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
        
        // If we've exhausted all retries, make one final attempt
        return fetch(url, options);
    }

    /**
     * Get track recommendations based on favorite artists
     * @param {Array} artistIds - Array of artist IDs
     * @param {number} limit - Maximum number of tracks to recommend
     */
    async getTrackRecommendations(artistIds, limit = 10) {
        try {
            if (!artistIds.length) return [];
            
            ui.showLoading('Aanbevelingen laden...');
            
            const headers = await this.getHeaders();
            // Use up to 5 seed artists
            const seedArtists = artistIds.slice(0, 5).join(',');
            
            const response = await fetch(`https://api.spotify.com/v1/recommendations?seed_artists=${seedArtists}&limit=${limit}&market=NL`, {
                headers
            });
            
            const data = await response.json();
            
            if (data.error) {
                throw new Error(`API error: ${data.error.message}`);
            }
            
            // Get full track details with audio features
            const tracksWithAudioFeatures = await Promise.all(
                data.tracks.map(async (track) => {
                    try {
                        const audioFeaturesResponse = await fetch(`https://api.spotify.com/v1/audio-features/${track.id}`, { headers });
                        const audioFeatures = await audioFeaturesResponse.json();
                        
                        return {
                            ...track,
                            audioFeatures: audioFeatures
                        };
                    } catch (error) {
                        console.error('Error fetching audio features:', error);
                        return track;
                    }
                })
            );
            
            ui.hideLoading();
            return tracksWithAudioFeatures;
        } catch (error) {
            ui.hideLoading();
            console.error('Error fetching track recommendations:', error);
            return [];
        }
    }
}

// Initialize API service
const api = new SpotifyApiService();