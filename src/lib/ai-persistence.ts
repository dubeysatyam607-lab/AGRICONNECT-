import { supabase } from "@/integrations/supabase/client";

/**
 * Client-side data access for AI persistence (spec §7 chat memory, §16 scan
 * history). All reads are scoped by Supabase RLS to the signed-in user, so a
 * user can never see another user's conversations or scans. Guests get null.
 */

export interface StoredConversation {
  id: string;
  title: string;
  language: string;
  updated_at: string;
  created_at: string;
}

export interface StoredChatMessage {
  id: string;
  conversation_id: string;
  role: "user" | "assistant";
  content: string;
  language: string | null;
  tool_calls: unknown[] | null;
  created_at: string;
}

export interface StoredScan {
  id: string;
  crop: string | null;
  plant_part: string | null;
  health_status: string | null;
  possible_issue: string | null;
  confidence: number | null;
  urgency: string | null;
  image_url: string | null;
  symptoms: unknown[] | null;
  recommendations: unknown[] | null;
  created_at: string;
}

const byRecent = (a: { updated_at: string }, b: { updated_at: string }) =>
  new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();

/** List the signed-in user's conversations (most recent first). */
export async function fetchConversations(): Promise<StoredConversation[]> {
  const { data, error } = await supabase
    .from("ai_conversations")
    .select("id, title, language, updated_at, created_at")
    .order("updated_at", { ascending: false })
    .limit(50);
  if (error) return [];
  return (data as StoredConversation[]) ?? [];
}

/** Load a single conversation's messages in chronological order. */
export async function fetchConversationMessages(conversationId: string): Promise<StoredChatMessage[]> {
  const { data, error } = await supabase
    .from("ai_messages")
    .select("id, conversation_id, role, content, language, tool_calls, created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });
  if (error) return [];
  return (data as StoredChatMessage[]) ?? [];
}

/** Soft-delete a conversation (RLS limits to the owner). */
export async function deleteConversation(conversationId: string): Promise<boolean> {
  const { error } = await supabase
    .from("ai_conversations")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", conversationId);
  return !error;
}

/** Create a new conversation shell. Returns null when signed out or on error. */
export async function createConversation(title: string, language: string): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data, error } = await supabase
    .from("ai_conversations")
    .insert({ user_id: user.id, title, language })
    .select("id")
    .single();
  if (error || !data) return null;
  return data.id as string;
}

/** List the signed-in user's crop scans (most recent first). */
export async function fetchScanHistory(limit = 20): Promise<StoredScan[]> {
  const { data, error } = await supabase
    .from("crop_scans")
    .select("id, crop, plant_part, health_status, possible_issue, confidence, urgency, image_url, symptoms, recommendations, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) return [];
  return (data as StoredScan[]) ?? [];
}

/** Permanently delete one of the user's scans. */
export async function deleteScan(scanId: string): Promise<boolean> {
  const { error } = await supabase.from("crop_scans").delete().eq("id", scanId);
  return !error;
}

/** Pull the latest scan for use as chat context (spec §17 AI + scan integration). */
export async function fetchLatestScan(): Promise<StoredScan | null> {
  const scans = await fetchScanHistory(1);
  return scans[0] ?? null;
}

export { byRecent };
