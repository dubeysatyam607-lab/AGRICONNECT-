import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

// Weather request schema
export const weatherRequestSchema = z.object({
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  city: z.string().max(100).optional(),
  checkAlerts: z.boolean().optional(),
});

// Mandi prices request schema
export const mandiPricesRequestSchema = z.object({
  state: z.string().max(100).optional(),
  district: z.string().max(100).optional(),
  commodity: z.string().max(100).optional(),
  searchQuery: z.string().max(100).optional(),
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
  conversationId: z.string().uuid().nullable().optional(),
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
  imageBase64: z.string().max(10 * 1024 * 1024).optional(), // 10MB max for base64 image
  language: z.string().max(50).optional(),
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
