// commentManager.js

const appsScriptURL = 'https://script.google.com/macros/s/AKfycbzcu3cF0jROowKPw1L__rnS-uBTa0MI_Ncwy4S9R4KHpWvDmpZtWZ4wbEe0mpVaP5zh/exec';
const commentsDisplay = document.getElementById('comments-display');
const usernameInput = document.getElementById('username-input');
const commentMessageInput = document.getElementById('comment-message-input');
const sendCommentBtn = document.getElementById('send-comment-btn');
const honeypotField = document.getElementById('hp_email');
const toggleCommentsBtn = document.getElementById('toggle-comments-btn');
const container = document.querySelector('.container'); // For padding update

const rootStyles = getComputedStyle(document.documentElement);
const COMMENT_INPUT_FORM_HEIGHT = parseInt(rootStyles.getPropertyValue('--comment-form-height'), 10) || 80;
const COMMENTS_DISPLAY_MAX_VH = parseInt(rootStyles.getPropertyValue('--comments-display-max-height'), 10) || 30;

export async function fetchComments() {
    try {
        const response = await fetch(appsScriptURL + '?action=getComments');
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
        const response = await fetch(appsScriptURL, { method: 'POST', body: formData });
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
    sendCommentBtn.addEventListener('click', sendComment);
    commentMessageInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') sendComment(); });
    
    toggleCommentsBtn.addEventListener('click', () => {
        commentsDisplay.classList.toggle('hidden');
        updateContainerPadding();
        toggleCommentsBtn.textContent = commentsDisplay.classList.contains('hidden') ? '댓글 보기' : '댓글 숨기기';
    });

    window.addEventListener('resize', updateContainerPadding); // Ensure padding updates on resize
    updateContainerPadding(); // Initial padding update

    // Mobile specific initializations for comments
    const isMobile = window.innerWidth <= 768; // Local isMobile for this function's initial logic
    if (isMobile) {
        if (!commentsDisplay.classList.contains('hidden')) {
            commentsDisplay.classList.add('hidden');
            toggleCommentsBtn.textContent = '댓글 보기';
        }
    } else {
        toggleCommentsBtn.textContent = commentsDisplay.classList.contains('hidden') ? '댓글 보기' : '댓글 숨기기';
    }

    fetchComments(); // Initial fetch
    setInterval(fetchComments, 30000); // Fetch periodically
}

function updateContainerPadding() {
    const inputFormTotalHeight = COMMENT_INPUT_FORM_HEIGHT + 10;
    let paddingForCommentsDisplayArea = 0;
    if (!commentsDisplay.classList.contains('hidden')) {
        const viewportHeight = window.innerHeight;
        paddingForCommentsDisplayArea = (COMMENTS_DISPLAY_MAX_VH / 100) * viewportHeight + 10; 
    }
    container.style.paddingBottom = `${paddingForCommentsDisplayArea + inputFormTotalHeight}px`;
}