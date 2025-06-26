// js/commentManager.js

import { APPS_SCRIPT_URL } from './utils.js'; // IMPROVEMENT: Import APPS_SCRIPT_URL

// All these will be initialized inside setupCommentUI
let commentsDisplay = null;
let usernameInput = null;
let commentMessageInput = null;
let sendCommentBtn = null;
let honeypotField = null;
let toggleCommentsBtn = null;
let container = null;

let COMMENT_INPUT_FORM_HEIGHT = 80; // Default
let COMMENTS_DISPLAY_MAX_VH = 30; // Default

export async function fetchComments() {
    if (!commentsDisplay) { // Check if elements are initialized
        console.error("Comments display not initialized. Cannot fetch comments.");
        return;
    }
    try {
        const response = await fetch(APPS_SCRIPT_URL + '?action=getComments'); // Use imported URL
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const comments = await response.json();
        if (comments.success === false) {
            console.error("Error from Apps Script (fetchComments):", comments.error);
            commentsDisplay.innerHTML = '<div class="comment-item">Error loading comments.</div>';
            return;
        }
        commentsDisplay.innerHTML = '';
        if (!Array.isArray(comments) || comments.length === 0) {
            commentsDisplay.innerHTML = '<div class="comment-item">No comments yet.</div>';
        } else {
            comments.forEach(comment => {
                commentsDisplay.innerHTML += `
                    <div class="comment-item">
                        <div class="comment-header">
                            <span class="comment-username">${comment.username || 'Anonymous'}</span>
                            <span class="comment-timestamp">${comment.timestamp || ''}</span>
                        </div>
                        <p class="comment-message">${comment.message || ''}</p>
                    </div>`;
            });
            commentsDisplay.scrollTop = commentsDisplay.scrollHeight;
        }
    } catch (error) {
        console.error('Error fetching comments:', error);
        commentsDisplay.innerHTML = '<div class="comment-item">Failed to load comments.</div>';
    }
}

export async function sendComment() {
    if (!usernameInput || !commentMessageInput || !sendCommentBtn || !honeypotField) {
        console.error("Comment input elements not initialized. Cannot send comment.");
        return;
    }
    const username = usernameInput.value.trim();
    const message = commentMessageInput.value.trim();
    if (honeypotField.value.trim() !== '' || !username || !message) {
         if (!username) alert("Please enter your name.");
         if (!message) alert("Please enter a message.");
        return;
    }
    sendCommentBtn.disabled = true;
    sendCommentBtn.textContent = 'Sending...';
    try {
        const formData = new FormData();
        formData.append('action', 'addComment');
        formData.append('username', username);
        formData.append('message', message);
        const response = await fetch(APPS_SCRIPT_URL, { method: 'POST', body: formData }); // Use imported URL
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const result = await response.json();
        if (result.success) {
            commentMessageInput.value = '';
            fetchComments();
            if (commentsDisplay.classList.contains('hidden')) {
                toggleCommentsBtn.click();
            }
        } else {
            alert(`Error: ${result.error || 'Failed to add comment.'}`);
        }
    } catch (error) {
        console.error('Error sending comment:', error);
        alert("Failed to send comment.");
    } finally {
        sendCommentBtn.disabled = false;
        sendCommentBtn.textContent = 'Send';
    }
}

export function setupCommentUI() {
    // IMPROVEMENT: Initialize DOM elements here
    commentsDisplay = document.getElementById('comments-display');
    usernameInput = document.getElementById('username-input');
    commentMessageInput = document.getElementById('comment-message-input');
    sendCommentBtn = document.getElementById('send-comment-btn');
    honeypotField = document.getElementById('hp_email');
    toggleCommentsBtn = document.getElementById('toggle-comments-btn');
    container = document.querySelector('.container');

    const rootStyles = getComputedStyle(document.documentElement);
    COMMENT_INPUT_FORM_HEIGHT = parseInt(rootStyles.getPropertyValue('--comment-form-height'), 10) || 80;
    COMMENTS_DISPLAY_MAX_VH = parseInt(rootStyles.getPropertyValue('--comments-display-max-height'), 10) || 30;


    if (!commentsDisplay || !usernameInput || !commentMessageInput || !sendCommentBtn || !honeypotField || !toggleCommentsBtn || !container) {
        console.error("One or more comment UI elements not found. Comment functionality may be limited.");
        return;
    }

    sendCommentBtn.addEventListener('click', sendComment);
    commentMessageInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') sendComment(); });
    
    toggleCommentsBtn.addEventListener('click', () => {
        commentsDisplay.classList.toggle('hidden');
        updateContainerPadding();
        toggleCommentsBtn.textContent = commentsDisplay.classList.contains('hidden') ? '댓글 보기' : '댓글 숨기기';
    });

    window.addEventListener('resize', updateContainerPadding);
    updateContainerPadding();

    const isMobile = window.innerWidth <= 768; // Local isMobile for this function's initial logic
    if (isMobile) {
        if (!commentsDisplay.classList.contains('hidden')) {
            commentsDisplay.classList.add('hidden');
            toggleCommentsBtn.textContent = '댓글 보기';
        }
    } else {
        toggleCommentsBtn.textContent = commentsDisplay.classList.contains('hidden') ? '댓글 보기' : '댓글 숨기기';
    }

    fetchComments();
    setInterval(fetchComments, 30000);
}

function updateContainerPadding() {
    if (!commentsDisplay || !container) { // Defensive check
        return;
    }
    const inputFormTotalHeight = COMMENT_INPUT_FORM_HEIGHT + 10;
    let paddingForCommentsDisplayArea = 0;
    if (!commentsDisplay.classList.contains('hidden')) {
        const viewportHeight = window.innerHeight;
        paddingForCommentsDisplayArea = (COMMENTS_DISPLAY_MAX_VH / 100) * viewportHeight + 10; 
    }
    container.style.paddingBottom = `${paddingForCommentsDisplayArea + inputFormTotalHeight}px`;
}