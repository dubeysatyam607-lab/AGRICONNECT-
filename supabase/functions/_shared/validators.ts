import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

// Weather request schema
export const weatherRequestSchema = z.object({
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  city: z.string().max(100).optional(),
  checkAlerts: z.boolean().optional(),
});

// Mandi prices request schema
// `sync` forces a live data.gov.in refresh (upsert + serve). `includeMeta`
// asks for dynamic discovery lists (states/districts/markets/commodities).
// `limit`/`offset` enable server-side pagination of the price rows.
export const mandiPricesRequestSchema = z.object({
  state: z.string().max(100).optional(),
  district: z.string().max(100).optional(),
  commodity: z.string().max(100).optional(),
  market: z.string().max(100).optional(),
  searchQuery: z.string().max(100).optional(),
  sync: z.boolean().optional(),
  includeMeta: z.boolean().optional(),
  limit: z.number().int().min(1).max(10000).optional(),
  offset: z.number().int().min(0).max(100000).optional(),
});

// Kisan chat request schema
export const kisanChatRequestSchema = z.object({
  messages: z.array(z.object({
    role: z.enum(["user", "assistant", "system"]),
    content: z.string().max(10000),
  })).max(50),
  language: z.string().max(50).optional(),
  persona: z.string().max(2000).optional(),
  memoryContext: z.string().max(4000).optional(),
  conversationId: z.string().max(100).nullable().optional(),
  userLocation: z.object({
    latitude: z.number().min(-90).max(90).optional(),
    longitude: z.number().min(-180).max(180).optional(),
  }).optional(),
  farmContext: z.object({
    crop: z.string().max(200).optional(),
    variety: z.string().max(200).optional(),
    stage: z.string().max(200).optional(),
    area: z.string().max(200).optional(),
    soil: z.string().max(200).optional(),
  }).optional(),
});

// Crop doctor request schema
export const cropDoctorRequestSchema = z.object({
  description: z.string().max(5000).optional(),
  imageBase64: z.string().max(12 * 1024 * 1024).optional(), // 12MB char cap — base64 inflates ~1.33x; binary cap enforced server-side
  imagesBase64: z.array(z.string().max(12 * 1024 * 1024)).max(4).optional(),
  language: z.string().max(50).optional(),
  storagePath: z.string().max(500).nullable().optional(),   // private bucket object path
  mimeType: z.string().max(50).optional(),
  farmContext: z.object({
    crop: z.string().max(200).optional(),
    variety: z.string().max(200).optional(),
    stage: z.string().max(200).optional(),
    area: z.string().max(200).optional(),
    soil: z.string().max(200).optional(),
    location: z.string().max(200).optional(),
  }).optional(),
});

// Nearby services (mandis / agri shops) request schema
export const nearbyServicesRequestSchema = z.object({
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  type: z.enum(["markets", "shops", "all"]).optional(),
});

// Contact request schema
export const contactRequestSchema = z.object({
  listingId: z.string().uuid(),
  message: z.string().max(500).optional(),
  reveal: z.boolean().optional().default(false),
});

// Live Agriculture Information System (agri-data) request schema
export const agriDataContentTypes = ["schemes", "news", "msp", "insurance", "loans"] as const;
export const agriDataRequestSchema = z.object({
  action: z.enum(["content", "search", "freshness", "report", "sync"]).default("content"),
  type: z.enum(agriDataContentTypes).optional(),
  q: z.string().max(200).optional(),
  filters: z.object({
    category: z.string().max(100).optional(),
    level: z.enum(["central", "state"]).optional(),
    state: z.string().max(100).optional(),
    season: z.string().max(100).optional(),
    year: z.string().max(20).optional(),
    crop: z.string().max(100).optional(),
    loanType: z.enum(["kcc", "crop_loan", "term_loan", "machinery_loan", "other"]).optional(),
    status: z.string().max(50).optional(),
  }).optional(),
  limit: z.number().int().min(1).max(100).optional(),
  offset: z.number().int().min(0).max(1000).optional(),
  jobs: z.array(z.enum(["scheme", "news", "msp"])).max(5).optional(),
});

// Validation error response helper
export function validationErrorResponse(error: z.ZodError, corsHeaders: Record<string, string>) {
  const errors = error.errors.map(e => `${e.path.join('.')}: ${e.message}`);
  return new Response(
    JSON.stringify({ 
      error: "Invalid request data", 
      details: errors 
    }),
    { 
      status: 400, 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    }
  );
}

// Parse JSON safely with Zod validation
export async function parseAndValidate<T>(
  req: Request, 
  schema: z.ZodSchema<T>,
  corsHeaders: Record<string, string>
): Promise<{ success: true; data: T } | { success: false; response: Response }> {
  try {
    const json = await req.json();
    const result = schema.safeParse(json);
    
    if (!result.success) {
      return { 
        success: false, 
        response: validationErrorResponse(result.error, corsHeaders) 
      };
    }
    
    return { success: true, data: result.data };
  } catch {
    return { 
      success: false, 
      response: new Response(
        JSON.stringify({ error: "Invalid JSON body" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    };
  }
}
