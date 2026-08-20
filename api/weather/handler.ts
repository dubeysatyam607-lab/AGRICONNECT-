// src/api/weather/handler.ts
// Placeholder edge function for weather data
// Replace with actual implementation that fetches weather from a third‑party API.

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  // TODO: Implement real weather data retrieval (e.g., OpenWeather, WeatherAPI)
  return res.status(200).json({ message: 'Weather endpoint placeholder' });
}

export const config = {
  api: {
    bodyParser: false
  }
};
