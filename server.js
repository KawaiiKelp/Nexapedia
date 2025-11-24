// server.js

// 1. 필요한 모듈 불러오기
const express = require('express');
const path = require('path');
const cors = require('cors'); // 프론트엔드와 통신을 위해 CORS 모듈 사용
const { GoogleGenAI } = require('@google/genai');

require('dotenv').config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// 키가 로드되었는지 확인하는 안전 장치 (선택 사항)
if (!GEMINI_API_KEY) {
    console.error("Fatal Error: GEMINI_API_KEY가 .env 파일에 설정되지 않았습니다!");
    process.exit(1); // 키가 없으면 서버 종료
}

const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
const app = express();
const PORT = 3000; // 백엔드 서버 포트 (프론트엔드와 다름)

// 2. 미들웨어 설정
// 모든 출처(origin)에서의 요청을 허용 (개발 단계에서 필수)
app.use(cors());
// JSON 요청 본문(body)을 파싱하기 위해 설정
app.use(express.json());

// 3. 정적 파일 서빙 설정
// 프로젝트 루트 디렉토리를 정적 파일 경로로 설정합니다.
// 이렇게 하면 브라우저에서 index.html, css/style.css, scripts/app.js에 접근 가능합니다.
app.use(express.static(path.join(__dirname)));

// ===========================================
// 4. API 엔드포인트 구현 (AI 연동 Mockup)
// ===========================================

/**
 * [AI 응답 구조 정의] (✅ diagramCode 필드 추가)
 */
const conceptSchema = {
    type: 'object',
    properties: {
        summary: { type: 'string', description: '검색어에 대한 2~3줄의 간결한 한 줄 요약' },
        levels: {
            type: 'object',
            properties: {
                basic: { type: 'string', description: '초등학생도 이해할 수 있는 쉬운 비유를 포함한 간략한 설명' },
                intermediate: { type: 'string', description: '핵심 원리와 기술 용어를 포함한 일반적인 설명' },
                advanced: { type: 'string', description: '수학적 모델링, 최신 연구 동향 등을 포함한 전문적인 설명' }
            },
        },
        // 🚨 누락된 'related' 속성 복구
        related: {
            type: 'array',
            items: { type: 'string' },
            description: '검색된 개념과 연관된 다른 키워드 5개'
        },
        // ✅ diagramCode 속성 유지
        diagramCode: {
            type: 'string',
            description: '개념의 구조나 흐름을 시각화하는 Mermaid 형식의 다이어그램 코드. 반드시 graph, flowchart, mindmap 중 하나를 사용하여 생성하고, 코드 블록(```mermaid ... ```)으로 감싸지 마세요.'
        },
        timeline: {
            type: 'array',
            description: '개념의 주요 발전 단계나 역사적 사건 목록을 시간순으로 나열하세요.',
            items: {
                type: 'object',
                properties: {
                    year: { type: 'string', description: '발생 연도 (예: 1886)' },
                    event: { type: 'string', description: '주요 사건 설명' }
                },
                required: ['year', 'event']
            }
        }
    },
    // ✅ required 배열 확인 (이제 properties와 일치합니다.)
    required: ['summary', 'levels', 'related', 'diagramCode']
};

/**
 * [AI 응답 구조 정의] 비교 검색 결과 구조를 정의합니다.
 */
const compareSchema = {
    type: 'object',
    properties: {
        summary: { type: 'string', description: '두 개념의 주요 차이점과 유사점을 요약한 3~5줄의 간결한 요약' },
        comparison: {
            type: 'array',
            description: '두 개념을 비교한 상세 표 데이터',
            items: {
                type: 'object',
                properties: {
                    criteria: { type: 'string', description: '비교 기준 (예: 핵심 목표, 주요 작동 원리)' },
                    conceptA: { type: 'string', description: '개념 A에 대한 설명' },
                    conceptB: { type: 'string', description: '개념 B에 대한 설명' }
                },
                required: ['criteria', 'conceptA', 'conceptB']
            }
        }
    },
    required: ['summary', 'comparison']
};

/**
 * [API 1] 단일 개념 검색 엔드포인트 (Gemini 연동)
 */
app.post('/api/search', async (req, res) => {
    // ✅ 수정: req.body에서 query와 함께 level 값을 가져옵니다.
    const { query, level } = req.body;

    console.log(`[🔍 AI 호출 시작] 단일 검색 요청: "${query}", 난이도: ${level}`);

    try {
        const prompt = `당신은 지식을 요약하고 구조화하고 시각화하는 전문 AI 백과사전 챗봇입니다. 사용자가 요청한 개념 "${query}"에 대해 아래의 JSON 스키마에 맞춰 정확하고 상세한 답변을 생성하세요. 

                        현재 사용자가 선택한 요구 난이도는 ${level}입니다. 또한, 해당 개념을 가장 잘 설명할 수 있는 구조나 흐름을 나타내는 엄격한 Mermaid 다이어그램 코드를 생성하여 'diagramCode' 필드에 넣어주세요.

                        Mermaid 코드를 생성할 때 다음 규칙을 반드시 지키세요:
                        1. 코드는 반드시 'graph TD', 'flowchart TD', 또는 'mindmap' 중 하나로 시작해야 합니다.
                        2. 노드 이름이나 텍스트에 띄어쓰기, 특수문자, 한국어가 포함될 경우, 반드시 큰따옴표("...")로 감싸야 합니다. (예: A["노드 이름"] --> B["다른 노드"]).
                        3. 마인드맵(mindmap)을 사용할 경우, 노드 텍스트는 반드시 괄호 안에 넣고 들여쓰기를 정확히 사용해야 합니다.

                        답변은 반드시 한국어로 작성되어야 하며, 각 난이도별 설명은 해당 난이도에 맞는 깊이와 용어를 사용해야 합니다. 사용자에게 되도록 존댓말로 답변하세요.`;

        // Gemini API 호출 및 Function Calling(JSON 출력) 설정
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            config: {
                responseMimeType: "application/json",
                responseSchema: conceptSchema,
                // 토큰 사용량을 최적화하기 위해 온도(temperature)를 낮춥니다.
                temperature: 0.2,
            },
        });
        // ✅ 추가: AI의 응답 텍스트를 콘솔에 출력하여 디버깅합니다.
        console.log('--- [AI Raw JSON Response START] ---');
        console.log(response.text);
        console.log('--- [AI Raw JSON Response END] ---');

        //         // Gemini는 JSON 문자열로 응답하므로 파싱이 필요합니다.
        const jsonText = response.text.trim();
        const aiData = JSON.parse(jsonText);

        console.log(`[✅ AI 응답 성공] "${query}"에 대한 응답을 프론트엔드로 전송`);
        res.json(aiData);

    } catch (error) {
        console.error('[❌ AI 호출 실패]', error);
        // 클라이언트에게 오류 메시지 전달
        res.status(500).json({
            error: "AI 서버 응답 처리 중 오류가 발생했습니다.",
            details: error.message
        });
    }
});

/**
 * [API 2] 두 개념 비교 검색 엔드포인트 (✅ Gemini 연동)
 */
app.post('/api/compare', async (req, res) => {
    const { conceptA, conceptB } = req.body;

    console.log(`[⚖️ AI 호출 시작] 비교 검색 요청: "${conceptA}" vs "${conceptB}"`);

    try {
        const prompt = `당신은 지식을 구조적으로 비교하는 전문 AI 백과사전 챗봇입니다. 사용자가 요청한 두 개념 "${conceptA}"와 "${conceptB}"를 비교 분석하여 아래의 JSON 스키마에 맞춰 상세한 답변을 생성하세요. 답변은 반드시 한국어로 작성되어야 하며, 최소 5가지 이상의 명확한 비교 기준(Criteria)을 제시해야 합니다.`;

        // Gemini API 호출 (비교 스키마 사용)
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            config: {
                responseMimeType: "application/json",
                responseSchema: compareSchema, // 새로 정의한 스키마 사용
                temperature: 0.2,
            },
        });

        const jsonText = response.text.trim();
        const aiData = JSON.parse(jsonText);

        console.log(`[✅ AI 응답 성공] 비교 결과 응답을 프론트엔드로 전송`);
        res.json(aiData);

    } catch (error) {
        console.error('[❌ AI 비교 호출 실패]', error);
        res.status(500).json({
            error: "AI 비교 서버 응답 처리 중 오류가 발생했습니다.",
            details: error.message
        });
    }
});


// 5. 서버 시작
app.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(`🚀 Nexapedia 백엔드 서버가 http://localhost:${PORT} 에서 실행 중입니다.`);
    console.log(`====================================================`);
    console.log(`프론트엔드(index.html)를 열고 테스트를 진행해 주세요.`);
});