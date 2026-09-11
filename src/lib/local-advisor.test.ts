import { describe, it, expect } from "vitest";
import { getLocalAnswer } from "./local-advisor";
import { detectLanguageOf } from "@/core/voice/language";
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

const emptyProfile: FarmProfile = {
  farmerName: "",
  phone: "",
  state: "",
  district: "",
  village: "",
  crop: "",
  variety: "",
  stage: "",
  farmArea: 0,
  soilType: "",
  irrigationSource: "",
  preferredLanguage: "en",
};

describe("Kisan AI / Kisan Sahayak Phase 5 — Comprehensive Tests", () => {
  describe("1. Multilingual Understanding & Response Matching (12 Indian Languages)", () => {
    const languages = [
      { code: "en", name: "English", query: "Hello Kisan AI", expected: "Hello farmer friend" },
      { code: "hi", name: "Hindi", query: "नमस्ते किसान सहायक", expected: "नमस्ते किसान भाई" },
      { code: "mr", name: "Marathi", query: "नमस्कार किसान AI", expected: "नमस्कार शेतकरी बंधू" },
      { code: "gu", name: "Gujarati", query: "નમસ્તે કિસાન AI", expected: "નમસ્તે ખેડૂત મિત્ર" },
      { code: "pa", name: "Punjabi", query: "ਸਤ ਸ੍ਰੀ ਅਕਾਲ ਕਿਸਾਨ AI", expected: "ਸਤ ਸ੍ਰੀ ਅਕਾਲ ਕਿਸਾਨ ਵੀਰੋ" },
      { code: "ta", name: "Tamil", query: "வணக்கம் கிசான் AI", expected: "வணக்கம் விவசாய தோழரே" },
      { code: "te", name: "Telugu", query: "నమస్కారం కిసాన్ AI", expected: "నమస్కారం రైతు మిత్రమా" },
      { code: "kn", name: "Kannada", query: "ನಮಸ್ಕಾರ ಕಿಸಾನ್ AI", expected: "ನಮಸ್ಕಾರ ರೈತ ಮಿತ್ರರೇ" },
      { code: "ml", name: "Malayalam", query: "നമസ്കാരം കിസാൻ AI", expected: "നമസ്കാരം കർഷക സുഹൃത്തേ" },
      { code: "bn", name: "Bengali", query: "নমস্কার কিষাণ AI", expected: "নমস্কার কৃষক বন্ধু" },
      { code: "or", name: "Odia", query: "ନମସ୍କାର କିଷାନ AI", expected: "ନମସ୍କାର କୃଷକ ଭାଇ" },
      { code: "as", name: "Assamese", query: "নমস্কাৰ কিষাণ AI", expected: "নমস্কাৰ কৃষক ভাই" },
    ];

    languages.forEach(({ code, name, query, expected }) => {
      it(`accurately handles ${name} (${code}) greeting in matching script`, () => {
        const res = getLocalAnswer(query, mockProfile, code);
        expect(res.matched).toBe(true);
        expect(res.text).toContain(expected);
      });
    });

    it("detects Marathi from Devanagari text with Marathi keywords", () => {
      const detected = detectLanguageOf("माझ्या पिकावर कीड पडली आहे काय करावे?");
      expect(detected.lang).toBe("mr");
    });

    it("detects Assamese from Eastern Nagari text with unique Assamese characters", () => {
      const detected = detectLanguageOf("মোৰ ধান খেতিত ৰোগ হৈছে");
      expect(detected.lang).toBe("as");
    });
  });

  describe("2. Off-Topic Guardrail & Polite Redirection", () => {
    it("redirects coding questions to farming in English", () => {
      const res = getLocalAnswer("Write a Python script for binary search", mockProfile, "en");
      expect(res.kind).toBe("off_topic");
      expect(res.text).toContain("specifically designed to assist with agriculture");
    });

    it("redirects entertainment/Bollywood questions in Hindi", () => {
      const res = getLocalAnswer("शाहरुख खान की नई फिल्म कौन सी है?", mockProfile, "hi");
      expect(res.kind).toBe("off_topic");
      expect(res.text).toContain("केवल कृषि");
      expect(res.text).toContain("फसल");
    });

    it("redirects cricket/sports questions in Marathi", () => {
      const res = getLocalAnswer("IPL match kon jinkle?", mockProfile, "mr");
      expect(res.kind).toBe("off_topic");
      expect(res.text).toContain("केवळ कृषी");
    });
  });

  describe("3. Strict 4-Part Agricultural Problem & Diagnostic Structure", () => {
    it("provides 4-part structure for Aphid (माहू) infestation", () => {
      const res = getLocalAnswer("गेहूं में माहू लग गया है क्या करें", mockProfile, "hi");
      expect(res.kind).toBe("pest");
      expect(res.text).toContain("1. **क्या हो सकता है");
      expect(res.text).toContain("2. **क्या जांचें");
      expect(res.text).toContain("3. **अगला कदम");
      expect(res.text).toContain("4. **सावधानी व सलाह");
      expect(res.text).toContain("KVK");
    });

    it("provides 4-part structure for Yellow Leaves (पीली पत्तियां)", () => {
      const res = getLocalAnswer("Pattiyan peeli ho rahi hain kya karu", mockProfile, "hi");
      expect(res.kind).toBe("disease");
      expect(res.text).toContain("1. **क्या हो सकता है");
      expect(res.text).toContain("2. **क्या जांचें");
      expect(res.text).toContain("3. **अगला कदम");
      expect(res.text).toContain("4. **सावधानी व सलाह");
      expect(res.text).toContain("Soil Health Card");
    });

    it("provides 4-part structure for Blight (झुलसा रोग) in English", () => {
      const res = getLocalAnswer("Tomato leaf blight problem", mockProfile, "en");
      expect(res.kind).toBe("disease");
      expect(res.text).toContain("1. **What may be happening**");
      expect(res.text).toContain("2. **What farmer can check**");
      expect(res.text).toContain("3. **Recommended next step**");
      expect(res.text).toContain("4. **Warning & Agronomic Confirmation**");
    });

    it("provides 4-part structure for Whitefly with sticky traps and safe dosage", () => {
      const res = getLocalAnswer("Safed makkhi ka ilaj", mockProfile, "hi");
      expect(res.kind).toBe("pest");
      expect(res.text).toContain("सफेद मक्खी");
      expect(res.text).toContain("ट्रैप");
      expect(res.text).toContain("KVK");
    });
  });

  describe("4. Multi-Turn Context Retention & Farmer Context", () => {
    it("inherits crop context across turns when user asks follow-up", () => {
      const history = [
        { role: "user", content: "टमाटर का मंडी भाव क्या है?" },
        { role: "assistant", content: "किस मंडी का टमाटर का भाव चाहिए?" }
      ];
      const res = getLocalAnswer("Indore", mockProfile, "hi", history);
      expect(res.kind).toBe("mandi");
      expect(res.text).toContain("Indore Mandi");
      expect(res.text).toContain("Tomato");
    });

    it("retains crop context when user asks follow-up spray advice", () => {
      const history = [
        { role: "user", content: "I am growing Tomato in 2 acres" },
        { role: "assistant", content: "Great! How can I assist with your Tomato crop?" }
      ];
      const res = getLocalAnswer("What spray to use for aphids?", mockProfile, "en", history);
      expect(res.kind).toBe("pest");
      expect(res.text).toContain("Tomato");
      expect(res.text).toContain("Aphid");
    });
  });

  describe("5. Zero Fabrication & Honest Responses", () => {
    it("never invents a user name if not present in profile", () => {
      const res = getLocalAnswer("mera naam kya hai", emptyProfile, "hi");
      expect(res.text).toContain("प्रोफाइल में दर्ज नहीं है");
      expect(res.text).not.toContain("undefined");
      expect(res.text).not.toContain("null");
    });

    it("uses verified government schemes without fabricating fake subsidies", () => {
      const res = getLocalAnswer("Government schemes for farmers", mockProfile, "en");
      expect(res.kind).toBe("scheme");
      expect(res.text).toContain("PM-Kisan Samman Nidhi");
      expect(res.text).toContain("PMFBY");
      expect(res.text).toContain("KCC");
      expect(res.text).toContain("pmkisan.gov.in");
    });

    it("prompts for crop name when asked vague spray questions rather than guessing", () => {
      const resHi = getLocalAnswer("दवा बताओ", emptyProfile, "hi");
      expect(resHi.text).toContain("फसल का नाम बताएं");

      const resHinglish = getLocalAnswer("spray batao", emptyProfile, "hi");
      expect(resHinglish.text).toContain("fasal ka naam");
    });
  });
});
