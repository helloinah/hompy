document.addEventListener('DOMContentLoaded', () => {
    const postList = document.getElementById('post-list');
    const contentFrame = document.getElementById('content-frame');
    const commentsSection = document.getElementById('comments-section');
    const toggleCommentsBtn = document.getElementById('toggle-comments-btn');
    const container = document.querySelector('.container');
    const tagFilterSelect = document.getElementById('tag-filter');
    const commentsDisplay = document.getElementById('comments-display');
    const usernameInput = document.getElementById('username-input');
    const commentMessageInput = document.getElementById('comment-message-input');
    const sendCommentBtn = document.getElementById('send-comment-btn');
    const honeypotField = document.getElementById('hp_email');
    const leftPanel = document.querySelector('.left-panel'); // Assuming you have this element
    const rightPanel = document.querySelector('.right-panel'); // Assuming you have this element

    // === CONFIGURATION ===
    const appsScriptURL = 'https://script.google.com/macros/s/AKfycbzcu3cF0jROowKPw1L__rnS-uBTa0MI_Ncwy4S9R4KHpWvDmpZtWZ4wbEe0mpVaP5zh/exec';
    const LIKED_POSTS_STORAGE_KEY = 'myWebsiteLikedPosts';
    
    // --- SIZING VALUES (Read from CSS) ---
    // This moves control of sizes to your style.css file.
    const rootStyles = getComputedStyle(document.documentElement);
    const COMMENT_INPUT_FORM_HEIGHT = parseInt(rootStyles.getPropertyValue('--comment-form-height'), 10) || 80;
    const COMMENTS_DISPLAY_MAX_VH = parseInt(rootStyles.getPropertyValue('--comments-display-max-height'), 10) || 30;

    let allPostsData = [];
    let sharedPostRowIndex = null;
    const isMobile = window.innerWidth <= 768; // Define isMobile here for global access

    // --- GENERAL POSTS LOGIC (Functions remain the same) ---
    async function getSheetData() {
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
            case 'img': case 'pdf':
                embedSrc = `https://drive.google.com/file/d/${id}/preview`;
                break;
            case 'spreadsheet':
                embedSrc = `https://docs.google.com/spreadsheets/d/${id}/pubhtml?widget=true&headers=false`;
                break;
            default: embedSrc = '';
        }
        return embedSrc;
    }

    function getLikedPostsFromStorage() {
        try {
            const likedPosts = JSON.parse(localStorage.getItem(LIKED_POSTS_STORAGE_KEY) || '[]');
            return Array.isArray(likedPosts) ? likedPosts : [];
        } catch (e) {
            console.error("Error parsing liked posts from localStorage:", e);
            return [];
        }
    }

    function saveLikedPostsToStorage(likedPosts) {
        localStorage.setItem(LIKED_POSTS_STORAGE_KEY, JSON.stringify(likedPosts));
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

    async function copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            alert('Link copied to clipboard!');
        } catch (err) {
            console.error('Failed to copy link:', err);
            alert('Failed to copy. Please copy manually: ' + text);
        }
    }

    function createPostElement(postData) {
        const li = document.createElement('li');
        li.dataset.rowIndex = postData.rowIndex;
        li.classList.add('post-list-item');

        if (postData.pin) li.classList.add('pinned');

        li.innerHTML = `
            <div class="post-title">${postData.title || 'Untitled Post'}</div>
            <div class="post-date">${postData.date ? postData.date : ''}</div>
            <div class="post-note">${postData.note || ''}</div>
            ${postData.tag ? `<span class="post-tag">${postData.tag}</span>` : ''}
            <div class="action-row" style="display: flex; align-items: center; justify-content: flex-end; gap: 10px;">
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
            
            // 3. 포스트를 선택했을 시 right-panel이 70vh로 left-panel이 30vh가 되면서 조정되어야 하지만 아무일도 일어나지 않음.
            if (isMobile) { // Only apply this behavior on mobile
                container.classList.add('content-view-active'); 
            }
        });

        return li;
    }

    function populateTagFilter(posts) {
        const uniqueTags = [...new Set(posts.map(p => p.tag).filter(Boolean))].sort();
        tagFilterSelect.innerHTML = '<option value="all">All Tags</option>';
        uniqueTags.forEach(tag => {
            tagFilterSelect.innerHTML += `<option value="${tag}">${tag}</option>`;
        });
    }

    function renderPosts(postsToRender, currentFilterTag = 'all') {
        postList.innerHTML = '';
        postsToRender.forEach(postData => {
            const postElement = createPostElement(postData);
            if (currentFilterTag !== 'all' && postData.tag === currentFilterTag) {
                postElement.classList.add('filtered-match');
            }
            if (sharedPostRowIndex !== null && postData.rowIndex === sharedPostRowIndex) {
                postElement.classList.add('shared-highlight');
            }
            postList.appendChild(postElement);
        });
        
        // Load first post or shared post
        const postToLoad = postsToRender.find(p => p.rowIndex === sharedPostRowIndex) || postsToRender[0];
        contentFrame.src = postToLoad ? getEmbedURL(postToLoad.type, postToLoad.id) : 'about:blank';
    }

    async function loadPosts() {
        allPostsData = await getSheetData();
        populateTagFilter(allPostsData);
        renderPosts(allPostsData, tagFilterSelect.value);
    }

    tagFilterSelect.addEventListener('change', () => {
        const selectedTag = tagFilterSelect.value;
        sharedPostRowIndex = null;
        const postsToShow = selectedTag === 'all' ? allPostsData : allPostsData.filter(post => post.tag === selectedTag);
        renderPosts(postsToShow, selectedTag);
    });

    // --- COMMENT SECTION LOGIC (Functions remain the same) ---
    async function fetchComments() {
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

    async function sendComment() {
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

    sendCommentBtn.addEventListener('click', sendComment);
    commentMessageInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') sendComment(); });
    
    
    // --- HIDE/SHOW COMMENTS LOGIC ---
    function updateContainerPadding() {
        const inputFormTotalHeight = COMMENT_INPUT_FORM_HEIGHT + 10;
        let paddingForCommentsDisplayArea = 0;
        if (!commentsDisplay.classList.contains('hidden')) {
            const viewportHeight = window.innerHeight;
            paddingForCommentsDisplayArea = (COMMENTS_DISPLAY_MAX_VH / 100) * viewportHeight + 10; 
        }
        container.style.paddingBottom = `${paddingForCommentsDisplayArea + inputFormTotalHeight}px`;
    }
    
    window.addEventListener('resize', updateContainerPadding);

    toggleCommentsBtn.addEventListener('click', () => {
        commentsDisplay.classList.toggle('hidden');
        updateContainerPadding();
        toggleCommentsBtn.textContent = commentsDisplay.classList.contains('hidden') ? 'Show Comments' : 'Hide Comments';
    });

    // --- MOBILE SPECIFIC LOGIC ---
    // 4. 아래쪽으로 swipe할 경우 다시 left-panel이 70vh로, right-panel이 30vh로 변해야 하지만 아무런 일도 일어나지 않음.
    function setupMobileSwipe() {
        let touchStartY = 0;

        // Attach listener to rightPanel for swipe down gesture
        rightPanel.addEventListener('touchstart', (e) => {
            // Only start tracking if we are in content-view-active mode
            if (container.classList.contains('content-view-active')) {
                touchStartY = e.touches[0].clientY;
            }
        }, { passive: true }); // Use passive to avoid blocking scrolling

        rightPanel.addEventListener('touchend', (e) => {
            // Only act if we are in content-view-active mode
            if (!container.classList.contains('content-view-active')) return;

            const touchEndY = e.changedTouches[0].clientY;
            const swipeThreshold = 50; // Pixels to qualify as a swipe down

            // Check for swipe down and if the iframe is at the top of its scroll
            // The contentFrame.contentWindow.scrollY check ensures the user
            // isn't just trying to scroll within the iframe
            if (touchEndY - touchStartY > swipeThreshold && contentFrame.contentWindow.scrollY === 0) {
                container.classList.remove('content-view-active');
            }
        }, { passive: true }); // Use passive to avoid blocking scrolling
    }

    // --- INITIAL LOAD ---
    const urlParams = new URLSearchParams(window.location.search);
    const postIdFromUrl = urlParams.get('post');
    if (postIdFromUrl) {
        sharedPostRowIndex = parseInt(postIdFromUrl, 10);
    }
    loadPosts();

    // Mobile specific initializations
    if (isMobile) {
        // 1. 코멘트가 숨겨진 상태에서 로딩되어야 하지만 노출되고 있음
        if (!commentsDisplay.classList.contains('hidden')) {
            commentsDisplay.classList.add('hidden');
            toggleCommentsBtn.textContent = '댓글 보기'; // Set initial button text for mobile
        }
        setupMobileSwipe(); // Initialize mobile swipe gestures
    } else {
        // Ensure button text is correct on desktop if comments are hidden by default via CSS or other means
        toggleCommentsBtn.textContent = commentsDisplay.classList.contains('hidden') ? '댓글 보기' : '댓글 숨기기';
    }

    // 2. 코멘트가 로딩되지 않고 'error loading comments'가 뜸. 데스크탑에서는 잘 작동함.
    // This part of the code itself is functionally correct.
    // The error on mobile is likely a network/CORS issue with your Apps Script.
    // You MUST use remote debugging to inspect the network request on your mobile device.
    fetchComments(); // Still call fetchComments
    
    updateContainerPadding();
    setInterval(fetchComments, 30000);
});