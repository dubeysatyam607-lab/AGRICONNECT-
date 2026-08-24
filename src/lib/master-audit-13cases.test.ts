import { describe, it, expect } from "vitest";
import { getLocalAnswer } from "./local-advisor";
import { getCropImage } from "./crop-images";
import { getMachineImage } from "./machine-images";
import { getStoreProductImage, resolveImage } from "./image-resolver";
import { extractEntities } from "@/core/voice/entities";
import { correctTranscription } from "@/core/voice/stt";
import { sanitizeForSpeech } from "@/core/voice/sanitize";
import type { FarmProfile } from "@/contexts/FarmContext";

const profile: FarmProfile = {
  farmerName: "Ramesh Patel",
  phone: "9876543210",
  state: "Madhya Pradesh",
  district: "Indore",
  village: "Sanwer",
  crop: "Wheat",
  variety: "Sharbati",
  stage: "Tillering",
  farmArea: 4,
  soilType: "Black Soil",
  irrigationSource: "Tubewell",
  preferredLanguage: "hi",
  savedAt: "2026-08-24T00:00:00.000Z",
};

describe("AgriConnect Master Audit — 13 Production Acceptance Tests", () => {
  // CASE 1: "tamatar ka bhav" -> Understands tomato, asks for mandi, never responds with soybean
  it("CASE 1: 'tamatar ka bhav' identifies Tomato, asks for mandi, and never responds with Soybean", () => {
    const res = getLocalAnswer("tamatar ka bhav", profile, "hi");
    expect(res.matched).toBe(true);
    expect(res.text).toContain("Kaunsi mandi");
    expect(res.text).toContain("Tamatar");
    expect(res.text).not.toContain("Soybean");
    expect(res.text).not.toContain("Soyabean");
  });

  // CASE 2: "indore mandi me tamatar ka bhav" -> Real available mandi data
  it("CASE 2: 'indore mandi me tamatar ka bhav' returns real available Indore Tomato data", () => {
    const res = getLocalAnswer("indore mandi me tamatar ka bhav", profile, "hi");
    expect(res.matched).toBe(true);
    expect(res.text).toContain("Indore Mandi");
    expect(res.text).toContain("Tomato");
    expect(res.text).toContain("Minimum");
    expect(res.text).toContain("Maximum");
    expect(res.text).toContain("Modal");
    expect(res.text).toContain("₹");
    expect(res.text).not.toContain("Soybean");
  });

  // CASE 3: "गेहूं का भाव क्या है?" -> Hindi/Hinglish response
  it("CASE 3: 'गेहूं का भाव क्या है?' returns Hindi response", () => {
    const res = getLocalAnswer("गेहूं का भाव क्या है", profile, "hi");
    expect(res.matched).toBe(true);
    expect(res.text).toContain("मंडी");
    expect(res.text).toContain("गेहूं");
  });

  // CASE 4: "bhai soyabean ka rate batao" -> Soybean data, NOT tomato
  it("CASE 4: 'bhai soyabean ka rate batao' returns Soybean data, never Tomato", () => {
    const res = getLocalAnswer("bhai soyabean ka rate batao", profile, "hi");
    expect(res.matched).toBe(true);
    expect(res.text).toContain("Soyabean");
    expect(res.text).not.toContain("Tomato");
    expect(res.text).not.toContain("Tamatar");
  });

  // CASE 5 & 6: Phonetic STT transcript correction
  it("CASE 5 & 6: Speech transcript normalization corrects farmer variations", () => {
    const corrected1 = correctTranscription("tamatr ka baav kya hai");
    expect(corrected1).toBe("tamatar ka bhav kya hai");

    const corrected2 = correctTranscription("bhai indor mandi me soya been ka rate");
    expect(corrected2).toContain("Indore");
    expect(corrected2).toContain("soyabean");
  });

  // CASE 7: Entity protection strictly extracts crop and intent
  it("CASE 7: Entity extractor accurately distinguishes tomato from soybean", () => {
    const e1 = extractEntities("tamatar ka bhav kya hai");
    expect(e1.crop).toBe("tomato");
    expect(e1.intent).toBe("mandi_price");

    const e2 = extractEntities("bhai indore mandi me soyabean ka rate");
    expect(e2.crop).toBe("soybean");
    expect(e2.mandi?.toLowerCase()).toBe("indore");
    expect(e2.intent).toBe("mandi_price");
  });

  // CASE 8: TTS Text Sanitize removes symbols, URLs, asterisks for natural speech
  it("CASE 8: TTS Text Sanitize cleans markdown, asterisks, and currencies for natural speech", () => {
    const raw = "📍 **Tamatar (Tomato)** — Indore Mandi (MP)\n\n• Minimum: **₹1,500/quintal**\n• Maximum: **₹2,200/quintal**";
    const cleaned = sanitizeForSpeech(raw, "hi");
    expect(cleaned).not.toContain("**");
    expect(cleaned).not.toContain("•");
    expect(cleaned).not.toContain("📍");
    expect(cleaned).toContain("रुपये");
  });

  // CASE 9: Real Tractor photograph visible
  it("CASE 9: Tractor section resolves authentic tractor photography", () => {
    const mahindra = getMachineImage("Mahindra 575 DI", "tractor");
    expect(mahindra).toMatch(/https:\/\/images\.(unsplash|pexels)\.com/);

    const sonalika = getMachineImage("Sonalika Tiger 55", "tractor");
    expect(sonalika).toMatch(/https:\/\/images\.(unsplash|pexels)\.com/);
  });

  // CASE 10: Real Harvester photograph visible
  it("CASE 10: Harvester section resolves authentic harvester photography", () => {
    const claas = getMachineImage("CLAAS Dominator", "harvester");
    expect(claas).toMatch(/https:\/\/images\.(unsplash|pexels)\.com/);

    const fieldking = getMachineImage("FieldKing Harvester", "harvester");
    expect(fieldking).toMatch(/https:\/\/images\.(unsplash|pexels)\.com/);
  });

  // CASE 11: Real Tomato photograph visible
  it("CASE 11: Tomato crop resolves authentic tomato photography", () => {
    const tomato = getCropImage("Tomato");
    expect(tomato).toMatch(/https:\/\/images\.(unsplash|pexels)\.com/);
  });

  // CASE 12: Real Agri Store product photograph visible
  it("CASE 12: Agri Store products resolve authentic product photography", () => {
    const urea = getStoreProductImage("Neem Coated Urea (45kg)", "Fertilizer");
    expect(urea).toMatch(/https:\/\/images\.(unsplash|pexels)\.com/);

    const sprayer = getStoreProductImage("16L Battery Operated Knapsack Sprayer", "Equipment");
    expect(sprayer).toMatch(/https:\/\/images\.(unsplash|pexels)\.com/);
  });

  // CASE 13: Centralized resolveImage options API
  it("CASE 13: Unified resolveImage API provides guaranteed resolution across categories", () => {
    const imgCrop = resolveImage({ entityType: "crop", entityName: "Wheat" });
    expect(imgCrop).toMatch(/https:\/\/images\.(unsplash|pexels)\.com/);

    const imgMachinery = resolveImage({ entityType: "machinery", entityName: "Shaktiman Cultivator" });
    expect(imgMachinery).toMatch(/https:\/\/images\.(unsplash|pexels)\.com/);
  });

  // CASE 14: Name and identity questions do NOT false-match mango ('aam')
  it("CASE 14: User identity questions answer with name and never trigger mango", () => {
    const entity = extractEntities("mera naam kya hai");
    expect(entity.crop).toBeNull();

    const ans = getLocalAnswer("mera naam kya hai", { name: "Ramesh Patel", village: "Sanwer", crop: "Soybean" }, "hi");
    expect(ans.text).toContain("Ramesh Patel");
    expect(ans.text.toLowerCase()).not.toContain("mango");
    expect(ans.text.toLowerCase()).not.toContain("आम");
  });
});
