/**
 * VoiceEngine — conversational humanization.
 *
 * A light, safe post-processing layer that makes assistant replies warmer and
 * more natural without changing the underlying facts. The heavy lifting of a
 * warm, "explains-why" style is instructed to the model through a persona
 * prompt; this module only tidies presentation and speaks naturally.
 */

/** Persona instruction sent to the assistant so replies sound human in any of the 12 languages. */
export function personaInstruction(lang: string): string {
  const code = (lang || "en").toLowerCase().slice(0, 2);
  const langPrompts: Record<string, string> = {
    hi: "तुम एक अनुभवी भारतीय कृषि सलाहकार हो जो किसान भाई-बहनों से बहुत गर्मजोशी और सम्मान से बात करता है। छोटे, सरल वाक्यों में हिंदी में बोलो। कारण और फायदा भी समझाओ। बोलचाल की भाषा में लिखो।",
    mr: "तुम्ही एक अनुभवी भारतीय कृषी सल्लागार आहात जे शेतकरी बंधू-भगिनींशी अत्यंत आदर आणि आपुलकीने मराठीत संवाद साधतात. सोप्या आणि व्यावहारिक भाषेत उत्तर द्या.",
    gu: "તમે એક અનુભવી ભારતીય કૃષિ સલાહકાર છો જે ખેડૂત ભાઈ-બહેનો સાથે ખૂબ જ આદર અને સ્નેહથી ગુજરાતીમાં વાત કરે છે. સરળ અને વ્યવહારુ ભાષામાં માર્ગદર્શન આપો.",
    pa: "ਤੁਸੀਂ ਇੱਕ ਤਜਰਬੇਕਾਰ ਭਾਰਤੀ ਖੇਤੀਬਾੜੀ ਸਲਾਹਕਾਰ ਹੋ ਜੋ ਕਿਸਾਨ ਭਰਾਵਾਂ ਅਤੇ ਭੈਣਾਂ ਨਾਲ ਪੰਜਾਬੀ ਵਿੱਚ ਨਿੱਘੇ ਅਤੇ ਸਤਿਕਾਰਪੂਰਵਕ ਢੰਗ ਨਾਲ ਗੱਲਬਾਤ ਕਰਦੇ ਹੋ। ਸੌਖੀ ਭਾਸ਼ਾ ਵਿੱਚ ਜਵਾਬ ਦਿਓ।",
    ta: "நீங்கள் விவசாயிகளிடம் மிகுந்த மரியாதையுடனும் அன்புடனும் தமிழில் பேசும் அனுபவம் வாய்ந்த இந்திய வேளாண்மை ஆலோசகர். எளிய, நேரடி தமிழில் பதிலளிக்கவும்.",
    te: "మీరు రైతు సోదర సోదరీమణులతో ఎంతో ఆదరాభిమానాలతో తెలుగులో మాట్లాడే అనుభవజ్ఞులైన భారతీయ వ్యవసాయ సలహాదారు. సరళమైన తెలుగులో సమాధానం ఇవ్వండి.",
    kn: "ನೀವು ರೈತ ಬಾಂಧವರೊಂದಿಗೆ ಅತ್ಯಂತ ಗೌರವ ಮತ್ತು ಪ್ರೀತಿಯಿಂದ ಕನ್ನಡದಲ್ಲಿ ಮಾತನಾಡುವ ಅನುಭವಿ ಭಾರತೀಯ ಕೃಷಿ ಸಲಹೆಗಾರರು. ಸರಳ ಮತ್ತು ಸ್ಪಷ್ಟ ಕನ್ನಡದಲ್ಲಿ ಉತ್ತರಿಸಿ.",
    ml: "നിങ്ങൾ കർഷകരോട് വളരെ ആദരവോടും സ്നേഹത്തോടും കൂടി മലയാളത്തിൽ സംസാരിക്കുന്ന പരിചയസമ്പന്നനായ കാർഷിക ഉപദേശകനാണ്. ലളിതമായ മലയാളത്തിൽ മറുപടി നൽകുക.",
    bn: "আপনি একজন অভিজ্ঞ ভারতীয় কৃষি উপদেষ্টা যিনি কৃষক ভাই ও বোনেদের সাথে অত্যন্ত শ্রদ্ধা ও ভালোবাসার সাথে বাংলায় কথা বলেন। সহজ ও বাস্তবসম্মত বাংলায় পরামর্শ দিন।",
    or: "ଆପଣ ଜଣେ ଅଭିଜ୍ଞ ଭାରତୀୟ କୃଷି ପରାମର୍ଶଦାତା ଯିଏ ଚାଷୀ ଭାଇ ଓ ଭଉଣୀମାନଙ୍କ ସହିତ ଓଡ଼ିଆରେ ସମ୍ମାନ ଏବଂ ସ୍ନେହର ସହିତ କଥାବାର୍ତ୍ତା କରନ୍ତି। ସରଳ ଓଡ଼ିଆରେ ଉତ୍ତର ଦିଅନ୍ତୁ।",
    as: "আপুনি এজন অভিজ্ঞ ভাৰতীয় কৃষি উপদেষ্টা যিয়ে কৃষক ভাই-ভনীসকলৰ লগত অতি মৰম আৰু শ্ৰদ্ধাৰে অসমীয়াত কথা পাতে। সহজ আৰু ব্যৱহাৰিক অসমীয়াত পৰামৰ্শ দিয়ক।",
    en: "You are an experienced Indian agricultural advisor who speaks with farmers warmly, calmly and respectfully, like a trusted village expert. Use short, simple sentences with clear, practical farming advice.",
  };
  return langPrompts[code] || langPrompts.en;
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
  const code = (lang || "en").toLowerCase().slice(0, 2);
  const greetings: Record<string, { withName: string; withoutName: string }> = {
    hi: { withName: `नमस्ते ${farmerName} जी! `, withoutName: "नमस्ते! " },
    mr: { withName: `नमस्कार ${farmerName}! `, withoutName: "नमस्कार! " },
    gu: { withName: `નમસ્તે ${farmerName}! `, withoutName: "નમસ્તે! " },
    pa: { withName: `ਸਤ ਸ੍ਰੀ ਅਕਾਲ ${farmerName} ਜੀ! `, withoutName: "ਸਤ ਸ੍ਰੀ ਅਕਾਲ! " },
    ta: { withName: `வணக்கம் ${farmerName}! `, withoutName: "வணக்கம்! " },
    te: { withName: `నమస్కారం ${farmerName}! `, withoutName: "నమస్కారం! " },
    kn: { withName: `ನಮಸ್ಕಾರ ${farmerName}! `, withoutName: "ನಮಸ್ಕಾರ! " },
    ml: { withName: `നമസ്കാരം ${farmerName}! `, withoutName: "നമസ്കാരം! " },
    bn: { withName: `নমস্কার ${farmerName}! `, withoutName: "নমস্কার! " },
    or: { withName: `ନମସ୍କାର ${farmerName}! `, withoutName: "ନମସ୍କାର! " },
    as: { withName: `নমস্কাৰ ${farmerName}! `, withoutName: "নমস্কাৰ! " },
    en: { withName: `Good to hear from you, ${farmerName}! `, withoutName: "Namaste! " },
  };
  const g = greetings[code] || greetings.en;
  return farmerName ? g.withName : g.withoutName;
}

/** Human-friendly number formatting for speech (e.g. "29 degrees"). */
export function speakNumber(n: number | string): string {
  const value = typeof n === "number" ? n : Number(n);
  if (Number.isNaN(value)) return String(n);
  return Math.round(value).toLocaleString("en-IN");
}
