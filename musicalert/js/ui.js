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
     * Load and display genre filters
     */
    async loadGenreFilters() {
        const container = document.getElementById('genreFilters');
        
        try {
            // Skip if the container doesn't exist
            if (!container) {
                console.log('Genre filter container not found, skipping');
                return;
            }
            
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
            // Handle error gracefully
            if (container) {
                container.innerHTML = '<span class="text-red-500">Fout bij het laden van genres</span>';
            }
            console.error('Error loading genres:', error);
        }
    }

    /**
     * Display track recommendations
     */
    displayTrackRecommendations(tracks) {
        const container = document.getElementById('track-recommendations');
        // Early exit if container doesn't exist
        if (!container) {
            console.warn('Track recommendations container not found');
            return;
        }
        container.innerHTML = '';
        
        if (!tracks || tracks.length === 0) {
            container.innerHTML = `
                <div class="col-span-full text-center py-6">
                    <p class="text-gray-500">Geen aanbevelingen beschikbaar. Volg eerst wat DJ's.</p>
                </div>
            `;
            return;
        }
        
        // Create grid layout for tracks
        const trackGrid = document.createElement('div');
        trackGrid.className = 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4';
        
        for (const track of tracks) {
            const audioFeatures = track.audioFeatures || {};
            
            // Get energy and danceability values
            const energy = Math.round((audioFeatures.energy || 0.5) * 100);
            const danceability = Math.round((audioFeatures.danceability || 0.5) * 100);
            
            const trackCard = document.createElement('div');
            trackCard.className = 'bg-white rounded-lg shadow-md overflow-hidden transition-all duration-300 hover:shadow-lg flex flex-col';
            
            trackCard.innerHTML = `
                <div class="relative">
                    <img src="${track.album?.images?.[0]?.url || 'img/placeholder-album.png'}" 
                        alt="${track.name}" class="w-full h-48 object-cover">
                    <button class="absolute bottom-2 right-2 bg-primary hover:bg-primary-dark text-white rounded-full w-10 h-10 flex items-center justify-center transition-colors preview-play-btn" 
                        data-preview-url="${track.preview_url || ''}" 
                        data-track-id="${track.id || ''}"
                        data-track-name="${track.name || 'Unknown Track'}"
                        data-artist-name="${track.artists?.[0]?.name || 'Unknown Artist'}"
                        data-artist-id="${track.artists?.[0]?.id || ''}"
                        data-album-name="${track.album?.name || 'Unknown Album'}"
                        data-album-id="${track.album?.id || ''}"
                        data-album-image="${track.album?.images?.[0]?.url || ''}">
                        <i class="fas fa-play"></i>
                    </button>
                </div>
                <div class="p-4 flex-grow flex flex-col">
                    <h4 class="font-bold line-clamp-2" title="${track.name}">${track.name}</h4>
                    <p class="text-primary line-clamp-1" title="${track.artists?.map(a => a.name).join(', ') || ''}">
                        ${track.artists?.map(a => a.name).join(', ') || 'Unknown Artist'}
                    </p>
                    <p class="text-sm text-gray-500">Album: ${track.album?.name || 'Unknown'}</p>
                    
                    <div class="mt-auto pt-3">
                        <div class="flex justify-between text-xs text-gray-600 mb-1">
                            <span>Energy</span>
                            <span>${energy}%</span>
                        </div>
                        <div class="w-full bg-gray-200 rounded-full h-1.5 mb-2">
                            <div class="bg-blue-500 h-1.5 rounded-full" style="width: ${energy}%"></div>
                        </div>
                        
                        <div class="flex justify-between text-xs text-gray-600 mb-1">
                            <span>Danceability</span>
                            <span>${danceability}%</span>
                        </div>
                        <div class="w-full bg-gray-200 rounded-full h-1.5">
                            <div class="bg-green-500 h-1.5 rounded-full" style="width: ${danceability}%"></div>
                        </div>
                    </div>
                </div>
                
                <div class="px-4 pb-4 pt-2 flex justify-between items-center">
                    <a href="${track.external_urls?.spotify || '#'}" target="_blank" class="text-sm text-gray-600 hover:text-primary transition-colors">
                        <i class="fab fa-spotify mr-1"></i>Open
                    </a>
                    
                    <button class="text-sm bg-gray-200 hover:bg-gray-300 text-gray-700 px-2 py-1 rounded-full transition-colors add-to-collection" data-track-id="${track.id || ''}">
                        <i class="fas fa-plus mr-1"></i>Toevoegen
                    </button>
                </div>
            `;
            
            trackGrid.appendChild(trackCard);
        }
        
        container.appendChild(trackGrid);
        
        // Initialize play buttons
        app.setupTrackPreviewButtons();
    }
}

// Initialize UI service
const ui = new UIService();
