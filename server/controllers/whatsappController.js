const { OpenAI } = require('openai');

const VERIFY_TOKEN = process.env.WHATSAPP_WEBHOOK_TOKEN;
const MAX_MESSAGE_LENGTH = 2000;

exports.whatsappWebhook = async (req, res) => {
  try {
    // Optional webhook token verification. When WHATSAPP_WEBHOOK_TOKEN is set,
    // requests must present it (body.token or hub.verify_token) to be processed,
    // preventing anonymous OpenAI credit abuse.
    if (VERIFY_TOKEN) {
      const provided =
        (typeof req.body?.token === 'string' && req.body.token) ||
        (typeof req.query?.hub?.verify_token === 'string' && req.query.hub.verify_token) ||
        (typeof req.query?.verify_token === 'string' && req.query.verify_token);
      if (provided !== VERIFY_TOKEN) {
        return res.status(401).send('Unauthorized webhook request');
      }
    }

    const incomingMsg = (typeof req.body?.Body === 'string' ? req.body.Body : '').slice(0, MAX_MESSAGE_LENGTH);
    const sender = req.body?.From;
    const mediaUrl = req.body?.MediaUrl0;

    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    if (!OPENAI_API_KEY) {
      console.error("OpenAI API key missing");
      return res.status(500).send("Configuration Error");
    }

    const openai = new OpenAI({ apiKey: OPENAI_API_KEY });
    let textToProcess = incomingMsg;

    // 1. If it's a voice note, we would normally download the mediaUrl and use Whisper API.
    if (mediaUrl) {
      // MOCK: In production, download from mediaUrl -> save as audio.ogg -> openai.audio.transcriptions.create
      // For now, we simulate receiving translated text if they send media.
      textToProcess = "Mock transcribed audio: " + (incomingMsg || "Hello Kisan Sahayak");
    }

    if (!textToProcess) {
      // Return a basic TwiML response for Twilio
      const twiml = `
        <Response>
          <Message>Namaste! Please send a text or voice note regarding agriculture, soil, or mandi prices.</Message>
        </Response>
      `;
      res.set('Content-Type', 'text/xml');
      return res.send(twiml);
    }

    // 2. Process with AI Doctor logic (same prompt as the app)
    const systemPrompt = `You are 'Kisan Sahayak', an elite agronomist and crop doctor for Indian farmers. Your job is to provide 100% scientifically backed, practical advice on crop diseases (Smart Crop Doctor) and soil health/fertilizers (Mitti Jaanch).
- You must strictly answer questions related to agriculture, crops, pests, soil management, Indian mandis, and weather.
- If a user asks a question completely unrelated to agriculture, farming, or livestock, you must politely decline and say: 'I am Kisan Sahayak, your farming assistant. Please ask me questions related to agriculture or crop health.'
- If you do not have enough specific data to provide a highly accurate answer for a disease, say: 'I need more information or a clear photo of the leaf to diagnose this with 100% certainty. Please consult a local Krishi Vigyan Kendra if symptoms persist.'
- Keep responses short, polite, and well-formatted for WhatsApp.`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      temperature: 0.1,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: textToProcess }
      ]
    });

    const reply = response.choices[0]?.message?.content;

    // 3. Return the response back to WhatsApp
    const twiml = `
      <Response>
        <Message>${reply}</Message>
      </Response>
    `;

    res.set('Content-Type', 'text/xml');
    res.send(twiml);

  } catch (error) {
    console.error('WhatsApp Webhook Error:', error.message);
    res.status(500).send("Internal Server Error");
  }
};
