// src/api/tractors/handler.ts
// Placeholder edge function for tractor rental data
// In production, replace with actual implementation that queries Supabase or external API.

export default async function handler(req, res) {
  // Simple health check
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  // TODO: Implement actual tractor data retrieval
  return res.status(200).json({ message: 'Tractor endpoint placeholder' });
}

export const config = {
  api: {
    bodyParser: false
  }
};
