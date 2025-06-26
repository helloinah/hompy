// script.js

import { renderPosts } from './postInteractions.js';
import { setupCommentUI } from './commentManager.js';

document.addEventListener('DOMContentLoaded', () => {
    const appsScriptURL = 'https://script.google.com/macros/s/AKfycbzcu3cF0jROowKPw1L__rnS-uBTa0MI_Ncwy4S9R4KHpWvDmpZtWZ4wbEe0mpVaP5zh/exec';
    const tagFilterSelect = document.getElementById('tag-filter');
    const postList = document.getElementById('post-list'); 

    // MOVE THESE DECLARATIONS INSIDE DOMContentLoaded
    const loadingSpinner = document.getElementById('loading-spinner'); // Corrected line
    const loadingOverlay = document.getElementById('loading-overlay'); // Corrected line

    let allPostsData = [];
    let sharedPostRowIndex = null;
    
    // --- Data Fetching ---
    async function getSheetData() {
        // Add a check here as well, although moving the declarations should fix it
        if (!loadingSpinner || !loadingOverlay) {
            console.error("Loading spinner/overlay elements not found. Cannot display loading animation.");
            // Proceed without loading animation if elements are missing
        } else {
            // Show loading animation before fetch
            loadingSpinner.style.display = 'block';
            loadingOverlay.style.display = 'block';
        }

        try {
            const response = await fetch(appsScriptURL + '?action=getPosts');
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
            // Hide loading animation after fetch completes (success or failure)
            if (loadingSpinner && loadingOverlay) { // Check before hiding as well
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
        sharedPostRowIndex = null; // Tag filter clears shared post highlight
        const postsToShow = selectedTag === 'all' ? allPostsData : allPostsData.filter(post => post.tag === selectedTag);
        renderPosts(postsToShow, selectedTag, sharedPostRowIndex);
    });

    // --- Initial Load ---
    const urlParams = new URLSearchParams(window.location.search);
    const postIdFromUrl = urlParams.get('post');
    if (postIdFromUrl) {
        sharedPostRowIndex = parseInt(postIdFromUrl, 10);
    }
    loadPosts(); // Load posts and render them

    // Setup comment UI and related functionalities
    setupCommentUI(); 
});