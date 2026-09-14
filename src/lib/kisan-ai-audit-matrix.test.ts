import { describe, it, expect } from "vitest";
import {
  getLocalAnswer,
  OFF_TOPIC_RESPONSES,
  FOUR_PART_PESTS,
  FOUR_PART_DISEASES,
} from "./local-advisor";
import { detectLanguageOf } from "@/core/voice/language";
import { verifyCropConsistency, extractEntities } from "@/core/voice/entities";
import { prepareTextForTTS } from "@/core/voice/sanitize";

describe("Kisan Sahayak / Kisan AI Master Audit Test Matrix", () => {
  describe("1. Off-Topic Query Redirection & Scope Guardrails", () => {
    it("redirects python programming queries politely to agriculture", () => {
      const ans = getLocalAnswer("write python code for me", undefined, "hi");
      expect(ans.matched).toBe(true);
      expect(ans.text).toContain("कृषि");
    });

    it("redirects Bollywood/movie queries to agriculture in English", () => {
      const ans = getLocalAnswer("tell me about latest bollywood movie", undefined, "en");
      expect(ans.matched).toBe(true);
      expect(ans.text).toContain("AgriConnect AI is specialized exclusively for agriculture");
    });

    it("redirects cricket/sports queries in Marathi", () => {
      const ans = getLocalAnswer("ipl cricket match score", undefined, "mr");
      expect(ans.matched).toBe(true);
      expect(ans.text).toContain("कृषी");
    });
  });

  describe("2. 4-Part Diagnostic Structure Verification", () => {
    it("formats aphid pest solution with all 4 mandatory parts", () => {
      const ans = getLocalAnswer("meri fasal me mahu keede lag gaye", undefined, "hi");
      expect(ans.matched).toBe(true);
      expect(ans.kind).toBe("pest");
      expect(ans.text).toContain("क्या हो सकता है");
      expect(ans.text).toContain("क्या जांचें");
      expect(ans.text).toContain("अगला कदम");
      expect(ans.text).toContain("सावधानी");
    });

    it("formats blight disease solution with 4-part structure", () => {
      const ans = getLocalAnswer("tomato me kaale dhabbe pad rahe hain", undefined, "hi");
      expect(ans.matched).toBe(true);
      expect(ans.text).toContain("क्या हो सकता है");
      expect(ans.text).toContain("सावधानी");
    });

    it("includes KVK / Extension Officer warning in pesticide/fungicide responses", () => {
      const ans = getLocalAnswer("gehu me patti peeli ho rahi hai", undefined, "hi");
      expect(ans.text).toMatch(/(KVK|कृषि विज्ञान केंद्र|कृषि अधिकारी)/);
    });
  });

  describe("3. Zero-Fabrication & Clarification Engine", () => {
    it("prompts for crop name when user asks for mandi bhav without mentioning crop", () => {
      const ans = getLocalAnswer("aaj mandi bhav kya hai", undefined, "hi");
      expect(ans.matched).toBe(true);
      expect(ans.kind).toBe("mandi");
      expect(ans.text).toMatch(/(mandi bhav|फसल)/i);
    });

    it("provides 4-part Leaf Yellowing diagnostic structure when user asks vague spray inquiry", () => {
      const ans = getLocalAnswer("meri patti peeli ho rahi hai spray batao", undefined, "hi");
      expect(ans.matched).toBe(true);
      expect(ans.text).toContain("क्या हो सकता है");
      expect(ans.text).toContain("सावधानी");
    });
  });

  describe("4. Multilingual & Hinglish Script Detection", () => {
    it("detects Hindi / Marathi Devanagari script", () => {
      const res = detectLanguageOf("गेहूं का मंडी भाव क्या है");
      expect(["hi", "mr"]).toContain(res.lang);
    });

    it("detects Marathi script with unique character 'ळ'", () => {
      const res = detectLanguageOf("पिकाची काळजी कशी घ्यावी कपाशीवर कळीगळत आहे");
      expect(res.lang).toBe("mr");
    });

    it("detects Hinglish romanized query", () => {
      const entities = extractEntities("bhai gehun me patti peeli ho rhi h spray batao");
      expect(entities.crop).toBe("wheat");
    });

    it("extracts crop mentioned in Devanagari", () => {
      const entities = extractEntities("आज सोयाबीन का भाव क्या है");
      expect(entities.crop).toBe("soybean");
    });
  });

  describe("5. Crop Entity Consistency Protection", () => {
    it("passes consistency when response discusses requested crop", () => {
      const isConsistent = verifyCropConsistency("tomato", "Tomato blight requires Dithane M-45 spray @ 2g/L.");
      expect(isConsistent).toBe(true);
    });

    it("flags inconsistency when response switches requested crop to another crop", () => {
      const isConsistent = verifyCropConsistency("tomato", "Soybean crops require 20kg sulfur per acre at sowing.");
      expect(isConsistent).toBe(false);
    });
  });

  describe("6. TTS Audio Text Sanitization", () => {
    it("removes markdown headings and symbols for smooth voice reading", () => {
      const cleaned = prepareTextForTTS("### Weather : 28°C \n**Namaste** farmer!", "en-IN");
      expect(cleaned).not.toContain("#");
      expect(cleaned).not.toContain("*");
      expect(cleaned.toLowerCase()).toContain("28 degrees celsius");
    });
  });
});
