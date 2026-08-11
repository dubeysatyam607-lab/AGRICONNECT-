import { describe, it, expect } from "vitest";
import { prepareTextForTTS } from "./sanitize";

describe("prepareTextForTTS — Comprehensive Speech Sanitizer", () => {
  it("removes markdown headers, bold, italics, and strike-through", () => {
    const input = "### Weather Update\n**Namaste** farmer brother! *Today* is ~~sunny~~ warm.";
    const cleaned = prepareTextForTTS(input, "hi-IN");
    expect(cleaned).not.toContain("#");
    expect(cleaned).not.toContain("*");
    expect(cleaned).not.toContain("~");
    expect(cleaned).toContain("Namaste");
    expect(cleaned).toContain("farmer brother");
  });

  it("converts temperature and degree symbols into spoken speech", () => {
    const input = "### Weather : 28°C in Lucknow. Night temp is 18°C.";
    const cleaned = prepareTextForTTS(input, "hi-IN");
    expect(cleaned).not.toContain(":");
    expect(cleaned).not.toContain("#");
    expect(cleaned).not.toContain("°");
    expect(cleaned).toContain("28 डिग्री सेल्सियस");
    expect(cleaned).toContain("18 डिग्री सेल्सियस");
  });

  it("converts currency, percentage, and units", () => {
    const input = "Wheat price is ₹2,400/qtl at 12% moisture. Apply 50kg/acre Urea.";
    const cleaned = prepareTextForTTS(input, "hi-IN");
    expect(cleaned).not.toContain("₹");
    expect(cleaned).not.toContain("%");
    expect(cleaned).not.toContain("/");
    expect(cleaned).toContain("2,400 रुपये");
    expect(cleaned).toContain("12 प्रतिशत");
    expect(cleaned).toContain("50 किलोग्राम प्रति एकड़");
    expect(cleaned).toContain("यूरिया");
  });

  it("converts Indian agricultural acronyms to spoken Hindi", () => {
    const input = "Check PM-Kisan subsidy, NPK ratio, and KCC loan at KVK.";
    const cleaned = prepareTextForTTS(input, "hi-IN");
    expect(cleaned).toContain("पीएम किसान");
    expect(cleaned).toContain("एनपीके");
    expect(cleaned).toContain("किसान क्रेडिट कार्ड");
    expect(cleaned).toContain("कृषि विज्ञान केंद्र");
  });

  it("strips code blocks, JSON, and HTML tags", () => {
    const input = "<div>Hello</div> ```const x = 1;``` {\"key\": \"val\"} <b>Bold</b>";
    const cleaned = prepareTextForTTS(input, "hi-IN");
    expect(cleaned).not.toContain("div");
    expect(cleaned).not.toContain("const");
    expect(cleaned).not.toContain("{");
    expect(cleaned).toContain("Hello");
    expect(cleaned).toContain("Bold");
  });

  it("removes URLs and raw Markdown link syntax", () => {
    const input = "Visit https://agriconnect.in or [Click Here](https://example.com) for schemes.";
    const cleaned = prepareTextForTTS(input, "hi-IN");
    expect(cleaned).not.toContain("https://");
    expect(cleaned).not.toContain("example.com");
    expect(cleaned).toContain("Click Here");
  });

  it("strips all emojis and special pictograms", () => {
    const input = "🌾 📍 📉 🌿 💊 🙏 ✨ ⚠️ 🚨 🧪 💧 🐛 📜 Weather is clear!";
    const cleaned = prepareTextForTTS(input, "hi-IN");
    expect(cleaned).toBe("Weather is clear!");
  });

  it("handles complex multi-line text with mixed lists, symbols, and Mandi prices", () => {
    const input = `
### Today Mandi Prices:
- Wheat (गेहूँ) : ₹2250 / qtl
- Rice (धान) : ₹2100 / qtl
- Soil moisture : 15%
* Note: Visit nearest APMC market!
    `;
    const cleaned = prepareTextForTTS(input, "hi-IN");
    expect(cleaned).not.toContain("#");
    expect(cleaned).not.toContain(":");
    expect(cleaned).not.toContain("-");
    expect(cleaned).not.toContain("*");
    expect(cleaned).not.toContain("₹");
    expect(cleaned).toContain("2250 रुपये");
    expect(cleaned).toContain("15 प्रतिशत");
    expect(cleaned).toContain("एपीएमसी");
  });
});
