import { describe, it, expect } from "vitest";
import { getLocalAnswer } from "./local-advisor";
import type { FarmProfile } from "@/contexts/FarmContext";

const mockProfile: FarmProfile = {
  farmerName: "Rajesh Kumar",
  phone: "9876543210",
  state: "Madhya Pradesh",
  district: "Indore",
  village: "Sanwer",
  crop: "Wheat",
  variety: "Sharbati",
  stage: "Tillering",
  farmArea: 5,
  soilType: "Black Soil",
  irrigationSource: "Borewell",
  preferredLanguage: "hi",
  savedAt: "2026-08-21T00:00:00.000Z",
};

describe("Kisan AI Local Advisor — Knowledge & Intent Accuracy", () => {
  it("answers natural greetings politely without dumping raw crop data", () => {
    const resHi = getLocalAnswer("Namaste", mockProfile, "hi");
    expect(resHi.matched).toBe(true);
    expect(resHi.text).toContain("नमस्ते");

    const resEn = getLocalAnswer("Hello", mockProfile, "en");
    expect(resEn.matched).toBe(true);
    expect(resEn.text).toContain("Hello");
  });

  it("answers polite thank you messages", () => {
    const res = getLocalAnswer("Dhanyawad", mockProfile, "hi");
    expect(res.matched).toBe(true);
    expect(res.text).toContain("स्वागत");
  });

  it("provides specific frost / pala protection advice", () => {
    const res = getLocalAnswer("Pala se fasal kaise bachaye", mockProfile, "hi");
    expect(res.matched).toBe(true);
    expect(res.text).toContain("पाला");
    expect(res.text).toContain("सिंचाई");
  });

  it("provides specific heatwave / summer care advice", () => {
    const res = getLocalAnswer("Garmi me fasal ko kaise bachaye", mockProfile, "hi");
    expect(res.matched).toBe(true);
    expect(res.text).toContain("गर्मी");
  });

  it("provides organic farming and bio-fertilizer guidance", () => {
    const res = getLocalAnswer("Jeevamrit kaise banaye", mockProfile, "hi");
    expect(res.matched).toBe(true);
    expect(res.text).toContain("जीवामृत");
  });

  it("provides specific crop fertilizer advice for requested crop even if profile is different", () => {
    const resTomato = getLocalAnswer("Tomato fertilizer dose", mockProfile, "en");
    expect(resTomato.matched).toBe(true);
    expect(resTomato.text).toContain("Tomato");
    expect(resTomato.text).toContain("Basal");

    const resGehu = getLocalAnswer("गेहूं की खाद मात्रा बताओ", mockProfile, "hi");
    expect(resGehu.matched).toBe(true);
    expect(resGehu.text).toContain("खाद");
  });

  it("provides specific pest control chemicals and organic treatments", () => {
    const resAphid = getLocalAnswer("Aphid control spray", mockProfile, "en");
    expect(resAphid.matched).toBe(true);
    expect(resAphid.text).toContain("Imidacloprid");

    const resWhitefly = getLocalAnswer("सफेद मक्खी की दवा", mockProfile, "hi");
    expect(resWhitefly.matched).toBe(true);
    expect(resWhitefly.text).toContain("नीम तेल");
  });

  it("provides specific disease treatments", () => {
    const resBlight = getLocalAnswer("Tomato leaf blight treatment", mockProfile, "en");
    expect(resBlight.matched).toBe(true);
    expect(resBlight.text).toContain("Mancozeb");

    const resRust = getLocalAnswer("गेहूं में पीला रतुआ", mockProfile, "hi");
    expect(resRust.matched).toBe(true);
    expect(resRust.text).toContain("प्रोपिकोनाजोल");
  });

  it("provides government scheme information for PM-Kisan and KCC", () => {
    const resScheme = getLocalAnswer("PM Kisan Yojana detail", mockProfile, "en");
    expect(resScheme.matched).toBe(true);
    expect(resScheme.text).toContain("PM-Kisan");
    expect(resScheme.text).toContain("6,000");
  });

  it("provides weather and safe spray guidance", () => {
    const resWeather = getLocalAnswer("Mausam kaisa rahega spray ke liye", mockProfile, "hi");
    expect(resWeather.matched).toBe(true);
    expect(resWeather.text).toContain("मौसम");
  });

  it("handles 'tamatar ka bhav' by asking for mandi clarification in Hindi/Hinglish without reference rate error", () => {
    const res = getLocalAnswer("tamatar ka bhav", mockProfile, "hi");
    expect(res.matched).toBe(true);
    expect(res.text).not.toContain("I don't have a reference rate");
    expect(res.text).toContain("mandi");
    expect(res.text).toContain("Tamatar");
  });

  it("handles 'bhai indore mandi me tamatar ka kya rate hai' by returning real Indore Tomato rates", () => {
    const res = getLocalAnswer("bhai indore mandi me tamatar ka kya rate hai", mockProfile, "hi");
    expect(res.matched).toBe(true);
    expect(res.text).toContain("Indore Mandi");
    expect(res.text).toContain("Tomato");
    expect(res.text).toContain("₹");
    expect(res.text).not.toContain("Soybean");
  });

  it("handles multi-turn conversation: User asks 'tamatar ka bhav', AI asks mandi, User says 'Indore'", () => {
    // Turn 1
    const turn1 = getLocalAnswer("tamatar ka bhav", mockProfile, "hi");
    expect(turn1.matched).toBe(true);
    expect(turn1.text).toContain("Kaunsi mandi");

    // Turn 2 with history
    const history = [
      { role: "user", content: "tamatar ka bhav" },
      { role: "assistant", content: turn1.text }
    ];
    const turn2 = getLocalAnswer("Indore", mockProfile, "hi", history);
    expect(turn2.matched).toBe(true);
    expect(turn2.text).toContain("Indore Mandi");
    expect(turn2.text).toContain("Tomato");
    expect(turn2.text).toContain("₹");
    expect(turn2.text).not.toContain("Soybean");
  });
});


