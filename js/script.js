// hompy/js/script.js

// CORRECTED IMPORTS: Added createPostElement, highlightActivePost, getEmbedURL, and setInitialContentAndHighlight
import { setupPostInteractions, createPostElement, highlightActivePost, setInitialContentAndHighlight } from './postInteractions.js';
import { setupCommentUI } from './commentManager.js';
import { APPS_SCRIPT_URL, getEmbedURL } from './utils.js';

document.addEventListener('DOMContentLoaded', () => {
    const tagFilterSelect = document.getElementById('tag-filter');
    const postList = document.getElementById('post-list');
    const loadMoreBtn = document.getElementById('load-more-btn'); // Assuming you've added this button to index.html

    // Caching variables
    const CACHE_KEY_POSTS = 'myWebsitePostsCache';
    const CACHE_TIMESTAMP_KEY = 'myWebsitePostsCacheTimestamp';
    const CACHE_DURATION_MS = 5 * 60 * 1000; // Cache for 5 minutes (adjust as needed)

    const loadingSpinner = document.getElementById('loading-spinner');
    const loadingOverlay = document.getElementById('loading-overlay');

    // Pagination and loading state variables (now correctly declared)
    let currentPage = 0;
    const postsPerPage = 10; // Number of posts to load per page
    let loadingPosts = false;
    let allPostsLoaded = false;
    let sharedPostRowIndex = null; // Stays global for URL param handling

    // --- Data Fetching ---
    // This function now primarily handles fetching data from the backend,
    // and also manages the full cache for initial load and filtering.
    async function getSheetData(startIndex, numPosts, tagFilter = 'all', useCache = true) {
        if (loadingSpinner && loadingOverlay) {
            loadingSpinner.style.display = 'block';
            loadingOverlay.style.display = 'block';
        }
        loadingPosts = true;

        let postsToReturn = []; // This will be the paginated/filtered subset
        let allFetchedPosts = []; // This will hold the full data for caching/initial population

        // --- Caching Logic for ALL Posts (for initial load and filter population) ---
        // This block tries to load the *entire* dataset from cache first, if applicable.
        if (useCache && startIndex === 0 && tagFilter === 'all') {
            const cachedData = localStorage.getItem(CACHE_KEY_POSTS);
            const cachedTimestamp = localStorage.getItem(CACHE_TIMESTAMP_KEY);

            if (cachedData && cachedTimestamp && (Date.now() - parseInt(cachedTimestamp, 10) < CACHE_DURATION_MS)) {
                try {
                    allFetchedPosts = JSON.parse(cachedData);
                    console.log('Loaded ALL posts from cache for initial display and filters.');
                    // Simulate network delay for smoother UX
                    await new Promise(resolve => setTimeout(resolve, 300));
                    postsToReturn = allFetchedPosts.slice(startIndex, startIndex + numPosts);
                    loadingPosts = false; // Set loading to false here as well for cached path
                    if (loadingSpinner && loadingOverlay) {
                        loadingSpinner.style.display = 'none';
                        loadingOverlay.style.display = 'none';
                    }
                    return postsToReturn; // Return directly from cache
                } catch (e) {
                    console.error("Error parsing cached data, fetching from network.", e);
                    localStorage.removeItem(CACHE_KEY_POSTS); // Clear bad cache
                    localStorage.removeItem(CACHE_TIMESTAMP_KEY);
                    // Fall through to network fetch
                }
            }
        }

        // --- Network Fetch Logic ---
        try {
            // Adjust URL parameters based on whether we need ALL data for caching
            // or just a paginated/filtered subset. Your Apps Script must support this.
            let fetchUrl = `${APPS_SCRIPT_URL}?action=getPosts`;
            if (startIndex === 0 && tagFilter === 'all') {
                // Request ALL posts from the backend for initial cache population.
                // Your Apps Script should handle `startIndex` and `numPosts` being omitted for this.
                fetchUrl += `&tag=${tagFilter}`; // Still send tag for backend processing
            } else {
                // Request paginated or filtered data
                fetchUrl += `&startIndex=${startIndex}&numPosts=${numPosts}&tag=${tagFilter}`;
            }

            const response = await fetch(fetchUrl);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const result = await response.json();

            if (result.success === false) {
                console.error("Error from Apps Script (getPosts):", result.error);
                if (startIndex === 0) { // Only show error message on initial load
                    postList.innerHTML = '<li>Error loading posts. Please try again later.</li>';
                }
                return [];
            }

            // If we just fetched ALL posts (initial load for 'all' tag), cache them
            if (startIndex === 0 && tagFilter === 'all') {
                allFetchedPosts = result; // Assuming 'result' contains all posts
                localStorage.setItem(CACHE_KEY_POSTS, JSON.stringify(allFetchedPosts));
                localStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString());
                postsToReturn = allFetchedPosts.slice(startIndex, startIndex + numPosts); // Slice for the first page
            } else {
                // If it's a paginated fetch or a specific tag filter, use the results directly
                postsToReturn = result;
            }

            return postsToReturn;

        } catch (error) {
            console.error('Error fetching post data:', error);
            if (startIndex === 0) {
                postList.innerHTML = '<li>Error loading posts. Please try again later.</li>';
            }
            return [];
        } finally {
            if (loadingSpinner && loadingOverlay) {
                loadingSpinner.style.display = 'none';
                loadingOverlay.style.display = 'none';
            }
            loadingPosts = false;
        }
    }

    // Function to update the visibility of the "Load More" button
    function updateLoadMoreButton() {
        if (loadMoreBtn) {
            loadMoreBtn.style.display = allPostsLoaded ? 'none' : 'block';
        }
    }

    // --- Main Post Loading and Rendering Function (updated) ---
    async function loadPosts(reset = false) {
        if (loadingPosts && !reset) return; // Prevent multiple simultaneous loads unless resetting

        const currentTag = tagFilterSelect.value;

        if (reset) {
            postList.innerHTML = ''; // Clear posts only if resetting (e.g., tag change)
            currentPage = 0;
            allPostsLoaded = false;
            // sharedPostRowIndex is preserved from URL for initial load logic in setInitialContentAndHighlight
        }

        // Determine if we should attempt to use cache for this specific call to getSheetData
        // Only attempt to use full cache if it's the very first page of the 'all' tag
        const useCacheForThisCall = (currentPage === 0 && currentTag === 'all');

        const fetchedPosts = await getSheetData(currentPage * postsPerPage, postsPerPage, currentTag, useCacheForThisCall);

        if (fetchedPosts.length === 0) {
            allPostsLoaded = true; // No more posts to load
            if (currentPage === 0) { // No posts at all for the current filter
                 postList.innerHTML = '<div class="post-list-item">No posts found.</div>';
            }
            // If no posts, ensure iframe is blank/default
            if (currentPage === 0) { // Only on initial load or reset with no posts
                setInitialContentAndHighlight([], sharedPostRowIndex); // Pass empty array
            }

        } else {
            // Render the fetched posts by appending them to the list
            fetchedPosts.forEach(post => {
                const postElement = createPostElement(post); // createPostElement handles its own click listener for iframe update
                postList.appendChild(postElement);
            });

            // NEW: Call the dedicated function for initial iframe content and highlighting
            // This should only happen once per initial load or tag filter reset, after first batch of posts is rendered.
            if (currentPage === 0) {
                // Pass all available posts (even if more than one page is in cache for 'all' tag)
                // The `populateTagFilter` also uses the full cache, so `setInitialContentAndHighlight` should also use it if available
                const allCachedPosts = localStorage.getItem(CACHE_KEY_POSTS);
                if (currentTag === 'all' && allCachedPosts) {
                    setInitialContentAndHighlight(JSON.parse(allCachedPosts), sharedPostRowIndex);
                } else {
                    // For filtered views or if no cache, just use the currently fetched posts
                    setInitialContentAndHighlight(fetchedPosts, sharedPostRowIndex);
                }
                // sharedPostRowIndex is handled by setInitialContentAndHighlight
            }

            currentPage++; // Increment page for next load
        }
        updateLoadMoreButton(); // Update button visibility after rendering posts
    }

    // --- Tag Filter Population (updated to work with full cached data or initial network fetch) ---
    async function populateTagFilter() {
        let allTagsData = [];
        const cachedData = localStorage.getItem(CACHE_KEY_POSTS);
        const cachedTimestamp = localStorage.getItem(CACHE_TIMESTAMP_KEY);

        if (cachedData && cachedTimestamp && (Date.now() - parseInt(cachedTimestamp, 10) < CACHE_DURATION_MS)) {
            // If full data is in cache and valid, use it to populate tags
            allTagsData = JSON.parse(cachedData);
            console.log('Populated tags from cached data.');
        } else {
            // If cache is stale or not present, fetch ALL tags from network specifically.
            try {
                // This call should fetch ALL posts from the backend to ensure all tags are captured.
                const response = await fetch(`${APPS_SCRIPT_URL}?action=getPosts&tag=all`);
                if (response.ok) {
                    const result = await response.json();
                    if (result.success !== false) {
                        allTagsData = result;
                        // Optionally cache this full data if it wasn't already cached by loadPosts
                        if (currentPage === 0) { // Only if initial load, not subsequent pages
                             localStorage.setItem(CACHE_KEY_POSTS, JSON.stringify(allTagsData));
                             localStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString());
                        }
                    }
                }
            } catch (error) {
                console.error("Error fetching all posts for tags:", error);
            }
        }

        const uniqueTags = [...new Set(allTagsData.map(p => p.tag).filter(Boolean))].sort();
        tagFilterSelect.innerHTML = '<option value="all">All Tags</option>';
        uniqueTags.forEach(tag => {
            tagFilterSelect.innerHTML += `<option value="${tag}">${tag}</option>`;
        });
    }

    // --- Event Listeners ---
    // Combined and corrected tag filter change listener
    tagFilterSelect.addEventListener('change', () => {
        loadPosts(true); // Always reset pagination and re-load first page for the new tag
    });

    // Event listener for the "Load More" button
    if (loadMoreBtn) {
        loadMoreBtn.addEventListener('click', () => {
            loadPosts(); // Load the next page
        });
    }


    // --- Initial Load ---
    const urlParams = new URLSearchParams(window.location.search);
    const postIdFromUrl = urlParams.get('post');
    if (postIdFromUrl) {
        sharedPostRowIndex = parseInt(postIdFromUrl, 10);
    }

    // CORRECTED ORDER: Call setup functions BEFORE loadPosts and populateTagFilter
    setupPostInteractions(); // Initialize DOM elements like contentFrame and postList
    setupCommentUI();       // Initialize DOM elements for comment UI

    // Initial call to populate tags and then load posts
    populateTagFilter();
    loadPosts(true); // Initial load, clearing existing list and setting up pagination
});