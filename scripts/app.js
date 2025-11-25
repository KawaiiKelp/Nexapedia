/**
 * 파일: app.js
 * 설명: Nexapedia의 싱글 페이지 애플리케이션(SPA) 및 핵심 기능을 제어하는 스크립트
 * 최종 수정 내용:
 * 1. AI 연동을 위해 단일 검색/비교 로직을 비동기(async/await) fetch 로직으로 변경.
 * 2. HTML ID ('related-list' vs 'related-chips') 불일치 및 변수 선언 오류 (const chip) 수정 완료.
 * 3. 뷰 전환 시 발생했던 'clickedButton is null' 오류에 대한 안전 장치 및 로직 수정 완료.
 */

document.addEventListener('DOMContentLoaded', () => {
    // ===================================
    // 1. DOM 요소 선택 및 상수 정의
    // ===================================

    // 네비게이션 버튼 (SPA 전환용)
    const navButtons = document.querySelectorAll('.nav-btn');
    // 모든 뷰 섹션의 ID 정의 (SPA 전환 대상)
    const viewIds = ['welcome-view', 'result-view', 'compare-view', 'history-view'];

    // LocalStorage Key 상수
    const HISTORY_KEY = 'nexapediaHistory';
    const FAVORITE_KEY = 'nexapediaFavorites';
    const OPTIONS_KEY = 'nexapediaOptions';

    // 1.1. 비교 기능 관련 요소
    const compareBtn = document.getElementById('compare-btn');
    const compareAInput = document.getElementById('compare-a');
    const compareBInput = document.getElementById('compare-b');
    const thA = document.getElementById('th-a');
    const thB = document.getElementById('th-b');
    const compareTableBody = document.querySelector('#compare-table tbody');
    const compareSummaryText = document.getElementById('compare-summary-text');

    // 1.2. 단일 검색 기능 관련 요소
    const searchBtn = document.getElementById('search-btn');
    const queryInput = document.getElementById('query-input');
    const resultTitle = document.getElementById('result-title');
    const summaryText = document.getElementById('summary-text');
    // 난이도별 설명 <p> 태그
    const levelBasicText = document.getElementById('level-basic-text');
    const levelIntermediateText = document.getElementById('level-intermediate-text');
    const levelAdvancedText = document.getElementById('level-advanced-text');

    // 난이도 라디오 버튼 전체 선택
    const levelRadios = document.querySelectorAll('input[name="level"]');

    // 1.3. 옵션 제어 관련 요소 (단일 검색 결과의 보조 카드)
    const structureCard = document.getElementById('structure-card');

    // 🚨 수정: 'diagram-container' 대신 'structure-graph' ID를 사용합니다.
    const diagramContainer = document.getElementById('structure-graph');

    const chipListElement = document.getElementById('related-list');
    const timelineCard = document.getElementById('timeline-card');
    const relatedCard = document.getElementById('related-card'); // 이전 단계에서 추가한 변수

    // 옵션 체크박스
    const showStructureCheckbox = document.getElementById('opt-diagram');
    const showTimelineCheckbox = document.getElementById('opt-timeline');
    const showRelatedCheckbox = document.getElementById('opt-related');

    // 1.4. 기록/즐겨찾기 관련 요소
    const recentList = document.getElementById('recent-list');
    const favoriteList = document.getElementById('favorite-list');
    const saveFavoriteBtn = document.getElementById('save-favorite-btn');

    const loadingOverlay = document.getElementById('loading-overlay');

    // ===================================
    // 2. 검색 기록 및 즐겨찾기 관리 유틸리티
    // ===================================

    function getLocalStorage(key, defaultValue) {
        try {
            const json = localStorage.getItem(key);
            return json ? JSON.parse(json) : defaultValue;
        } catch (e) {
            console.error("Error reading localStorage", e);
            return defaultValue;
        }
    }

    function setLocalStorage(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
        } catch (e) {
            console.error("Error writing localStorage", e);
        }
    }

    function addSearchHistory(query) {
        let history = getLocalStorage(HISTORY_KEY, []);
        history = history.filter(item => item !== query);
        history.unshift(query);
        if (history.length > 5) {
            history = history.slice(0, 5);
        }
        setLocalStorage(HISTORY_KEY, history);
        if (document.getElementById('history-view').classList.contains('hidden') === false) {
            renderHistory();
        }
    }

    function updateFavoriteButtonState(query) {
        const favorites = getLocalStorage(FAVORITE_KEY, []);
        if (favorites.includes(query)) {
            saveFavoriteBtn.textContent = '🌟 즐겨찾기에서 제거';
            saveFavoriteBtn.classList.add('favorited');
        } else {
            saveFavoriteBtn.textContent = '★ 즐겨찾기에 추가';
            saveFavoriteBtn.classList.remove('favorited');
        }
    }

    function removeFavorite(queryToRemove) {
        let favorites = getLocalStorage(FAVORITE_KEY, []);
        favorites = favorites.filter(item => item !== queryToRemove);
        setLocalStorage(FAVORITE_KEY, favorites);
        alert(`"${queryToRemove}"가 즐겨찾기에서 제거되었습니다.`);
        renderHistory();

        if (queryInput.value.trim() === queryToRemove) {
            updateFavoriteButtonState(queryToRemove);
        }
    }

    function createHistoryListItem(query, isFavorite = false) {
        const li = document.createElement('li');
        li.classList.add('history-item');

        li.innerHTML = `
            <span class="history-query">${query}</span>
            ${isFavorite
                ? `<button class="remove-btn secondary-btn" data-query="${query}" data-type="favorite">❌</button>`
                : `<button class="search-again-btn secondary-btn" data-query="${query}">재검색</button>`
            }
        `;

        li.querySelector('button').addEventListener('click', (event) => {
            const targetQuery = event.currentTarget.getAttribute('data-query');
            const dataType = event.currentTarget.getAttribute('data-type');

            if (dataType === 'favorite') {
                removeFavorite(targetQuery);
            } else {
                queryInput.value = targetQuery;
                document.getElementById('search-btn').click();
            }
        });

        return li;
    }

    function renderHistory() {
        const recent = getLocalStorage(HISTORY_KEY, []);
        const favorites = getLocalStorage(FAVORITE_KEY, []);

        recentList.innerHTML = '';
        if (recent.length === 0) {
            recentList.innerHTML = '<li class="placeholder">최근 검색 기록이 없습니다.</li>';
        } else {
            recent.forEach(query => {
                recentList.appendChild(createHistoryListItem(query, false));
            });
        }

        favoriteList.innerHTML = '';
        if (favorites.length === 0) {
            favoriteList.innerHTML = '<li class="placeholder">즐겨찾기 항목이 없습니다.</li>';
        } else {
            favorites.forEach(query => {
                favoriteList.appendChild(createHistoryListItem(query, true));
            });
        }
    }

    function renderTimeline(timelineData) {
        const timelineContainer = document.getElementById('timeline-container');
        if (!timelineData || timelineData.length === 0 || !timelineContainer) {
            timelineCard.classList.add('hidden');
            return;
        }

        timelineContainer.innerHTML = '';
        const ul = document.createElement('ul');
        ul.classList.add('timeline-list'); // CSS 스타일을 위해 클래스 추가

        timelineData.forEach(item => {
            const li = document.createElement('li');
            li.innerHTML = `<strong>${item.year}:</strong> ${item.event}`;
            ul.appendChild(li);
        });

        timelineContainer.appendChild(ul);
        timelineCard.classList.remove('hidden');
    }

    function handleFavoriteClick() {
        const query = queryInput.value.trim();
        if (!query) {
            alert('즐겨찾기에 저장할 검색어가 없습니다.');
            return;
        }

        let favorites = getLocalStorage(FAVORITE_KEY, []);
        const isFavorite = favorites.includes(query);

        if (isFavorite) {
            favorites = favorites.filter((item => item !== query));
            alert(`"${query}"가 즐겨찾기에서 제거되었습니다.`);
        } else {
            favorites.push(query);
            alert(`"${query}"가 즐겨찾기에서 저장되었습니다.`);
        }

        setLocalStorage(FAVORITE_KEY, favorites);
        updateFavoriteButtonState(query);
    }

    // ===================================
    // 3. 옵션 설정 저장/불러오기 유틸리티 (🚨 추가된 섹션)
    // ===================================

    /**
     * 현재 옵션 체크박스 상태를 localStorage에 저장합니다.
     */
    function saveOptions() {
        const options = {
            showStructure: showStructureCheckbox.checked,
            showTimeline: showTimelineCheckbox.checked,
            showRelated: showRelatedCheckbox.checked,
        };
        localStorage.setItem(OPTIONS_KEY, JSON.stringify(options));
    }

    /**
     * localStorage에서 옵션 상태를 불러와 체크박스에 적용합니다.
     */
    function loadOptions() {
        const storedOptions = localStorage.getItem(OPTIONS_KEY);
        if (!storedOptions) return; // 저장된 옵션이 없으면 종료

        try {
            const options = JSON.parse(storedOptions);

            // 1. 체크박스 상태 복원
            showStructureCheckbox.checked = options.showStructure ?? true; // 기본값: true
            showTimelineCheckbox.checked = options.showTimeline ?? true;
            showRelatedCheckbox.checked = options.showRelated ?? true;

            // 2. 해당 결과 카드 가시성 초기 설정
            structureCard.classList.toggle('hidden', !showStructureCheckbox.checked);
            timelineCard.classList.toggle('hidden', !showTimelineCheckbox.checked);
            relatedCard.classList.toggle('hidden', !showRelatedCheckbox.checked);

        } catch (e) {
            console.error("옵션 불러오기 오류:", e);
            localStorage.removeItem(OPTIONS_KEY); // 오류 발생 시 저장된 값 삭제
        }
    }

    // ===================================
    // 4. SPA 뷰 전환 로직
    // ===================================

    /**
     * 클릭된 버튼을 활성화하고 해당하는 뷰를 표시/숨김 처리하는 함수 (SPA 핵심)
     */
    function handleNavClick(clickedButton) {
        // ✅ 안전 장치 추가: 버튼이 null일 경우 에러 방지
        if (!clickedButton) return;

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
        const targetViewId = (viewName === 'home') ? 'welcome-view' : viewName + '-view';

        const targetView = document.getElementById(targetViewId);
        if (targetView) {
            targetView.classList.remove('hidden');
        }

        if (targetViewId === 'history-view') {
            renderHistory();
        }
    }


    // ===================================
    // 5. 데이터 렌더링 로직
    // ===================================

    /**
     * 단일 검색 결과를 화면에 렌더링하는 함수
     */
    function renderResult(query, data) {
        resultTitle.textContent = query;
        summaryText.textContent = data.summary;

        // 난이도별 설명 렌더링
        levelBasicText.textContent = data.levels.basic || '준비된 설명이 없습니다.';
        levelIntermediateText.textContent = data.levels.intermediate || '준비된 설명이 없습니다.';
        levelAdvancedText.textContent = data.levels.advanced || '준비된 설명이 없습니다.';

        // 연관 개념 칩 렌더링
        chipListElement.innerHTML = '';
        if (data.related && data.related.length > 0) {
            data.related.forEach(concept => {
                // ✅ 수정: 'const'를 추가하여 변수를 명확히 선언
                const chip = document.createElement('li');
                chip.classList.add('chip');
                chip.textContent = concept;
                chip.addEventListener('click', () => {
                    queryInput.value = concept;
                    searchBtn.click(); // 칩 클릭 시 재검색
                });
                chipListElement.appendChild(chip);
            });
            relatedCard.classList.remove('hidden');
        } else {
            relatedCard.classList.add('hidden');
        }

        // 뷰 전환: 결과 화면 표시
        // 'result' 뷰 버튼이 없으므로 'home' 버튼을 활성화하고 'result-view'를 직접 표시합니다.
        const homeButton = document.querySelector('.nav-btn[data-view="home"]');
        if (homeButton) {
            navButtons.forEach(btn => btn.classList.remove('active'));
            homeButton.classList.add('active');
        }

        viewIds.forEach(id => {
            const viewElement = document.getElementById(id);
            if (viewElement) viewElement.classList.add('hidden');
        });
        const resultView = document.getElementById('result-view');
        if (resultView) {
            resultView.classList.remove('hidden');
        }

        // ✅ 추가: 다이어그램 렌더링 처리
        if (data.diagramCode) {
            renderDiagram(data.diagramCode);
        } else {
            // 코드가 없으면 카드 숨김
            structureCard.classList.add('hidden');
        }

        // ✅ 타임라인 렌더링 처리 추가
        if (data.timeline && showTimelineCheckbox.checked) {
            renderTimeline(data.timeline);
        } else {
            timelineCard.classList.add('hidden');
        }

        // 기록 업데이트 및 버튼 상태 업데이트
        addSearchHistory(query);
        updateFavoriteButtonState(query);
    }

    /**
     * 비교 검색 결과를 화면에 렌더링하는 함수
     */
    function renderCompareResult(queryA, queryB, data) {
        // 테이블 헤더 업데이트
        thA.textContent = queryA;
        thB.textContent = queryB;

        // 비교 요약 업데이트
        compareSummaryText.textContent = data.summary || '두 개념에 대한 상세 비교 및 분석 결과입니다.';

        // 테이블 본문 업데이트
        compareTableBody.innerHTML = '';

        // 데이터가 없을 경우 플레이스홀더 표시
        if (!data.comparison || data.comparison.length === 0) {
            compareTableBody.innerHTML = `
                <tr>
                    <td></td>
                    <td colspan="2" style="text-align: center; color: #888;">비교할 데이터가 없습니다.</td>
                </tr>
            `;
        } else {
            data.comparison.forEach(row => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${row.criteria}</td>
                    <td>${row.conceptA}</td>
                    <td>${row.conceptB}</td>
                `;
                compareTableBody.appendChild(tr);
            });
        }

        // 뷰 전환: 비교 화면 표시
        handleNavClick(document.querySelector('.nav-btn[data-view="compare"]'));
    }

    /**
     * Mermaid 코드를 받아와 다이어그램 컨테이너에 렌더링합니다.
     * @param {string} code - Mermaid 다이어그램 코드
     */
    function renderDiagram(code) {
        if (!code || !diagramContainer) return;

        // 1. 다이어그램 컨테이너 초기화
        diagramContainer.innerHTML = '';

        // 2. Mermaid 코드를 담을 div 요소 생성 (클래스가 필수입니다)
        const diagramDiv = document.createElement('div');
        diagramDiv.classList.add('mermaid');

        // 3. 코드 삽입
        diagramDiv.textContent = code;
        diagramContainer.appendChild(diagramDiv);

        // 4. Mermaid 렌더링 요청
        // mermaid.init()을 사용하면 됩니다.
        mermaid.init(undefined, diagramDiv);

        // 5. 구조도 카드를 표시합니다.
        structureCard.classList.remove('hidden');
    }

    // ===================================
    // 6. 검색 및 비교 이벤트 핸들러 (AI 연동)
    // ===================================

    function showLoading() {
        if (loadingOverlay) loadingOverlay.classList.remove('hidden');
    }

    function hideLoading() {
        if (loadingOverlay) loadingOverlay.classList.add('hidden');
    }

    /**
     * 단일 개념 검색을 처리하고 결과를 렌더링합니다.
     */
    async function handleSearchClick() {
        const query = queryInput.value.trim();
        if (!query) {
            alert('검색어를 입력해 주세요.');
            return;
        }

        // ✅ 추가: 선택된 난이도(level) 값을 가져옵니다.
        const selectedLevel = document.querySelector('input[name="level"]:checked').value;

        showLoading();

        searchBtn.textContent = '검색 중...';
        searchBtn.disabled = true;

        try {
            const response = await fetch('http://localhost:3000/api/search', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    query: query,
                    // ✅ 수정: 난이도 값을 body에 추가하여 백엔드로 전송
                    level: selectedLevel
                })
            });

            if (!response.ok) {
                // HTTP 오류 응답 처리 (예: 백엔드가 켜져 있지 않거나 404/500 에러)
                throw new Error(`AI API 호출 실패: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();

            // 데이터 렌더링
            renderResult(query, data);

        } catch (error) {
            console.error('검색 중 오류 발생:', error);
            // 백엔드가 없을 경우 다시 이 메시지가 표시됩니다.
            alert(`검색 중 오류가 발생했습니다: ${error.message}.`);
        } finally {
            searchBtn.textContent = '검색';
            searchBtn.disabled = false;
            hideLoading();
        }
    }


    /** * [✅ AI 연동 로직 복구] 
     * 두 개념의 비교 검색을 처리하고 결과를 렌더링합니다.
     */
    async function handleCompareClick() {
        const queryA = compareAInput.value.trim();
        const queryB = compareBInput.value.trim();

        if (!queryA || !queryB) {
            alert('비교할 두 개의 개념을 모두 입력해 주세요.');
            return;
        }

        showLoading();

        compareBtn.textContent = '비교 중...';
        compareBtn.disabled = true;

        try {
            // =======================================================
            // 💡 AI Backend API 호출 (Fetch API) 로직
            // =======================================================
            const response = await fetch('/api/compare', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    conceptA: queryA,
                    conceptB: queryB
                })
            });

            if (!response.ok) {
                throw new Error(`AI API 호출 실패: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();

            // 데이터 렌더링
            renderCompareResult(queryA, queryB, data);

        } catch (error) {
            console.error('비교 중 오류 발생:', error);
            alert(`비교 검색 중 오류가 발생했습니다: ${error.message}`);
        } finally {
            compareBtn.textContent = '비교하기'; // 버튼 텍스트 '비교 시작'을 '비교하기'로 수정
            compareBtn.disabled = false;
            hideLoading();
        }
    }


    // ===================================
    // 7. 이벤트 리스너 연결
    // ===================================

    // 7.1. SPA 내비게이션 버튼 이벤트 연결
    navButtons.forEach(button => {
        button.addEventListener('click', (event) => {
            handleNavClick(event.currentTarget);
        });
    });

    // 7.2. 검색 및 비교 버튼 이벤트 연결
    searchBtn.addEventListener('click', handleSearchClick);
    compareBtn.addEventListener('click', handleCompareClick);

    // 7.3. 즐겨찾기 버튼 이벤트 연결
    saveFavoriteBtn.addEventListener('click', handleFavoriteClick);

    // 7.4. 옵션 체크박스 이벤트 연결 (결과 카드 표시/숨김)
    showStructureCheckbox.addEventListener('change', () => {
        structureCard.classList.toggle('hidden', !showStructureCheckbox.checked);
        saveOptions();
    });

    showTimelineCheckbox.addEventListener('change', () => {
        timelineCard.classList.toggle('hidden', !showTimelineCheckbox.checked);
        saveOptions();
    });

    showRelatedCheckbox.addEventListener('change', () => {
        relatedCard.classList.toggle('hidden', !showRelatedCheckbox.checked);
        saveOptions();
    });

    // 7.5. 초기 설정
    // 초기 화면(home)에 해당하는 버튼을 활성화하고 뷰를 표시합니다.
    const initialButton = document.querySelector('.nav-btn[data-view="home"]');
    if (initialButton) {
        handleNavClick(initialButton);
    }
    // 난이도 라디오 버튼 기본값 선택 (중급)
    document.getElementById('level-intermediate').checked = true;

});