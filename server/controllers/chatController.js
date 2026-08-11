const { OpenAI } = require('openai'); // or @google/genai depending on user preference, the user allowed both. I will use openai

exports.kisanChat = async (req, res) => {
  try {
    const { message } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    if (!OPENAI_API_KEY) {
      return res.status(500).json({ error: 'OpenAI API key is missing' });
    }

    const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

    const systemPrompt = `You are 'Kisan Sahayak', an elite agronomist and crop doctor for Indian farmers. Your job is to provide 100% scientifically backed, practical advice on crop diseases (Smart Crop Doctor) and soil health/fertilizers (Mitti Jaanch).
- You must strictly answer questions related to agriculture, crops, pests, soil management, Indian mandis, and weather.
- If a user asks a question completely unrelated to agriculture, farming, or livestock, you must politely decline and say: 'I am Kisan Sahayak, your farming assistant. Please ask me questions related to agriculture or crop health.'
- If you do not have enough specific data to provide a highly accurate answer for a disease, say: 'I need more information or a clear photo of the leaf to diagnose this with 100% certainty. Please consult a local Krishi Vigyan Kendra if symptoms persist.'`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o', // or gpt-3.5-turbo
      temperature: 0.1, // Hyper-Accuracy
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message }
      ]
    });

    const reply = response.choices[0]?.message?.content;
    res.json({ reply });

  } catch (error) {
    console.error('Chat API Error:', error.message);
    res.status(500).json({ error: 'Failed to generate response' });
  }
};
