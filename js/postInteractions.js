// hompy/js/postInteractions.js

import { APPS_SCRIPT_URL, getEmbedURL, getLikedPostsFromStorage, saveLikedPostsToStorage, copyToClipboard } from './utils.js';

let contentFrame = null;
let postList = null;
let currentActivePostElement = null;

// NEW: Define the default iframe content URL
const DEFAULT_IFRAME_URL = 'blank.html'; // Assuming blank.html is in the same directory as index.html

// Function to highlight the active post (no changes)
export function highlightActivePost(postElement) {
    if (currentActivePostElement) {
        currentActivePostElement.classList.remove('active-post');
    }
    postElement.classList.add('active-post');
    currentActivePostElement = postElement;
    postElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// ... (sendLikeUpdate and sendShareUpdate functions - no changes) ...

// createPostElement function (no changes)
export function createPostElement(postData) {
    const li = document.createElement('li');
    li.dataset.rowIndex = postData.rowIndex;
    li.classList.add('post-list-item');

    if (postData.pin) li.classList.add('pinned');

    li.innerHTML = `
        <div class="post-title">${postData.title || 'Untitled Post'}</div>
        <div class="post-date">${postData.date ? postData.date : ''}</div>
        <div class="post-note">${postData.note || ''}</div>
        ${postData.tag ? `<span class="post-tag">${postData.tag}</span>` : ''}
        <div class="action-row">
            ${postData.link ? `<a href="${postData.link}" target="_blank" class="post-external-link-btn">View More</a>` : ''}
            <div class="post-like-container">
                <button class="like-button">&#x2764;</button>
                <span class="like-count">${postData.like}</span>
            </div>
            <div class="share-container">
                 <button class="share-button">&#x1F517;</button>
                 <span class="share-count">${postData.share}</span>
            </div>
        </div>
    `;

    const likeButton = li.querySelector('.like-button');
    const likeCountSpan = li.querySelector('.like-count');
    const shareButton = li.querySelector('.share-button');
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

// MODIFIED: renderPosts now solely appends elements to the post list.
// It no longer handles initial iframe content or highlighting.
export function renderPosts(postsToRender, currentFilterTag = 'all') {
    if (!postList) {
        console.error("postList not initialized in renderPosts.");
        return;
    }
    // postList.innerHTML = ''; // This line should be managed by script.js (e.g., on reset=true)
    // currentActivePostElement = null; // Highlighting reset is managed by setInitialContentAndHighlight

    postsToRender.forEach(postData => {
        const postElement = createPostElement(postData);
        if (currentFilterTag !== 'all' && postData.tag === currentFilterTag) {
            postElement.classList.add('filtered-match');
        }
        postList.appendChild(postElement);
    });
    // The final if/else block that set contentFrame.src and highlightActivePost has been moved.
}

// NEW: Function to set initial iframe content and highlight a post.
// This function should be called once after posts are loaded initially or upon filter change.
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
    if (!postToLoad && postsData.length > 0) {
        postToLoad = postsData[0];
    }

    if (postToLoad) {
        contentFrame.src = getEmbedURL(postToLoad.type, postToLoad.id);
        const initialActiveElement = postList.querySelector(`[data-row-index="${postToLoad.rowIndex}"]`);
        if (initialActiveElement) {
            highlightActivePost(initialActiveElement);
            initialActiveElement.scrollIntoView({ behavior: 'smooth', block: 'center' }); // Ensure visibility
        }
    } else {
        // If no posts to load (e.g., empty list or filter), load default blank.html
        contentFrame.src = DEFAULT_IFRAME_URL;
    }
}


// setupPostInteractions function (no changes)
export function setupPostInteractions() {
    contentFrame = document.getElementById('content-frame');
    postList = document.getElementById('post-list');
}