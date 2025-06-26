// resizer.js
document.addEventListener('DOMContentLoaded', () => {
    const container = document.querySelector('.container');
    const leftPanel = document.querySelector('.left-panel');
    const rightPanel = document.querySelector('.right-panel');
    const resizer = document.querySelector('.resizer');
    const contentFrame = document.getElementById('content-frame'); // iframe 참조
    const iframeOverlay = document.getElementById('iframe-overlay'); // 오버레이 참조
    const commentsSection = document.getElementById('comments-section'); // 댓글 섹션 참조

    // Check if elements exist before attaching listeners
    if (!container || !leftPanel || !rightPanel || !resizer || !contentFrame || !commentsSection || !iframeOverlay) {
        console.error("Resizer elements not found. Make sure .container, .left-panel, .right-panel, .resizer, #content-frame, #comments-section, and #iframe-overlay are in your HTML.");
        return;
    }

    let isResizing = false;

    // Determine if it's mobile based on CSS breakpoint (should match your @media query)
    const isMobile = window.innerWidth <= 768; // 이 변수는 script.js에서도 독립적으로 사용

    // Function to set initial panel sizes
    function setInitialPanelSizes() {
        if (isMobile) {
            // 모바일 초기 상태: 목록이 크고, 콘텐츠가 작음
            leftPanel.style.height = '70vh';
            rightPanel.style.height = '30vh';
        } else {
            // 데스크톱 초기 상태
            leftPanel.style.width = '30%';
            rightPanel.style.width = '70%';
        }
    }

    // Set initial sizes on load
    setInitialPanelSizes();

    // Event listeners for resizing
    resizer.addEventListener('mousedown', (e) => {
        if (!isMobile) { // Only for desktop horizontal drag
            isResizing = true;
            iframeOverlay.style.display = 'block'; // iframe 위 오버레이 표시
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
        }
    });

    resizer.addEventListener('touchstart', (e) => {
        if (isMobile) { // Only for mobile vertical drag
            isResizing = true;
            // 모바일에서는 iframe-overlay가 필요 없을 수 있습니다.
            // contentFrame.style.pointerEvents = 'none'; // iframe 내부 터치 이벤트를 막음
            document.addEventListener('touchmove', handleTouchMove);
            document.addEventListener('touchend', handleTouchEnd);
        }
    }, { passive: true }); // Use passive for touchstart/touchmove for better scroll performance

    function handleMouseMove(e) {
        if (!isResizing) return;
        requestAnimationFrame(() => { // 성능 향상을 위해 requestAnimationFrame 사용
            const containerRect = container.getBoundingClientRect();
            let newLeftWidth = (e.clientX - containerRect.left);

            // Apply limits (e.g., min 10% of container width)
            const minWidthPx = containerRect.width * 0.1; // 10%
            const maxWidthPx = containerRect.width * 0.9; // 90%

            newLeftWidth = Math.max(minWidthPx, Math.min(newLeftWidth, maxWidthPx));

            const newLeftPercentage = (newLeftWidth / containerRect.width) * 100;
            
            leftPanel.style.width = `${newLeftPercentage}%`;
            rightPanel.style.width = `${100 - newLeftPercentage}%`;
        });
    }

    function handleTouchMove(e) {
        if (!isResizing) return;
        requestAnimationFrame(() => { // 성능 향상을 위해 requestAnimationFrame 사용
            const containerRect = container.getBoundingClientRect();
            const commentsSectionHeight = commentsSection.offsetHeight; // 현재 댓글 섹션의 실제 높이
            const viewportHeight = window.innerHeight;

            // 전체 뷰포트 높이에서 댓글 섹션 높이를 뺀 만큼이 패널들이 사용할 수 있는 공간
            const availableHeight = viewportHeight - commentsSectionHeight;

            let newLeftHeightPx = (e.touches[0].clientY - containerRect.top);

            // Apply limits based on available height (e.g., min 10% of available, max 90% of available)
            const minHeightPx = availableHeight * 0.1;
            const maxHeightPx = availableHeight * 0.9;

            newLeftHeightPx = Math.max(minHeightPx, Math.min(newLeftHeightPx, maxHeightPx));

            const newLeftHeightVh = (newLeftHeightPx / viewportHeight) * 100; // 뷰포트 대비 vh 계산

            leftPanel.style.height = `${newLeftHeightVh}vh`;
            rightPanel.style.height = `${(availableHeight - newLeftHeightPx) / viewportHeight * 100}vh`;
        });
    }

    function handleMouseUp() {
        isResizing = false;
        iframeOverlay.style.display = 'none'; // iframe 위 오버레이 숨김
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
    }

    function handleTouchEnd() {
        isResizing = false;
        // contentFrame.style.pointerEvents = 'auto'; // iframe 내부 터치 이벤트를 다시 허용
        document.removeEventListener('touchmove', handleTouchMove);
        document.removeEventListener('touchend', handleTouchEnd);
    }

    // Recalculate sizes on window resize (e.g., device orientation change)
    window.addEventListener('resize', () => {
        // Debounce resize to prevent excessive calls
        clearTimeout(window.resizeTimeout);
        window.resizeTimeout = setTimeout(() => {
            setInitialPanelSizes(); // Reset to default on resize, or re-evaluate current proportions
            // Also ensure the main script's padding is updated
            // This might be better handled by a custom event or a shared function if necessary
        }, 100);
    });
});