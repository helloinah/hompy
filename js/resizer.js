// js/resizer.js (패널 크기 조절 스크립트)

// HTML 문서가 완전히 로드되고 파싱되면 실행됩니다.
document.addEventListener('DOMContentLoaded', () => {
    // 필요한 HTML 요소들을 JavaScript 변수에 연결합니다.
    const container = document.querySelector('.container'); // 전체 컨테이너
    const leftPanel = document.querySelector('.left-panel'); // 왼쪽 패널
    const rightPanel = document.querySelector('.right-panel'); // 오른쪽 패널
    const resizer = document.querySelector('.resizer'); // 크기 조절 바
    const contentFrame = document.getElementById('content-frame'); // 콘텐츠 iframe
    const iframeOverlay = document.getElementById('iframe-overlay'); // iframe 오버레이

    // 필수 요소가 없으면 오류 메시지를 콘솔에 출력하고 함수를 종료합니다.
    if (!container || !leftPanel || !rightPanel || !resizer || !contentFrame || !iframeOverlay) {
        console.error("Resizer elements not found. Make sure .container, .left-panel, .right-panel, .resizer, #content-frame, and #iframe-overlay are in your HTML.");
        return;
    }

    let isResizing = false; // 현재 크기 조절 중인지 여부를 나타내는 플래그

    // 현재 화면 너비가 768px 이하인지 확인하여 모바일 여부를 판단합니다.
    const isMobile = window.innerWidth <= 768;

    /**
     * 초기 패널 크기를 설정합니다. 모바일과 데스크톱 환경에 따라 다르게 설정됩니다.
     */
    function setInitialPanelSizes() {
        if (isMobile) {
            // 모바일 환경: 높이를 뷰포트 높이의 50%로 설정
            leftPanel.style.height = '50vh';
            rightPanel.style.height = '50vh';
        } else {
            // 데스크톱 환경: 너비를 뷰포트 너비의 50%로 설정
            leftPanel.style.width = '50%';
            rightPanel.style.width = '50%';
        }
    }

    setInitialPanelSizes(); // 페이지 로드 시 초기 패널 크기 설정

    // 마우스 다운 이벤트 리스너 (데스크톱)
    resizer.addEventListener('mousedown', (e) => {
        if (!isMobile) { // 모바일이 아닐 때만 작동
            isResizing = true; // 크기 조절 시작 플래그 설정
            iframeOverlay.style.display = 'block'; // iframe 오버레이 표시 (iframe 내부 클릭 방지)
            // 마우스 이동 및 해제 이벤트 리스너 추가
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
        }
    });

    // 터치 시작 이벤트 리스너 (모바일)
    resizer.addEventListener('touchstart', (e) => {
        if (isMobile) { // 모바일일 때만 작동
            isResizing = true; // 크기 조절 시작 플래그 설정
            e.preventDefault(); // 기본 터치 동작(스크롤 등) 방지
            // 터치 이동 및 종료 이벤트 리스너 추가 (passive: false는 preventDefault를 허용)
            document.addEventListener('touchmove', handleTouchMove, { passive: false }); 
            document.addEventListener('touchend', handleTouchEnd);
        }
    }, { passive: false });

    /**
     * 마우스 이동 시 패널 크기를 조절하는 함수 (데스크톱)
     * requestAnimationFrame을 사용하여 부드러운 애니메이션을 제공합니다.
     */
    function handleMouseMove(e) {
        if (!isResizing) return; // 크기 조절 중이 아니면 함수 종료
        requestAnimationFrame(() => {
            const containerRect = container.getBoundingClientRect(); // 컨테이너의 크기와 위치 정보
            let newLeftWidth = (e.clientX - containerRect.left); // 새로운 왼쪽 패널 너비 (마우스 X 좌표 기준)

            const minWidthPx = 320; // 왼쪽 패널 최소 너비 (픽셀)
            const maxWidthPx = containerRect.width * 0.9; // 왼쪽 패널 최대 너비 (컨테이너 너비의 90%)

            // 너비 제한을 적용합니다.
            newLeftWidth = Math.max(minWidthPx, Math.min(newLeftWidth, maxWidthPx));

            // 새로운 왼쪽 패널 너비를 백분율로 계산합니다.
            const newLeftPercentage = (newLeftWidth / containerRect.width) * 100;

            // 패널들의 너비를 설정합니다.
            leftPanel.style.width = `${newLeftPercentage}%`;
            rightPanel.style.width = `${100 - newLeftPercentage}%`;
        });
    }

    /**
     * 터치 이동 시 패널 크기를 조절하는 함수 (모바일)
     * requestAnimationFrame을 사용하여 부드러운 애니메이션을 제공합니다.
     */
    function handleTouchMove(e) {
        if (!isResizing) return; // 크기 조절 중이 아니면 함수 종료
        e.preventDefault(); // 기본 터치 동작 방지
        requestAnimationFrame(() => {
            const containerRect = container.getBoundingClientRect(); // 컨테이너의 크기와 위치 정보
            const availableHeight = containerRect.height; // 컨테이너의 사용 가능한 높이
            let newLeftHeightPx = (e.touches[0].clientY - containerRect.top); // 새로운 왼쪽 패널 높이 (터치 Y 좌표 기준)

            const minHeightPx = availableHeight * 0.1; // 왼쪽 패널 최소 높이 (컨테이너 높이의 10%)
            const maxHeightPx = availableHeight * 0.9; // 왼쪽 패널 최대 높이 (컨테이너 높이의 90%)

            // 높이 제한을 적용합니다.
            newLeftHeightPx = Math.max(minHeightPx, Math.min(newLeftHeightPx, maxHeightPx));

            // 새로운 왼쪽 패널 높이를 백분율(vh)로 계산합니다.
            const newLeftPercentage = (newLeftHeightPx / availableHeight) * 100;

            // 패널들의 높이를 설정합니다.
            leftPanel.style.height = `${newLeftPercentage}vh`;
            rightPanel.style.height = `${100 - newLeftPercentage}vh`;
        });
    }

    /**
     * 마우스 업 시 크기 조절을 종료하는 함수
     */
    function handleMouseUp() {
        isResizing = false; // 크기 조절 종료 플래그 설정
        iframeOverlay.style.display = 'none'; // iframe 오버레이 숨김
        // 마우스 이벤트 리스너 제거
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
    }

    /**
     * 터치 종료 시 크기 조절을 종료하는 함수
     */
    function handleTouchEnd() {
        isResizing = false; // 크기 조절 종료 플래그 설정
        // 터치 이벤트 리스너 제거
        document.removeEventListener('touchmove', handleTouchMove, { passive: false });
        document.removeEventListener('touchend', handleTouchEnd);
    }

    // 창 크기 변경 시 이벤트 리스너
    window.addEventListener('resize', () => {
        clearTimeout(window.resizeTimeout); // 기존 타이머 클리어
        // 100ms 후에 초기 패널 크기를 다시 설정합니다. (잦은 리사이즈 이벤트에 대한 성능 최적화)
        window.resizeTimeout = setTimeout(() => {
            setInitialPanelSizes();
        }, 100);
    });
});