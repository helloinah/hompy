// js/commentManager.js

import { APPS_SCRIPT_URL } from './utils.js';

let commentsDisplay = null;
let usernameInput = null;
let commentMessageInput = null;
let sendCommentBtn = null;
let honeypotField = null;
let toggleCommentsBtn = null;
let container = null;
let commentInputForm = null;

// NEW: Icons for toggle button
let togglePlusIcon = null;
let toggleCloseIcon = null;

let COMMENT_FORM_INITIAL_HEIGHT = 70;
let COMMENTS_DISPLAY_MAX_VH = 30;
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
            commentsDisplay.innerHTML = '<div class="comment-item">Error loading comments.</div>';
            return;
        }
        commentsDisplay.innerHTML = '';
        if (!Array.isArray(comments) || comments.length === 0) {
            commentsDisplay.innerHTML = '<div class="comment-item">No comments yet.</div>';
        } else {
            comments.forEach(comment => {
                const isUserComment = localStorage.getItem('myWebsiteUsername') === comment.username;
                const commentClass = isUserComment ? 'comment-item user-comment' : 'comment-item';

                commentsDisplay.innerHTML += `
                    <div class="comment-container">
                    <div class="comment-row1"><span class="comment-username">${comment.username || ''}</span></div>
                    <div class="comment-row2">
                    <span class="comment-timestamp">${comment.timestamp || ''}</span>
                    <div class="${commentClass}">
                        <p class="comment-message">${comment.message || ''}</p>
                    </div></div></div>
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
    if (!usernameInput || !commentMessageInput || !sendCommentBtn || !honeypotField || !commentInputForm || !toggleCommentsBtn) {
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

            // Revert UI to initial collapsed state after sending (optional, depends on desired UX)
            // commentInputForm.classList.remove('expanded');
            // togglePlusIcon.classList.remove('hidden');
            // toggleCloseIcon.classList.add('hidden');
            // updateContainerPadding(); // Adjust padding back

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
    container = document.querySelector('.container');
    commentInputForm = document.getElementById('comment-input-form');

    // NEW: Get icon elements
    // togglePlusIcon = toggleCommentsBtn.querySelector('.icon-plus');
    // toggleCloseIcon = toggleCommentsBtn.querySelector('.icon-close');

    const storedUsername = localStorage.getItem('myWebsiteUsername');
    if (usernameInput && storedUsername) {
        usernameInput.value = storedUsername;
    }

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

    // toggleCommentsBtn.addEventListener('click', () => {
    //     const isExpanded = commentInputForm.classList.toggle('expanded');

        // Toggle icons
     //    if (isExpanded) {
    //         togglePlusIcon.classList.add('hidden');
    //         toggleCloseIcon.classList.remove('hidden');
    //         commentMessageInput.focus(); // Focus on message input when expanded
    //     } else {
    //         togglePlusIcon.classList.remove('hidden');
    //         toggleCloseIcon.classList.add('hidden');
    //     }

    //     updateContainerPadding();
    // });

    window.addEventListener('resize', updateContainerPadding);
    updateContainerPadding();

    fetchComments();
    setInterval(fetchComments, 30000);
}

function updateContainerPadding() {
    if (!container || !commentInputForm) {
        return;
    }

    const isInputFormExpanded = commentInputForm.classList.contains('expanded');
    let commentSectionTotalHeight = COMMENT_FORM_INITIAL_HEIGHT;

    // Determine the height of the comments display based on its content or max-height
    // On mobile, if the comments-display overflows its max-height, it will scroll
    // The actual space it occupies is its current clientHeight or its max-height, whichever is smaller.
    // For padding calculation, it's safer to consider the max height it *can* take.
    const commentsDisplayMaxHeightPx = (COMMENTS_DISPLAY_MAX_VH / 100) * window.innerHeight; // From responsive.css 250px
    const actualCommentsDisplayHeight = Math.min(commentsDisplay.scrollHeight, commentsDisplayMaxHeightPx);


    if (isInputFormExpanded) {
        // When expanded, the comments section occupies its display area + the expanded input form height
        commentSectionTotalHeight = actualCommentsDisplayHeight + COMMENT_INPUT_FORM_EXPANDED_HEIGHT + 20; // Expanded input form height + action-area padding
    } else {
        // When collapsed, only the fixed height of the comment-action-area (toggle button) + comments display area
        commentSectionTotalHeight = actualCommentsDisplayHeight + COMMENT_FORM_INITIAL_HEIGHT;
    }

    // Add a bit extra padding for visual separation
    container.style.paddingBottom = `${commentSectionTotalHeight + 20}px`;
}