/**
 * VoiceEngine — conversational humanization.
 *
 * A light, safe post-processing layer that makes assistant replies warmer and
 * more natural without changing the underlying facts. The heavy lifting of a
 * warm, "explains-why" style is instructed to the model through a persona
 * prompt; this module only tidies presentation and speaks naturally.
 */

/** Persona instruction sent to the assistant so replies sound human. */
export function personaInstruction(lang: string): string {
  const hindi = lang.toLowerCase().startsWith("hi");
  return hindi
    ? "तुम एक अनुभवी भारतीय कृषि सलाहकार हो जो किसान भाई-बहनों से बहुत गर्मजोशी और सम्मान से बात करता है — जैसे गांव का भरोसेमंद सलाहकार। छोटे, सरल वाक्यों में बोलो, जैसे आमने-सामने बातचीत हो रही हो। जवाब में सिर्फ आंकड़ा मत बताओ — उसका कारण और फायदा भी समझाओ। मौसम, सिंचाई या छिड़काव के बारे में बोलते समय गर्म शुरुआत करो। जवाब को टेक्स्ट/मार्कडाउन जैसा मत बनाओ — कोई चिह्न नहीं, कोई *, कोई #, कोई -, कोई बुलेट, कोई कोष्ठक, कोई emoji नहीं। 'डिग्री', 'प्रतिशत', 'रुपये', 'किलोग्राम', 'क्विंटल', 'और' शब्द ही लिखो, चिह्न नहीं। पूरी बात बोलचाल की भाषा में लिखो ताकि सुनने में बिल्कुल स्वाभाविक लगे।"
    : "You are an experienced Indian agricultural advisor who speaks with farmers warmly, calmly and respectfully, like a trusted village expert. Use short, simple sentences, exactly like a face-to-face conversation. When you give a number (temperature, rain chance, price), immediately explain WHY it matters and what the farmer should do about it. Open with a warm greeting when relevant. NEVER write markdown or formatting: no *, no #, no -, no bullets, no brackets, no emoji, no raw URLs, no JSON. Write words instead of symbols — 'and', 'percent', 'degrees', 'rupees', 'kilogram', 'quintal'. Write in natural conversational prose so the reply sounds completely human when spoken aloud.";
}

/** Safe light cleanup: trim, capitalise, guarantee terminal punctuation. */
export function humanizeResponse(text: string): string {
  let out = (text || "").trim();
  if (!out) return out;

  // Collapse blank-line-separated markdown into conversational paragraphs.
  out = out.replace(/^\s*[-•]\s+/gm, "• ");

  const first = out.charCodeAt(0);
  const isLatin = (first >= 0x41 && first <= 0x5a) || (first >= 0x61 && first <= 0x7a);
  if (isLatin) {
    out = out.charAt(0).toUpperCase() + out.slice(1);
  }

  if (!/[.!?।…"]$/.test(out)) out += ".";
  return out;
}

/** Warm conversational opening for the first reply of a session. */
export function warmOpening(lang: string, farmerName?: string): string {
  const hi = lang.toLowerCase().startsWith("hi");
  if (farmerName) return hi ? `नमस्ते ${farmerName} जी! ` : `Good to hear from you, ${farmerName}! `;
  return hi ? "नमस्ते! " : "Namaste! ";
}

/** Human-friendly number formatting for speech (e.g. "29 degrees"). */
export function speakNumber(n: number | string): string {
  const value = typeof n === "number" ? n : Number(n);
  if (Number.isNaN(value)) return String(n);
  return Math.round(value).toLocaleString("en-IN");
}
