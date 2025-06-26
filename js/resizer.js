// js/resizer.js
document.addEventListener('DOMContentLoaded', () => {
    const container = document.querySelector('.container');
    const leftPanel = document.querySelector('.left-panel');
    const rightPanel = document.querySelector('.right-panel');
    const resizer = document.querySelector('.resizer');
    const contentFrame = document.getElementById('content-frame');
    const iframeOverlay = document.getElementById('iframe-overlay');
    const commentsSection = document.getElementById('comments-section'); // IMPROVEMENT: Initialize here

    // Check if elements exist before attaching listeners
    if (!container || !leftPanel || !rightPanel || !resizer || !contentFrame || !commentsSection || !iframeOverlay) {
        console.error("Resizer elements not found. Make sure .container, .left-panel, .right-panel, .resizer, #content-frame, #comments-section, and #iframe-overlay are in your HTML.");
        return;
    }

    let isResizing = false;

    // Determine if it's mobile based on CSS breakpoint (should match your @media query)
    const isMobile = window.innerWidth <= 768;

    // Function to set initial panel sizes
    function setInitialPanelSizes() {
        if (isMobile) {
            leftPanel.style.height = '70vh';
            rightPanel.style.height = '30vh';
        } else {
            leftPanel.style.width = '30%';
            rightPanel.style.width = '70%';
        }
    }

    // Set initial sizes on load
    setInitialPanelSizes();

    // Event listeners for resizing
    resizer.addEventListener('mousedown', (e) => {
        if (!isMobile) {
            isResizing = true;
            iframeOverlay.style.display = 'block';
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
        }
    });

    resizer.addEventListener('touchstart', (e) => {
        if (isMobile) {
            isResizing = true;
            document.addEventListener('touchmove', handleTouchMove);
            document.addEventListener('touchend', handleTouchEnd);
        }
    }, { passive: true });

    function handleMouseMove(e) {
        if (!isResizing) return;
        requestAnimationFrame(() => {
            const containerRect = container.getBoundingClientRect();
            let newLeftWidth = (e.clientX - containerRect.left);

            const minWidthPx = containerRect.width * 0.1;
            const maxWidthPx = containerRect.width * 0.9;

            newLeftWidth = Math.max(minWidthPx, Math.min(newLeftWidth, maxWidthPx));

            const newLeftPercentage = (newLeftWidth / containerRect.width) * 100;
            
            leftPanel.style.width = `${newLeftPercentage}%`;
            rightPanel.style.width = `${100 - newLeftPercentage}%`;
        });
    }

    function handleTouchMove(e) {
        if (!isResizing) return;
        requestAnimationFrame(() => {
            const containerRect = container.getBoundingClientRect();
            const commentsSectionHeight = commentsSection.offsetHeight;
            const viewportHeight = window.innerHeight;

            const availableHeight = viewportHeight - commentsSectionHeight;

            let newLeftHeightPx = (e.touches[0].clientY - containerRect.top);

            const minHeightPx = availableHeight * 0.1;
            const maxHeightPx = availableHeight * 0.9;

            newLeftHeightPx = Math.max(minHeightPx, Math.min(newLeftHeightPx, maxHeightPx));

            const newLeftHeightVh = (newLeftHeightPx / viewportHeight) * 100;

            leftPanel.style.height = `${newLeftHeightVh}vh`;
            rightPanel.style.height = `${(availableHeight - newLeftHeightPx) / viewportHeight * 100}vh`;
        });
    }

    function handleMouseUp() {
        isResizing = false;
        iframeOverlay.style.display = 'none';
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
    }

    function handleTouchEnd() {
        isResizing = false;
        document.removeEventListener('touchmove', handleTouchMove);
        document.removeEventListener('touchend', handleTouchEnd);
    }

    window.addEventListener('resize', () => {
        clearTimeout(window.resizeTimeout);
        window.resizeTimeout = setTimeout(() => {
            setInitialPanelSizes();
        }, 100);
    });
});