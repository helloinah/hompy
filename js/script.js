// hompy/js/script.js

import { setupPostInteractions, createPostElement, highlightActivePost, setInitialContentAndHighlight } from './postInteractions.js';
import { setupCommentUI } from './commentManager.js';
import { APPS_SCRIPT_URL, getEmbedURL } from './utils.js';

document.addEventListener('DOMContentLoaded', () => {
    const tagFilterSelect = document.getElementById('tag-filter');
    const postList = document.getElementById('post-list');
    const loadMoreBtn = document.getElementById('load-more-btn'); 

    // Search elements
    const searchInput = document.getElementById('search-input');
    const searchButton = document.getElementById('search-button');

    // Caching variables
    const CACHE_KEY_POSTS = 'myWebsitePostsCache';
    const CACHE_TIMESTAMP_KEY = 'myWebsitePostsCacheTimestamp';
    const CACHE_DURATION_MS = 5 * 60 * 1000; // Cache for 5 minutes

    const loadingSpinner = document.getElementById('loading-spinner');
    const loadingOverlay = document.getElementById('loading-overlay');

    // Pagination and loading state variables
    let currentPage = 0;
    const postsPerPage = 10;
    let loadingPosts = false;
    let allPostsLoaded = false; // Refers to whether all posts *for the current filter/search* have been rendered
    let sharedPostRowIndex = null; 

    // Central store for all fetched posts (from cache or network, once per cache duration)
    let allAvailablePosts = []; 
    // Variable to hold current search query, used for filtering `allAvailablePosts`
    let currentSearchQuery = '';

    // --- Data Fetching from Apps Script (only for the full dataset) ---
    async function fetchAllPostsFromAppsScript() {
        if (loadingSpinner && loadingOverlay) {
            loadingSpinner.style.display = 'block';
            loadingOverlay.style.display = 'block';
        }
        loadingPosts = true;

        try {
            // Always fetch ALL posts from the backend when this is called, ignoring client-side pagination/tag params
            const response = await fetch(`${APPS_SCRIPT_URL}?action=getPosts&tag=all`); // Request all posts
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const result = await response.json();

            if (result.success === false) {
                console.error("Error from Apps Script (getPosts):", result.error);
                postList.innerHTML = '<li>Error loading posts. Please try again later.</li>';
                return [];
            }
            
            // Simulate network delay for smoother UX
            await new Promise(resolve => setTimeout(resolve, 300));

            // Store the full dataset
            allAvailablePosts = result; 
            localStorage.setItem(CACHE_KEY_POSTS, JSON.stringify(allAvailablePosts));
            localStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString());

            return allAvailablePosts;

        } catch (error) {
            console.error('Error fetching all post data:', error);
            postList.innerHTML = '<li>Error loading posts. Please try again later.</li>';
            return [];
        } finally {
            if (loadingSpinner && loadingOverlay) {
                loadingSpinner.style.display = 'none';
                loadingOverlay.style.display = 'none';
            }
            loadingPosts = false;
        }
    }

    // Function to ensure `allAvailablePosts` is populated, using cache if valid
    async function ensureAllPostsLoaded() {
        if (allAvailablePosts.length > 0) { // Already loaded in memory
            return; 
        }

        const cachedData = localStorage.getItem(CACHE_KEY_POSTS);
        const cachedTimestamp = localStorage.getItem(CACHE_TIMESTAMP_KEY);

        if (cachedData && cachedTimestamp && (Date.now() - parseInt(cachedTimestamp, 10) < CACHE_DURATION_MS)) {
            try {
                allAvailablePosts = JSON.parse(cachedData);
                console.log('Loaded ALL posts from cache.');
            } catch (e) {
                console.error("Error parsing cached data, fetching from network.", e);
                localStorage.removeItem(CACHE_KEY_POSTS); 
                localStorage.removeItem(CACHE_TIMESTAMP_KEY);
                await fetchAllPostsFromAppsScript(); // Fetch if cache parsing fails
            }
        } else {
            // Cache is empty or stale, fetch from network
            await fetchAllPostsFromAppsScript();
        }
    }


    // Function to update the visibility of the "Load More" button
    function updateLoadMoreButton() {
        if (loadMoreBtn) {
            // Hide "Load More" if all posts for the current filter/search are rendered
            // or if there are no posts at all.
            loadMoreBtn.style.display = allPostsLoaded ? 'none' : 'block';
        }
    }

    /**
     * Filters and sorts the `allAvailablePosts` array based on current UI state.
     * @returns {Array<object>} The filtered and sorted array of posts.
     */
    function getFilteredAndSortedPosts() {
        let posts = [...allAvailablePosts]; // Create a copy to avoid modifying original

        // Apply Tag Filtering
        const currentTag = tagFilterSelect.value;
        if (currentTag && currentTag.toLowerCase() !== 'all') {
            posts = posts.filter(post => 
                post.tag && post.tag.toLowerCase() === currentTag.toLowerCase()
            );
        }

        // Apply Search Filtering
        if (currentSearchQuery !== '') {
            const searchQueryLower = currentSearchQuery.toLowerCase();
            posts = posts.filter(post => 
                (post.title && post.title.toLowerCase().includes(searchQueryLower)) ||
                (post.note && post.note.toLowerCase().includes(searchQueryLower)) ||
                (post.tag && post.tag.toLowerCase().includes(searchQueryLower))
            );
        }

        // Apply the same sorting logic as in Apps Script for consistency
        posts.sort((a, b) => {
            if (a.pin && !b.pin) return -1;
            if (!a.pin && b.pin) return 1;
            const dateA = new Date(a.date);
            const dateB = new Date(b.date);
            return dateB.getTime() - dateA.getTime();
        });

        return posts;
    }


    // --- Main Post Loading and Rendering Function ---
    async function loadPosts(reset = false) {
        if (loadingPosts && !reset) return; // Prevent multiple simultaneous loads unless resetting

        if (reset) {
            postList.innerHTML = '';
            currentPage = 0;
            allPostsLoaded = false;
        }

        // Get the current search query (only update if a new search is initiated)
        const newSearchQuery = searchInput.value.trim();
        if (reset && currentSearchQuery !== newSearchQuery) { // Only update if reset and query actually changed
             currentSearchQuery = newSearchQuery;
        }

        // Ensure all posts are loaded into `allAvailablePosts` first
        await ensureAllPostsLoaded(); 

        // Filter and sort the posts based on current tag and search query from `allAvailablePosts`
        const filteredAndSortedPosts = getFilteredAndSortedPosts();

        // Determine if all posts for the current filter/search are already displayed or about to be
        const totalPostsForCurrentView = filteredAndSortedPosts.length;
        if ((currentPage * postsPerPage) >= totalPostsForCurrentView) {
            allPostsLoaded = true; // No more posts to load for this view
            updateLoadMoreButton(); // Hide load more button
            if (currentPage === 0) { // If no posts at all for current filter/search
                postList.innerHTML = '<div class="post-list-item">No posts found matching your criteria.</div>';
                setInitialContentAndHighlight([], sharedPostRowIndex); // Load blank
            }
            return; // Nothing more to render
        }

        // Slice for pagination from the filtered and sorted set
        const postsToRender = filteredAndSortedPosts.slice(
            currentPage * postsPerPage, 
            (currentPage * postsPerPage) + postsPerPage
        );

        if (postsToRender.length === 0 && currentPage === 0) {
            postList.innerHTML = '<div class="post-list-item">No posts found matching your criteria.</div>';
            allPostsLoaded = true;
            setInitialContentAndHighlight([], sharedPostRowIndex); // Load blank if nothing found
        } else if ((currentPage * postsPerPage) + postsPerPage >= totalPostsForCurrentView) {
            allPostsLoaded = true; // All posts for current view have been fetched/rendered
        }

        postsToRender.forEach(post => {
            const postElement = createPostElement(post);
            postList.appendChild(postElement);
        });

        // For the very first load (currentPage was 0), set initial iframe content
        if (currentPage === 0) {
            setInitialContentAndHighlight(filteredAndSortedPosts, sharedPostRowIndex);
        }

        currentPage++;
        updateLoadMoreButton();
    }

    // --- Tag Filter Population ---
    async function populateTagFilter() {
        await ensureAllPostsLoaded(); // Ensure `allAvailablePosts` is populated
        const uniqueTags = [...new Set(allAvailablePosts.map(p => p.tag).filter(Boolean))].sort();
        tagFilterSelect.innerHTML = '<option value="all">All Tags</option>';
        uniqueTags.forEach(tag => {
            tagFilterSelect.innerHTML += `<option value="${tag}">${tag}</option>`;
        });
    }

    // --- Event Listeners ---
    tagFilterSelect.addEventListener('change', () => {
        searchInput.value = ''; // Clear search input when tag filter changes for cleaner interaction
        currentSearchQuery = ''; // Reset search query state
        loadPosts(true); // Reset pagination and re-load first page for the new tag/no-search
    });

    if (loadMoreBtn) {
        loadMoreBtn.addEventListener('click', () => {
            loadPosts(); 
        });
    }

    // Search event listeners
    searchButton.addEventListener('click', () => {
        // When search button is clicked, reset pagination and load posts with new query
        loadPosts(true); 
    });

    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            loadPosts(true); 
        }
    });


    // --- Initial Load ---
    const urlParams = new URLSearchParams(window.location.search);
    const postIdFromUrl = urlParams.get('post');
    if (postIdFromUrl) {
        sharedPostRowIndex = parseInt(postIdFromUrl, 10);
    }

    setupPostInteractions();
    setupCommentUI();       

    populateTagFilter(); // This will also trigger ensureAllPostsLoaded
    loadPosts(true); // Initial load of posts, which will use the now loaded/cached `allAvailablePosts`
});
