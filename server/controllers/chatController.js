const { OpenAI } = require('openai'); // or @google/genai depending on user preference, the user allowed both. I will use openai

exports.kisanChat = async (req, res) => {
  try {
    const { message } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    if (message.length > 4000) {
      return res.status(400).json({ error: 'Message too long (max 4000 characters)' });
    }

    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    if (!OPENAI_API_KEY) {
      return res.status(500).json({ error: 'OpenAI API key is missing' });
    }

    const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

    const systemPrompt = `You are "Kisan AI" (किसान एआई), the intelligent farming assistant inside AgriConnect.

YOUR PRIMARY RULE:
Answer ONLY what the farmer actually asks. Never inject unrelated crop information, unrelated farm advice, unrelated schemes, unrelated weather, or stored farm context unless it is directly relevant to the current question.

- QUERY-FIRST INTELLIGENCE:
  - "tamatar ka bhav" -> Answer ONLY about tomato mandi price.
  - "soybean me kya spray karu?" -> Answer about soybean spray/treatment.
  - "aaj barish hogi?" -> Answer about weather.
  - "PM Kisan ka paisa kab aayega?" -> Answer about PM-KISAN.
  - "namaste" / "hello" -> Reply naturally: "Namaste! 👋 Main Kisan AI hoon. Aap kheti, fasal, mandi bhav, mausam, rog, khaad, sinchai ya sarkari yojana ke baare mein pooch sakte hain." Never dump crop advisories or weather for greetings.

- NO HALLUCINATION: Never invent mandi rates, disease diagnoses, or dosages. If live data is not available, state it clearly.
- CROP-SPECIFIC FOCUS: If a specific crop is asked, answer only for that crop.
- LANGUAGE: Reply in the same language/dialect as the user (Hindi, Hinglish, English, etc.).
- CONCISE & VOICE-FRIENDLY: 2-5 concise lines in plain prose without raw markdown symbols.`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      temperature: 0.1,
      max_tokens: 2000,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message.slice(0, 4000) }
      ],
      signal: AbortSignal.timeout(30000),
    });

    const reply = response.choices[0]?.message?.content;
    res.json({ reply });

  } catch (error) {
    console.error('Chat API Error:', error.message);
    res.status(500).json({ error: 'Failed to generate response' });
  }
};
