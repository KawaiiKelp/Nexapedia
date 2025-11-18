/**
 * 파일: app.js의 내용 (HTML <script> 태그 내부에 삽입)
 */
document.addEventListener('DOMContentLoaded', () => {
    const navButtons = document.querySelectorAll('.nav-btn');
    
    // 모든 뷰 섹션의 ID를 배열로 정의 (SPA 전환 대상)
    const viewIds = ['welcome-view', 'result-view', 'compare-view', 'history-view'];

    /**
     * 클릭된 버튼을 활성화하고 해당하는 뷰를 표시/숨김 처리하는 함수
     * @param {Element} clickedButton - 클릭된 네비게이션 버튼
     */
    function handleNavClick(clickedButton) {
        // 1. 버튼 활성 클래스 처리
        navButtons.forEach(btn => btn.classList.remove('active'));
        clickedButton.classList.add('active');
        
        // 2. 뷰 전환 로직
        const viewName = clickedButton.getAttribute('data-view');
        
        // 모든 뷰 숨김
        viewIds.forEach(id => {
            const viewElement = document.getElementById(id);
            if (viewElement) viewElement.classList.add('hidden');
        });

        // 타겟 뷰 표시
        // 'home' 버튼은 초기 화면인 welcome-view를 표시합니다.
        const targetViewId = (viewName === 'home') ? 'welcome-view' : viewName + '-view';
        
        const targetView = document.getElementById(targetViewId);
        if (targetView) {
            targetView.classList.remove('hidden');
        }
    }

    // 3. 이벤트 리스너 연결
    navButtons.forEach(button => {
        button.addEventListener('click', () => handleNavClick(button));
    });

    // 4. 페이지 로드 시 초기 상태 설정
    const initialButton = document.querySelector('.nav-btn[data-view="home"]');
    if (initialButton) {
        // 초기 뷰 설정 로직을 실행하여 '검색' 버튼을 활성화하고 'welcome-view'를 표시
        handleNavClick(initialButton);
    }
});