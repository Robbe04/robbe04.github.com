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
            
            // Check if we have cached data that's still valid (until next midnight UTC)
            const cacheKey = 'new-releases-cache';
            const cacheExpiryKey = 'new-releases-cache-expiry';
            const cachedData = localStorage.getItem(cacheKey);
            const cacheExpiry = localStorage.getItem(cacheExpiryKey);
            
            // Calculate next midnight UTC
            const now = new Date();
            const nextMidnightUTC = new Date();
            nextMidnightUTC.setUTCHours(24, 0, 0, 0); // Next day at 00:00 UTC
            
            // Use cache if it exists and hasn't expired (before next midnight UTC)
            if (cachedData && cacheExpiry && parseInt(cacheExpiry) > Date.now()) {
                console.log('Using cached new releases data (valid until next Spotify release cycle)');
                try {
                    const parsedData = JSON.parse(cachedData);
                    console.log(`Returning ${parsedData.length} cached new releases`);
                    return parsedData;
                } catch (e) {
                    console.error('Error parsing cached new releases data:', e);
                    // Continue with fresh fetch if cache is corrupted
                }
            } else {
                console.log('Cache expired or not found - fetching fresh new releases data');
            }
            
            const headers = await this.getHeaders();
            const nowTimestamp = Date.now();
            
            // Look back X days (in milliseconds) based on parameter
            const lookBackPeriod = days * 24 * 60 * 60 * 1000;
            
            let newReleases = [];
            let processedAlbumIds = new Set(); // Track album IDs to prevent duplicates
            
            console.log(`Checking new releases for ${favorites.length} artists (last ${days} days)`);
            
            for (const artist of favorites) {
                const response = await fetch(`https://api.spotify.com/v1/artists/${artist.id}/albums?include_groups=single,album&limit=10&market=NL`, {
                    headers
                });
                
                const data = await response.json();
                
                if (data.error) continue;
                
                // Find albums released within the specified period
                const artistNewReleases = data.items.filter(album => {
                    const releaseDate = new Date(album.release_date).getTime();
                    const ageInMs = nowTimestamp - releaseDate;
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
                        collaborationInfo: collaborationInfo,
                        releaseDate: new Date(album.release_date), // Add parsed release date for sorting
                        releaseDateMs: new Date(album.release_date).getTime() // Add timestamp for easy sorting
                    });
                }
            }
            
            // Sort by release date (newest first)
            newReleases.sort((a, b) => b.releaseDateMs - a.releaseDateMs);
            
            // Cache the results until next midnight UTC (when Spotify releases new music)
            try {
                localStorage.setItem(cacheKey, JSON.stringify(newReleases));
                localStorage.setItem(cacheExpiryKey, nextMidnightUTC.getTime().toString());
                console.log(`Cached ${newReleases.length} new releases until next Spotify release cycle (${nextMidnightUTC.toISOString()})`);
            } catch (e) {
                console.error('Error saving new releases to cache:', e);
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
     * @param {boolean} highPriority - Whether this is a high priority request
     */
    async getPreReleases(favorites, limit = 10, highPriority = false) {
        try {
            if (!favorites || !favorites.length) {
                console.log("No favorites provided");
                return [];
            }
            
            console.log(`Getting pre-releases for ${favorites.length} favorite artists${highPriority ? ' (high priority)' : ''}`);
            const headers = await this.getHeaders();
            let preReleases = [];
            const processedAlbumIds = new Set();
            
            // Try to get data from cache first (skip if force refresh requested)
            const forceRefresh = new URLSearchParams(window.location.search).has('refresh');
            if (!forceRefresh) {
                const cacheKey = 'pre-releases-cache';
                const cacheExpiryKey = 'pre-releases-cache-expiry';
                const cachedData = localStorage.getItem(cacheKey);
                const cacheExpiry = localStorage.getItem(cacheExpiryKey);
                
                // Use cache if it exists and is less than 1 hour old (presaves change rarely)
                if (cachedData && cacheExpiry && parseInt(cacheExpiry) > Date.now()) {
                    console.log('Using cached pre-releases data');
                    try {
                        const parsedData = JSON.parse(cachedData);
                        
                        // Filter cache to remove releases that have already been released
                        const now = new Date();
                        now.setHours(0, 0, 0, 0);                        
                        const filteredReleases = parsedData.filter(release => {
                            const releaseDate = new Date(release.releaseDate);
                            return releaseDate >= now;
                        });
                        
                        console.log(`Filtered ${parsedData.length - filteredReleases.length} already released items from cache`);
                        
                        if (filteredReleases.length > 0) {
                            return filteredReleases;
                        }
                    } catch (e) {
                        console.error('Error parsing cached data:', e);
                    }
                }
            } else {
                console.log('Force refresh requested - clearing cache');
            }
            
            // Process more artists since we're fetching much less data per artist
            const maxArtistsToProcess = Math.min(favorites.length, 30); // Increased to 30
            const artistsToProcess = favorites.slice(0, maxArtistsToProcess);
            
            console.log(`Processing ${maxArtistsToProcess} artists for presave opportunities`);
            
            // Define presave window: TODAY to 1 WEEK from now
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            const oneWeekFromNow = new Date(today);
            oneWeekFromNow.setDate(today.getDate() + 7);
            
            console.log(`Presave window: ${today.toDateString()} to ${oneWeekFromNow.toDateString()}`);
            
            // Process artists in batches
            const batchSize = 8; // Larger batches since we expect very few results
            const batchDelay = 500; // Shorter delay since most requests will return no results
            
            for (let i = 0; i < artistsToProcess.length; i += batchSize) {
                const batch = artistsToProcess.slice(i, i + batchSize);
                console.log(`Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(artistsToProcess.length / batchSize)}: ${batch.map(a => a.name).join(', ')}`);
                
                const batchPromises = batch.map(async (artist, index) => {
                    try {
                        if (index > 0) {
                            await new Promise(resolve => setTimeout(resolve, 100));
                        }
                        
                        console.log(`Checking presave window for ${artist.name}...`);
                        
                        // Get only the 3 most recent albums/singles (minimal request)
                        const response = await this.fetchWithRetry(
                            `https://api.spotify.com/v1/artists/${artist.id}/albums?include_groups=album,single&market=NL&limit=3`,
                            { headers },
                            3
                        );
                        
                        if (!response.ok) {
                            if (response.status === 429) {
                                console.warn(`Rate limited for artist ${artist.name}, skipping`);
                                return [];
                            }
                            console.error(`API error for artist ${artist.name}: ${response.status}`);
                            return [];
                        }
                        
                        const data = await response.json();
                        
                        // IMMEDIATELY filter to only future releases within presave window
                        const futureReleases = data.items.filter(album => {
                            try {
                                let releaseDate = new Date(album.release_date);
                                
                                // Handle different date formats
                                if (album.release_date.length === 4) { // YYYY
                                    releaseDate = new Date(parseInt(album.release_date), 11, 31);
                                } else if (album.release_date.length === 7) { // YYYY-MM
                                    const [year, month] = album.release_date.split('-');
                                    releaseDate = new Date(parseInt(year), parseInt(month), 0);
                                } else if (album.release_date.length === 10) { // YYYY-MM-DD
                                    releaseDate = new Date(album.release_date);
                                }
                                
                                releaseDate.setHours(0, 0, 0, 0);
                                
                                // ONLY return releases in the presave window (today to 1 week)
                                return releaseDate >= today && releaseDate <= oneWeekFromNow;
                            } catch (e) {
                                console.error(`Invalid release date for ${album.name}: ${album.release_date}`);
                                return false;
                            }
                        });
                        
                        // Only log if we find something relevant
                        if (futureReleases.length > 0) {
                            console.log(`✅ ${artist.name}: Found ${futureReleases.length} presave opportunities`);
                            
                            const artistPresaves = [];
                            
                            for (const album of futureReleases) {
                                if (processedAlbumIds.has(album.id)) {
                                    continue;
                                }
                                
                                processedAlbumIds.add(album.id);
                                
                                const releaseDate = new Date(album.release_date);
                                releaseDate.setHours(0, 0, 0, 0);
                                
                                console.log(`🎵 Presave: "${album.name}" by ${artist.name} on ${album.release_date}`);
                                artistPresaves.push({
                                    artist: artist,
                                    album: album,
                                    releaseDate: releaseDate
                                });
                            }
                            
                            return artistPresaves;
                        } else {
                            // No presave opportunities found - this is normal
                            return [];
                        }
                    } catch (error) {
                        console.error(`Error fetching presaves for ${artist.name}:`, error);
                        return [];
                    }
                });
                
                const batchResults = await Promise.all(batchPromises);
                
                batchResults.forEach(artistPresaves => {
                    preReleases.push(...artistPresaves);
                });
                
                if (i + batchSize < artistsToProcess.length) {
                    console.log(`Waiting ${batchDelay}ms before next batch...`);
                    await new Promise(resolve => setTimeout(resolve, batchDelay));
                }
            }
            
            // Sort by release date (closest first)
            preReleases.sort((a, b) => a.releaseDate - b.releaseDate);
            
            console.log(`🎯 RESULT: Found ${preReleases.length} presave opportunities in the next week`);
            if (preReleases.length > 0) {
                preReleases.forEach(release => {
                    console.log(`📅 ${release.album.name} by ${release.artist.name} on ${release.album.release_date}`);
                });
            } else {
                console.log('🚫 No presave opportunities found in the next week');
            }
            
            // Get detailed information for ALL presave opportunities (they should be very few)
            if (preReleases.length > 0) {
                const detailedReleases = [];
                
                console.log(`Getting detailed info for all ${preReleases.length} presave opportunities...`);
                
                // Process individually since there should be very few
                for (const release of preReleases) {
                    try {
                        await new Promise(resolve => setTimeout(resolve, 300));
                        
                        const albumResponse = await this.fetchWithRetry(
                            `https://api.spotify.com/v1/albums/${release.album.id}`,
                            { headers },
                            2
                        );
                        
                        if (!albumResponse.ok) {
                            console.warn(`Failed to get detailed info for ${release.album.name}`);
                            detailedReleases.push(release);
                            continue;
                        }
                        
                        const fullAlbum = await albumResponse.json();
                        
                        detailedReleases.push({
                            ...release,
                            album: fullAlbum
                        });
                    } catch (error) {
                        console.error(`Error fetching album details for ${release.album.name}:`, error);
                        detailedReleases.push(release);
                    }
                }
                
                console.log(`Returning ${detailedReleases.length} detailed presave opportunities`);
                
                // Cache the results for 1 hour (presaves don't change often)
                try {
                    localStorage.setItem('pre-releases-cache', JSON.stringify(detailedReleases));
                    localStorage.setItem('pre-releases-cache-expiry', (Date.now() + 1 * 60 * 60 * 1000).toString()); // 1 hour
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
                            audioFeatures: audioFeatures,
                            duration: this.formatDuration(track.duration_ms) // Include formatted duration
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

    /**
     * Get a specific album with all tracks
     */
    async getAlbum(albumId) {
        if (!albumId) throw new Error('Album ID is required');
        
        try {
            const token = await this.getToken();
            
            const response = await fetch(`https://api.spotify.com/v1/albums/${albumId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (!response.ok) {
                throw new Error(`Error fetching album: ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('Error in getAlbum:', error);
            throw error;
        }
    }
    
    /**
     * Format track duration from milliseconds to MM:SS format
     * @param {number} ms - Duration in milliseconds
     * @returns {string} Formatted duration as MM:SS
     */
    formatDuration(ms) {
        if (!ms || isNaN(ms)) return "0:00";
        const minutes = Math.floor(ms / 60000);
        const seconds = Math.floor((ms % 60000) / 1000);
        return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
    }
    
    /**
     * Check if an album has multiple tracks
     * @param {Object} album - Album object from Spotify API
     * @returns {boolean} True if album has multiple tracks
     */
    hasMultipleTracks(album) {
        return album && album.total_tracks && album.total_tracks > 1;
    }
}

// Initialize API service
const api = new SpotifyApiService();