// hompy/js/postInteractions.js

import { APPS_SCRIPT_URL, getEmbedURL, getLikedPostsFromStorage, saveLikedPostsToStorage, copyToClipboard } from './utils.js';

/**
 * Helper function to format an ISO 8601 date string into YYYY-MM-DD format.
 * @param {string} isoString The ISO 8601 date string (e.g., "2025-06-27T05:23:37.000Z")
 * @returns {string} Formatted date string (e.g., "2025-06-27") or original string/empty if invalid.
 */
function formatPostDate(isoString) {
    if (!isoString) return '';
    try {
        const date = new Date(isoString);
        // Check for invalid date
        if (isNaN(date.getTime())) {
            console.warn('Invalid date string received:', isoString);
            return isoString; // Return original if invalid
        }
        
        // Example: YYYY-MM-DD format
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`; // Changed to YYYY-MM-DD format

    } catch (e) {
        console.error('Error formatting date:', e, 'for string:', isoString);
        return isoString; // Fallback to original string on error
    }
}

let contentFrame = null;
let postList = null;
let currentActivePostElement = null;

// Define the default iframe content URL
const DEFAULT_IFRAME_URL = 'main.html'; // Assuming blank.html is in the same directory as index.html

/**
 * Highlights the currently active post in the list.
 * @param {HTMLElement} postElement The HTML element of the post to highlight.
 */
export function highlightActivePost(postElement) {
    if (currentActivePostElement) {
        currentActivePostElement.classList.remove('active-post');
    }
    postElement.classList.add('active-post');
    currentActivePostElement = postElement;
    postElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

/**
 * Sends a request to the Apps Script to update a post's like count.
 * @param {number} rowIndex The 1-based row index of the post in the Google Sheet.
 * @param {'increment'|'decrement'} action The action to perform ('increment' or 'decrement').
 * @returns {Promise<number|null>} The new like count on success, or null on failure.
 */
async function sendLikeUpdate(rowIndex, action) {
    try {
        const response = await fetch(APPS_SCRIPT_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                action: 'updateLike',
                rowIndex: rowIndex,
                likeAction: action
            })
        });
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const result = await response.json();
        if (result.success) {
            return result.newLikes;
        } else {
            console.error("Error from Apps Script (updateLike):", result.error);
            return null;
        }
    } catch (error) {
        console.error('Error sending like update:', error);
        return null;
    }
}

/**
 * Sends a request to the Apps Script to increment a post's share count.
 * @param {number} rowIndex The 1-based row index of the post in the Google Sheet.
 * @returns {Promise<number|null>} The new share count on success, or null on failure.
 */
async function sendShareUpdate(rowIndex) {
    try {
        const response = await fetch(APPS_SCRIPT_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                action: 'updateShare',
                rowIndex: rowIndex
            })
        });
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const result = await response.json();
        if (result.success) {
            return result.newShares;
        } else {
            console.error("Error from Apps Script (updateShare):", result.error);
            return null;
        }
    } catch (error) {
        console.error('Error sending share update:', error);
        return null;
    }
}

/**
 * Creates an HTML list item element for a given post.
 * @param {object} postData The data object for the post.
 * @returns {HTMLElement} The created <li> element.
 */
export function createPostElement(postData) {
    const li = document.createElement('li');
    li.dataset.rowIndex = postData.rowIndex;
    li.classList.add('post-list-item');

    if (postData.pin) li.classList.add('pinned');

    li.innerHTML = `
        <div class="post-title-container">
        
        <span class="dot">⬤</span>
        <div class="post-title">${postData.title || 'Untitled Post'}</div><div class="post-date">${formatPostDate(postData.date)}</div> </div>
        
        <div class="post-note">${postData.note || ''}</div>
        
        
        <div class="action-row">
        ${postData.tag ? `<span class="post-tag">${postData.tag}</span>` : ''}
            <div class="post-like-container">
                <button class="like-button">좋아요</button>
                <span class="like-count">${postData.like}</span>
            </div>
            <div class="share-container">
                 <button class="share-button">퍼가요</button>
                 <span class="share-count">${postData.share}</span>
            </div>
            <div class="external-btn-container">${postData.link ? `<a href="${postData.link}" target="_blank" class="post-external-link-btn">새창에서 보기</a>` : ''}
</div>
        </div>
        
    `;

    const likeButton = li.querySelector('.post-like-container');
    const likeCountSpan = li.querySelector('.like-count');
    const shareButton = li.querySelector('.share-container');
    const shareCountSpan = li.querySelector('.share-count');

    if (getLikedPostsFromStorage().includes(postData.rowIndex)) {
        likeButton.classList.add('liked');
    }

    likeButton.addEventListener('click', async (event) => {
        event.stopPropagation();
        const isLiked = likeButton.classList.toggle('liked');
        let currentLikedPosts = getLikedPostsFromStorage();
        if (isLiked) {
            currentLikedPosts.push(postData.rowIndex);
        } else {
            currentLikedPosts = currentLikedPosts.filter(id => id !== postData.rowIndex);
        }
        saveLikedPostsToStorage(currentLikedPosts);
        const updatedCount = await sendLikeUpdate(postData.rowIndex, isLiked ? 'increment' : 'decrement');
        if (updatedCount !== null) {
            likeCountSpan.textContent = updatedCount;
        } else { // Revert UI on failure
            likeButton.classList.toggle('liked');
            saveLikedPostsToStorage(getLikedPostsFromStorage().filter(id => id !== postData.rowIndex));
        }
    });

    shareButton.addEventListener('click', async (event) => {
        event.stopPropagation();
        const shareLink = `${window.location.origin}${window.location.pathname}?post=${postData.rowIndex}`;
        await copyToClipboard(shareLink);
        const updatedShareCount = await sendShareUpdate(postData.rowIndex);
        if (updatedShareCount !== null) shareCountSpan.textContent = updatedShareCount;
    });

    li.addEventListener('click', (event) => {
        if (event.target.closest('.post-external-link-btn, .like-button, .share-button')) return;
        const embedURL = getEmbedURL(postData.type, postData.id);
        contentFrame.src = embedURL || 'about:blank';
        
        highlightActivePost(li);
    });

    return li;
}

/**
 * Renders an array of post data by appending them to the post list.
 * @param {Array<object>} postsToRender An array of post data objects.
 * @param {string} currentFilterTag The currently active tag filter.
 */
export function renderPosts(postsToRender, currentFilterTag = 'all') {
    if (!postList) {
        console.error("postList not initialized in renderPosts.");
        return;
    }
    // postList.innerHTML = ''; // This line should be managed by script.js (e.g., on reset=true)
    // currentActivePostElement = null; // Highlighting reset is managed by setInitialContentAndHighlight

    postsToRender.forEach(postData => {
        const postElement = createPostElement(postData); // createPostElement handles its own click listener for iframe update
        if (currentFilterTag !== 'all' && postData.tag === currentFilterTag) {
            postElement.classList.add('filtered-match');
        }
        postList.appendChild(postElement);
    });
    // The final if/else block that set contentFrame.src and highlightActivePost has been moved.
}

/**
 * Sets the initial iframe content and highlights a post, prioritizing a shared post via URL.
 * @param {Array<object>} postsData An array of all available post data.
 * @param {number|null} sharedPostRowIndex The row index of a post to highlight from a shared URL.
 */
export function setInitialContentAndHighlight(postsData, sharedPostRowIndex = null) {
    if (!contentFrame || !postList) {
        console.error("Content frame or post list not initialized for initial content setup.");
        return;
    }

    // Ensure any previously active post is unhighlighted
    if (currentActivePostElement) {
        currentActivePostElement.classList.remove('active-post');
        currentActivePostElement = null;
    }

    let postToLoad = null;

    // Prioritize shared post
    if (sharedPostRowIndex !== null) {
        postToLoad = postsData.find(post => post.rowIndex === sharedPostRowIndex);
    } 
    
    // If no shared post, load the first available post
     // if (!postToLoad && postsData.length > 0) {
     //     postToLoad = postsData[0];
     // }

    if (postToLoad) {
        contentFrame.src = getEmbedURL(postToLoad.type, postToLoad.id);
        const initialActiveElement = postList.querySelector(`[data-row-index="${postToLoad.rowIndex}"]`);
        if (initialActiveElement) {
            highlightActivePost(initialActiveElement);
            initialActiveElement.scrollIntoView({ behavior: 'smooth', block: 'center' }); // Ensure visibility
        }
    } else {
        //contentFrame.src = DEFAULT_IFRAME_URL;
    }
}

/**
 * Initializes DOM elements related to post interactions.
 */
export function setupPostInteractions() {
    contentFrame = document.getElementById('content-frame');
    postList = document.getElementById('post-list');
}