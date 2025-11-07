export default async function handler(req, res) {
  // CORS 설정
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { input, mode } = req.body;

  if (!input || !input.trim()) {
    return res.status(400).json({ error: '입력 내용이 필요합니다.' });
  }

  // API 키 확인
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('ANTHROPIC_API_KEY is not set');
    return res.status(500).json({ error: 'API 키가 설정되지 않았습니다.' });
  }

  try {
    // 1단계: 질문 명확화 모드
    if (mode === 'clarify') {
      console.log('Clarifying question...');
      
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-3-5-haiku-20241022',
          max_tokens: 500,
          messages: [{
            role: 'user',
            content: `다음 질문이 객관식 질문을 만들기에 충분히 구체적인지 판단하세요.

사용자 입력:
${input}

구체적이면: "OK"만 답변
불충분하면: "CLARIFY: [질문할 내용]" 형식으로 답변

예시:
- "글쓰기 관심사" → OK
- "학년" → CLARIFY: 어떤 학교급의 학년인가요? (초등/중등/고등)
- "선호도" → CLARIFY: 무엇에 대한 선호도인가요?

간단히 답변하세요.`
          }]
        })
      });

      const data = await response.json();

      if (data.content && data.content[0]) {
        const result = data.content[0].text.trim();
        
        if (result === 'OK') {
          return res.status(200).json({ status: 'ready' });
        } else if (result.startsWith('CLARIFY:')) {
          const question = result.replace('CLARIFY:', '').trim();
          return res.status(200).json({ 
            status: 'clarify', 
            question: question 
          });
        }
      }
    }

    // 2단계: 질문 생성 모드
    console.log('Generating questions...');
    
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-5-haiku-20241022',
        max_tokens: 1500,
        messages: [{
          role: 'user',
          content: `객관식 질문을 생성하세요.

입력:
${input}

규칙:
1. 질문은 명확하고 간결하게
2. 설명은 있으면 포함, 없으면 생략
3. 옵션은 태그 형식 (짧은 단어/구문)

출력 형식:
**질문:** [질문 내용]
**설명:** [설명 또는 "없음"]
**옵션:**
- [옵션1]
- [옵션2]
- [옵션3]`
        }]
      })
    });

    const data = await response.json();

    if (data.content && data.content[0]) {
      return res.status(200).json({ 
        status: 'complete',
        result: data.content[0].text 
      });
    } else {
      return res.status(500).json({ 
        error: '예상치 못한 응답 형식',
        details: data 
      });
    }
  } catch (error) {
    console.error('Exception:', error);
    return res.status(500).json({ 
      error: error.message
    });
  }
}