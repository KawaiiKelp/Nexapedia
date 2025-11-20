/**
 * 파일: app.js의 내용 (HTML <script> 태그 내부에 삽입)
 */
document.addEventListener('DOMContentLoaded', () => {
    const navButtons = document.querySelectorAll('.nav-btn');

    // 모든 뷰 섹션의 ID를 배열로 정의 (SPA 전환 대상)
    const viewIds = ['welcome-view', 'result-view', 'compare-view', 'history-view'];

    // 비교 기능 요소 (기존)
    const compareBtn = document.getElementById('compare-btn');
    const compareAInput = document.getElementById('compare-a');
    const compareBInput = document.getElementById('compare-b');
    const thA = document.getElementById('th-a');
    const thB = document.getElementById('th-b');
    const compareTableBody = document.querySelector('#compare-table tbody');

    // 단일 검색 기능 요소 (신규)
    const searchBtn = document.getElementById('search-btn');
    const queryInput = document.getElementById('query-input');
    const resultTitle = document.getElementById('result-title');
    const summaryText = document.getElementById('summary-text');
    const levelBasicText = document.getElementById('level-basic-text');
    const levelIntermediateText = document.getElementById('level-intermediate-text');
    const levelAdvancedText = document.getElementById('level-advanced-text');
    const levelsContainer = document.getElementById('levels-card'); // 난이도 카드를 통째로 숨기기 위해

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


    /**
     * 단일 검색 버튼 클릭 핸들러
     */
    function handleSearchClick() {
        const query = queryInput.value.trim();

        // 현재 선택된 난이도 값 가져오기
        const selectedLevel = document.querySelector('input[name="level"]:checked').value;

        if (!query) {
            alert('검색어를 입력해 주세요.');
            return;
        }

        // 뷰 전환 : '검색' 탭 활성화 및 결과 뷰 표시
        const homeNavButton = document.querySelector('.nav-btn[data-view="home"]');
        if (homeNavButton) {
            // '검색' 버튼을 활성화하고 결과 뷰를 표시
            handleNavClick(homeNavButton)
        }

        // welcome-view에서 result-view로 전환
        document.getElementById('welcome-view').classList.add('hidden');
        document.getElementById('result-view').classList.remove('hidden');

        // 2. (가상의) 검색 결과 데이터 생성
        // 실제 AI 응답을 대체하는 임시 데이터
        const mockResult = createMockConceptData(query);

        // 3. 결과 영역 업데이트
        resultTitle.textContent = `"${query}" 검색 결과`;
        summaryText.textContent = mockResult.summary;
        levelBasicText.textContent = mockResult.levels.basic;
        levelIntermediateText.textContent = mockResult.levels.intermediate;
        levelAdvancedText.textContent = mockResult.levels.advanced;

        // 4. 연관 개념 업데이트
        updateRelatedContents(mockResult.related);

        // 5. 난이도별 설명 표시/숨김 처리 (선택된 난이도만 보여주도록)
        console.log(`선택된 난이도: ${selectedLevel}`);
    }

    /**
    * 연관 개념 (Chip)을 동적으로 생성하는 함수
    * @param {string[]} concepts - 연관 개념 키워드 배열
    */
    function updateRelatedContents(concepts) {
        const relatedList = document.getElementById('related-list');
        relatedList.innerHTML = ''; // 기존 내용 초기화

        concepts.forEach(concept => {
            const chip = document.createElement('li');
            chip.classList.add('chip')
            chip.textContent = concept;
            relatedList.appendChild(chip);
        });
    }

    /**
    * 개념에 따른 가상의 데이터를 반환하는 함수
    */
    function createMockConceptData(query) {
        return {
            summary: `${query}는 ${query}의 핵심 원리를 간결하게 설명한 것입니다. 이는 인공지능이 복잡한 개념을 빠르고 쉽게 이해하도록 돕습니다.`,
            levels: {
                basic: `[초급] ${query}는 무엇인가요? 간단히 말해, ${query}는 일상에서 사용하는 도구와 같은 역할을 하며, 매우 기초적인 원리로 작동합니다.`,
                intermediate: `[중급] ${query}의 구조와 주요 구성 요소는 무엇인가요? ${query}는 A, B, C 세 가지 주요 요소로 구성되어 있으며, 상호작용을 통해 D라는 결과물을 만들어냅니다.`,
                advanced: `[고급] ${query}의 심층적인 원리 및 현대적 적용 사례는 무엇인가요? ${query}는 X 이론을 기반으로 하며, 현대 산업에서는 Y 분야의 성능 향상에 혁신적으로 기여하고 있습니다.`,
            },
            related: [`${query}의 역사`, '유사 개념 1', '응용 분야 2', '핵심 원리']
        };
    }

    // 3. 이벤트 리스너 연결
    navButtons.forEach(button => {
        button.addEventListener('click', () => handleNavClick(button));
    });

    compareBtn.addEventListener('click', handleCompareClick);
    
    searchBtn.addEventListener('click', handleSearchClick);

    /* 
    4. 초기 상태 설정
    */

    const initialButton = document.querySelector('.nav-btn[data-view="home"]');
    if (initialButton) {// 초기 뷰 설정 로직을 실행하여 '검색' 버튼을 활성화하고 'welcome-view'를 표시
        handleNavClick(initialButton);
    }

    /**
     * 비교 테이블에 행을 추가하는 헬퍼 함수
     * @param {string} category - 구분 항목 (예: 정의, 역사, 용도)
     * @param {string} valueA - 개념 A에 대한 설명
     * @param {string} valueB - 개념 B에 대한 설명
     */
    function addCompareTableRow(category, valueA, valueB) {
        const row = compareTableBody.insertRow();
        row.innerHTML = `
            <td>${category}</td>
            <td>${valueA}</td>
            <td>${valueB}</td>
        `;
    }

    /**
     * 비교 버튼 클릭 핸들러
     */
    function handleCompareClick() {
        const termA = compareAInput.value.trim();
        const termB = compareBInput.value.trim();

        if (!termA || !termB) {
            alert('비교할 두 가지 개념을 모두 입력해 주세요.');
            return;
        }

        // 1. 뷰 전환: '비교' 탭 활성화 및 뷰 표시
        const compareNavButton = document.querySelector('.nav-btn[data-view="compare"]');
        if (compareNavButton) {
            handleNavClick(compareNavButton);
        }

        // 2. 헤더 업데이트
        thA.textContent = termA;
        thB.textContent = termB;

        // 3. 테이블 내용 초기화
        compareTableBody.innerHTML = '';
        
        // 4. (가상의) 비교 데이터로 테이블 채우기
        // 실제 AI 응답을 대체하는 임시 데이터입니다.
        const mockCompareData = [
            { category: '정의', a: `${termA}는 ${termA}의 원리와 기능을 기반으로 합니다.`, b: `${termB}는 ${termB}의 효율성을 개선한 기술입니다.` },
            { category: '발명/개발 시기', a: '19세기 초반', b: '20세기 중반 이후' },
            { category: '주요 작동 원리', a: '외연 기관 (증기 등)', b: '내연 기관 또는 효율적인 흐름 제어' },
            { category: '효율성', a: '상대적으로 낮음', b: '상대적으로 매우 높음' },
            { category: '주요 용도', a: '초기 산업 동력, 기차', b: '발전소, 항공기, 고속 선박' }
        ];

        mockCompareData.forEach(data => {
            addCompareTableRow(data.category, data.a, data.b);
        });
        
        // 5. 비교 요약 텍스트 업데이트 (임시)
        document.getElementById('compare-summary-text').textContent = 
            `"${termA}"와 "${termB}"의 가장 큰 차이점은 작동 원리(외연/내연)와 에너지 효율성입니다.`;
    }
});