// js/script.js

import { setupPostInteractions, createPostElement, highlightActivePost, setInitialContentAndHighlight } from './postInteractions.js';
import { APPS_SCRIPT_URL } from './utils.js';

document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const tagFilterSelect = document.getElementById('tag-filter');
    const postList = document.getElementById('post-list');
    const loadMoreBtn = document.getElementById('load-more-btn');
    const searchInput = document.getElementById('search-input');
    const searchButton = document.getElementById('search-button');
    const loadingSpinner = document.getElementById('loading-spinner');
    const loadingOverlay = document.getElementById('loading-overlay');
    const clickableDiv = document.getElementById('about-container');
    const myIframe = document.getElementById('content-frame');
    const searchContainer = document.querySelector('.search-container');

    // Constants for caching
    const CACHE_KEY_POSTS = 'myWebsitePostsCache';
    const CACHE_TIMESTAMP_KEY = 'myWebsitePostsCacheTimestamp';
    const CACHE_DURATION_MS = 5 * 60 * 1000;

    // State Variables
    let currentPage = 0;
    const postsPerPage = 10;
    let loadingPosts = false;
    let allPostsLoaded = false;
    let sharedPostRowIndex = null;
    let allAvailablePosts = [];
    let currentSearchQuery = '';


    /**
     * Fetches all posts from Google Apps Script.
     * Displays a loading spinner and overlay during the fetch.
     * Caches the fetched data in localStorage with a timestamp.
     * @returns {Promise<Array<object>>} An array of post data objects.
     */
    async function fetchAllPostsFromAppsScript() {
        if (loadingSpinner && loadingOverlay) {
            loadingSpinner.style.display = 'block';
            loadingOverlay.style.display = 'block';
        }
        loadingPosts = true;

        try {
            const response = await fetch(`${APPS_SCRIPT_URL}?action=getPosts&tag=all`);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const result = await response.json();

            if (result.success === false) {
                console.error("Error from Apps Script (getPosts):", result.error);
                postList.innerHTML = '<li>Error loading posts. Please try again later.</li>';
                return [];
            }

            await new Promise(resolve => setTimeout(resolve, 300)); // Simulate loading delay

            allAvailablePosts = result;
            localStorage.setItem(CACHE_KEY_POSTS, JSON.stringify(allAvailablePosts));
            localStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString());

            return allAvailablePosts;

        }
        catch (error) {
            console.error('에러...', error);
            postList.innerHTML = '<li>에러...이게 왜이러지...</li>';
            return [];
        } finally {
            if (loadingSpinner && loadingOverlay) {
                loadingSpinner.style.display = 'none';
                 loadingOverlay.style.display = 'none';
             }
            loadingPosts = false;
        }
    }

    /**
     * Ensures all posts are loaded, either from cache or by fetching from Apps Script.
     */
    async function ensureAllPostsLoaded() {
        if (allAvailablePosts.length > 0) {
            return;
        }

        const cachedData = localStorage.getItem(CACHE_KEY_POSTS);
        const cachedTimestamp = localStorage.getItem(CACHE_TIMESTAMP_KEY);

        if (cachedData && cachedTimestamp && (Date.now() - parseInt(cachedTimestamp, 10) < CACHE_DURATION_MS)) {
            try {
                allAvailablePosts = JSON.parse(cachedData);
                console.log('Loaded ALL posts from cache.');
            }
            catch (e) {
                console.error("Error parsing cached data, fetching from network.", e);
                localStorage.removeItem(CACHE_KEY_POSTS);
                localStorage.removeItem(CACHE_TIMESTAMP_KEY);
                await fetchAllPostsFromAppsScript();
            }
        } else {
            await fetchAllPostsFromAppsScript();
        }
    }

    /**
     * Updates the display style of the "Load More" button based on `allPostsLoaded` state.
     */
    function updateLoadMoreButton() {
        if (loadMoreBtn) {
            loadMoreBtn.style.display = allPostsLoaded ? 'none' : 'block';
        }
    }

    /**
     * Filters and sorts the available posts based on the current tag filter and search query.
     * Posts are sorted by 'pin' status (pinned first) and then by date (newest first).
     * @returns {Array<object>} An array of filtered and sorted post data objects.
     */
    function getFilteredAndSortedPosts() {
        let posts = [...allAvailablePosts];

        const currentTag = tagFilterSelect.value;
        if (currentTag && currentTag.toLowerCase() !== 'all') {
            posts = posts.filter(post =>
                post.tag && post.tag.toLowerCase() === currentTag.toLowerCase()
            );
        }

        if (currentSearchQuery !== '') {
            const searchQueryLower = currentSearchQuery.toLowerCase();
            posts = posts.filter(post =>
                (post.title && post.title.toLowerCase().includes(searchQueryLower)) ||
                (post.note && post.note.toLowerCase().includes(searchQueryLower)) ||
                (post.tag && post.tag.toLowerCase().includes(searchQueryLower)) // Corrected line
            );
        }

        posts.sort((a, b) => {
            if (a.pin && !b.pin) return -1;
            if (!a.pin && b.pin) return 1;
            const dateA = new Date(a.date);
            const dateB = new Date(b.date);
            return dateB.getTime() - dateA.getTime();
        });

        return posts;
    }

    /**
     * Loads and renders a batch of posts to the `postList`.
     * Can reset the list if `reset` is true.
     * @param {boolean} [reset=false] Whether to clear the existing posts and reset pagination.
     */
    async function loadPosts(reset = false) {
        if (loadingPosts && !reset) return;

        if (reset) {
            postList.innerHTML = '';
            currentPage = 0;
            allPostsLoaded = false;
        }

        const newSearchQuery = searchInput.value.trim();
        if (reset && currentSearchQuery !== newSearchQuery) {
             currentSearchQuery = newSearchQuery;
        }

        await ensureAllPostsLoaded();

        const filteredAndSortedPosts = getFilteredAndSortedPosts();

        const totalPostsForCurrentView = filteredAndSortedPosts.length;
        if ((currentPage * postsPerPage) >= totalPostsForCurrentView) {
            allPostsLoaded = true;
            updateLoadMoreButton();
            if (currentPage === 0) {
                postList.innerHTML = '<div class="post-list-item">검색 결과가 아무것도 없어요...</div>';
                setInitialContentAndHighlight([], sharedPostRowIndex);
            }
            return;
        }

        const postsToRender = filteredAndSortedPosts.slice(
            currentPage * postsPerPage,
            (currentPage * postsPerPage) + postsPerPage
        );

        if (postsToRender.length === 0 && currentPage === 0) {
            postList.innerHTML = '<div class="post-list-item">No posts found matching your criteria.</div>';
            allPostsLoaded = true;
            setInitialContentAndHighlight([], sharedPostRowIndex);
        } else if ((currentPage * postsPerPage) + postsPerPage >= totalPostsForCurrentView) {
            allPostsLoaded = true;
        }

        postsToRender.forEach(post => {
            const postElement = createPostElement(post);
            postList.appendChild(postElement);
        });

        if (currentPage === 0) {
            setInitialContentAndHighlight(filteredAndSortedPosts, sharedPostRowIndex);
        }

        currentPage++;
        updateLoadMoreButton();
    }

    /**
     * Populates the tag filter dropdown with unique tags from all available posts.
     */
    async function populateTagFilter() {
        await ensureAllPostsLoaded();
        const uniqueTags = [...new Set(allAvailablePosts.map(p => p.tag).filter(Boolean))].sort();
        tagFilterSelect.innerHTML = '<option value="all">All Tags</option>';
        uniqueTags.forEach(tag => {
            tagFilterSelect.innerHTML += `<option value="${tag}">${tag}</option>`;
        });
    }

    // Event Listeners

    // "ABOUT" link click handler
    clickableDiv.addEventListener('click', function() {
        myIframe.src = 'about.html'; // Change the src of the iframe to 'about.html'
    });

    // Tag filter change handler
    tagFilterSelect.addEventListener('change', () => {
        searchInput.value = ''; // Clear search input when tag filter changes
        currentSearchQuery = '';
        loadPosts(true); // Reload posts with the new filter
    });

    // "Load More" button click handler
    if (loadMoreBtn) {
        loadMoreBtn.addEventListener('click', () => {
            loadPosts(); // Load more posts
        });
    }

    // Search button click handler
    searchButton.addEventListener('click', function() {
        searchContainer.classList.toggle('expanded'); // Toggle the 'expanded' class for search input visibility

        if (searchContainer.classList.contains('expanded')) {
            searchInput.focus(); // Focus input when expanding
        } else {
            searchInput.value = ''; // Clear input when collapsing
        }
        loadPosts(true); // Reload posts with the new search query
    });

    // Search input keypress handler (for Enter key)
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            loadPosts(true); // Reload posts on Enter key press
        }
    });

    // Initial setup when DOM is ready
    const urlParams = new URLSearchParams(window.location.search);
    const postIdFromUrl = urlParams.get('post');
    if (postIdFromUrl) {
        sharedPostRowIndex = parseInt(postIdFromUrl, 10);
    }

    setupPostInteractions(); // Initialize post interaction elements

    populateTagFilter(); // Populate the tag filter dropdown
    loadPosts(true); // Load initial posts
});