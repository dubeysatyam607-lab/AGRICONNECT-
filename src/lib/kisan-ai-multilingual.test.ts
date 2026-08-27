import { describe, it, expect } from "vitest";
import { getLocalAnswer } from "./local-advisor";
import type { FarmProfile } from "@/contexts/FarmContext";

const mockProfile: FarmProfile = {
  crop: "Wheat",
  variety: "Sharbati",
  stage: "Tillering",
  farmArea: 5,
  soilType: "Black Soil",
};

describe("Kisan AI Multilingual & Conversational Intelligence", () => {
  it("answers in Hindi for Hindi & Hinglish questions", () => {
    const res1 = getLocalAnswer("aaj mausam kaisa rahega", mockProfile, "hi");
    expect(res1.text).toContain("मौसम");
    expect(res1.text).not.toContain("Wheat cultivation summary");

    const res2 = getLocalAnswer("gehu me khad kab dale", mockProfile, "hi");
    expect(res2.text).toContain("खाद");
    expect(res2.text).not.toContain("Wheat cultivation summary");
  });

  it("does not dump Wheat cultivation summary for informal, conversational or unknown queries", () => {
    const history = [
      { role: "user", content: "gehu ki jankari" },
      { role: "assistant", content: "Wheat cultivation summary: Fertilizer DAP..." }
    ];

    // User sends a conversational query or slang/casual input:
    const resCasual = getLocalAnswer("kya haal hai bhai", mockProfile, "hi", history);
    expect(resCasual.text).not.toContain("Wheat cultivation summary");
    expect(resCasual.text).toContain("Kisan AI");

    const resRandom = getLocalAnswer("hello kaise ho", mockProfile, "hi", history);
    expect(resRandom.text).not.toContain("Wheat cultivation summary");
  });

  it("answers in Marathi (मराठी) when requested or in Marathi context", () => {
    const res = getLocalAnswer("नमस्कार", mockProfile, "mr");
    expect(res.text).toContain("नमस्कार");
    expect(res.text).toContain("किसान AI");
    expect(res.text).not.toContain("Wheat cultivation summary");
  });

  it("answers in Gujarati (ગુજરાતી) when requested", () => {
    const res = getLocalAnswer("નમસ્તે", mockProfile, "gu");
    expect(res.text).toContain("નમસ્તે");
    expect(res.text).toContain("કિસાન AI");
  });

  it("answers in Punjabi (ਪੰਜਾਬੀ) when requested", () => {
    const res = getLocalAnswer("ਸਤ ਸ੍ਰੀ ਅਕਾਲ", mockProfile, "pa");
    expect(res.text).toContain("ਸਤ ਸ੍ਰੀ ਅਕਾਲ");
    expect(res.text).toContain("ਕਿਸਾਨ AI");
  });

  it("answers in Bengali (বাংলা) when requested", () => {
    const res = getLocalAnswer("নমস্কার", mockProfile, "bn");
    expect(res.text).toContain("নমস্কার");
    expect(res.text).toContain("কিষাণ AI");
  });

  it("answers in Tamil (தமிழ்) when requested", () => {
    const res = getLocalAnswer("வணக்கம்", mockProfile, "ta");
    expect(res.text).toContain("வணக்கம்");
    expect(res.text).toContain("கிசான் AI");
  });

  it("answers in Telugu (తెలుగు) when requested", () => {
    const res = getLocalAnswer("నమస్కారం", mockProfile, "te");
    expect(res.text).toContain("నమస్కారం");
    expect(res.text).toContain("కిసాన్ AI");
  });

  it("answers in Kannada (ಕನ್ನಡ) when requested", () => {
    const res = getLocalAnswer("ನಮಸ್ಕಾರ", mockProfile, "kn");
    expect(res.text).toContain("ನಮಸ್ಕಾರ");
    expect(res.text).toContain("ಕಿಸಾನ್ AI");
  });

  it("answers in Malayalam (മലയാളം) when requested", () => {
    const res = getLocalAnswer("നമസ്കാരം", mockProfile, "ml");
    expect(res.text).toContain("നമസ്കാരം");
    expect(res.text).toContain("കിസാൻ AI");
  });

  it("answers in Odia (ଓଡ଼ିଆ) when requested", () => {
    const res = getLocalAnswer("ନମସ୍କାର", mockProfile, "or");
    expect(res.text).toContain("ନମସ୍କାର");
    expect(res.text).toContain("କିଷାନ AI");
  });

  it("answers in Assamese (অসমীয়া) when requested", () => {
    const res = getLocalAnswer("নমস্কাৰ", mockProfile, "as");
    expect(res.text).toContain("নমস্কাৰ");
    expect(res.text).toContain("কিষাণ AI");
  });
});
