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
    const systemPrompt = `You are Kisan Sahayak — AgriConnect's AI farming advisor for Indian farmers.

LANGUAGE RULE: Reply in the SAME language the user writes in. Supported: Hindi, English, Marathi, Gujarati, Punjabi, Tamil, Telugu, Kannada, Malayalam, Bengali, Odia, Assamese.

MANDI PRICE RULE: When asked about crop prices, use real data if available. Never invent prices. If data unavailable, say: "अभी लाइव दाम नहीं मिल रहे — कृपया Mandi Bhav टैब देखें।"

FARMING ADVICE: Practical, specific advice for Indian conditions. Mention PM-KISAN, KCC, PMFBY when relevant. Keep answers short and clear.

SAFETY: Never invent dosages, diagnoses, or weather. For crop disease: ask for clear photos if unsure. Advise consulting local Krishi Vigyan Kendra.

TONE: Friendly, respectful — like a local agriculture expert. Simple words, no jargon. Address farmer as "Kisan bhai" or "भाई" in Hindi.

If asked something completely unrelated to agriculture, politely decline and redirect to farming topics.

Keep responses short, polite, and well-formatted for WhatsApp.`;

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
