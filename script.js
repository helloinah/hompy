document.addEventListener('DOMContentLoaded', () => {
    const postList = document.getElementById('post-list');
    const contentFrame = document.getElementById('content-frame');
    const commentsSection = document.getElementById('comments-section'); // The fixed wrapper (always visible)
    const toggleCommentsBtn = document.getElementById('toggle-comments-btn'); // The hide/show button
    const container = document.querySelector('.container'); // The main content container

    // === CONFIGURATION ===
    // IMPORTANT: REPLACE THIS WITH YOUR DEPLOYED GOOGLE APPS SCRIPT WEB APP URL
    // Keeping your provided URL from the chat:
    const appsScriptURL = 'https://script.google.com/macros/s/AKfycbxlSRmTTbvnKooAo_iF2qkpAJJXYp6v_4CCTIJ1cIBplm8q2SuuziT_gF18_YxH_gHb/exec'; 

    // === COMMENT SECTION ELEMENTS ===
    const commentsDisplay = document.getElementById('comments-display'); // The comments list itself (this will be hidden/shown)
    const usernameInput = document.getElementById('username-input');
    const commentMessageInput = document.getElementById('comment-message-input');
    const sendCommentBtn = document.getElementById('send-comment-btn');
    const honeypotField = document.getElementById('hp_email'); // Get honeypot field

    // === LIKE FEATURE - LOCAL STORAGE KEY ===
    const LIKED_POSTS_STORAGE_KEY = 'myWebsiteLikedPosts';
    
    // NEW: Define heights for accurate padding calculations
    // These values should match the heights defined in your `style.css` for .comment-input-form and .comments-display
    // Make sure .comment-input-form has a consistent height, e.g., using `height: 80px;` and `box-sizing: border-box;`
    // And .comments-display has `max-height: 30vh;`
    const COMMENT_INPUT_FORM_HEIGHT = 80; // This should be the fixed height of your .comment-input-form in pixels
    const COMMENTS_DISPLAY_MAX_VH = 30; // This should be the max-height value in vh for .comments-display

    // --- GENERAL POSTS LOGIC ---

    // Now fetches posts from Apps Script doGet(action='getPosts')
    async function getSheetData() {
        try {
            console.log('Attempting to fetch posts from Apps Script:', appsScriptURL + '?action=getPosts');
            const response = await fetch(appsScriptURL + '?action=getPosts');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
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
        }
    }

    function getEmbedURL(type, id) {
        let embedSrc = '';
        switch (type.toLowerCase()) {
            case 'docs':
                embedSrc = `https://docs.google.com/document/d/${id}/preview`;
                break;
            case 'slide':
                embedSrc = `https://docs.google.com/presentation/d/${id}/embed?start=false&loop=false&delayms=3000`;
                break;
            case 'img':
                embedSrc = `https://drive.google.com/file/d/${id}/preview`;
                break;
            case 'pdf':
                embedSrc = `https://drive.google.com/file/d/${id}/preview`;
                break;
            case 'spreadsheet':
                embedSrc = `https://docs.google.com/spreadsheets/d/${id}/pubhtml?widget=true&headers=false`;
                break;
            default:
                embedSrc = '';
        }
        return embedSrc;
    }

    // Function to get liked posts from localStorage
    function getLikedPostsFromStorage() {
        try {
            const likedPosts = JSON.parse(localStorage.getItem(LIKED_POSTS_STORAGE_KEY) || '[]');
            return Array.isArray(likedPosts) ? likedPosts : [];
        } catch (e) {
            console.error("Error parsing liked posts from localStorage:", e);
            return [];
        }
    }

    // Function to save liked posts to localStorage
    function saveLikedPostsToStorage(likedPosts) {
        localStorage.setItem(LIKED_POSTS_STORAGE_KEY, JSON.stringify(likedPosts));
    }

    // Function to send like update to Apps Script
    async function sendLikeUpdate(rowIndex, likeAction) {
        const formData = new FormData();
        formData.append('action', 'updateLike'); // Specify action for Apps Script
        formData.append('rowIndex', rowIndex);
        formData.append('likeAction', likeAction);

        try {
            const response = await fetch(appsScriptURL, {
                method: 'POST',
                body: formData
            });
            const result = await response.json();
            if (result.success) {
                console.log(`Like update successful for row ${rowIndex}: new count ${result.newLikes}`);
                return result.newLikes; // Return the new count from Apps Script
            } else {
                console.error('Like update failed:', result.error);
                return null;
            }
        } catch (error) {
            console.error('Error sending like update:', error);
            return null;
        }
    }

    function createPostElement(postData) {
        const li = document.createElement('li');
        li.dataset.rowIndex = postData.rowIndex; // Store row index for like button

        if (postData.pin) { // postData.pin is already boolean from Apps Script
            li.classList.add('pinned');
        }

        const title = document.createElement('div');
        title.classList.add('post-title');
        title.textContent = postData.title || 'Untitled Post';
        li.appendChild(title);

        const date = document.createElement('div');
        date.classList.add('post-date');
        // postData.date is a string from toLocaleString() in Apps Script
        date.textContent = postData.date ? postData.date : '';
        li.appendChild(date);

        const note = document.createElement('div');
        note.classList.add('post-note');
        note.textContent = postData.note || '';
        li.appendChild(note);

        if (postData.tag) {
            const tag = document.createElement('span');
            tag.classList.add('post-tag');
            tag.textContent = postData.tag;
            li.appendChild(tag);
        }

        const actionRow = document.createElement('div');
        actionRow.style.display = 'flex';
        actionRow.style.alignItems = 'center';
        actionRow.style.justifyContent = 'flex-end'; // Align buttons to the right
        actionRow.style.gap = '10px'; // Space between buttons
        li.appendChild(actionRow);

        // External Link Button (moved to actionRow)
        if (postData.link) {
            const externalLinkBtn = document.createElement('a');
            externalLinkBtn.classList.add('post-external-link-btn');
            externalLinkBtn.href = postData.link;
            externalLinkBtn.target = '_blank';
            externalLinkBtn.textContent = 'View More';
            actionRow.appendChild(externalLinkBtn); // Append to actionRow
        }

        // Like button container (moved to actionRow)
        const likeContainer = document.createElement('div');
        likeContainer.classList.add('post-like-container');
        actionRow.appendChild(likeContainer); // Append to actionRow

        const likeButton = document.createElement('button');
        likeButton.classList.add('like-button');
        likeButton.innerHTML = '&#x2764;'; // Heart icon

        const likeCountSpan = document.createElement('span');
        likeCountSpan.classList.add('like-count');
        likeCountSpan.textContent = postData.like; // Display initial like count from postData

        likeContainer.appendChild(likeButton);
        likeContainer.appendChild(likeCountSpan);

        // Check initial liked state from localStorage
        const likedPosts = getLikedPostsFromStorage();
        const isLiked = likedPosts.includes(postData.rowIndex);
        if (isLiked) {
            likeButton.classList.add('liked');
        }

        // Like button click handler
        likeButton.addEventListener('click', async (event) => {
            event.stopPropagation(); // Prevent this click from triggering the post selection

            let currentLikedPosts = getLikedPostsFromStorage();
            let actionToSend;

            if (likeButton.classList.contains('liked')) {
                // User is unliking
                likeButton.classList.remove('liked');
                currentLikedPosts = currentLikedPosts.filter(id => id !== postData.rowIndex);
                actionToSend = 'decrement';
            } else {
                // User is liking
                likeButton.classList.add('liked');
                currentLikedPosts.push(postData.rowIndex);
                actionToSend = 'increment';
            }

            saveLikedPostsToStorage(currentLikedPosts); // Update localStorage

            const updatedCount = await sendLikeUpdate(postData.rowIndex, actionToSend);

            if (updatedCount !== null) {
                likeCountSpan.textContent = updatedCount; // Update UI with count from server
            } else {
                // Revert UI state if server update failed
                console.warn("Server update failed, reverting UI like state.");
                if (actionToSend === 'increment') {
                    likeButton.classList.remove('liked');
                    currentLikedPosts = currentLikedPosts.filter(id => id !== postData.rowIndex);
                } else {
                    likeButton.classList.add('liked');
                    currentLikedPosts.push(postData.rowIndex);
                }
                saveLikedPostsToStorage(currentLikedPosts);
            }
        });

        // Main post click handler
        li.addEventListener('click', (event) => {
            // Prevent clicks on action elements from triggering iframe load
            if (event.target.classList.contains('post-external-link-btn') || event.target.closest('.post-like-container')) {
                return;
            }

            const embedURL = getEmbedURL(postData.type, postData.id);
            if (embedURL) {
                contentFrame.src = embedURL;
            } else {
                contentFrame.src = 'about:blank';
                console.warn(`No embed URL generated for type: ${postData.type} and ID: ${postData.id}`);
            }
        });

        return li;
    }

    async function loadPosts() {
        const posts = await getSheetData();

        posts.sort((a, b) => {
            const aPinned = a.pin; // postData.pin is already boolean
            const bPinned = b.pin;

            if (aPinned && !bPinned) return -1;
            if (!aPinned && bPinned) return 1;

            const dateA = a.date ? new Date(a.date) : new Date(0);
            const dateB = b.date ? new Date(b.date) : new Date(0);

            return dateB.getTime() - dateA.getTime();
        });

        postList.innerHTML = '';

        posts.forEach(postData => {
            const postElement = createPostElement(postData);
            postList.appendChild(postElement);
        });

        if (posts.length > 0) {
            const firstPost = posts[0];
            const embedURL = getEmbedURL(firstPost.type, firstPost.id);
            if (embedURL) {
                contentFrame.src = embedURL;
            } else {
                contentFrame.src = 'about:blank';
            }
        }
    }

    // --- COMMENT SECTION LOGIC ---
    async function fetchComments() {
        try {
            const response = await fetch(appsScriptURL + '?action=getComments');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const comments = await response.json();

            if (comments && comments.success === false) {
                console.error("Error from Apps Script (fetchComments):", comments.error);
                commentsDisplay.innerHTML = '<div class="comment-error">Error loading comments.</div>';
                return;
            }

            commentsDisplay.innerHTML = '';

            if (!Array.isArray(comments) || comments.length === 0) {
                commentsDisplay.innerHTML = '<div class="comment-message">No comments yet. Be the first to leave one!</div>';
            } else {
                comments.forEach(comment => {
                    const commentElement = document.createElement('div');
                    commentElement.classList.add('comment-item');

                    const commentHeader = document.createElement('div');
                    commentHeader.classList.add('comment-header');

                    const usernameSpan = document.createElement('span');
                    usernameSpan.classList.add('comment-username');
                    usernameSpan.textContent = comment.username || 'Anonymous';
                    commentHeader.appendChild(usernameSpan);

                    const timestampSpan = document.createElement('span');
                    timestampSpan.classList.add('comment-timestamp');
                    timestampSpan.textContent = comment.timestamp || '';
                    commentHeader.appendChild(timestampSpan);

                    commentElement.appendChild(commentHeader);

                    const messagePara = document.createElement('p');
                    messagePara.classList.add('comment-message');
                    messagePara.textContent = comment.message || '';
                    commentElement.appendChild(messagePara);

                    commentsDisplay.appendChild(commentElement);
                });
                commentsDisplay.scrollTop = commentsDisplay.scrollHeight;
            }

        } catch (error) {
            console.error('Error fetching comments:', error);
            commentsDisplay.innerHTML = '<div class="comment-error">Failed to load comments.</div>';
        }
    }

    async function sendComment() {
        const username = usernameInput.value.trim();
        const message = commentMessageInput.value.trim();
        const hpEmail = honeypotField.value.trim(); // Get honeypot field value

        if (message === '') {
            alert("Please enter a message before sending.");
            return;
        }

        sendCommentBtn.disabled = true;
        sendCommentBtn.textContent = 'Sending...';

        try {
            const formData = new FormData();
            formData.append('action', 'addComment'); // Specify action for Apps Script
            formData.append('username', username);
            formData.append('message', message);
            formData.append('hp_email', hpEmail); // Include honeypot field

            const response = await fetch(appsScriptURL, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();

            if (result.success) {
                commentMessageInput.value = ''; // Clear message input
                fetchComments(); // Refresh comments to show the new one

                // NEW: If comments display was hidden, show it after successful submission
                if (commentsDisplay.classList.contains('hidden')) {
                    commentsDisplay.classList.remove('hidden'); // Remove the hidden class
                    updateContainerPadding(); // Recalculate padding to make space
                    toggleCommentsBtn.textContent = 'Hide Comments'; // Update button text
                }
            } else {
                // If spam detected, the error message from Apps Script will be displayed
                alert(`Error: ${result.error || 'Failed to add comment.'}`);
            }

        } catch (error) {
            console.error('Error sending comment:', error);
            alert("Failed to send comment. Please try again.");
        } finally {
            sendCommentBtn.disabled = false;
            sendCommentBtn.textContent = 'Send';
        }
    }

    sendCommentBtn.addEventListener('click', sendComment);
    commentMessageInput.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
            sendComment();
        }
    });

    // --- HIDE COMMENTS LOGIC ---
    // Function to set padding based on comments visibility
    function updateContainerPadding() {
        // Calculate the height required by the comment input form + any fixed padding
        // This value should match the height of your .comment-input-form in CSS
        const inputFormTotalHeight = COMMENT_INPUT_FORM_HEIGHT + 10; // 10px from .comments-section padding-top

        let paddingForCommentsDisplayArea = 0;
        // If the comments display area is NOT hidden, calculate its max height
        if (!commentsDisplay.classList.contains('hidden')) {
            const viewportHeight = window.innerHeight;
            // Max height of comments display is COMMENTS_DISPLAY_MAX_VH % of viewport height.
            // Also account for its own vertical padding (0px top + 10px bottom from comments-display CSS)
            paddingForCommentsDisplayArea = (COMMENTS_DISPLAY_MAX_VH / 100) * viewportHeight + 10; 
        }

        // Total padding for .container = height of comments display area + height of input form
        container.style.paddingBottom = `${paddingForCommentsDisplayArea + inputFormTotalHeight}px`;
    }
    
    // Adjust padding on window resize as vh values change
    window.addEventListener('resize', updateContainerPadding);

    toggleCommentsBtn.addEventListener('click', () => {
        commentsDisplay.classList.toggle('hidden'); // Toggle the hidden class on the comments display
        updateContainerPadding(); // Re-adjust padding for the main container

        // Update the button text based on the new state
        if (commentsDisplay.classList.contains('hidden')) {
            toggleCommentsBtn.textContent = 'Show Comments';
        } else {
            toggleCommentsBtn.textContent = 'Hide Comments';
        }
    });

    // --- INITIAL LOAD ---
    loadPosts(); // Load posts (now from Apps Script with like data)
    fetchComments(); // Load comments

    // Set initial padding on page load based on current visibility
    updateContainerPadding();

    // Optional: Refresh data periodically
    setInterval(fetchComments, 30000);
    setInterval(loadPosts, 60000); // Reload posts to get updated like counts
});