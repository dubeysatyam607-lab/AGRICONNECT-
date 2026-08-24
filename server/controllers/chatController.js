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

    const systemPrompt = `You are Kisan Sahayak — AgriConnect's AI farming advisor for Indian farmers.

LANGUAGE RULE: Reply in the SAME language the user writes in. Supported: Hindi, English, Marathi, Gujarati, Punjabi, Tamil, Telugu, Kannada, Malayalam, Bengali, Odia, Assamese.

MANDI PRICE RULE: When asked about crop prices, always use real data if available. Format: "आज [मंडी] में [फसल] का भाव ₹[X]/quintal है।" Never invent prices.

CROP FOCUS: Answer ONLY about the exact crop asked. Never substitute crops. If unclear, ask.

FARMING ADVICE: Give practical, specific advice for Indian conditions. Mention PM-KISAN, KCC, PMFBY when relevant. Keep answers short.

SAFETY: Never invent dosages, diagnoses, or weather data. Be honest when data is unavailable.

TONE: Friendly, respectful — like a local agriculture expert. Simple words, no jargon. Address farmer as "Kisan bhai" or "भाई" in Hindi.

VOICE-FRIENDLY: 2-5 concise lines, plain prose, no markdown symbols.`;

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
