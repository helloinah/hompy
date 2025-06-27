// js/commentManager.js

import { APPS_SCRIPT_URL } from './utils.js';

let commentsDisplay = null;
let usernameInput = null;
let commentMessageInput = null;
let sendCommentBtn = null;
let honeypotField = null;
// let toggleCommentsBtn = null; // Removed - no longer needed
let container = null;
let commentInputForm = null;

// NEW: Icons for toggle button
// let togglePlusIcon = null; // Removed - no longer needed
// let toggleCloseIcon = null; // Removed - no longer needed

let COMMENT_FORM_INITIAL_HEIGHT = 70; // This variable might become redundant with always-expanded input
let COMMENTS_DISPLAY_MAX_VH = 30; // This variable might become redundant
let COMMENT_INPUT_FORM_EXPANDED_HEIGHT = 150;

export async function fetchComments() {
    if (!commentsDisplay) {
        console.error("Comments display not initialized. Cannot fetch comments.");
        return;
    }
    try {
        const response = await fetch(APPS_SCRIPT_URL + '?action=getComments');
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const comments = await response.json();
        if (comments.success === false) {
            console.error("Error from Apps Script (fetchComments):", comments.error);
            commentsDisplay.innerHTML = '<div class="comment-item">방명록을 읽어올 수 없습니다.</div>';
            return;
        }
        commentsDisplay.innerHTML = '';
        if (!Array.isArray(comments) || comments.length === 0) {
            commentsDisplay.innerHTML = '<div class="comment-item">그 누구도 글을 남겨주징 않았네...</div>';
        } else {
            comments.forEach(comment => {
                const isUserComment = localStorage.getItem('myWebsiteUsername') === comment.username;
                const commentClass = isUserComment ? 'comment-item user-comment' : 'comment-item';
                const row1Class = isUserComment ? 'comment-row1 user-row1' : 'comment-row1';
                const row2Class = isUserComment ? 'comment-row2 user-row2' : 'comment-row2';

                commentsDisplay.innerHTML += `
                    <div class="comment-container">
                        <div class="${row1Class}"><span class="comment-timestamp">${comment.timestamp || ''}</span></div>
                        <div class="${row2Class} ${commentClass}">
                            
<span class="comment-username">${comment.username || ''}</span>
                                <p class="comment-message"> ${comment.message || ''}</p>
                            </div>
                        </div>
                    </div>
                    `;
            });
            // IMPROVEMENT: Only scroll to bottom if comments were already visible or just loaded for the first time
            if (commentsDisplay.scrollHeight > commentsDisplay.clientHeight) {
                commentsDisplay.scrollTop = commentsDisplay.scrollHeight;
            }
        }
    } catch (error) {
        console.error('Error fetching comments:', error);
        commentsDisplay.innerHTML = '<div class="comment-item">Failed to load comments.</div>';
    }
}

export async function sendComment() {
    // Removed toggleCommentsBtn from check as it no longer exists
    if (!usernameInput || !commentMessageInput || !sendCommentBtn || !honeypotField || !commentInputForm) {
        console.error("Comment input elements not initialized. Cannot send comment.");
        return;
    }
    const username = usernameInput.value.trim();
    const message = commentMessageInput.value.trim();
    const hpEmail = honeypotField.value.trim();

    if (hpEmail !== '') {
        console.warn("Honeypot triggered, likely spam attempt.");
        return;
    }

    if (!username) {
        alert("Please enter your name."); // Using alert for simplicity, consider a custom modal/toast
        return;
    }
    if (!message) {
        alert("Please enter a message."); // Using alert for simplicity, consider a custom modal/toast
        return;
    }

    sendCommentBtn.disabled = true;
    sendCommentBtn.style.opacity = '0.5';

    localStorage.setItem('myWebsiteUsername', username);

    try {
        const formData = new FormData();
        formData.append('action', 'addComment');
        formData.append('username', username);
        formData.append('message', message);
        const response = await fetch(APPS_SCRIPT_URL, { method: 'POST', body: formData });
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const result = await response.json();
        if (result.success) {
            commentMessageInput.value = '';
            fetchComments();

            // Removed UI reversion to collapsed state as input is always expanded
            // commentInputForm.classList.remove('expanded');
            // togglePlusIcon.classList.remove('hidden');
            // toggleCloseIcon.classList.add('hidden');
            // updateContainerPadding(); // Removed

            commentsDisplay.scrollTop = commentsDisplay.scrollHeight; // Scroll to bottom to show new comment
        } else {
            console.error(`Error: ${result.error || 'Failed to add comment.'}`);
            alert(`Error: ${result.error || 'Failed to add comment.'}`); // Using alert
        }
    } catch (error) {
        console.error('Error sending comment:', error);
        alert('Error sending comment. Please try again.'); // Using alert
    } finally {
        sendCommentBtn.disabled = false;
        sendCommentBtn.style.opacity = '1';
    }
}

export function setupCommentUI() {
    commentsDisplay = document.getElementById('comments-display');
    usernameInput = document.getElementById('username-input');
    commentMessageInput = document.getElementById('comment-message-input');
    sendCommentBtn = document.getElementById('send-comment-btn');
    honeypotField = document.getElementById('hp_email');
    container = document.querySelector('.container'); // This might be used for overall layout adjustments, though padding will be removed
    commentInputForm = document.getElementById('comment-input-form');

    const storedUsername = localStorage.getItem('myWebsiteUsername');
    if (usernameInput && storedUsername) {
        usernameInput.value = storedUsername;
    }

    // Adjusted initialization check
    if (!commentsDisplay || !usernameInput || !commentMessageInput || !sendCommentBtn || !honeypotField || !container || !commentInputForm) {
        console.error("One or more comment UI elements not found. Comment functionality may be limited.");
        return;
    }

    sendCommentBtn.addEventListener('click', sendComment);
    commentMessageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !sendCommentBtn.disabled) {
            sendComment();
        }
    });

    fetchComments();
    setInterval(fetchComments, 30000);
}
