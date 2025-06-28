// js/resizer.js
document.addEventListener('DOMContentLoaded', () => {
    const container = document.querySelector('.container');
    const leftPanel = document.querySelector('.left-panel');
    const rightPanel = document.querySelector('.right-panel');
    const resizer = document.querySelector('.resizer');
    const contentFrame = document.getElementById('content-frame');
    const iframeOverlay = document.getElementById('iframe-overlay');
    // Removed commentsSection as its height is no longer factored into panel resizing logic directly
    // const commentsSection = document.getElementById('comments-section'); 

    if (!container || !leftPanel || !rightPanel || !resizer || !contentFrame || !iframeOverlay) {
        console.error("Resizer elements not found. Make sure .container, .left-panel, .right-panel, .resizer, #content-frame, and #iframe-overlay are in your HTML.");
        return;
    }

    let isResizing = false;

    const isMobile = window.innerWidth <= 768;

    function setInitialPanelSizes() {
        if (isMobile) {
            leftPanel.style.height = '50vh';
            rightPanel.style.height = '50vh';
        } else {
            leftPanel.style.width = '50%';
            rightPanel.style.width = '50%';
        }
    }

    setInitialPanelSizes();

    resizer.addEventListener('mousedown', (e) => {
        if (!isMobile) {
            isResizing = true;
            iframeOverlay.style.display = 'block';
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
        }
    });

    // passive: false로 변경하여 preventDefault() 가능하도록
    resizer.addEventListener('touchstart', (e) => {
        if (isMobile) {
            isResizing = true;
            e.preventDefault(); // 스크롤 방지
            document.addEventListener('touchmove', handleTouchMove, { passive: false }); // passive: false
            document.addEventListener('touchend', handleTouchEnd);
        }
    }, { passive: false }); // passive: false

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
        e.preventDefault(); // 스크롤 방지
        requestAnimationFrame(() => {
            const containerRect = container.getBoundingClientRect();
            // const commentsSectionHeight = commentsSection.offsetHeight; // Removed
            // const viewportHeight = window.innerHeight; // Removed, using containerRect.height instead

            // availableHeight should be the total height of the container, as comments section is now inside leftPanel
            const availableHeight = containerRect.height; // Use container's actual height for vertical resizing

            let newLeftHeightPx = (e.touches[0].clientY - containerRect.top);

            const minHeightPx = availableHeight * 0.1;
            const maxHeightPx = availableHeight * 0.9;

            newLeftHeightPx = Math.max(minHeightPx, Math.min(newLeftHeightPx, maxHeightPx));

            const newLeftPercentage = (newLeftHeightPx / availableHeight) * 100;

            leftPanel.style.height = `${newLeftPercentage}vh`;
            rightPanel.style.height = `${100 - newLeftPercentage}vh`;
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
        document.removeEventListener('touchmove', handleTouchMove, { passive: false }); // passive: false
        document.removeEventListener('touchend', handleTouchEnd);
    }

    window.addEventListener('resize', () => {
        clearTimeout(window.resizeTimeout);
        window.resizeTimeout = setTimeout(() => {
            setInitialPanelSizes();
        }, 100);
    });
});