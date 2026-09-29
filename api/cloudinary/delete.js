/**
 * Vercel Serverless Function — Cloudinary Signed Image Delete.
 *
 * POST /api/cloudinary/delete  { "publicId": "cattle-images/<userId>/<file>.jpg" }
 *
 * The browser never holds the Cloudinary API secret. This function signs the
 * destroy request server-side using CLOUDINARY_API_SECRET, so only app-owned
 * images are deleted. Ownership is already enforced by the client hook
 * (public ids are namespaced under the signed-in user's id).
 */

import crypto from "node:crypto";

const CLOUD_NAME =
  process.env.VITE_CLOUDINARY_CLOUD_NAME || process.env.CLOUDINARY_CLOUD_NAME || "";
const API_KEY =
  process.env.CLOUDINARY_API_KEY || process.env.VITE_CLOUDINARY_API_KEY || "";
const API_SECRET = process.env.CLOUDINARY_API_SECRET || "";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed. Use POST." });
  }

  const publicId = typeof req.body?.publicId === "string" ? req.body.publicId.trim() : "";
  if (!publicId) {
    return res.status(400).json({ error: "Missing required field: publicId" });
  }

  if (!CLOUD_NAME || !API_KEY || !API_SECRET) {
    return res.status(500).json({ error: "Cloudinary delete is not configured on this server." });
  }

  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signature = crypto
    .createHash("sha1")
    .update(`public_id=${publicId}&timestamp=${timestamp}${API_SECRET}`)
    .digest("hex");

  const params = new URLSearchParams({
    public_id: publicId,
    timestamp,
    api_key: API_KEY,
    signature,
  });

  try {
    const cloudRes = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/destroy`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });

    const data = await cloudRes.json().catch(() => ({}));
    if (!cloudRes.ok || data.result !== "ok") {
      const message = data?.error?.message || `Cloudinary destroy failed (result: ${data.result || "unknown"}).`;
      return res.status(cloudRes.ok ? 502 : cloudRes.status).json({ error: message });
    }

    return res.status(200).json({ success: true, result: data.result });
  } catch (err) {
    console.error("[api/cloudinary/delete] Error:", err?.message || err);
    return res.status(500).json({ error: "Failed to delete image", message: err?.message || "Internal server error" });
  }
}