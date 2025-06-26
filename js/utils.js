// js/utils.js

export const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzcu3cF0jROowKPw1L__rnS-uBTa0MI_Ncwy4S9R4KHpWvDmpZtWZ4wbEe0mpVaP5zh/exec'; // IMPROVEMENT: Centralized Apps Script URL
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
            embedSrc = `https://docs.google.com/spreadsheets/d/${id}/pubhtml?widget=true&headers=false`;
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