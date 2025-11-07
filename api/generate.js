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

  const { input } = req.body;

  if (!input || !input.trim()) {
    return res.status(400).json({ error: '입력 내용이 필요합니다.' });
  }

  // API 키 확인
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('ANTHROPIC_API_KEY is not set');
    return res.status(500).json({ error: 'API 키가 설정되지 않았습니다.' });
  }

  try {
    console.log('Calling Anthropic API...');
    
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-5-haiku-20241022',
        max_tokens: 2000,
        messages: [{
          role: 'user',
          content: `당신은 객관식 질문 생성 전문가입니다. 사용자가 입력한 내용을 분석하여 객관식 질문으로 변환하세요.

📝 사용자 입력:
${input}

🎯 작업 지침:
1. 각 항목을 분석하여 "질문", "설명", "옵션"으로 구분
2. 질문은 명확하고 간결하게
3. 설명은 있으면 포함, 없으면 생략
4. 옵션은 **반드시 태그 형식**으로 (문장 X, 항목명 O)
   - 좋은 예: "에세이", "초등 1~3학년", "독서"
   - 나쁜 예: "에세이를 좋아합니다", "초등학교 1학년부터 3학년까지"

5. 여러 질문이 있으면 구분선(---)으로 분리

📋 출력 형식:
**질문:** [질문 내용]
**설명:** [설명 내용 또는 "없음"]
**옵션:**
- [옵션1]
- [옵션2]
- [옵션3]

---

**질문:** [다음 질문]
...

🚨 중요:
- 옵션은 무조건 짧은 단어/구문 (태그로 사용 가능)
- 문장 형태 금지
- "~합니다", "~입니다" 같은 서술 금지`
        }]
      })
    });

    console.log('API Response status:', response.status);

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Anthropic API Error:', errorData);
      return res.status(response.status).json({ 
        error: 'Anthropic API 오류',
        details: errorData 
      });
    }

    const data = await response.json();
    console.log('API Response received');

    if (data.content && data.content[0] && data.content[0].text) {
      return res.status(200).json({ result: data.content[0].text });
    } else {
      console.error('Unexpected response structure:', data);
      return res.status(500).json({ 
        error: '예상치 못한 응답 형식',
        details: data 
      });
    }
  } catch (error) {
    console.error('Exception:', error);
    return res.status(500).json({ 
      error: error.message,
      stack: error.stack 
    });
  }
}