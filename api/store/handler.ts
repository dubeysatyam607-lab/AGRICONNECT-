// src/api/store/handler.ts
// Placeholder edge function for AgriStore data
// Replace with actual implementation that fetches store items from Supabase or external API.

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  // TODO: Implement real store data retrieval
  return res.status(200).json({ message: 'Store endpoint placeholder' });
}

export const config = {
  api: {
    bodyParser: false
  }
};
