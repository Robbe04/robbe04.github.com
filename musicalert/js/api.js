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
        const token = await this.getToken();
        return {
            'Authorization': `Bearer ${token}`
        };
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
     */
    async getPreReleases(favorites, limit = 10) {
        try {
            if (!favorites || !favorites.length) {
                console.log("No favorites provided");
                return [];
            }
            
            console.log(`Getting pre-releases for ${favorites.length} favorite artists`);
            const headers = await this.getHeaders();
            let preReleases = [];
            const now = new Date();
            const processedAlbumIds = new Set(); // Track album IDs to prevent duplicates
            
            // Try to get data from cache first
            const cacheKey = 'pre-releases-cache';
            const cacheExpiryKey = 'pre-releases-cache-expiry';
            const cachedData = localStorage.getItem(cacheKey);
            const cacheExpiry = localStorage.getItem(cacheExpiryKey);
            
            // Use cache if it exists and is less than 6 hours old
            if (cachedData && cacheExpiry && parseInt(cacheExpiry) > Date.now()) {
                console.log('Using cached pre-releases data');
                try {
                    const parsedData = JSON.parse(cachedData);
                    return parsedData;
                } catch (e) {
                    console.error('Error parsing cached data:', e);
                    // Continue with fresh data if cache parsing fails
                }
            }
            
            // To avoid rate limiting, only process a subset of artists
            const maxArtistsToProcess = 10; // Process only 10 artists at a time
            const artistsToProcess = favorites.slice(0, maxArtistsToProcess);
            
            // Show a message that we're limiting the request due to API constraints
            ui.showMessage(`API-limiet bereikt: Alleen de eerste ${maxArtistsToProcess} artiesten worden gecontroleerd op aankomende releases`, 'info');
            
            // Process artists with delay between requests
            for (let i = 0; i < artistsToProcess.length; i++) {
                const artist = artistsToProcess[i];
                
                try {
                    console.log(`Checking releases for: ${artist.name}`);
                    
                    // Add delay between requests to avoid rate limiting
                    if (i > 0) {
                        await new Promise(resolve => setTimeout(resolve, 300)); // 300ms delay
                    }
                    
                    // Get albums for this artist
                    const response = await this.fetchWithRetry(
                        `https://api.spotify.com/v1/artists/${artist.id}/albums?include_groups=album,single&market=NL&limit=5`,
                        { headers },
                        3 // Max retries
                    );
                    
                    if (!response.ok) {
                        if (response.status === 429) {
                            // Get retry-after header
                            const retryAfter = response.headers.get('Retry-After') || '5';
                            console.log(`Rate limited for artist ${artist.id}. Retry after ${retryAfter}s`);
                            
                            // Skip this artist for now
                            continue;
                        }
                        
                        console.error(`API error for artist ${artist.id}: ${response.status}`);
                        continue;
                    }
                    
                    const data = await response.json();
                    
                    // Process albums
                    for (const album of data.items) {
                        // Skip albums we've already processed
                        if (processedAlbumIds.has(album.id)) {
                            continue;
                        }
                        
                        // Add to processed IDs
                        processedAlbumIds.add(album.id);
                        
                        // Parse release date
                        let releaseDate;
                        try {
                            // Handle YYYY-MM-DD and YYYY formats
                            if (album.release_date_precision === 'day') {
                                releaseDate = new Date(album.release_date);
                            } else if (album.release_date_precision === 'month') {
                                releaseDate = new Date(`${album.release_date}-01`);
                            } else {
                                releaseDate = new Date(album.release_date);
                            }
                        } catch (e) {
                            console.error(`Error parsing date: ${album.release_date}`, e);
                            continue;
                        }
                        
                        // Check if this is a future release (tomorrow or later to avoid timezone issues)
                        const tomorrow = new Date();
                        tomorrow.setDate(tomorrow.getDate() + 1);
                        tomorrow.setHours(0, 0, 0, 0);
                        
                        if (releaseDate >= tomorrow) {
                            console.log(`Found upcoming release: ${album.name} by ${artist.name}, date: ${releaseDate.toISOString()}`);
                            
                            preReleases.push({
                                artist: artist,
                                album: album,
                                releaseDate: releaseDate,
                                isPreRelease: true
                            });
                        }
                    }
                } catch (error) {
                    console.error(`Error fetching releases for ${artist.name}:`, error);
                }
            }
            
            // Sort by release date (closest first)
            preReleases.sort((a, b) => a.releaseDate - b.releaseDate);
            
            console.log(`Found ${preReleases.length} upcoming releases in total`);
            
            // Get detailed information for each upcoming release
            if (preReleases.length > 0) {
                const detailedReleases = [];
                
                // Process releases with delay between requests
                for (let i = 0; i < Math.min(preReleases.length, limit); i++) {
                    const release = preReleases[i];
                    
                    try {
                        // Add delay between requests
                        if (i > 0) {
                            await new Promise(resolve => setTimeout(resolve, 300));
                        }
                        
                        // Get full album details
                        const albumResponse = await this.fetchWithRetry(
                            `https://api.spotify.com/v1/albums/${release.album.id}`,
                            { headers },
                            3 // Max retries
                        );
                        
                        if (!albumResponse.ok) {
                            if (albumResponse.status === 429) {
                                console.log(`Rate limited for album ${release.album.id}. Skipping detailed info.`);
                                detailedReleases.push(release); // Use basic info
                                continue;
                            }
                            
                            console.error(`Failed to get album details: ${albumResponse.status}`);
                            detailedReleases.push(release); // Use basic info
                            continue;
                        }
                        
                        const fullAlbum = await albumResponse.json();
                        
                        detailedReleases.push({
                            ...release,
                            album: fullAlbum
                        });
                    } catch (error) {
                        console.error(`Error fetching album details for ${release.album.name}:`, error);
                        detailedReleases.push(release); // Use basic info if error occurs
                    }
                }
                
                console.log(`Returning ${detailedReleases.length} detailed upcoming releases`);
                
                // Cache the results for 6 hours
                try {
                    localStorage.setItem(cacheKey, JSON.stringify(detailedReleases));
                    localStorage.setItem(cacheExpiryKey, (Date.now() + 6 * 60 * 60 * 1000).toString()); // 6 hours
                } catch (e) {
                    console.error('Error saving to cache:', e);
                }
                
                return detailedReleases;
            }
            
            return preReleases;
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
                    await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
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
