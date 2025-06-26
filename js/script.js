// js/script.js

import { renderPosts, setupPostInteractions } from './postInteractions.js'; // IMPROVEMENT: Import setupPostInteractions
import { setupCommentUI } from './commentManager.js';
import { APPS_SCRIPT_URL } from './utils.js'; // IMPROVEMENT: Import APPS_SCRIPT_URL

document.addEventListener('DOMContentLoaded', () => {
    // const appsScriptURL = '...'; // REMOVED: Now imported from utils.js
    const tagFilterSelect = document.getElementById('tag-filter');
    const postList = document.getElementById('post-list'); 

    const loadingSpinner = document.getElementById('loading-spinner');
    const loadingOverlay = document.getElementById('loading-overlay');

    let allPostsData = [];
    let sharedPostRowIndex = null;
    
    // --- Data Fetching ---
    async function getSheetData() {
        if (!loadingSpinner || !loadingOverlay) {
            console.error("Loading spinner/overlay elements not found. Cannot display loading animation.");
        } else {
            loadingSpinner.style.display = 'block';
            loadingOverlay.style.display = 'block';
        }

        try {
            const response = await fetch(APPS_SCRIPT_URL + '?action=getPosts'); // Use imported URL
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const posts = await response.json();
            if (posts.success === false) {
                console.error("Error from Apps Script (getPosts):", posts.error);
                postList.innerHTML = '<li>Error loading posts. Please try again later.</li>';
                return [];
            }
            return posts;
        } catch (error) {
            console.error('Error fetching post data:', error);
            postList.innerHTML = '<li>Error loading posts. Please try again later.</li>';
            return [];
        } finally {
            if (loadingSpinner && loadingOverlay) {
                loadingSpinner.style.display = 'none';
                loadingOverlay.style.display = 'none';
            }
        }
    }

    function populateTagFilter(posts) {
        const uniqueTags = [...new Set(posts.map(p => p.tag).filter(Boolean))].sort();
        tagFilterSelect.innerHTML = '<option value="all">All Tags</option>';
        uniqueTags.forEach(tag => {
            tagFilterSelect.innerHTML += `<option value="${tag}">${tag}</option>`;
        });
    }

    async function loadPosts() {
        allPostsData = await getSheetData();
        populateTagFilter(allPostsData);
        renderPosts(allPostsData, tagFilterSelect.value, sharedPostRowIndex);
    }

    // --- Event Listeners ---
    tagFilterSelect.addEventListener('change', () => {
        const selectedTag = tagFilterSelect.value;
        sharedPostRowIndex = null;
        const postsToShow = selectedTag === 'all' ? allPostsData : allPostsData.filter(post => post.tag === selectedTag);
        renderPosts(postsToShow, selectedTag, sharedPostRowIndex);
    });

    // --- Initial Load ---
    const urlParams = new URLSearchParams(window.location.search);
    const postIdFromUrl = urlParams.get('post');
    if (postIdFromUrl) {
        sharedPostRowIndex = parseInt(postIdFromUrl, 10);
    }

    // IMPROVEMENT: Call setup functions for each module
    setupPostInteractions(); // Initialize DOM elements for post interactions
    setupCommentUI();       // Initialize DOM elements for comment UI

    loadPosts(); 
});