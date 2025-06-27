// js/commentManager.js

import { APPS_SCRIPT_URL } from './utils.js';

// All these will be initialized inside setupCommentUI
let commentsDisplay = null;
let usernameInput = null;
let commentMessageInput = null;
let sendCommentBtn = null; // This will now be the integrated icon button
let honeypotField = null;
let toggleCommentsBtn = null;
let container = null; // Main content container for padding adjustment
let commentInputForm = null; // The form container that expands/collapses

let COMMENT_FORM_INITIAL_HEIGHT = 70; // Height of the toggle button/collapsed input area
let COMMENTS_DISPLAY_MAX_VH = 30; // Max height for comments display relative to viewport
let COMMENT_INPUT_FORM_EXPANDED_HEIGHT = 150; // Max height for the expanded input form

export async function fetchComments() {
    if (!commentsDisplay) { // Check if elements are initialized
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
                // Determine if it's a user's own comment (basic example: based on saved username)
                // In a real app, you'd use a unique user ID
                const isUserComment = localStorage.getItem('myWebsiteUsername') === comment.username;
                const commentClass = isUserComment ? 'comment-item user-comment' : 'comment-item';

                commentsDisplay.innerHTML += `
                    <div class="${commentClass}">
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
    if (!usernameInput || !commentMessageInput || !sendCommentBtn || !honeypotField || !commentInputForm || !toggleCommentsBtn) {
        console.error("Comment input elements not initialized. Cannot send comment.");
        return;
    }
    const username = usernameInput.value.trim();
    const message = commentMessageInput.value.trim();
    const hpEmail = honeypotField.value.trim();

    if (hpEmail !== '') { // Honeypot check
        console.warn("Honeypot triggered, likely spam attempt.");
        // Optionally provide user feedback without an alert
        return; 
    }

    if (!username) {
        console.warn("Please enter your name.");
        // IMPROVEMENT: Implement a custom modal/toast for user feedback
        return;
    }
    if (!message) {
        console.warn("Please enter a message.");
        // IMPROVEMENT: Implement a custom modal/toast for user feedback
        return;
    }

    sendCommentBtn.disabled = true;
    // sendCommentBtn.textContent = 'Sending...'; // No text on icon button
    sendCommentBtn.style.opacity = '0.5'; // Dim icon while sending

    // Store username locally so user's own comments can be styled
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
            commentMessageInput.value = ''; // Clear message input
            // Do NOT clear username input, keep it pre-filled for user convenience
            fetchComments(); // Refresh comments

            // Revert UI to initial collapsed state after sending
            commentInputForm.classList.remove('expanded');
            toggleCommentsBtn.querySelector('.icon-send').classList.add('hidden');
            toggleCommentsBtn.querySelector('.icon-plus').classList.remove('hidden');
            updateContainerPadding(); // Adjust padding back
            commentsDisplay.scrollTop = commentsDisplay.scrollHeight; // Scroll to bottom to show new comment
        } else {
            console.error(`Error: ${result.error || 'Failed to add comment.'}`);
            // IMPROVEMENT: Custom modal for error message
        }
    } catch (error) {
        console.error('Error sending comment:', error);
        // IMPROVEMENT: Custom modal for network error message
    } finally {
        sendCommentBtn.disabled = false;
        // sendCommentBtn.textContent = 'Send'; // No text on icon button
        sendCommentBtn.style.opacity = '1'; // Restore opacity
    }
}

export function setupCommentUI() {
    commentsDisplay = document.getElementById('comments-display');
    usernameInput = document.getElementById('username-input');
    commentMessageInput = document.getElementById('comment-message-input');
    sendCommentBtn = document.getElementById('send-comment-btn'); // Now the send icon button
    honeypotField = document.getElementById('hp_email');
    toggleCommentsBtn = document.getElementById('toggle-comments-btn');
    container = document.querySelector('.container'); // Main content container
    commentInputForm = document.getElementById('comment-input-form'); // The new input form container

    // Retrieve the initial username if stored
    const storedUsername = localStorage.getItem('myWebsiteUsername');
    if (usernameInput && storedUsername) {
        usernameInput.value = storedUsername;
    }

    if (!commentsDisplay || !usernameInput || !commentMessageInput || !sendCommentBtn || !honeypotField || !toggleCommentsBtn || !container || !commentInputForm) {
        console.error("One or more comment UI elements not found. Comment functionality may be limited.");
        return;
    }

    // Set initial heights for dynamic padding calculation (can be derived from CSS or fixed)
    // These values should match your CSS.
    // Ensure this calculation is robust; toggleCommentsBtn.offsetHeight should give you the height of the button itself.
    COMMENT_FORM_INITIAL_HEIGHT = toggleCommentsBtn.offsetHeight + 20; // Toggle button height + action-area padding
    COMMENT_INPUT_FORM_EXPANDED_HEIGHT = 150; // Matches max-height for .comment-input-form.expanded in CSS
    
    // Add event listeners
    sendCommentBtn.addEventListener('click', sendComment); // Now this button is inside the message input wrapper
    commentMessageInput.addEventListener('keypress', (e) => { 
        if (e.key === 'Enter' && !sendCommentBtn.disabled) { // Prevent sending if already sending
            sendComment(); 
        }
    });
    
    toggleCommentsBtn.addEventListener('click', () => {
        const isExpanded = commentInputForm.classList.toggle('expanded');
        
        // Toggle icons for the main toggle button (plus/send)
        // The send button INSIDE the input is always a send icon.
        if (isExpanded) {
            toggleCommentsBtn.querySelector('.icon-plus').classList.add('hidden');
            toggleCommentsBtn.querySelector('.icon-send').classList.remove('hidden');
            commentMessageInput.focus(); // Focus on message input when expanded
        } else {
            toggleCommentsBtn.querySelector('.icon-send').classList.add('hidden');
            toggleCommentsBtn.querySelector('.icon-plus').classList.remove('hidden');
        }

        updateContainerPadding(); // Adjust padding
    });

    window.addEventListener('resize', updateContainerPadding);
    updateContainerPadding(); // Initial padding adjustment

    fetchComments();
    setInterval(fetchComments, 30000); // Fetch new comments every 30 seconds
}

function updateContainerPadding() {
    if (!container || !commentInputForm) {
        return;
    }

    const isInputFormExpanded = commentInputForm.classList.contains('expanded');
    let commentSectionTotalHeight = COMMENT_FORM_INITIAL_HEIGHT; 

    if (isInputFormExpanded) {
        commentSectionTotalHeight = COMMENT_INPUT_FORM_EXPANDED_HEIGHT + 20; // Expanded input form height + action-area padding
    }
    
    const viewportHeight = window.innerHeight;
    const commentsDisplayMaxHeightPx = (COMMENTS_DISPLAY_MAX_VH / 100) * viewportHeight;

    const actualCommentsSectionFixedHeight = commentsDisplayMaxHeightPx + commentSectionTotalHeight;

    container.style.paddingBottom = `${actualCommentsSectionFixedHeight + 20}px`; 
}
