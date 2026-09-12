import { describe, it, expect } from "vitest";
import { getLocalAnswer } from "@/lib/local-advisor";
import type { IFarmerProfile } from "@/features/profile/domain/models/FarmerProfile";

const mockFarmerProfile: IFarmerProfile = {
  id: "farmer-101",
  personal: {
    fullName: "Ramesh Patel",
    mobileNumber: "9876543210",
    gender: "Male",
    isAadhaarVerified: true,
  },
  location: {
    villageOrTehsil: "Haveli",
    district: "Pune",
    state: "Maharashtra",
    pinCode: "411028",
    isLocationPermissionGranted: true,
  },
  farmSpecs: {
    totalArea: 4,
    landUnit: "Acres",
    soilType: "Black Cotton",
    irrigationType: "Drip Irrigation",
  },
  crops: ["Soybean", "Wheat"],
  machineryOwned: ["Tractor (4WD/2WD)"],
  livestock: { cows: 2, buffaloes: 1, bullocks: 0, goatsOrSheep: 0, poultry: 0 },
  preferredLanguage: "hi",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-09-12T00:00:00.000Z",
};

describe("AgriConnect Phase 6 — Kisan AI Multilingual Agricultural Assistant (20+ Cases)", () => {

  // 1. Hinglish Mixed Query: Soybean yellow leaves
  it("1. Answers mixed Hinglish query on Soybean yellow leaves with direct actionable advice", () => {
    const q = "Meri soybean ki fasal me patte yellow ho rhe hain kya karu?";
    const res = getLocalAnswer(q, mockFarmerProfile, "hi");
    expect(res.matched).toBe(true);
    expect(res.text).toContain("पीलापन");
    expect(res.text).toContain("Soybean");
    expect(res.text).toContain("19:19:19");
    expect(res.text).toContain("क्या हो सकता है");
    expect(res.text).toContain("सावधानी");
  });

  // 2. Hindi (हिंदी) Pest Query: Cotton pink bollworm
  it("2. Answers Hindi query on Cotton pink bollworm with pest control steps", () => {
    const q = "कपास में गुलाबी सुंडी और कीट नियंत्रण के उपाय बताएं";
    const res = getLocalAnswer(q, mockFarmerProfile, "hi");
    expect(res.matched).toBe(true);
    expect(res.text).toContain("गुलाबी सुंडी");
    expect(res.text).toContain("फेरोमोन ट्रैप");
    expect(res.text).toContain("नीम तेल");
  });

  // 3. English Fertilizer Schedule: Wheat
  it("3. Answers English query for Wheat fertilizer dose and schedule", () => {
    const q = "What is the recommended fertilizer schedule for Wheat crop per acre?";
    const res = getLocalAnswer(q, mockFarmerProfile, "en");
    expect(res.matched).toBe(true);
    expect(res.text).toContain("Wheat");
    expect(res.text).toContain("DAP");
    expect(res.text).toContain("Urea");
    expect(res.text).toContain("zinc sulfate");
  });

  // 4. Marathi (मराठी) Query: Soybean leaf spot / disease
  it("4. Answers Marathi query for Soybean yellowing / pests in Marathi context", () => {
    const q = "सोयाबीन पिकावर पाने पिवळी पडली आहेत आणि कीड लागली आहे काय उपाय करावा?";
    const res = getLocalAnswer(q, mockFarmerProfile, "mr");
    expect(res.matched).toBe(true);
    expect(res.text).toContain("पिवळे");
  });

  // 5. Punjabi (ਪੰਜਾਬੀ) Query: Wheat Yellow Rust
  it("5. Answers Punjabi query for Wheat Yellow Rust in Punjabi", () => {
    const q = "ਕਣਕ ਦੀ ਫਸਲ ਵਿੱਚ ਪੀਲੀ ਕੁੰਗੀ (yellow rust) ਦਾ ਇਲਾਜ ਦੱਸੋ";
    const res = getLocalAnswer(q, mockFarmerProfile, "pa");
    expect(res.matched).toBe(true);
    expect(res.text).toContain("ਕੁੰਗੀ");
  });

  // 6. Gujarati (ગુજરાતી) Query: Cotton Whitefly
  it("6. Answers Gujarati query for Cotton Whitefly in Gujarati", () => {
    const q = "કપાસમાં સફેદ માખી અને જીવાત માટે શું કરવું?";
    const res = getLocalAnswer(q, mockFarmerProfile, "gu");
    expect(res.matched).toBe(true);
    expect(res.text).toContain("કપાસ");
  });

  // 7. Bengali (বাংলা) Query: Paddy Blast Disease
  it("7. Answers Bengali query for Paddy Blast Disease in Bengali", () => {
    const q = "ধানের ব্লাস্ট ও পাতাপোড়া রোগের প্রতিকার কি?";
    const res = getLocalAnswer(q, mockFarmerProfile, "bn");
    expect(res.matched).toBe(true);
    expect(res.text).toContain("ধান");
  });

  // 8. Tamil (தமிழ்) Query: Paddy Pest Control
  it("8. Answers Tamil query for Paddy Pest Control in Tamil", () => {
    const q = "நெல் பயிரில் பூச்சி கட்டுப்பாடு மற்றும் உரம் முறை";
    const res = getLocalAnswer(q, mockFarmerProfile, "ta");
    expect(res.matched).toBe(true);
    expect(res.text).toContain("பயிர்");
  });

  // 9. Telugu (తెలుగు) Query: Chilli Mites / Thrips
  it("9. Answers Telugu query for Chilli Mites / Thrips in Telugu", () => {
    const q = "మిరప తోటలో నల్లి మరియు తామర పురుగుల నివారణ";
    const res = getLocalAnswer(q, mockFarmerProfile, "te");
    expect(res.matched).toBe(true);
    expect(res.text).toContain("మిరప");
  });

  // 10. Kannada (ಕನ್ನಡ) Query: Tomato Leaf Curl
  it("10. Answers Kannada query for Tomato management in Kannada", () => {
    const q = "ಟೊಮೆಟೊ ಬೆಳೆಯಲ್ಲಿ ಕೀಟ ನಿಯಂತ್ರಣ ಮತ್ತು ರೋಗ ನಿರ್ವಹಣೆ";
    const res = getLocalAnswer(q, mockFarmerProfile, "kn");
    expect(res.matched).toBe(true);
    expect(res.text).toContain("ಟೊಮೆಟೊ");
  });

  // 11. Malayalam (മലയാളം) Query: Banana Management
  it("11. Answers Malayalam query for Banana management in Malayalam", () => {
    const q = "വാഴ കൃഷിയിലെ വളപ്രയോഗവും കീട നിയന്ത്രണവും";
    const res = getLocalAnswer(q, mockFarmerProfile, "ml");
    expect(res.matched).toBe(true);
    expect(res.text).toContain("കൃഷി");
  });

  // 12. Odia (ଓଡ଼ିଆ) Query: Paddy Management
  it("12. Answers Odia query for Paddy Management in Odia", () => {
    const q = "ଧାନ ଫସଲରେ ସାର ପ୍ରୟୋଗ ଏବଂ କୀଟ ନିୟନ୍ତ୍ରଣ";
    const res = getLocalAnswer(q, mockFarmerProfile, "or");
    expect(res.matched).toBe(true);
    expect(res.text).toContain("ଧାନ");
  });

  // 13. Assamese (অসমীয়া) Query: Paddy Management
  it("13. Answers Assamese query for Paddy management in Assamese", () => {
    const q = "ধান খেতিত সাৰ প্ৰয়োগ আৰু ৰোগ নিয়ন্ত্ৰণ";
    const res = getLocalAnswer(q, mockFarmerProfile, "as");
    expect(res.matched).toBe(true);
    expect(res.text).toContain("ধান");
  });

  // 14. Clarification Request: Ambiguous disease without crop
  it("14. Requests clarification when disease is mentioned without a specified crop", () => {
    const q = "meri fasal me achanak bimari lag gayi hai kya karu";
    const res = getLocalAnswer(q, null, "hi");
    expect(res.matched).toBe(true);
    expect(res.text).toContain("कृपया अपनी फसल का नाम");
  });

  // 15. Weather & Irrigation Inquiry
  it("15. Answers weather & irrigation planning queries with soil-aware guidance", () => {
    const q = "gehu me pehla paani kab lagana chahiye aur barish me kya kare";
    const res = getLocalAnswer(q, mockFarmerProfile, "hi");
    expect(res.matched).toBe(true);
    expect(res.text).toContain("सिंचाई");
    expect(res.text).toContain("CRI");
  });

  // 16. Mandi Price Inquiry: Potato / Aloo
  it("16. Answers Mandi price discovery query with honest quotes and source attribution", () => {
    const q = "aaj aalu ka mandi bhav kya chal raha hai";
    const res = getLocalAnswer(q, mockFarmerProfile, "hi");
    expect(res.matched).toBe(true);
    expect(res.text).toContain("आलू");
    expect(res.text).toContain("AGMARKNET");
  });

  // 17. Government Scheme: PM-Kisan & Subsidy
  it("17. Explains PM-KISAN, PMFBY, and KCC schemes clearly with official benefit details", () => {
    const q = "PM kisan samman nidhi yojana ka labh kaise milega";
    const res = getLocalAnswer(q, mockFarmerProfile, "hi");
    expect(res.matched).toBe(true);
    expect(res.text).toContain("PM-Kisan");
    expect(res.text).toContain("6,000");
  });

  // 18. Soil Health & Organic Preparation: Mustard
  it("18. Answers soil preparation and organic amendment queries for Mustard", () => {
    const q = "sarson ki buwai ke liye mitti ki taiyari kaise kare";
    const res = getLocalAnswer(q, mockFarmerProfile, "hi");
    expect(res.matched).toBe(true);
    expect(res.text).toContain("Mustard");
    expect(res.text).toContain("DAP");
  });

  // 19. Off-topic Question Guardrail Rejection
  it("19. Politely declines off-topic questions (e.g. coding / non-farming)", () => {
    const q = "Can you write a python script to sort a list of numbers?";
    const res = getLocalAnswer(q, mockFarmerProfile, "en");
    expect(res.kind).toBe("off_topic");
    expect(res.text).toContain("AgriConnect AI is specialized exclusively for agriculture");
  });

  // 20. Multi-Turn Context Retention: Follow-up question
  it("20. Retains previous crop context when a follow-up irrigation question is asked", () => {
    const chatHistory = [
      { role: "user" as const, content: "Tamatar ki kheti me konsi khad dale" },
      { role: "assistant" as const, content: "Tomato basal dose: FYM 5 t/acre + DAP 30 kg/acre..." }
    ];

    const followUp = "aur isme paani kab kab dena chahiye?";
    const res = getLocalAnswer(followUp, mockFarmerProfile, "hi", chatHistory);
    expect(res.matched).toBe(true);
    expect(res.text).toContain("सिंचाई");
    expect(res.text).toContain("Tamatar");
  });

  // 21. Natural Friendly Greeting Response
  it("21. Greets farmer warmly in Hindi upon namaste", () => {
    const q = "Namaste Kisan AI";
    const res = getLocalAnswer(q, mockFarmerProfile, "hi");
    expect(res.matched).toBe(true);
    expect(res.text).toContain("नमस्ते");
  });
});
