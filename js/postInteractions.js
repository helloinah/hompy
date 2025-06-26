// postInteractions.js

import { getEmbedURL, getLikedPostsFromStorage, saveLikedPostsToStorage, copyToClipboard } from './utils.js';

const appsScriptURL = 'https://script.google.com/macros/s/AKfycbzcu3cF0jROowKPw1L__rnS-uBTa0MI_Ncwy4S9R4KHpWvDmpZtWZ4wbEe0mpVaP5zh/exec';
const contentFrame = document.getElementById('content-frame');
const postList = document.getElementById('post-list');

let currentActivePostElement = null; // 현재 활성화된 포스트 요소를 추적 (외부로 노출하여 script.js에서 접근)

// Function to highlight the active post
export function highlightActivePost(postElement) {
    if (currentActivePostElement) {
        currentActivePostElement.classList.remove('active-post');
    }
    postElement.classList.add('active-post');
    currentActivePostElement = postElement;
}

async function sendLikeUpdate(rowIndex, likeAction) {
    const formData = new FormData();
    formData.append('action', 'updateLike');
    formData.append('rowIndex', rowIndex);
    formData.append('likeAction', likeAction);
    try {
        const response = await fetch(appsScriptURL, { method: 'POST', body: formData });
        const result = await response.json();
        if (result.success) return result.newLikes;
        console.error('Like update failed:', result.error);
        return null;
    } catch (error) {
        console.error('Error sending like update:', error);
        return null;
    }
}

async function sendShareUpdate(rowIndex) {
    const formData = new FormData();
    formData.append('action', 'updateShare');
    formData.append('rowIndex', rowIndex);
    try {
        const response = await fetch(appsScriptURL, { method: 'POST', body: formData });
        const result = await response.json();
        if (result.success) return result.newShares;
        console.error('Share update failed:', result.error);
        return null;
    } catch (error) {
        console.error('Error sending share update:', error);
        return null;
    }
}

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

export function renderPosts(postsToRender, currentFilterTag = 'all', sharedPostRowIndex = null) {
    postList.innerHTML = '';
    currentActivePostElement = null; // Reset active post when re-rendering
    let postToLoad = null;

    postsToRender.forEach(postData => {
        const postElement = createPostElement(postData);
        if (currentFilterTag !== 'all' && postData.tag === currentFilterTag) {
            postElement.classList.add('filtered-match');
        }
        if (sharedPostRowIndex !== null && postData.rowIndex === sharedPostRowIndex) {
            postElement.classList.add('shared-highlight');
            postToLoad = postData; // Prioritize shared post
        }
        postList.appendChild(postElement);
    });
    
    // If no shared post, load the first post
    if (!postToLoad && postsToRender.length > 0) {
        postToLoad = postsToRender[0];
    }

    if (postToLoad) {
        contentFrame.src = getEmbedURL(postToLoad.type, postToLoad.id);
        // Highlight the initially loaded post
        const initialActiveElement = postList.querySelector(`[data-row-index="${postToLoad.rowIndex}"]`);
        if (initialActiveElement) {
            highlightActivePost(initialActiveElement);
        }
    } else {
        contentFrame.src = 'about:blank';
    }
}