export { prepareTextForTTS } from './sanitize';
export { speakText, stopSpeaking, ttsSupported, textForSpeech, chunkForSpeech, getBestIndianVoice } from './tts';
export type { TtsController, TtsCallbacks, TtsProgress } from './tts';
export { listen, sttSupported, correctTranscription } from './stt';
export type { SttCallbacks, SttController, MicState } from './stt';
export { detectLanguageOf, localeForLang, langLabel } from './language';
export {
  readMemory,
  writeMemory,
  rememberProfile,
  extractFacts,
  updateMemory,
  rememberTopic,
  buildMemoryContext,
} from './memory';
export type { AssistantMemory } from './memory';
export { personaInstruction, humanizeResponse, warmOpening, speakNumber } from './humanize';
export { extractEntities, verifyCropConsistency, CROP_DICTIONARY } from './entities';
export type { ExtractedEntities, CropDefinition } from './entities';
export { useAssistantVoice } from './useAssistantVoice';
export { GlowOrb } from './ui/GlowOrb';
export { Waveform } from './ui/Waveform';
export { ListeningOverlay } from './ui/ListeningOverlay';
export { VoicePlayerBar } from './ui/VoicePlayerBar';
