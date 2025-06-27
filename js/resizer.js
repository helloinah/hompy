// js/resizer.js
document.addEventListener('DOMContentLoaded', () => {
    const container = document.querySelector('.container');
    const leftPanel = document.querySelector('.left-panel');
    const rightPanel = document.querySelector('.right-panel');
    const resizer = document.querySelector('.resizer');
    const contentFrame = document.getElementById('content-frame');
    const iframeOverlay = document.getElementById('iframe-overlay');
    const commentsSection = document.getElementById('comments-section');

    if (!container || !leftPanel || !rightPanel || !resizer || !contentFrame || !commentsSection || !iframeOverlay) {
        console.error("Resizer elements not found. Make sure .container, .left-panel, .right-panel, .resizer, #content-frame, #comments-section, and #iframe-overlay are in your HTML.");
        return;
    }

    let isResizing = false;

    const isMobile = window.innerWidth <= 768;

    function setInitialPanelSizes() {
        if (isMobile) {
            leftPanel.style.height = '70vh';
            rightPanel.style.height = '30vh';
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
            const commentsSectionHeight = commentsSection.offsetHeight;
            const viewportHeight = window.innerHeight;

            // `container` 높이에서 `commentsSection` 높이를 제외한 사용 가능한 높이
            // `container`는 `body`의 `flex-grow: 1`에 의해 전체 높이를 차지하므로, 
            // `commentsSection`을 제외한 영역이 `left/right-panel`에 할당됨
            const availableHeight = viewportHeight - commentsSectionHeight;

            let newLeftHeightPx = (e.touches[0].clientY - containerRect.top);

            const minHeightPx = availableHeight * 0.1;
            const maxHeightPx = availableHeight * 0.9;

            newLeftHeightPx = Math.max(minHeightPx, Math.min(newLeftHeightPx, maxHeightPx));

            const newLeftPercentage = (newLeftHeightPx / availableHeight) * 100; // availableHeight 기준으로 퍼센트 계산

            leftPanel.style.height = `${newLeftPercentage}vh`;
            rightPanel.style.height = `${100 - newLeftPercentage}vh`;
            // rightPanel의 높이는 leftPanel이 차지하고 남은 viewportHeight에서 commentsSectionHeight를 뺀 값의 vh
            // 이는 commentsSectionHeight가 고정되어 있다고 가정할 때 정확하게 동작
            // rightPanel.style.height = `${(availableHeight - newLeftHeightPx) / viewportHeight * 100}vh`; // 기존 계산 방식 유지 또는 위에처럼 변경
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