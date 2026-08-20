// src/api/mandi/handler.ts
// Placeholder edge function for Mandi price data
// Replace with actual implementation that calls the government APMC API or Supabase.

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  // TODO: Implement real mandi price retrieval
  return res.status(200).json({ message: 'Mandi endpoint placeholder' });
}

export const config = {
  api: {
    bodyParser: false
  }
};
