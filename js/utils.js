// js/utils.js

export const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwbi1A3o8T4BMjSQ5D5QmCque20c1GO4znfJ1DS6QZ0VolgIbO7KPAPskxVlX0PFwJ3/exec'; // IMPROVEMENT: Centralized Apps Script URL
const LIKED_POSTS_STORAGE_KEY = 'myWebsiteLikedPosts';

export function getEmbedURL(type, id) {
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
            embedSrc = `https://docs.google.com/spreadsheets/d/${id}/htmlembed`;
            break;
        case 'html': // NEW: For HTML files located in /contents/html
            // Assuming the 'id' for HTML type is the filename (e.g., 'my_page.html')
            // And the files are served from the root as /contents/html/filename.html
            embedSrc = `/contents/html/${id}`;
            break;
        case 'folder': // NEW: For Google Drive Folders
            // Note: Embedding Google Drive folders directly in an iframe might not work
            // as expected due to security policies (X-Frame-Options).
            // This URL will typically open the folder in a new tab if used as a direct link,
            // or might show a blank/error in an iframe.
            embedSrc = `https://drive.google.com/embeddedfolderview?id=${id}#grid`;
            break;
        default: embedSrc = '';
    }
    return embedSrc;
}

export function getLikedPostsFromStorage() {
    try {
        const likedPosts = JSON.parse(localStorage.getItem(LIKED_POSTS_STORAGE_KEY) || '[]');
        return Array.isArray(likedPosts) ? likedPosts : [];
    } catch (e) {
        console.error("Error parsing liked posts from localStorage:", e);
        return [];
    }
}

export function saveLikedPostsToStorage(likedPosts) {
    localStorage.setItem(LIKED_POSTS_STORAGE_KEY, JSON.stringify(likedPosts));
}

export async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        alert('Link copied to clipboard!');
    } catch (err) {
        console.error('Failed to copy link:', err);
        alert('Failed to copy. Please copy manually: ' + text);
    }
}