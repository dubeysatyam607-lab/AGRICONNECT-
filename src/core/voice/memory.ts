/**
 * VoiceEngine — assistant memory.
 *
 * A lightweight long-term memory so the assistant never repeatedly asks for
 * the farmer's name, village, crop or stage. Facts are extracted from the
 * farm profile and from everyday conversation, then fed back into the
 * assistant's context on every turn.
 */

const MEMORY_KEY = "agri_assistant_memory_v1";

export interface AssistantMemory {
  name: string;
  village: string;
  district: string;
  state: string;
  crop: string;
  variety: string;
  stage: string;
  farmArea: number;
  soilType: string;
  irrigation: string;
  visits: number;
  lastSeen: number;
  firstSeen: number;
  /** Free-form facts picked up from conversation. */
  facts: Record<string, string>;
  /** Topics the farmer has asked about recently. */
  topics: string[];
}

const EMPTY: AssistantMemory = {
  name: "", village: "", district: "", state: "", crop: "", variety: "",
  stage: "", farmArea: 0, soilType: "", irrigation: "", visits: 0,
  lastSeen: 0, firstSeen: 0, facts: {}, topics: [],
};

export function readMemory(): AssistantMemory {
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = localStorage.getItem(MEMORY_KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as AssistantMemory;
    return { ...EMPTY, ...parsed, facts: { ...EMPTY.facts, ...(parsed.facts || {}) }, topics: Array.isArray(parsed.topics) ? parsed.topics : [] };
  } catch {
    return EMPTY;
  }
}

export function writeMemory(memory: AssistantMemory): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(MEMORY_KEY, JSON.stringify(memory));
  } catch {
    // storage full / private mode — ignore
  }
}

/** Seed memory from the farmer's profile on first use. */
export function rememberProfile(input: {
  name?: string; village?: string; district?: string; state?: string;
  crop?: string; variety?: string; stage?: string; farmArea?: number;
  soilType?: string; irrigation?: string;
}): AssistantMemory {
  const m = readMemory();
  m.name = input.name || m.name;
  m.village = input.village || m.village;
  m.district = input.district || m.district;
  m.state = input.state || m.state;
  m.crop = input.crop || m.crop;
  m.variety = input.variety || m.variety;
  m.stage = input.stage || m.stage;
  if (input.farmArea) m.farmArea = input.farmArea;
  m.soilType = input.soilType || m.soilType;
  m.irrigation = input.irrigation || m.irrigation;
  m.visits = m.visits ? m.visits + 1 : 1;
  m.lastSeen = Date.now();
  if (!m.firstSeen) m.firstSeen = Date.now();
  writeMemory(m);
  return m;
}

const FACT_PATTERNS: Array<{ key: string; regex: RegExp; transform?: (v: string) => string }> = [
  {
    key: "name",
    regex: /\b(?:my name is|i am|मेरा नाम|नाम)\s+([^.!?।,\n]+?)(?:\s+(?:and|but|then|i)\s+|[.!?।,]|$)/i,
    transform: (v) => v.trim(),
  },
  {
    key: "village",
    regex: /\b(?:i am from|i live in|my village|गांव|गाँव)\s+([^.!?।,\n]+?)(?:\s+(?:and|but|then|i)\s+|[.!?।,]|$)/i,
    transform: (v) => v.trim(),
  },
  {
    key: "crop",
    regex: /\b(?:i grow|i am growing|i planted|उगाता|बोता|फसल)\s+([^.!?।,\n]+?)(?:\s+(?:and|but|then|i)\s+|[.!?।,]|$)/i,
    transform: (v) => v.trim(),
  },
];

/** Extract a few facts from a farmer's message ("my name is Ramesh"). */
export function extractFacts(text: string): Record<string, string> {
  const found: Record<string, string> = {};
  for (const pattern of FACT_PATTERNS) {
    const match = text.match(pattern.regex);
    if (match && match[1]) {
      const value = pattern.transform ? pattern.transform(match[1]) : match[1].trim();
      if (value && value.length <= 48) found[pattern.key] = value;
    }
  }
  return found;
}

export function updateMemory(partial: Partial<AssistantMemory> | ((m: AssistantMemory) => void)): AssistantMemory {
  const m = readMemory();
  if (typeof partial === "function") {
    partial(m);
  } else {
    Object.assign(m, partial);
  }
  m.lastSeen = Date.now();
  writeMemory(m);
  return m;
}

/** Remember a recently asked topic (deduped, capped). */
export function rememberTopic(topic: string): void {
  if (!topic.trim()) return;
  updateMemory((m) => {
    m.topics = [topic.trim().slice(0, 60), ...m.topics.filter((x) => x !== topic)].slice(0, 8);
  });
}

/** Build a personalised context block to inject into the assistant prompt. */
export function buildMemoryContext(memory: AssistantMemory): string {
  const parts: string[] = [];
  if (memory.name) parts.push(`Farmer name: ${memory.name}`);
  if (memory.village) parts.push(`Village: ${memory.village}${memory.district ? `, ${memory.district}` : ""}`);
  if (memory.state) parts.push(`State: ${memory.state}`);
  if (memory.crop) parts.push(`Crop: ${memory.crop}${memory.variety ? ` (${memory.variety})` : ""}`);
  if (memory.stage) parts.push(`Crop stage: ${memory.stage}`);
  if (memory.farmArea) parts.push(`Farm size: ${memory.farmArea} acres`);
  if (memory.soilType) parts.push(`Soil type: ${memory.soilType}`);
  if (memory.irrigation) parts.push(`Irrigation: ${memory.irrigation}`);
  if (parts.length === 0) return "";
  return `Known farmer context: ${parts.join("; ")}. Address the farmer by name if known, and never ask again for information already known.`;
}
