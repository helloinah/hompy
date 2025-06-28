// js/script.js

import { setupPostInteractions, createPostElement, highlightActivePost, setInitialContentAndHighlight } from './postInteractions.js';
import { setupCommentUI } from './commentManager.js';
import { APPS_SCRIPT_URL, getEmbedURL } from './utils.js';
// config.js 및 Lottie 관련 임포트는 더 이상 필요 없습니다.

document.addEventListener('DOMContentLoaded', () => {
    const tagFilterSelect = document.getElementById('tag-filter');
    const postList = document.getElementById('post-list');
    const loadMoreBtn = document.getElementById('load-more-btn');

    const searchInput = document.getElementById('search-input');
    const searchButton = document.getElementById('search-button');

    const CACHE_KEY_POSTS = 'myWebsitePostsCache';
    const CACHE_TIMESTAMP_KEY = 'myWebsitePostsCacheTimestamp';
    const CACHE_DURATION_MS = 5 * 60 * 1000;

    const loadingSpinner = document.getElementById('loading-spinner');
    const loadingOverlay = document.getElementById('loading-overlay');
    // Lottie 플레이어 관련 변수 및 제어 로직은 모두 제거됩니다.

    let currentPage = 0;
    const postsPerPage = 10;
    let loadingPosts = false;
    let allPostsLoaded = false;
    let sharedPostRowIndex = null;

    let allAvailablePosts = [];
    let currentSearchQuery = '';

    // NEW: Collapsible section elements
    const aboutToggleBtn = document.getElementById('about-toggle-btn');
    const aboutContent = document.querySelector('.about-section .collapsible-content');
    const filterSearchToggleBtn = document.getElementById('filter-search-toggle-btn');
    const filterSearchContent = document.querySelector('.filter-search-section .collapsible-content');

    // NEW: Function to handle collapsible sections
    function setupCollapsibleSection(toggleButton, contentElement) {
        if (!toggleButton || !contentElement) return;

        toggleButton.addEventListener('click', () => {
            const isExpanded = toggleButton.classList.toggle('expanded');
            contentElement.classList.toggle('expanded');
            const toggleIcon = toggleButton.querySelector('.toggle-icon');
            if (toggleIcon) {
                toggleIcon.textContent = isExpanded ? '-' : '+'; // Change icon to -/+
            }

            // If expanding, set max-height to scrollHeight for smooth transition
            if (isExpanded) {
                contentElement.style.maxHeight = contentElement.scrollHeight + "px";
            } else {
                contentElement.style.maxHeight = "0";
            }
        });

    }


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

            await new Promise(resolve => setTimeout(resolve, 300));

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

const clickableDiv = document.getElementById('about-container');
        const myIframe = document.getElementById('content-frame');

        clickableDiv.addEventListener('click', function() {
            // Change the src of the iframe to a new URL
            myIframe.src = 'about.html'; // Replace with your desired URL
        });
    function updateLoadMoreButton() {
        if (loadMoreBtn) {
            loadMoreBtn.style.display = allPostsLoaded ? 'none' : 'block';
        }
    }

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
                (post.tag && post.tag.toLowerCase().includes(searchLower))
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

    async function populateTagFilter() {
        await ensureAllPostsLoaded();
        const uniqueTags = [...new Set(allAvailablePosts.map(p => p.tag).filter(Boolean))].sort();
        tagFilterSelect.innerHTML = '<option value="all">All Tags</option>';
        uniqueTags.forEach(tag => {
            tagFilterSelect.innerHTML += `<option value="${tag}">${tag}</option>`;
        });
    }

    tagFilterSelect.addEventListener('change', () => {
        searchInput.value = '';
        currentSearchQuery = '';
        loadPosts(true);
    });

    if (loadMoreBtn) {
        loadMoreBtn.addEventListener('click', () => {
            loadPosts();
        });
    }

    searchButton.addEventListener('click', () => {
        loadPosts(true);
    });

    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            loadPosts(true);
        }
    });

    const urlParams = new URLSearchParams(window.location.search);
    const postIdFromUrl = urlParams.get('post');
    if (postIdFromUrl) {
        sharedPostRowIndex = parseInt(postIdFromUrl, 10);
    }

    setupPostInteractions();
    setupCommentUI();

    const searchContainer = document.querySelector('.search-container');

    searchButton.addEventListener('click', function() {
        // Toggle the 'expanded' class on the container
        searchContainer.classList.toggle('expanded');

        // Optional: If you want the input to focus after expanding
        if (searchContainer.classList.contains('expanded')) {
            searchInput.focus();
        } else {
            // Optional: Clear input when collapsing
            searchInput.value = '';
        }
    });


    populateTagFilter();
    loadPosts(true);

    // NEW: Handle window resize for collapsible sections to recalculate max-height
    window.addEventListener('resize', () => {
        // Debounce resize to prevent performance issues
        clearTimeout(window.collapsibleResizeTimeout);
        window.collapsibleResizeTimeout = setTimeout(() => {
            // aboutToggleBtn, filterSearchToggleBtn 등이 null이 아닐 경우에만 실행
            // if (aboutToggleBtn && aboutToggleBtn.classList.contains('expanded')) {
            //     aboutContent.style.maxHeight = aboutContent.scrollHeight + "px";
            // }
            // if (filterSearchToggleBtn && filterSearchToggleBtn.classList.contains('expanded')) {
            //     filterSearchContent.style.maxHeight = filterSearchContent.scrollHeight + "px";
            // }
            // Re-run initial setup for mobile/desktop state
            // setupCollapsibleSection(aboutToggleBtn, aboutContent);
            // setupCollapsibleSection(filterSearchToggleBtn, filterSearchContent);
        }, 250);
    });
});