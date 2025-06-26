// resizer.js
document.addEventListener('DOMContentLoaded', () => {
    const container = document.querySelector('.container');
    const leftPanel = document.querySelector('.left-panel');
    const rightPanel = document.querySelector('.right-panel');
    const resizer = document.querySelector('.resizer');

    // Check if elements exist before attaching listeners
    if (!container || !leftPanel || !rightPanel || !resizer) {
        console.error("Resizer elements not found. Make sure .container, .left-panel, .right-panel, and .resizer are in your HTML.");
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
            // Ensure content frame takes full height of rightPanel initially
            const contentFrame = document.getElementById('content-frame');
            if (contentFrame) {
                 contentFrame.style.height = '100%';
            }
        } else {
            leftPanel.style.width = '30%'; // Initial desktop width
            rightPanel.style.width = '70%'; // Initial desktop width
            const contentFrame = document.getElementById('content-frame');
            if (contentFrame) {
                 contentFrame.style.height = '100%';
            }
        }
    }

    // Set initial sizes on load
    setInitialPanelSizes();

    // Event listeners for resizing
    resizer.addEventListener('mousedown', (e) => {
        if (!isMobile) { // Only for desktop horizontal drag
            isResizing = true;
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
        }
    });

    resizer.addEventListener('touchstart', (e) => {
        if (isMobile) { // Only for mobile vertical drag
            isResizing = true;
            document.addEventListener('touchmove', handleTouchMove);
            document.addEventListener('touchend', handleTouchEnd);
        }
    }, { passive: true }); // Use passive for touchstart/touchmove for better scroll performance

    function handleMouseMove(e) {
        if (!isResizing) return;
        let newLeftWidth;
        const containerRect = container.getBoundingClientRect();
        const resizerRect = resizer.getBoundingClientRect();

        // Calculate based on mouse X position relative to container
        newLeftWidth = (e.clientX - containerRect.left);

        // Convert pixel width to percentage
        const newLeftPercentage = (newLeftWidth / containerRect.width) * 100;

        // Apply limits (e.g., min 10%, max 90%)
        if (newLeftPercentage > 10 && newLeftPercentage < 90) {
            leftPanel.style.width = `${newLeftPercentage}%`;
            rightPanel.style.width = `${100 - newLeftPercentage}%`;
        }
    }

    function handleTouchMove(e) {
        if (!isResizing) return;
        let newLeftHeight;
        const containerRect = container.getBoundingClientRect();
        const resizerRect = resizer.getBoundingClientRect();

        // Calculate based on touch Y position relative to container
        newLeftHeight = (e.touches[0].clientY - containerRect.top);

        // Convert pixel height to vh
        // Note: Using vh directly for panel heights might be tricky with fixed elements (comments)
        // A more robust approach might be to use flex-basis or calculate pixel heights for panels.
        // For simplicity, we'll try to convert to vh based on container height.
        const newLeftHeightVh = (newLeftHeight / window.innerHeight) * 100;

        // Apply limits (e.g., min 10vh, max 90vh)
        if (newLeftHeightVh > 10 && newLeftHeightVh < 90) {
            leftPanel.style.height = `${newLeftHeightVh}vh`;
            rightPanel.style.height = `${100 - newLeftHeightVh}vh`; // Remaining height
            
            // Adjust iframe height inside right panel to fill space, if needed
            const contentFrame = document.getElementById('content-frame');
            if (contentFrame) {
                 contentFrame.style.height = '100%'; // Ensure iframe fills its parent
            }
        }
    }

    function handleMouseUp() {
        isResizing = false;
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
    }

    function handleTouchEnd() {
        isResizing = false;
        document.removeEventListener('touchmove', handleTouchMove);
        document.removeEventListener('touchend', handleTouchEnd);
    }

    // Recalculate sizes on window resize (e.g., device orientation change)
    window.addEventListener('resize', () => {
        setInitialPanelSizes(); // Reset to default on resize, or re-evaluate current proportions
    });
});