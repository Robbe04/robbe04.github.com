/**
 * UI Service
 * Handles all UI-related functionality
 */
class UIService {
    constructor() {
        this.activeGenreFilters = [];
        this.audioVisualizers = new Map();
        this.preSearchGenreFilters = [];
        this.currentTheme = localStorage.getItem('theme') || 'light';

        // Initialize theme on startup
        this.initializeTheme();
    }

    /**
     * Initialize UI elements
     */
    async initialize() {
        // Load genres for filtering
        this.loadGenreFilters();
        
        // Setup pre-search genre filter panel
        this.setupPreSearchGenreFilters();
        
        // Setup live search
        this.setupLiveSearch();
        
        // Smooth scroll for navigation
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function(e) {
                e.preventDefault();
                const target = document.querySelector(this.getAttribute('href'));
                if (target) {
                    window.scrollTo({
                        top: target.offsetTop,
                        behavior: 'smooth'
                    });
                }
            });
        });
        
        // Create audio visualizers for currently playing tracks
        this.setupAudioVisualizerObserver();

        // Initialize sorting and filtering for favorites and notifications
        this.initializeSortingAndFiltering();

        // Update install button in settings
        this.updateInstallStatus();
        
        // Set theme selector to match current theme
        const themeSelector = document.getElementById('theme-selector');
        if (themeSelector) {
            themeSelector.value = this.currentTheme;
        }
        
        // Initialize mobile menu
        this.initializeMobileMenu();
    }

    /**
     * Setup pre-search genre filters
     */
    setupPreSearchGenreFilters() {
        const filterToggle = document.getElementById('genre-filter-toggle');
        const filterPanel = document.getElementById('genre-filter-panel');
        
        if (filterToggle && filterPanel) {
            // Toggle filter panel visibility
            filterToggle.addEventListener('click', () => {
                filterPanel.classList.toggle('hidden');
                
                // Update icon
                const icon = filterToggle.querySelector('i');
                if (filterPanel.classList.contains('hidden')) {
                    icon.classList.remove('fa-chevron-up');
                    icon.classList.add('fa-chevron-down');
                } else {
                    icon.classList.remove('fa-chevron-down');
                    icon.classList.add('fa-chevron-up');
                }
            });
            
            // Close panel when clicking outside
            document.addEventListener('click', (e) => {
                if (!filterPanel.contains(e.target) && 
                    !filterToggle.contains(e.target) && 
                    !filterPanel.classList.contains('hidden')) {
                    filterPanel.classList.add('hidden');
                    
                    // Update icon
                    const icon = filterToggle.querySelector('i');
                    icon.classList.remove('fa-chevron-up');
                    icon.classList.add('fa-chevron-down');
                }
            });
            
            // Load genres into the panel
            this.loadPreSearchGenres();
        }
    }
    
    /**
     * Load genres for pre-search filtering
     */
    async loadPreSearchGenres() {
        const container = document.getElementById('pre-search-genres');
        if (!container) return;
        
        try {
            container.innerHTML = '<div class="p-2 text-center"><i class="fas fa-spinner fa-spin mr-2"></i>Genres laden...</div>';
            
            const genres = await api.getGenres();
            
            // Filter to get mostly electronic and DJ-related genres
            const relevantGenres = [
                'house', 'techno', 'electronic', 'edm', 'dance', 'deep-house', 
                'electro', 'drum-and-bass', 'dubstep', 'trance', 'progressive-house',
                'ambient', 'trap', 'hip-hop', 'r-n-b', 'pop', 'club', 'detroit-techno',
                'disco', 'minimal-techno', 'tech-house', 'hardstyle', 'hardcore', 'gabber',
                'industrial', 'funk', 'soul', 'jazz', 'reggae', 'reggaeton'
            ];
            
            const genresToShow = genres.filter(genre => 
                relevantGenres.some(relevantGenre => genre.includes(relevantGenre))
            ).slice(0, 30);
            
            container.innerHTML = '';
            
            // Add "select all" and "clear all" buttons
            const controlsDiv = document.createElement('div');
            controlsDiv.className = 'flex justify-between p-2 border-b border-gray-200 mb-2';
            
            const selectAllBtn = document.createElement('button');
            selectAllBtn.className = 'text-xs text-primary hover:underline';
            selectAllBtn.textContent = 'Selecteer alle';
            selectAllBtn.addEventListener('click', () => this.toggleAllPreSearchGenres(true));
            
            const clearAllBtn = document.createElement('button');
            clearAllBtn.className = 'text-xs text-gray-500 hover:underline';
            clearAllBtn.textContent = 'Wis selectie';
            clearAllBtn.addEventListener('click', () => this.toggleAllPreSearchGenres(false));
            
            controlsDiv.appendChild(selectAllBtn);
            controlsDiv.appendChild(clearAllBtn);
            container.appendChild(controlsDiv);
            
            // Create a div to hold the genres in columns
            const genresGrid = document.createElement('div');
            genresGrid.className = 'grid grid-cols-2 gap-1 p-2 max-h-60 overflow-y-auto';
            container.appendChild(genresGrid);
            
            // Add genres as checkboxes
            genresToShow.forEach(genre => {
                const label = document.createElement('label');
                label.className = 'flex items-center text-sm p-1 hover:bg-gray-50 rounded';
                
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.value = genre;
                checkbox.className = 'mr-2 h-4 w-4 text-primary focus:ring-primary';
                checkbox.dataset.genre = genre;
                
                label.appendChild(checkbox);
                label.appendChild(document.createTextNode(this.formatGenreName(genre)));
                
                genresGrid.appendChild(label);
            });
            
            // Add apply button
            const applyBtnContainer = document.createElement('div');
            applyBtnContainer.className = 'p-2 border-t border-gray-200 mt-2';
            
            const applyBtn = document.createElement('button');
            applyBtn.className = 'w-full bg-primary hover:bg-primary-dark text-white py-2 rounded-lg transition-colors';
            applyBtn.textContent = 'Toepassen';
            applyBtn.addEventListener('click', () => {
                this.applyPreSearchGenreFilters();
                document.getElementById('genre-filter-panel').classList.add('hidden');
                
                // Update icon
                const icon = document.querySelector('#genre-filter-toggle i');
                if (icon) {
                    icon.classList.remove('fa-chevron-up');
                    icon.classList.add('fa-chevron-down');
                }
            });
            
            applyBtnContainer.appendChild(applyBtn);
            container.appendChild(applyBtnContainer);
            
        } catch (error) {
            container.innerHTML = '<span class="text-red-500 p-2">Fout bij het laden van genres</span>';
            console.error('Error loading pre-search genres:', error);
        }
    }
    
    /**
     * Toggle all pre-search genre filters
     */
    toggleAllPreSearchGenres(select) {
        const container = document.getElementById('pre-search-genres');
        if (!container) return;
        
        const checkboxes = container.querySelectorAll('input[type="checkbox"]');
        checkboxes.forEach(checkbox => {
            checkbox.checked = select;
        });
    }
    
    /**
     * Apply pre-search genre filters
     */
    applyPreSearchGenreFilters() {
        const container = document.getElementById('pre-search-genres');
        if (!container) return;
        
        // Get selected genres
        const selectedGenres = [];
        const checkboxes = container.querySelectorAll('input[type="checkbox"]:checked');
        checkboxes.forEach(checkbox => {
            selectedGenres.push(checkbox.dataset.genre);
        });
        
        // Store selected genres
        this.preSearchGenreFilters = selectedGenres;
        
        // Update filter badge counter
        const counter = document.getElementById('genre-filter-count');
        if (counter) {
            if (selectedGenres.length > 0) {
                counter.textContent = selectedGenres.length;
                counter.classList.remove('hidden');
            } else {
                counter.classList.add('hidden');
            }
        }
    }

    /**
     * Setup live search with debounce
     */
    setupLiveSearch() {
        const searchInput = document.getElementById('artistInput');
        const suggestionsContainer = document.getElementById('artistSuggestions');
        
        let debounceTimer;
        
        // Listen for input in search field
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.trim();
            
            // Clear any existing timer
            clearTimeout(debounceTimer);
            
            // Hide suggestions if query is empty
            if (query.length < 2) {
                suggestionsContainer.classList.add('hidden');
                return;
            }
            
            // Debounce the search to avoid too many API calls
            debounceTimer = setTimeout(async () => {
                try {
                    // Perform search and show suggestions
                    const artists = await api.searchArtists(query, 10);
                    app.lastSearchResults = artists;
                    
                    // Filter artists by pre-selected genres if applicable
                    if (this.preSearchGenreFilters && this.preSearchGenreFilters.length > 0) {
                        const filteredArtists = artists.filter(artist => {
                            if (!artist.genres || artist.genres.length === 0) return false;
                            
                            return artist.genres.some(genre => 
                                this.preSearchGenreFilters.some(filter => genre.includes(filter))
                            );
                        });
                        
                        // If we have filtered results, use them. Otherwise, show all results
                        if (filteredArtists.length > 0) {
                            this.displayArtistSuggestions(filteredArtists);
                        } else {
                            this.displayArtistSuggestions(artists);
                        }
                    } else {
                        this.displayArtistSuggestions(artists);
                    }
                } catch (error) {
                    console.error('Error in live search:', error);
                }
            }, 300); // Wait 300ms after user stops typing
        });
        
        // Hide suggestions when clicking outside
        document.addEventListener('click', (e) => {
            if (!suggestionsContainer.contains(e.target) && e.target !== searchInput) {
                suggestionsContainer.classList.add('hidden');
            }
        });
        
        // Show suggestions when focusing on search input if it has content
        searchInput.addEventListener('focus', () => {
            if (searchInput.value.trim().length >= 2 && app.lastSearchResults.length > 0) {
                this.displayArtistSuggestions(app.lastSearchResults);
            }
        });
    }
    
    /**
     * Display artist suggestions below search box
     */
    displayArtistSuggestions(artists) {
        const container = document.getElementById('artistSuggestions');
        
        if (!artists || artists.length === 0) {
            container.classList.add('hidden');
            return;
        }
        
        // Filter by active genre filters if any
        let filteredArtists = artists;
        if (this.activeGenreFilters.length > 0) {
            filteredArtists = artists.filter(artist => {
                if (!artist.genres || artist.genres.length === 0) return false;
                
                return artist.genres.some(genre => 
                    this.activeGenreFilters.some(filter => genre.includes(filter))
                );
            });
            
            // If no matches, use all artists
            if (filteredArtists.length === 0) {
                filteredArtists = artists;
            }
        }
        
        let html = '';
        
        filteredArtists.forEach(artist => {
            const artistImg = artist.images.length > 0 ? artist.images[0].url : '';
            const genres = artist.genres.length > 0 ? 
                this.formatGenreName(artist.genres[0]) : 'DJ / Producer';
            
            html += `
                <div class="artist-suggestion p-3 hover:bg-gray-100 cursor-pointer transition flex items-center border-b border-gray-100" 
                     onclick="app.getLatestTracks('${artist.id}')">
                    <div class="w-12 h-12 rounded-full overflow-hidden mr-3 flex-shrink-0">
                        ${artistImg ? 
                            `<img src="${artistImg}" alt="${artist.name}" class="w-full h-full object-cover">` : 
                            `<div class="w-full h-full flex items-center justify-center bg-gradient-to-r from-primary to-secondary text-white">
                                <i class="fas fa-music"></i>
                            </div>`
                        }
                    </div>
                    <div class="flex-1 min-w-0">
                        <p class="font-medium truncate">${artist.name}</p>
                        <p class="text-xs text-gray-500 truncate">${genres}</p>
                    </div>
                    <div class="flex-shrink-0 ml-2">
                        <span class="text-xs bg-gray-200 text-gray-800 px-2 py-1 rounded-full">
                            ${artist.popularity}%
                        </span>
                    </div>
                </div>
            `;
        });
        
        container.innerHTML = html;
        container.classList.remove('hidden');
    }

    /**
     * Display favorites with sorting and filtering options
     */
    displayFavorites(favorites) {
        const container = document.getElementById('favorites');
        const filterContainer = document.getElementById('favorites-filter-container');
        
        if (!favorites.length) {
            container.innerHTML = `
                <div class="col-span-full text-center py-8">
                    <div class="text-gray-400 mb-4">
                        <i class="fas fa-heart text-5xl"></i>
                    </div>
                    <p class="text-gray-500">Je hebt nog geen DJ's gevolgd</p>
                    <p class="text-gray-500 text-sm mt-2">Zoek naar artiesten en voeg ze toe aan je favorieten</p>
                </div>
            `;
            
            // Hide filter options when no favorites
            if (filterContainer) filterContainer.classList.add('hidden');
            return;
        }
        
        // Show filter options when we have favorites
        if (filterContainer) filterContainer.classList.remove('hidden');
        
        // Deep copy the favorites array to avoid mutating the original
        let sortedFavorites = JSON.parse(JSON.stringify(favorites));
        
        // Get current sort order
        const sortOrder = document.getElementById('favorites-sort')?.value || 'name-asc';
        
        // Sort according to selected option
        switch (sortOrder) {
            case 'name-asc':
                sortedFavorites.sort((a, b) => a.name.localeCompare(b.name));
                break;
            case 'name-desc':
                sortedFavorites.sort((a, b) => b.name.localeCompare(a.name));
                break;
            case 'recent':
                // If we have added timestamp, use it, otherwise keep original order
                sortedFavorites.sort((a, b) => (b.addedAt || 0) - (a.addedAt || 0));
                break;
            default:
                // Default to alphabetical
                sortedFavorites.sort((a, b) => a.name.localeCompare(b.name));
        }
        
        // Apply search filter if there's text in the search input
        const searchQuery = document.getElementById('favorites-search')?.value?.trim().toLowerCase();
        if (searchQuery) {
            sortedFavorites = sortedFavorites.filter(artist => 
                artist.name.toLowerCase().includes(searchQuery)
            );
        }
        
        // If no results after filtering
        if (sortedFavorites.length === 0) {
            container.innerHTML = `
                <div class="col-span-full text-center py-8">
                    <div class="text-gray-400 mb-4">
                        <i class="fas fa-search text-5xl"></i>
                    </div>
                    <p class="text-gray-500">Geen DJ's gevonden die overeenkomen met "${searchQuery}"</p>
                </div>
            `;
            return;
        }
        
        let html = '';
        
        sortedFavorites.forEach(artist => {
            html += `
                <div class="artist-card bg-white rounded-xl overflow-hidden shadow-md hover:shadow-lg transition-all duration-300 flex flex-col animate__animated animate__fadeIn">
                    <div class="h-40 bg-gray-200 overflow-hidden relative">
                        ${artist.img ? 
                            `<img src="${artist.img}" alt="${artist.name}" class="w-full h-full object-cover">` : 
                            `<div class="w-full h-full flex items-center justify-center bg-gradient-to-r from-primary to-secondary text-white">
                                <i class="fas fa-music text-4xl"></i>
                            </div>`
                        }
                        <div class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent h-20"></div>
                    </div>
                    <div class="p-4 flex-grow flex flex-col">
                        <h3 class="font-bold text-lg mb-1 truncate">${artist.name}</h3>
                        ${artist.genres ? 
                            `<p class="text-gray-600 text-sm mb-3 truncate">${this.formatGenreName(artist.genres[0] || '')}</p>` : 
                            '<p class="text-gray-600 text-sm mb-3">DJ / Producer</p>'
                        }
                        <div class="mt-auto flex gap-2">
                            <button onclick="app.getLatestTracks('${artist.id}')" 
                                class="flex-1 bg-primary hover:bg-primary-dark text-white py-2 rounded-lg transition flex items-center justify-center">
                                <i class="fas fa-headphones mr-2"></i>Muziek
                            </button>
                            <button onclick="app.toggleFavorite('${artist.id}')" 
                                class="bg-red-500 hover:bg-red-600 text-white p-2 rounded-lg transition">
                                <i class="fas fa-heart-broken"></i>
                            </button>
                            <button onclick="app.shareArtist('${artist.name}')"
                                class="bg-blue-500 hover:bg-blue-600 text-white p-2 rounded-lg transition">
                                <i class="fas fa-share-alt"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `;
        });
        
        container.innerHTML = html;
    }

    /**
     * Display notifications of new releases
     */
    displayNotifications(releases) {
        const container = document.getElementById('notifications');
        const filterContainer = document.getElementById('notifications-filter-container');
        
        if (!releases.length) {
            container.innerHTML = `
                <div class="text-center py-8">
                    <div class="text-gray-400 mb-4">
                        <i class="fas fa-bell text-5xl"></i>
                    </div>
                    <p class="text-gray-500">Geen nieuwe releases (< ${app.releaseAgeDays || 7} dagen) gevonden van je gevolgde DJ's</p>
                    <p class="text-gray-500 text-sm mt-2">We laten het je weten wanneer er nieuwe muziek uitkomt</p>
                </div>
            `;
            
            // Hide filter options when no releases
            if (filterContainer) filterContainer.classList.add('hidden');
            return;
        }
        
        // Show filter options when we have releases
        if (filterContainer) filterContainer.classList.remove('hidden');
        
        // Create a flattened list of releases for easier sorting
        let flatReleases = [];
        
        releases.forEach(release => {
            flatReleases.push({
                artist: release.artist,
                album: release.album,
                collaborationInfo: release.collaborationInfo,
                releaseDate: new Date(release.album.release_date).getTime()
            });
        });
        
        // Get sort order
        const sortOrder = document.getElementById('notifications-sort')?.value || 'date-desc';
        
        // Sort according to selected option
        switch (sortOrder) {
            case 'date-desc': // Newest first (default)
                flatReleases.sort((a, b) => b.releaseDate - a.releaseDate);
                break;
            case 'date-asc': // Oldest first
                flatReleases.sort((a, b) => a.releaseDate - b.releaseDate);
                break;
            case 'artist-asc': // Artist name A-Z
                flatReleases.sort((a, b) => a.artist.name.localeCompare(b.artist.name));
                break;
            case 'artist-desc': // Artist name Z-A
                flatReleases.sort((a, b) => b.artist.name.localeCompare(a.artist.name));
                break;
            default:
                flatReleases.sort((a, b) => b.releaseDate - a.releaseDate);
        }
        
        // Apply search filter if there's text in the search input
        const searchQuery = document.getElementById('notifications-search')?.value?.trim().toLowerCase();
        if (searchQuery) {
            flatReleases = flatReleases.filter(release => {
                // Search in artist name, album name, and collaborators
                const artistNameMatch = release.artist.name.toLowerCase().includes(searchQuery);
                const albumNameMatch = release.album.name.toLowerCase().includes(searchQuery);
                
                // Check collaborator names if this is a collaboration
                let collaboratorMatch = false;
                if (release.collaborationInfo && release.collaborationInfo.isCollaboration) {
                    collaboratorMatch = release.collaborationInfo.collaboratingArtists.some(
                        artist => artist.toLowerCase().includes(searchQuery)
                    );
                }
                
                return artistNameMatch || albumNameMatch || collaboratorMatch;
            });
        }
        
        // If no results after filtering
        if (flatReleases.length === 0) {
            container.innerHTML = `
                <div class="text-center py-8">
                    <div class="text-gray-400 mb-4">
                        <i class="fas fa-search text-5xl"></i>
                    </div>
                    <p class="text-gray-500">Geen releases gevonden die overeenkomen met "${searchQuery}"</p>
                </div>
            `;
            return;
        }
        
        // Display as a list
        let html = '<div class="space-y-4">';
        
        flatReleases.forEach(release => {
            const { artist, album, collaborationInfo } = release;
            const releaseDate = new Date(album.release_date).toLocaleDateString('nl-NL');
            const daysAgo = Math.floor((Date.now() - new Date(album.release_date).getTime()) / (1000 * 60 * 60 * 24));
            const releaseDateText = daysAgo === 0 ? 'Vandaag' : daysAgo === 1 ? 'Gisteren' : `${daysAgo} dagen geleden`;
            
            // Create collaboration display text if needed
            let collaborationText = '';
            if (collaborationInfo && collaborationInfo.isCollaboration) {
                const otherArtists = collaborationInfo.collaboratingArtists;
                collaborationText = otherArtists.length === 1 
                    ? `met ${otherArtists[0]}` 
                    : `met ${otherArtists.slice(0, -1).join(', ')} & ${otherArtists.slice(-1)}`;
            }
            
            html += `
                <div class="bg-white p-4 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 animate__animated animate__fadeIn">
                    <div class="flex items-start">
                        <img src="${album.images[0]?.url || ''}" alt="${album.name}" class="w-20 h-20 mr-4 object-cover rounded-lg">
                        <div class="flex-1">
                            <div class="flex justify-between items-start">
                                <div>
                                    <div class="flex flex-wrap items-center gap-x-1 gap-y-0">
                                        <p class="font-bold text-lg">${artist.name}</p>
                                        ${collaborationText ? 
                                            `<span class="text-xs bg-primary bg-opacity-20 text-primary-dark px-2 py-0.5 rounded-full">
                                                ${collaborationText}
                                            </span>` : 
                                            ''
                                        }
                                    </div>
                                    <p class="text-primary-dark font-medium">${album.name}</p>
                                </div>
                                <div class="flex flex-col items-end">
                                    <span class="text-sm bg-secondary-light text-secondary-dark px-2 py-1 rounded-full">
                                        ${releaseDate}
                                    </span>
                                    <span class="text-xs text-gray-500 mt-1">${releaseDateText}</span>
                                </div>
                            </div>
                            <p class="text-gray-600 text-sm mb-3">
                                ${album.album_type.charAt(0).toUpperCase() + album.album_type.slice(1)} • ${album.total_tracks} ${album?.total_tracks == '1' ? 'nummer' : 'nummers'}
                            </p>
                            <div class="flex gap-2">
                                <a href="${album.external_urls.spotify}" target="_blank" 
                                  class="flex-1 text-center bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg transition">
                                  <i class="fab fa-spotify mr-2"></i>Beluisteren
                                </a>
                                <button onclick="app.getLatestTracks('${artist.id}')" 
                                  class="flex-1 bg-primary hover:bg-primary-dark text-white py-2 rounded-lg transition">
                                  Meer bekijken
                                </button>
                                <button onclick="app.shareRelease('${artist.name}', '${album.name}', '${album.external_urls.spotify}')" 
                                  class="bg-blue-500 hover:bg-blue-600 text-white p-2 rounded-lg transition">
                                  <i class="fas fa-share-alt"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });
        
        html += '</div>';
        container.innerHTML = html;
    }

    /**
     * Initialize sorting and filtering for favorites and notifications
     */
    initializeSortingAndFiltering() {
        // Favorite artists sorting
        const favoritesSort = document.getElementById('favorites-sort');
        if (favoritesSort) {
            favoritesSort.addEventListener('change', () => {
                app.displayFavorites();
            });
        }
        
        // Favorite artists search
        const favoritesSearch = document.getElementById('favorites-search');
        if (favoritesSearch) {
            let debounceTimer;
            favoritesSearch.addEventListener('input', () => {
                clearTimeout(debounceTimer);
                debounceTimer = setTimeout(() => {
                    app.displayFavorites();
                }, 300);
            });
        }
        
        // Notifications sorting
        const notificationsSort = document.getElementById('notifications-sort');
        if (notificationsSort) {
            notificationsSort.addEventListener('change', () => {
                app.checkNewReleases();
            });
        }
        
        // Notifications search
        const notificationsSearch = document.getElementById('notifications-search');
        if (notificationsSearch) {
            let debounceTimer;
            notificationsSearch.addEventListener('input', () => {
                clearTimeout(debounceTimer);
                debounceTimer = setTimeout(() => {
                    app.checkNewReleases();
                }, 300);
            });
        }
        
        // Initialize release age setting
        this.initializeReleaseAgeSetting();
    }

    /**
     * Initialize release age setting
     */
    initializeReleaseAgeSetting() {
        const releaseAgeInput = document.getElementById('release-age');
        const releaseAgeApplyBtn = document.getElementById('release-age-apply');
        
        if (releaseAgeInput && releaseAgeApplyBtn) {
            // Set initial value from app settings
            releaseAgeInput.value = app.releaseAgeDays;
            
            // Apply button click handler
            releaseAgeApplyBtn.addEventListener('click', () => {
                const days = parseInt(releaseAgeInput.value);
                app.setReleaseAgeDays(days);
            });
            
            // Also apply when pressing Enter in the input
            releaseAgeInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    const days = parseInt(releaseAgeInput.value);
                    app.setReleaseAgeDays(days);
                }
            });
            
            // Validate input on blur (when leaving the field)
            releaseAgeInput.addEventListener('blur', () => {
                let days = parseInt(releaseAgeInput.value);
                
                if (isNaN(days) || days < 1) {
                    days = 7; // Reset to default
                } else if (days > 14) {
                    days = 14; // Cap at 14
                }
                
                releaseAgeInput.value = days;
            });
        }
    }

    /**
     * Show loading indicator
     */
    showLoading(message = 'Laden...') {
        // Use inline loading instead of overlay for artist searching
        if (message.includes('Artiesten zoeken')) {
            const searchInput = document.getElementById('artistInput');
            const loadingIndicator = document.getElementById('searchLoadingIndicator');
            
            if (loadingIndicator) {
                loadingIndicator.classList.remove('hidden');
            } else {
                // Create inline loading indicator if it doesn't exist
                const indicator = document.createElement('div');
                indicator.id = 'searchLoadingIndicator';
                indicator.className = 'absolute right-4 top-1/2 transform -translate-y-1/2 text-primary';
                indicator.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
                searchInput.parentNode.appendChild(indicator);
            }
            return;
        }
        
        // For other operations, use the overlay
        const overlay = document.getElementById('loading-overlay');
        const text = document.getElementById('loading-text');
        text.textContent = message;
        overlay.classList.remove('hidden');
    }

    /**
     * Hide loading indicator
     */
    hideLoading() {
        // Hide search loading indicator if present
        const searchLoadingIndicator = document.getElementById('searchLoadingIndicator');
        if (searchLoadingIndicator) {
            searchLoadingIndicator.classList.add('hidden');
        }
        
        // Hide overlay
        const overlay = document.getElementById('loading-overlay');
        overlay.classList.add('hidden');
    }

    /**
     * Show error message
     */
    showError(message) {
        alert(message);
    }

    /**
     * Show message toast
     */
    showMessage(message, type = 'info') {
        // Create toast if it doesn't exist
        let toast = document.getElementById('toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'toast';
            toast.className = 'fixed bottom-4 left-1/2 transform -translate-x-1/2 px-4 py-2 rounded-lg text-white shadow-lg transition-opacity duration-300 z-50 opacity-0';
            document.body.appendChild(toast);
        }
        
        // Set message and color based on type
        toast.textContent = message;
        if (type === 'error') {
            toast.classList.add('bg-red-500');
            toast.classList.remove('bg-green-500', 'bg-blue-500');
        } else if (type === 'success') {
            toast.classList.add('bg-green-500');
            toast.classList.remove('bg-red-500', 'bg-blue-500');
        } else {
            toast.classList.add('bg-blue-500');
            toast.classList.remove('bg-red-500', 'bg-green-500');
        }
        
        // Show toast
        setTimeout(() => {
            toast.classList.add('opacity-100');
        }, 10);
        
        // Hide toast after 3 seconds
        setTimeout(() => {
            toast.classList.remove('opacity-100');
            setTimeout(() => {
                toast.classList.add('opacity-0');
            }, 300);
        }, 3000);
    }

    /**
     * Update notification toggle button based on subscription status
     */
    updateNotificationToggle(isSubscribed) {
        const notificationToggle = document.getElementById('notification-toggle');
        const notificationSettings = document.getElementById('notification-settings');
        
        if (notificationToggle) {
            if (isSubscribed) {
                notificationToggle.innerHTML = '<i class="fas fa-bell mr-2"></i>Notificaties uitschakelen';
                notificationToggle.classList.remove('bg-primary');
                notificationToggle.classList.add('bg-gray-500');
            } else {
                notificationToggle.innerHTML = '<i class="far fa-bell mr-2"></i>Notificaties inschakelen';
                notificationToggle.classList.remove('bg-gray-500');
                notificationToggle.classList.add('bg-primary');
            }
        }
        
        if (notificationSettings) {
            if (isSubscribed) {
                notificationSettings.innerHTML = '<i class="fas fa-bell mr-2"></i>Notificaties Uitschakelen';
                notificationSettings.classList.remove('bg-primary');
                notificationSettings.classList.add('bg-gray-500');
            } else {
                notificationSettings.innerHTML = '<i class="far fa-bell mr-2"></i>Notificaties Inschakelen';
                notificationSettings.classList.remove('bg-gray-500');
                notificationSettings.classList.add('bg-primary');
            }
        }
        
        // Update mobile button
        this.updateMobileNotificationButton(isSubscribed);
    }

    /**
     * Load and display genre filters
     */
    async loadGenreFilters() {
        const container = document.getElementById('genreFilters');
        
        try {
            const genres = await api.getGenres();
            
            // Filter to get mostly electronic and DJ-related genres
            const relevantGenres = [
                'house', 'techno', 'electronic', 'edm', 'dance', 'deep-house', 
                'electro', 'drum-and-bass', 'dubstep', 'trance', 'progressive-house',
                'ambient', 'trap', 'hip-hop', 'r-n-b', 'pop', 'club', 'detroit-techno',
                'disco', 'minimal-techno', 'tech-house'
            ];
            
            const genresToShow = genres.filter(genre => 
                relevantGenres.some(relevantGenre => genre.includes(relevantGenre))
            ).slice(0, 12);
            
            container.innerHTML = '';
            
            genresToShow.forEach(genre => {
                const button = document.createElement('button');
                button.className = 'px-3 py-1 text-sm rounded-full bg-gray-200 hover:bg-gray-300 transition';
                button.textContent = this.formatGenreName(genre);
                button.dataset.genre = genre;
                button.addEventListener('click', () => this.toggleGenreFilter(button));
                container.appendChild(button);
            });
        } catch (error) {
            container.innerHTML = '<span class="text-red-500">Fout bij het laden van genres</span>';
            console.error('Error loading genres:', error);
        }
    }

    /**
     * Format genre name for display
     */
    formatGenreName(genre) {
        return genre
            .split('-')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }

    /**
     * Toggle a genre filter display
     */
    toggleGenreFilter(button) {
        const genre = button.dataset.genre;
        
        if (this.activeGenreFilters.includes(genre)) {
            this.activeGenreFilters = this.activeGenreFilters.filter(g => g !== genre);
            button.classList.remove('bg-primary', 'text-white');
            button.classList.add('bg-gray-200');
        } else {
            this.activeGenreFilters.push(genre);
            button.classList.remove('bg-gray-200');
            button.classList.add('bg-primary', 'text-white');
        }
        
        // If we have an artist search results, filter them
        if (app.lastSearchResults && app.lastSearchResults.length) {
            this.updateArtistSelectWithFilters(app.lastSearchResults);
        }
    }

    /**
     * Update artist select dropdown with filtered results
     */
    updateArtistSelectWithFilters(artists) {
        const select = document.getElementById('artistSelect');
        select.innerHTML = '<option value="">Selecteer een artiest</option>';
        
        // If no filters active, show all artists
        if (this.activeGenreFilters.length === 0) {
            artists.forEach(artist => {
                this.addArtistToSelect(select, artist);
            });
            return;
        }
        
        // Filter artists by genre
        const filteredArtists = artists.filter(artist => {
            if (!artist.genres || artist.genres.length === 0) return false;
            
            return artist.genres.some(genre => 
                this.activeGenreFilters.some(filter => genre.includes(filter))
            );
        });
        
        // Add filtered artists to select
        if (filteredArtists.length) {
            filteredArtists.forEach(artist => {
                this.addArtistToSelect(select, artist);
            });
        } else {
            // If no matches, add an option indicating that
            const option = document.createElement('option');
            option.disabled = true;
            option.textContent = 'Geen artiesten gevonden met deze genres';
            select.appendChild(option);
        }
    }

    /**
     * Add artist to select dropdown
     */
    addArtistToSelect(select, artist) {
        const option = document.createElement('option');
        option.value = artist.id;
        option.textContent = artist.name;
        option.dataset.img = artist.images.length > 0 ? artist.images[0].url : '';
        option.dataset.popularity = artist.popularity || 0;
        option.dataset.genres = artist.genres ? artist.genres.join(',') : '';
        select.appendChild(option);
    }

    /**
     * Display recommended artists
     */
    displayRecommendations(artists) {
        const container = document.getElementById('recommendations');
        
        if (!artists.length) {
            container.innerHTML = `
                <div class="col-span-full text-center py-8">
                    <div class="text-gray-400 mb-4">
                        <i class="fas fa-magic text-5xl"></i>
                    </div>
                    <p class="text-gray-500">Volg eerst enkele DJ's om aanbevelingen te krijgen</p>
                </div>
            `;
            return;
        }
        
        let html = '';
        
        artists.forEach(artist => {
            const isFavorite = app.favorites.some(fav => fav.id === artist.id);
            
            html += `
                <div class="artist-card bg-white rounded-xl overflow-hidden shadow-md hover:shadow-lg transition-all duration-300 flex flex-col animate__animated animate__fadeIn">
                    <div class="h-40 bg-gray-200 overflow-hidden relative">
                        ${artist.images.length ? 
                            `<img src="${artist.images[0].url}" alt="${artist.name}" class="w-full h-full object-cover">` : 
                            `<div class="w-full h-full flex items-center justify-center bg-gradient-to-r from-primary to-secondary text-white">
                                <i class="fas fa-music text-4xl"></i>
                            </div>`
                        }
                        <div class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent h-20"></div>
                    </div>
                    <div class="p-4 flex-grow flex flex-col">
                        <h3 class="font-bold text-lg mb-1 truncate">${artist.name}</h3>
                        <p class="text-gray-600 text-sm mb-1 truncate">
                            ${artist.genres.length ? this.formatGenreName(artist.genres[0]) : 'DJ / Producer'}
                        </p>
                        <div class="flex items-center mb-3">
                            <div class="text-yellow-500 mr-1">
                                <i class="fas fa-star"></i>
                            </div>
                            <span class="text-sm text-gray-600">${artist.popularity}% populariteit</span>
                        </div>
                        <div class="mt-auto flex gap-2">
                            <button onclick="app.getLatestTracks('${artist.id}')" 
                                class="flex-1 bg-primary hover:bg-primary-dark text-white py-2 rounded-lg transition flex items-center justify-center">
                                <i class="fas fa-headphones mr-2"></i>Ontdekken
                            </button>
                            <button onclick="app.toggleFavorite('${artist.id}', '${artist.name}', '${artist.images.length ? artist.images[0].url : ''}')" 
                                class="${isFavorite ? 'bg-red-500 hover:bg-red-600' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'} p-2 rounded-lg transition">
                                <i class="fas ${isFavorite ? 'fa-heart-broken' : 'fa-heart'}"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `;
        });
        
        container.innerHTML = html;
    }

    /**
     * Display latest tracks
     */
    displayLatestTracks(artist, albums, relatedArtists = []) {
        const resultsContainer = document.getElementById('results');
        const artistImg = artist.images.length > 0 ? artist.images[0].url : '';
        const artistGenres = artist.genres.length ? 
            artist.genres.map(genre => this.formatGenreName(genre)).join(', ') : 
            'DJ / Producer';
        const isFavorite = app.favorites.some(fav => fav.id === artist.id);
        
        let html = `
            <div class="animate__animated animate__fadeIn">
                <div class="flex flex-col md:flex-row items-center md:items-start gap-6 mb-8">
                    <div class="w-48 h-48 rounded-xl overflow-hidden flex-shrink-0">
                        ${artistImg ? 
                            `<img src="${artistImg}" alt="${artist.name}" class="w-full h-full object-cover">` : 
                            `<div class="w-full h-full flex items-center justify-center bg-gradient-to-r from-primary to-secondary text-white">
                                <i class="fas fa-music text-4xl"></i>
                            </div>`
                        }
                    </div>
                    <div class="flex-1 text-center md:text-left">
                        <div class="flex flex-col md:flex-row md:justify-between md:items-center mb-4">
                            <h2 class="text-3xl font-bold text-primary mb-2 md:mb-0">${artist.name}</h2>
                            <button onclick="app.toggleFavorite('${artist.id}', '${artist.name}', '${artistImg}')" 
                                class="inline-flex items-center justify-center px-4 py-2 rounded-lg ${isFavorite ? 'bg-red-500 hover:bg-red-600' : 'bg-primary hover:bg-primary-dark'} text-white transition self-center md:self-auto">
                                <i class="fas ${isFavorite ? 'fa-heart-broken' : 'fa-heart'} mr-2"></i>
                                ${isFavorite ? 'Niet meer volgen' : 'Volgen'}
                            </button>
                        </div>
                        <p class="text-gray-600 mb-4">${artistGenres}</p>
                        <div class="flex items-center justify-center md:justify-start mb-4">
                            <div class="text-yellow-500 mr-2">
                                ${this.getPopularityStars(artist.popularity)}
                            </div>
                            <span class="text-sm text-gray-600">${artist.popularity}% populariteit</span>
                        </div>
                        <p class="text-gray-600">
                            ${artist.followers.total.toLocaleString('nl-NL')} volgers op Spotify
                        </p>
                        <div class="mt-4">
                            <a href="${artist.external_urls.spotify}" target="_blank" 
                               class="inline-flex items-center text-center bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition">
                               <i class="fab fa-spotify mr-2"></i>Bekijk op Spotify
                            </a>
                        </div>
                    </div>
                </div>
                <h3 class="text-2xl font-bold mb-6 text-primary">Nieuwste Releases</h3>
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        `;
        
        albums.forEach(album => {
            const releaseDate = new Date(album.release_date).toLocaleDateString('nl-NL');
            const previewTrack = album.tracks.items.find(track => track.preview_url);
            
            html += `
                <div class="album-card bg-white rounded-xl overflow-hidden shadow-md transition-all duration-300 animate__animated animate__fadeIn">
                    <div class="relative h-48 bg-gray-200 overflow-hidden">
                        ${album.images.length ? 
                            `<img src="${album.images[0].url}" alt="${album.name}" class="w-full h-full object-cover">` : 
                            `<div class="w-full h-full flex items-center justify-center bg-gradient-to-r from-primary to-secondary text-white">
                                <i class="fas fa-music text-4xl"></i>
                            </div>`
                        }
                        <div class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-4">
                            <span class="text-xs font-medium text-white bg-primary bg-opacity-90 rounded-full px-2 py-1">
                                ${album.album_type.toUpperCase()}
                            </span>
                            <span class="text-xs font-medium text-white ml-2">${releaseDate}</span>
                        </div>
                    </div>
                    <div class="p-4">
                        <h4 class="font-bold text-lg mb-1">${album.name}</h4>
                        <p class="text-gray-600 text-sm mb-3">${album.total_tracks} nummers</p>
                        ${previewTrack ? `
                            <div class="mb-4">
                                <div class="audio-visualizer" id="visualizer-${previewTrack.id}" data-track-id="${previewTrack.id}">
                                    ${Array(20).fill().map(() => `<div class="audio-bar" style="height: ${5 + Math.random() * 25}px;"></div>`).join('')}
                                </div>
                                <audio 
                                    id="audio-${previewTrack.id}" 
                                    class="w-full audio-player" 
                                    src="${previewTrack.preview_url}" 
                                    data-track-id="${previewTrack.id}"
                                    controls
                                    data-artist-id="${artist.id}"
                                    data-album-name="${album.name}"
                                    data-track-name="${previewTrack.name}"
                                ></audio>
                            </div>
                        ` : `
                            <p class="text-red-500 mb-4 text-sm">Preview niet beschikbaar</p>
                        `}
                        <div class="flex gap-2 mb-2">
                            <a href="${album.external_urls.spotify}" target="_blank" 
                               class="flex-1 text-center bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg transition">
                               <i class="fab fa-spotify mr-2"></i>Beluisteren
                            </a>
                            <button onclick="app.shareRelease('${artist.name}', '${album.name}', '${album.external_urls.spotify}')" 
                               class="bg-blue-500 hover:bg-blue-600 text-white p-2 rounded-lg transition">
                               <i class="fas fa-share-alt"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `;
        });
        
        html += `
                </div>
        `;
        
        // Add related artists section
        if (relatedArtists && relatedArtists.length > 0) {
            html += `
                <h3 class="text-2xl font-bold my-6 text-primary">Vergelijkbare DJ's</h3>
                <div class="flex overflow-x-auto pb-4 space-x-4 related-artists-scroll">
            `;
            
            relatedArtists.forEach(relArtist => {
                const isFavorite = app.favorites.some(fav => fav.id === relArtist.id);
                
                html += `
                    <div class="flex-shrink-0 w-48 bg-white rounded-xl overflow-hidden shadow-md hover:shadow-lg transition-all duration-300">
                        <div class="h-48 bg-gray-200 overflow-hidden relative">
                            ${relArtist.images.length ? 
                                `<img src="${relArtist.images[0].url}" alt="${relArtist.name}" class="w-full h-full object-cover">` : 
                                `<div class="w-full h-full flex items-center justify-center bg-gradient-to-r from-primary to-secondary text-white">
                                    <i class="fas fa-music text-4xl"></i>
                                </div>`
                            }
                        </div>
                        <div class="p-3">
                            <h4 class="font-bold truncate">${relArtist.name}</h4>
                            <p class="text-gray-600 text-xs mb-2 truncate">
                                ${relArtist.genres.length ? this.formatGenreName(relArtist.genres[0]) : 'DJ / Producer'}
                            </p>
                            <div class="flex gap-1">
                                <button onclick="app.getLatestTracks('${relArtist.id}')" 
                                    class="flex-1 bg-primary hover:bg-primary-dark text-white py-1 text-sm rounded-lg transition">
                                    Verkennen
                                </button>
                                <button onclick="app.toggleFavorite('${relArtist.id}', '${relArtist.name}', '${relArtist.images.length ? relArtist.images[0].url : ''}')" 
                                    class="${isFavorite ? 'bg-red-500 hover:bg-red-600' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'} p-1 rounded-lg transition">
                                    <i class="fas ${isFavorite ? 'fa-heart-broken' : 'fa-heart'}"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                `;
            });
            
            html += `
                </div>
            `;
        }
        
        resultsContainer.innerHTML = html;
        
        // Initialize audio visualizers
        this.initAudioVisualizers();
    }

    /**
     * Generate star rating based on popularity
     */
    getPopularityStars(popularity) {
        const starCount = Math.round(popularity / 20);
        let stars = '';
        
        for (let i = 0; i < 5; i++) {
            if (i < starCount) {
                stars += '<i class="fas fa-star"></i>';
            } else {
                stars += '<i class="far fa-star"></i>';
            }
        }
        
        return stars;
    }

    /**
     * Initialize audio visualizers for tracks
     */
    initAudioVisualizers() {
        document.querySelectorAll('.audio-player').forEach(audio => {
            const trackId = audio.dataset.trackId;
            const visualizer = document.getElementById(`visualizer-${trackId}`);
            
            if (!visualizer) return;
            
            audio.addEventListener('play', () => {
                this.startVisualizer(trackId);
                
                // Pause other audio players
                document.querySelectorAll('.audio-player').forEach(otherAudio => {
                    if (otherAudio !== audio && !otherAudio.paused) {
                        otherAudio.pause();
                    }
                });
            });
            
            audio.addEventListener('pause', () => {
                this.stopVisualizer(trackId);
            });
            
            audio.addEventListener('ended', () => {
                this.stopVisualizer(trackId);
            });
        });
    }

    /**
     * Setup mutation observer for audio visualizers
     */
    setupAudioVisualizerObserver() {
        // Watch for new audio players being added to the DOM
        const observer = new MutationObserver((mutations) => {
            mutations.forEach(mutation => {
                if (mutation.addedNodes.length) {
                    mutation.addedNodes.forEach(node => {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            const audioPlayers = node.querySelectorAll('.audio-player');
                            if (audioPlayers.length) {
                                this.initAudioVisualizers();
                            }
                        }
                    });
                }
            });
        });
        
        observer.observe(document.body, { childList: true, subtree: true });
    }

    /**
     * Start audio visualizer animation
     */
    startVisualizer(trackId) {
        const visualizer = document.getElementById(`visualizer-${trackId}`);
        if (!visualizer) return;
        
        const bars = visualizer.querySelectorAll('.audio-bar');
        
        // Stop existing animation if there is one
        if (this.audioVisualizers.has(trackId)) {
            cancelAnimationFrame(this.audioVisualizers.get(trackId));
        }
        
        const animate = () => {
            bars.forEach(bar => {
                const height = 5 + Math.random() * 25;
                bar.style.height = `${height}px`;
            });
            this.audioVisualizers.set(trackId, requestAnimationFrame(animate));
        };
        
        this.audioVisualizers.set(trackId, requestAnimationFrame(animate));
    }

    /**
     * Stop audio visualizer animation
     */
    stopVisualizer(trackId) {
        if (this.audioVisualizers.has(trackId)) {
            cancelAnimationFrame(this.audioVisualizers.get(trackId));
            this.audioVisualizers.delete(trackId);
            
            // Reset visualizer bars
            const visualizer = document.getElementById(`visualizer-${trackId}`);
            if (visualizer) {
                const bars = visualizer.querySelectorAll('.audio-bar');
                bars.forEach(bar => {
                    bar.style.height = '5px';
                });
            }
        }
    }

    /**
     * Initialize mobile menu
     */
    initializeMobileMenu() {
        const mobileButton = document.getElementById('mobile-quick-actions');
        const mobileMenu = document.getElementById('mobile-menu');
        
        if (mobileButton && mobileMenu) {
            // Close when clicking outside
            document.addEventListener('click', (e) => {
                if (!mobileMenu.contains(e.target) && 
                    e.target !== mobileButton &&
                    !mobileButton.contains(e.target) && 
                    !mobileMenu.classList.contains('hidden')) {
                    app.closeQuickActions();
                }
            });
            
            // Update mobile notification button
            this.updateMobileNotificationButton(this.notificationsEnabled);
        }
    }

    /**
     * Update mobile notification button
     */
    updateMobileNotificationButton(isSubscribed) {
        const mobileIcon = document.getElementById('mobile-notification-icon');
        const mobileText = document.getElementById('mobile-notification-text');
        
        if (mobileIcon && mobileText) {
            if (isSubscribed) {
                mobileIcon.className = 'fas fa-bell mr-3 text-blue-500';
                mobileText.textContent = 'Notificaties Uitschakelen';
            } else {
                mobileIcon.className = 'far fa-bell mr-3 text-blue-500';
                mobileText.textContent = 'Notificaties Inschakelen';
            }
        }
    }

    /**
     * Initialize theme
     */
    initializeTheme() {
        if (this.currentTheme === 'dark') {
            document.documentElement.classList.add('dark');
        } else if (this.currentTheme === 'system') {
            if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
                document.documentElement.classList.add('dark');
            }
            
            // Listen for changes in system preference
            window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
                if (this.currentTheme === 'system') {
                    if (e.matches) {
                        document.documentElement.classList.add('dark');
                    } else {
                        document.documentElement.classList.remove('dark');
                    }
                }
            });
        }
    }

    /**
     * Update theme
     */
    updateTheme(theme) {
        this.currentTheme = theme;
        localStorage.setItem('theme', theme);
        
        // Apply theme changes
        if (theme === 'dark') {
            document.documentElement.classList.add('dark');
        } else if (theme === 'light') {
            document.documentElement.classList.remove('dark');
        } else if (theme === 'system') {
            if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
                document.documentElement.classList.add('dark');
            } else {
                document.documentElement.classList.remove('dark');
            }
        }
        
        this.showMessage(`Thema gewijzigd naar ${theme === 'system' ? 'systeemvoorkeur' : theme === 'dark' ? 'donker' : 'licht'}`, 'success');
    }

    /**
     * Update install status
     */
    updateInstallStatus() {
        const installButton = document.getElementById('install-app-settings');
        const alreadyInstalled = document.getElementById('already-installed');
        
        if (installButton && alreadyInstalled) {
            if (window.matchMedia('(display-mode: standalone)').matches) {
                // App is already installed
                alreadyInstalled.classList.remove('hidden');
                installButton.classList.add('hidden');
            } else {
                // Make sure the install button in settings reflects the same state as the main install button
                alreadyInstalled.classList.add('hidden');
                installButton.classList.remove('hidden');
                
                if (deferredPrompt) {
                    // Add click handler
                    installButton.addEventListener('click', async () => {
                        installButton.classList.add('hidden');
                        deferredPrompt.prompt();
                        const { outcome } = await deferredPrompt.userChoice;
                        
                        if (outcome === 'accepted') {
                            // App was installed
                            alreadyInstalled.classList.remove('hidden');
                        }
                        
                        deferredPrompt = null;
                    });
                } else {
                    // No install prompt available
                    installButton.classList.add('hidden');
                }
            }
        }
    }
}

// Initialize UI service
const ui = new UIService();
