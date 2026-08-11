const axios = require('axios');

/**
 * ElevenLabs High Quality Neural Text-to-Speech Controller.
 * Configured with eleven_multilingual_v2 for natural Indian Hindi conversational speech.
 */
exports.textToSpeech = async (req, res) => {
  try {
    const { text, languageCode = 'hi-IN' } = req.body;
    
    if (!text || typeof text !== 'string' || !text.trim()) {
      return res.status(400).json({ error: 'Text is required' });
    }

    const apiKey = process.env.ELEVEN_LABS_API_KEY || process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      console.error('ElevenLabs API Key is missing from environment variables.');
      return res.status(503).json({ error: 'ElevenLabs API key is missing' });
    }

    const voiceId = process.env.ELEVEN_LABS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM';
    const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream?output_format=mp3_44100_128`;

    const response = await axios({
      method: 'post',
      url,
      headers: {
        'Accept': 'audio/mpeg',
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      data: {
        text: text.trim(),
        model_id: 'eleven_multilingual_v2',
        voice_settings: {
          stability: 0.65,
          similarity_boost: 0.85,
          style: 0.15,
          use_speaker_boost: true,
        },
      },
      responseType: 'stream',
      timeout: 15000,
    });

    res.set({
      'Content-Type': 'audio/mpeg',
      'Transfer-Encoding': 'chunked',
      'Cache-Control': 'no-cache',
    });

    response.data.pipe(res);
  } catch (error) {
    const status = error?.response?.status || 500;
    const details = error?.response?.data || error.message;
    console.error('ElevenLabs TTS Controller Error:', status, details);
    res.status(status).json({ error: 'Failed to generate speech via ElevenLabs' });
  }
};
