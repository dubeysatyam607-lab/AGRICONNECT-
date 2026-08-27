import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  X, Sparkles, Send, Bot, Volume2, VolumeX, Mic, MicOff,
  Image, Plus, Trash2, WifiOff, Menu, MapPin, Store, Navigation,
  Phone, Clock, Star,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { invokeEdgeWithTimeout } from "@/lib/invoke-edge";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/hooks/useAuth";
import { useFarm } from "@/contexts/FarmContext";
import { useLocation } from "@/features/location/LocationContext";
import { getLocalAnswer, type LocalAnswerKind } from "@/lib/local-advisor";
import { dialogService } from "@/core/services/DialogService";
import {
  fetchConversations, fetchConversationMessages, deleteConversation,
  type StoredConversation, type StoredChatMessage,
} from "@/lib/ai-persistence";
import {
  listen, sttSupported, detectLanguageOf, localeForLang,
  rememberProfile, buildMemoryContext, extractFacts, rememberTopic,
  personaInstruction, speakText as engineSpeakText, stopSpeaking as stopSpeakingEngine,
  chunkForSpeech, textForSpeech, extractEntities, verifyCropConsistency,
} from "@/core/voice";
import type { SttController, TtsController, MicState } from "@/core/voice";
import { ListeningOverlay } from "@/core/voice/ui/ListeningOverlay";
import { VoicePlayerBar } from "@/core/voice/ui/VoicePlayerBar";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  image?: string;
  suggestions?: string[];
  source?: "cloud" | "local";
  structured?: {
    kind: "nearby";
    places: NearbyPlace[];
    hasLocation: boolean;
  } | null;
}

interface NearbyPlace {
  id: string;
  name: string;
  nameHi: string;
  type: "market" | "shop";
  city: string;
  state: string;
  lat: number;
  lng: number;
  address: string;
  addressHi: string;
  phone: string;
  timings: string;
  rating: number;
  specialty?: string;
  distance: string | null;
}

interface ChatSession {
  id: string;
  title: string;
  timestamp: number;
  messages: ChatMessage[];
  language: string;
}

interface NearbyFetchResult {
  places: NearbyPlace[];
  hasLocation: boolean;
}

const MAX_IMAGE_SIZE_MB = 8;

// Stop all speaking utility using core Sarvam AI engine
const stopSpeaking = () => {
  stopSpeakingEngine();
};

// Practical Farmer Quick Prompt Chips
const PROMPT_CHIPS = [
  "yellow_leaves",
  "irrigation",
  "pest",
  "mandi",
  "weather",
] as const;

// Quick action toolbar items
const QUICK_ACTIONS = [
  { id: "markets", hint: "markets", icon: "market" },
  { id: "shops", hint: "shops", icon: "shop" },
  { id: "fertilizer", hint: "fertilizer", icon: "flask" },
  { id: "irrigation", hint: "irrigation", icon: "drop" },
  { id: "pest", hint: "pest", icon: "bug" },
  { id: "schemes", hint: "schemes", icon: "file" },
] as const;

const OFFLINE_ADVISORIES = {
  hindi: "⚠️ आप वर्तमान में ऑफ़लाइन हैं। किसान सहायक डेटाबेस में संग्रहीत जानकारी के अनुसार: अपनी खड़ी फसलों की सिंचाई को नियंत्रित रखें और रोगग्रस्त पत्तियों को तुरंत काटकर नष्ट कर दें।",
  english: "⚠️ You are offline. Kisan Sahayak cached tips: Monitor soil moisture, remove dead foliage to prevent mold, and check mandi prices when reconnected.",
};

const ERRORS = {
  hindi: "माफ़ कीजिए, सर्वर कनेक्टिविटी में समस्या हुई। कृपया दोबारा कोशिश करें या लॉग इन करें।",
  english: "Cannot reach the assistant. Please check your internet connection and try again.",
};

const getSpeechLangCode = (selectedLanguage: string): string => {
  const l = (selectedLanguage || "").toLowerCase();
  if (l.includes("punjabi") || l === "pa") return "pa-IN";
  if (l.includes("marathi") || l === "mr") return "mr-IN";
  if (l.includes("tamil") || l === "ta") return "ta-IN";
  if (l.includes("telugu") || l === "te") return "te-IN";
  if (l.includes("kannada") || l === "kn") return "kn-IN";
  if (l.includes("malayalam") || l === "ml") return "ml-IN";
  if (l.includes("bengali") || l === "bn") return "bn-IN";
  if (l.includes("gujarati") || l === "gu") return "gu-IN";
  if (l.includes("odia") || l.includes("oriya") || l === "or") return "or-IN";
  if (l.includes("assamese") || l === "as") return "as-IN";
  if (l.includes("english") || l === "en") return "en-IN";
  return "hi-IN";
};

const getSttLangCode = (selectedLanguage: string): string => {
  const l = (selectedLanguage || "").toLowerCase();
  if (l.includes("punjabi") || l === "pa") return "pa-IN";
  if (l.includes("marathi") || l === "mr") return "mr-IN";
  if (l.includes("tamil") || l === "ta") return "ta-IN";
  if (l.includes("telugu") || l === "te") return "te-IN";
  if (l.includes("kannada") || l === "kn") return "kn-IN";
  if (l.includes("malayalam") || l === "ml") return "ml-IN";
  if (l.includes("bengali") || l === "bn") return "bn-IN";
  if (l.includes("gujarati") || l === "gu") return "gu-IN";
  if (l.includes("odia") || l.includes("oriya") || l === "or") return "or-IN";
  if (l.includes("assamese") || l === "as") return "as-IN";
  if (l.includes("english") || l === "en") return "en-IN";
  return "hi-IN";
};

const DEFAULT_SUGGESTIONS = [
  "नजदीकी मंडी की कीमतें क्या हैं?",
  "खाद की सही मात्रा बताएं",
  "सिंचाई का सही समय",
  "कीट नियंत्रण के उपाय",
  "सरकारी योजनाएं",
];

const LOCAL_SUGGESTIONS: Partial<Record<LocalAnswerKind, string[]>> = {
  mandi: ["Soybean mandi price", "Wheat mandi price", "Onion rate today"],
  fertilizer: ["Wheat fertilizer dose", "Irrigation schedule", "Top schemes for farmers"],
  irrigation: ["Wheat irrigation schedule", "Fertilizer dose", "Mandi price"],
  pest: ["Organic pest control", "Yellow leaves on crop", "Mandi price"],
  disease: ["Organic pest control", "Fertilizer dose", "Mandi price"],
  scheme: ["KCC loan details", "PM-Kisan status", "PMFBY insurance"],
  crop: ["Fertilizer dose", "Irrigation schedule", "Mandi price"],
  general: ["Soybean mandi price", "Wheat fertilizer dose", "Govt schemes"],
};

interface KisanChatProps {
  onClose: () => void;
  selectedLanguage?: string;
}

const KisanChat: React.FC<KisanChatProps> = ({ onClose, selectedLanguage: propLanguage }) => {
  const { languageName, t } = useLanguage();
  const selectedLanguage = languageName || propLanguage || "Hindi (हिंदी)";
  const greeting = t('chat.greeting');
  const isHindi = selectedLanguage.includes("Hindi");

  const { user } = useAuth();
  const { toast } = useToast();
  const { profile } = useFarm();
  const { location: activeLocation } = useLocation();
  const localLang = isHindi ? "hi" : "en";

  const chipLabels: Record<string, string> = {
    yellow_leaves: t('chat.chipYellowLeaves'),
    irrigation: t('chat.chipIrrigate'),
    pest: t('chat.chipIdentifyPest'),
    mandi: t('chat.chipMandiPrice'),
    weather: t('chat.chipWeather'),
  };
  const chipPrompts: Record<string, string> = {
    yellow_leaves: t('chat.chipPromptYellowLeaves'),
    irrigation: t('chat.chipPromptIrrigate'),
    pest: t('chat.chipPromptPest'),
    mandi: t('chat.chipPromptMandiPrice'),
    weather: t('chat.chipPromptWeather'),
  };
  const quickActionLabels: Record<string, string> = {
    markets: t('chat.qaMandi'),
    shops: t('chat.qaShops'),
    fertilizer: t('chat.qaFertilizer'),
    irrigation: t('chat.qaIrrigation'),
    pest: t('chat.qaPests'),
    schemes: t('chat.qaSchemes'),
  };

  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(false);
  const [isOffline, setIsOffline] = useState(typeof navigator !== 'undefined' ? !navigator.onLine : false);
  const [showHistory, setShowHistory] = useState(false);
  const [micState, setMicState] = useState<MicState>("IDLE");

  // VoiceEngine: live transcript, silence auto-stop and spoken-language auto-detect
  const [voiceTranscript, setVoiceTranscript] = useState("");
  const [voiceFinal, setVoiceFinal] = useState(false);
  const [sttLang, setSttLang] = useState(getSttLangCode(selectedLanguage));
  const sttRef = useRef<SttController | null>(null);
  // Ref mirror of voiceTranscript so the listen() onEnd/onError closures (which
  // are created once when the mic turns on) read the LATEST transcript instead
  // of the stale value captured at the moment listening started.
  const voiceTranscriptRef = useRef("");

  // VoiceEngine: speaking progress subtitles
  const [speakingSentence, setSpeakingSentence] = useState("");
  const [speakPaused, setSpeakPaused] = useState(false);
  const [speakRate, setSpeakRate] = useState(0.95);
  const [speakTotal, setSpeakTotal] = useState(0);
  const [speakIndex, setSpeakIndex] = useState(0);
  const [speakActive, setSpeakActive] = useState<"engine" | "azure" | null>(null);
  const speakControllerRef = useRef<TtsController | null>(null);

  // Location-aware nearby services state
  const [nearbyLoading, setNearbyLoading] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  // Word-by-word typing animation state
  const [typingWordIndex, setTypingWordIndex] = useState<number | null>(null);
  const typingTimerRef = useRef<number | null>(null);

  // Conversation history sessions state
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string>("");
  const [serverConversationId, setServerConversationId] = useState<string | null>(null);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([
    { role: "assistant", content: greeting }
  ]);

  // Image Upload references & states
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory, isLoading, typingWordIndex, nearbyLoading]);

  // Detect network online/offline state
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Load chat sessions from localStorage on mount
  useEffect(() => {
    const cached = localStorage.getItem("kisan_chat_sessions");
    if (cached) {
      try {
        const parsed = JSON.parse(cached) as ChatSession[];
        setSessions(parsed);
        if (parsed.length > 0) {
          setCurrentSessionId(parsed[0].id);
          setChatHistory(parsed[0].messages);
        }
      } catch (e) {
        console.error("Failed to parse cached chat history sessions", e);
      }
    }
  }, []);

  // Load the signed-in user's server-side conversations (spec §7 chat memory).
  // Server conversations are the source of truth when signed in; the local
  // cache is used for guests only.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      try {
        const conversations = await fetchConversations();
        if (cancelled) return;
        if (!conversations || conversations.length === 0) return;
        const serverSessions: ChatSession[] = conversations.map((c: StoredConversation) => ({
          id: `server-${c.id}`,
          title: c.title,
          timestamp: new Date(c.updated_at).getTime(),
          messages: [],
          language: c.language,
        }));
        // Merge with any local guest sessions, server ones on top.
        const localOnly = sessions.filter((s) => !s.id.startsWith("server-"));
        const merged = [...serverSessions, ...localOnly];
        setSessions(merged);
        if (currentSessionId === "") {
          setCurrentSessionId(serverSessions[0].id);
          const msgs = await fetchConversationMessages(conversations[0].id);
          if (cancelled) return;
          setChatHistory([
            { role: "assistant", content: greeting },
            ...(msgs ?? []).map((m: StoredChatMessage) => ({
              role: m.role as ChatMessage["role"],
              content: m.content,
              source: "cloud" as const,
            })),
          ]);
        }
      } catch (e) {
        console.warn("Failed to load server conversations", e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, greeting]);

  // Stop any ongoing Sarvam AI speech when the chat unmounts. The engine's
  // onStart/onProgress/onEnd callbacks own the isSpeaking state (the Web Audio
  // engine is NOT tied to window.speechSynthesis).
  useEffect(() => {
    return () => {
      stopSpeaking();
      speakControllerRef.current = null;
    };
  }, []);

  // Seed the assistant's long-term memory from the farmer's farm profile.
  useEffect(() => {
    try {
      rememberProfile({
        crop: profile.crop,
        variety: profile.variety,
        stage: profile.stage,
        farmArea: profile.farmArea,
        soilType: profile.soilType,
      });
    } catch {
      // Memory is best-effort — never block the chat on it.
    }
  }, [profile]);

  // Create a new session list node
  const handleNewSession = () => {
    stopAllSpeaking();
    setCurrentSessionId("");
    setServerConversationId(null);
    setChatHistory([{ role: "assistant", content: greeting }]);
    setImagePreview(null);
    setImageBase64(null);
    setShowHistory(false);
    if (typingTimerRef.current) window.clearInterval(typingTimerRef.current);
    setTypingWordIndex(null);
  };

  // Save current conversation status to localStorage
  const saveSession = useCallback((history: ChatMessage[]) => {
    let activeId = currentSessionId;
    let updatedSessions = [...sessions];

    if (!activeId) {
      activeId = Date.now().toString();
      setCurrentSessionId(activeId);
      const firstMsg = history.find(m => m.role === "user")?.content || "Conversation";
      const title = firstMsg.length > 25 ? firstMsg.slice(0, 22) + "..." : firstMsg;
      updatedSessions = [{
        id: activeId,
        title,
        timestamp: Date.now(),
        messages: history,
        language: selectedLanguage
      }, ...updatedSessions];
    } else {
      updatedSessions = updatedSessions.map(s => {
        if (s.id === activeId) {
          const firstMsg = history.find(m => m.role === "user")?.content || s.title;
          const title = firstMsg.length > 25 && !s.title.includes("...") ? firstMsg.slice(0, 22) + "..." : s.title;
          return {
            ...s,
            title,
            messages: history,
            timestamp: Date.now()
          };
        }
        return s;
      });
    }

    setSessions(updatedSessions);
    try {
      const capped = updatedSessions.slice(0, 20);
      localStorage.setItem("kisan_chat_sessions", JSON.stringify(capped));
    } catch {
      // Storage full or unavailable — keep chat in memory only
    }
  }, [currentSessionId, selectedLanguage, sessions]);

  // Load a selected history session
  const handleLoadSession = async (session: ChatSession) => {
    stopAllSpeaking();
    setCurrentSessionId(session.id);
    setShowHistory(false);
    if (typingTimerRef.current) window.clearInterval(typingTimerRef.current);
    setTypingWordIndex(null);

    // Server-backed conversation — fetch its messages.
    if (session.id.startsWith("server-") && session.messages.length === 0) {
      const serverId = session.id.replace("server-", "");
      setServerConversationId(serverId);
      const msgs = await fetchConversationMessages(serverId);
      setChatHistory([
        { role: "assistant", content: greeting },
        ...(msgs ?? []).map((m: StoredChatMessage) => ({
          role: m.role as ChatMessage["role"],
          content: m.content,
          source: "cloud" as const,
        })),
      ]);
      return;
    }
    if (!session.id.startsWith("server-")) setServerConversationId(null);
    setChatHistory(session.messages);
    setImagePreview(null);
    setImageBase64(null);
  };

  // Delete a history node session
  const handleDeleteSession = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();

    const confirmed = await dialogService.confirm({
      title: t('chat.deleteConfirmTitle'),
      description: t('chat.deleteConfirmMessage'),
      confirmText: t('chat.deleteConfirmAction'),
      cancelText: t('chat.cancelAction'),
      variant: "danger",
    });
    if (!confirmed) return;

    if (id.startsWith("server-")) {
      const serverId = id.replace("server-", "");
      await deleteConversation(serverId);
    }

    const updated = sessions.filter(s => s.id !== id);
    setSessions(updated);
    try {
      localStorage.setItem("kisan_chat_sessions", JSON.stringify(updated));
    } catch {
      // Storage full or unavailable — ignore
    }
    if (currentSessionId === id) {
      handleNewSession();
    }
  };

  // Handle Image Upload Selection
  const triggerImageSelect = () => {
    fileInputRef.current?.click();
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedMimes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedMimes.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Please attach a valid JPG, PNG, or WebP image.",
        variant: "destructive",
      });
      return;
    }

    if (file.size > MAX_IMAGE_SIZE_MB * 1024 * 1024) {
      toast({
        title: t('chat.fileTooLargeTitle'),
        description: t('chat.fileTooLargeDesc', { size: MAX_IMAGE_SIZE_MB }),
        variant: "destructive"
      });
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64Url = reader.result as string;
      setImagePreview(base64Url);
      setImageBase64(base64Url.split(",")[1]);
    };
    reader.readAsDataURL(file);
  };

  const clearAttachedImage = () => {
    setImagePreview(null);
    setImageBase64(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const toggleListening = () => {
    if (!sttSupported()) {
      toast({
        title: t('chat.voiceNotSupportedTitle'),
        description: t('chat.voiceNotSupportedDesc'),
        variant: "destructive"
      });
      return;
    }

    // Barge-in: If AI is speaking, interrupt it immediately
    if (isSpeaking) {
      stopAllSpeaking();
    }

    if (isListening) {
      // Manual stop — commit whatever was captured.
      sttRef.current?.stop();
      sttRef.current = null;
      const captured = voiceTranscriptRef.current;
      voiceTranscriptRef.current = "";
      setIsListening(false);
      setMicState("IDLE");
      setVoiceTranscript("");
      if (captured.trim()) {
        handleSend(captured.trim());
      }
      return;
    }

    stopAllSpeaking();
    setVoiceTranscript("");
    voiceTranscriptRef.current = "";
    setVoiceFinal(false);
    setIsListening(true);
    setMicState("LISTENING");

    sttRef.current = listen(sttLang, {
      onTranscript: (combined, isFinal) => {
        voiceTranscriptRef.current = combined;
        setVoiceTranscript(combined);
        setVoiceFinal(isFinal);
      },
      onStateChange: (state) => {
        setMicState(state);
        if (state === "IDLE") {
          setIsListening(false);
        }
      },
      // Silence auto-stop — automatically commit and send the captured speech straight to AI!
      onEnd: () => {
        sttRef.current = null;
        setIsListening(false);
        setMicState("IDLE");
        const captured = voiceTranscriptRef.current;
        voiceTranscriptRef.current = "";
        setVoiceTranscript("");
        if (captured.trim()) {
          handleSend(captured.trim());
        }
      },
      onError: (error) => {
        sttRef.current = null;
        setIsListening(false);
        setMicState("ERROR");
        voiceTranscriptRef.current = "";
        setVoiceTranscript("");
        if (error === "not-allowed" || error === "service-not-allowed") {
          toast({
            title: t('chat.micDeniedTitle'),
            description: t('chat.micDeniedDesc'),
            variant: "destructive",
          });
        }
      },
    });
  };

  const commitTranscript = (text: string) => {
    if (!text.trim()) return;
    const detected = detectLanguageOf(text);
    if (detected && detected.lang !== "en") {
      setSttLang(localeForLang(detected.lang));
    }
    rememberTopic(text);
    voiceTranscriptRef.current = "";
    setVoiceTranscript("");
    setIsListening(false);
    setMicState("IDLE");
    sttRef.current?.abort();
    sttRef.current = null;
    handleSend(text.trim());
  };

  const stopAllSpeaking = () => {
    speakControllerRef.current?.stop();
    speakControllerRef.current = null;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
    setSpeakActive(null);
    setSpeakingSentence("");
    setSpeakPaused(false);
  };

  /**
   * Speak assistant reply with Natural Indian Human Voice & immediate streaming playback.
   */
  const playAssistantVoice = (text: string, forceLang?: string) => {
    // Detect response language to pick the exact natural voice
    const detected = detectLanguageOf(text);
    const langCode = forceLang || (detected.lang === "hi" ? "hi-IN" : getSpeechLangCode(selectedLanguage));
    const chunks = chunkForSpeech(textForSpeech(text, langCode), langCode);

    setSpeakActive("engine");
    setIsSpeaking(true);
    setSpeakPaused(false);
    setSpeakingSentence(chunks[0] || "");
    setSpeakTotal(chunks.length);
    setSpeakIndex(0);

    const controller = engineSpeakText(text, langCode, {
      onStart: (total) => {
        setSpeakTotal(total || chunks.length);
        setIsSpeaking(true);
      },
      onProgress: (p) => {
        setSpeakingSentence(chunks[p.sentenceIndex] || "");
        setSpeakTotal(chunks.length);
        setSpeakIndex(p.sentenceIndex);
      },
      onEnd: () => {
        setIsSpeaking(false);
        setSpeakActive(null);
        setSpeakingSentence("");
        speakControllerRef.current = null;
      },
      onError: () => {
        setIsSpeaking(false);
        setSpeakActive(null);
        setSpeakingSentence("");
        speakControllerRef.current = null;
      },
    });
    speakControllerRef.current = controller;
  };

  // Start the word-by-word typing animation for a given text
  const startTypingAnimation = useCallback((fullText: string) => {
    if (typingTimerRef.current) window.clearInterval(typingTimerRef.current);
    setTypingWordIndex(0);
    const words = fullText.split(" ").length;
    const step = 22; // ms per word — fast, smart-feeling
    let index = 0;
    typingTimerRef.current = window.setInterval(() => {
      index += 1;
      setTypingWordIndex(index);
      if (index >= words) {
        if (typingTimerRef.current) window.clearInterval(typingTimerRef.current);
        typingTimerRef.current = null;
        setTypingWordIndex(null);
      }
    }, step);
  }, []);

  const getErrorMessage = () => isHindi ? ERRORS.hindi : ERRORS.english;
  const getOfflineAdvisory = () => isHindi ? OFFLINE_ADVISORIES.hindi : OFFLINE_ADVISORIES.english;

  // Fetch nearby markets / shops with geolocation
  const fetchNearby = useCallback(async (type: "markets" | "shops"): Promise<void> => {
    if (isLoading) return;
    stopAllSpeaking();
    setIsLoading(true);
    setNearbyLoading(true);

    const userMsg: ChatMessage = { role: "user", content: `Show me nearby ${type === "markets" ? "mandis/markets" : "agri-input shops"} near my location.` };
    const nextHistory = [...chatHistory, userMsg];
    setChatHistory(nextHistory);

    // 1. Offline Mode Fallback
    if (isOffline) {
      const offlineMsg: ChatMessage = { role: "assistant", content: getOfflineAdvisory() };
      const finalHistory = [...nextHistory, offlineMsg];
      setChatHistory(finalHistory);
      saveSession(finalHistory);
      setIsLoading(false);
      setNearbyLoading(false);
      return;
    }

    try {
      // Try to get location from active context, local state, or GPS
      let lat: number | undefined = (activeLocation?.status === 'ready' && typeof activeLocation.latitude === 'number')
        ? activeLocation.latitude
        : userLocation?.lat;
      let lng: number | undefined = (activeLocation?.status === 'ready' && typeof activeLocation.longitude === 'number')
        ? activeLocation.longitude
        : userLocation?.lng;

      if (!lat && !lng && navigator.geolocation) {
        try {
          const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: true,
              timeout: 8000,
              maximumAge: 300000,
            });
          });
          lat = position.coords.latitude;
          lng = position.coords.longitude;
          setUserLocation({ lat, lng });
        } catch {
          // Location permission denied — proceed without coordinates
        }
      }

      const { data: nearbyData, error: nearbyErr } = await invokeEdgeWithTimeout("nearby-services", {
        latitude: lat, longitude: lng, type,
      });

      const result: NearbyFetchResult = nearbyData ?? { places: [], hasLocation: false };
      const heading = type === "markets"
        ? (result.hasLocation ? `📍 Nearby Mandis` : "📍 Popular Mandis")
        : (result.hasLocation ? `🏪 Nearby Agri Shops` : "🏪 Popular Agri Shops");

      const assistantMsg: ChatMessage = {
        role: "assistant",
        content: heading,
        structured: {
          kind: "nearby",
          places: result.places || [],
          hasLocation: result.hasLocation,
        },
      };

      const finalHistory = [...nextHistory, assistantMsg];
      setChatHistory(finalHistory);
      saveSession(finalHistory);
    } catch (err: any) {
      console.error("Nearby services error:", err);
      const errorMsg: ChatMessage = { role: "assistant", content: getErrorMessage() };
      const finalHistory = [...nextHistory, errorMsg];
      setChatHistory(finalHistory);
      saveSession(finalHistory);
    } finally {
      setIsLoading(false);
      setNearbyLoading(false);
    }
  }, [chatHistory, isLoading, saveSession, userLocation, isHindi]);

  // Main sending workflow
  const handleSend = async (overridePrompt?: string) => {
    const messageToSend = overridePrompt || input.trim();
    if (!messageToSend && !imageBase64) return;
    if (isLoading) return;

    stopAllSpeaking();
    setIsLoading(true);
    setInput("");

    const userMsg: ChatMessage = {
      role: "user",
      content: messageToSend,
      image: imagePreview || undefined
    };

    const nextHistory = [...chatHistory, userMsg];
    setChatHistory(nextHistory);

    const base64Data = imageBase64;
    clearAttachedImage();

    // 1. Offline Mode Fallback — smart local advisor
    if (isOffline) {
      const local = getLocalAnswer(messageToSend, profile, localLang, chatHistory);
      window.setTimeout(() => {
        const finalHistory = [...nextHistory, {
          role: "assistant" as const,
          content: local.matched ? local.text : getOfflineAdvisory(),
          source: local.matched ? ("local" as const) : undefined,
          suggestions: local.matched ? LOCAL_SUGGESTIONS[local.kind] : undefined,
        }];
        setChatHistory(finalHistory);
        saveSession(finalHistory);
        setIsLoading(false);
      }, 700);
      return;
    }

    try {
      let assistantResponse = "";
      let suggestions: string[] = [];
      const source: ChatMessage["source"] = "cloud";

      // 2. Crop Doctor Mode: If image is present
      if (base64Data) {
        if (!user) {
          assistantResponse = isHindi
            ? "📸 फसल रोग जांच के लिए कृपया पहले लॉगिन करें ताकि आपकी फसल का इतिहास सुरक्षित रहे। या आप नीचे कोई भी कृषि प्रश्न लिखकर या बोलकर पूछ सकते हैं।"
            : "📸 Please sign in to run AI crop leaf disease analysis so your diagnosis history is saved. You can also ask any farming question by typing or speaking below.";
          suggestions = isHindi
            ? ["खाद की सही मात्रा बताएं", "सिंचाई का सही समय", "नजदीकी मंडी भाव"]
            : ["Fertilizer dosage", "Irrigation schedule", "Mandi prices"];
        } else {
          let r: Record<string, unknown> | null = null;
          try {
            const { data: cropData, error: cropErr } = await invokeEdgeWithTimeout<{ result: Record<string, unknown>; error?: string }>("crop-doctor", {
              description: messageToSend || "Analyze this crop health",
              imageBase64: base64Data,
              language: selectedLanguage,
            }, 15000);

            if (!cropErr && cropData?.result) {
              r = cropData.result;
            }
          } catch {
            // Local fallback below
          }

          if (!r) {
            // Honest fallback — never fabricate a diagnosis
            const langCode = selectedLanguage.toLowerCase().includes("hi") || selectedLanguage.toLowerCase().includes("hindi") ? "hi"
              : selectedLanguage.toLowerCase().includes("mr") ? "mr"
              : selectedLanguage.toLowerCase().includes("gu") ? "gu"
              : selectedLanguage.toLowerCase().includes("pa") ? "pa"
              : selectedLanguage.toLowerCase().includes("ta") ? "ta"
              : selectedLanguage.toLowerCase().includes("te") ? "te"
              : selectedLanguage.toLowerCase().includes("kn") ? "kn"
              : selectedLanguage.toLowerCase().includes("ml") ? "ml"
              : selectedLanguage.toLowerCase().includes("bn") ? "bn"
              : selectedLanguage.toLowerCase().includes("or") ? "or"
              : selectedLanguage.toLowerCase().includes("as") ? "as"
              : "en";

            const errorMessages: Record<string, { msg: string; suggestions: string[] }> = {
              hi: { msg: "📸 फसल रोग जांच में समस्या आई। कृपया दोबारा प्रयास करें। अगर समस्या बनी रहे तो स्पष्ट फोटो के साथ फिर से भेजें।", suggestions: ["फसल रोग जांच दोबारा करें", "कीटनाशक की सलाह", "नजदीकी मंडी भाव"] },
              mr: { msg: "📸 पिक रोग तपासणीत अडचण आली. कृपया पुन्हा प्रयत्न करा. स्पष्ट फोटोसह पुन्हा पाठवा.", suggestions: ["पिक रोग तपासणी पुन्हा करा", "कीटकनाशक सल्ला", "जवळच्या बाजाराचा भाव"] },
              gu: { msg: "📸 પાક રોગ તપાસમાં સમસ્યા આવી. કૃપા કરીને ફરી પ્રયાસ કરો. સ્પષ્ટ ફોટો સાથે મોકલો.", suggestions: ["પાક રોગ તપાસ ફરી કરો", "જંતુનાશક સલાહ", "નજીકની મંડી ભાવ"] },
              pa: { msg: "📸 ਫਸਲ ਰੋਗ ਜਾਂਚ ਵਿੱਚ ਸਮੱਸਿਆ ਆਈ। ਕਿਰਪਾ ਕਰਕੇ ਦੁਬਾਰਾ ਕੋਸ਼ਿਸ਼ ਕਰੋ। ਸਾਫ਼ ਫੋਟੋ ਨਾਲ ਭੇਜੋ।", suggestions: ["ਫਸਲ ਰੋਗ ਜਾਂਚ ਦੁਬਾਰਾ ਕਰੋ", "ਕੀਟਨਾਸ਼ਕ ਸਲਾਹ", "ਨੇੜੇ ਦੀ ਮੰਡੀ ਭਾਵ"] },
              ta: { msg: "📸 பயிர் நோய் பரிசோதனையில் சிக்கல். மீண்டும் முயற்சிக்கவும். தெளிவான புகைப்படத்துடன் அனுப்பவும்.", suggestions: ["பயிர் நோய் பரிசோதனை மீண்டும்", "பூச்சிக்கொல்லி ஆலோசனை", "அருகிலுள்ள சந்தை விலை"] },
              te: { msg: "📸 పంట వ్యాధి పరీక్షలో సమస్య వచ్చింది. దయచేసి మళ్ళీ ప్రయత్నించండి. స్పష్టమైన ఫోటోతో పంపండి.", suggestions: ["పంట వ్యాధి పరీక్ష మళ్ళీ", "పురుగుమందు సలహా", "సమీపంలోని మార్కెట్ ధర"] },
              kn: { msg: "📸 ಬೆಳೆ ರೋಗ ಪರೀಕ್ಷೆಯಲ್ಲಿ ಸಮಸ್ಯೆ ಬಂದಿದೆ. ದಯವಿಟ್ಟು ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ. ಸ್ಪಷ್ಟ ಫೋಟೊದೊಂದಿಗೆ ಕಳುಹಿಸಿ.", suggestions: ["ಬೆಳೆ ರೋಗ ಪರೀಕ್ಷೆ ಮತ್ತೆ", "ಕೀಟನಾಶಕ ಸಲಹೆ", "ಹತ್ತಿರದ ಮಾರುಕಟ್ಟೆ ಬೆಲೆ"] },
              ml: { msg: "📸 വിള രോഗ പരിശോധനയിൽ പ്രശ്നം. ദയവായി വീണ്ടും ശ്രമിക്കുക. വ്യക്തമായ ഫോട്ടോയോടെ അയക്കുക.", suggestions: ["വിള രോഗ പരിശോധന വീണ്ടും", "കീടനാശിനി ഉപദേശം", "അടുത്തുള്ള മാർക്കറ്റ് വില"] },
              bn: { msg: "📸 ফসল রোগ পরীক্ষায় সমস্যা। দয়া করে আবার চেষ্টা করুন। স্পষ্ট ছবি সহ পাঠান।", suggestions: ["ফসল রোগ পরীক্ষা আবার", "কীটনাশক পরামর্শ", "কাছের বাজারের দাম"] },
              or: { msg: "📸 ଫସଲ ରୋଗ ପରୀକ୍ଷାରେ ସମସ୍ୟା। ଦୟାକରି ପୁଣି ଚେଷ୍ଟା କରନ୍ତୁ। ସ୍ପଷ୍ଟ ଫୋଟୋ ସହ ପଠାନ୍ତୁ।", suggestions: ["ଫସଲ ରୋଗ ପରୀକ୍ଷା ପୁଣି", "କୀଟନାଶକ ପରାମର୍ଶ", "ନିକଟତମ ବଜାର ମୂଲ୍ୟ"] },
              as: { msg: "📸 ফসল ৰোগ পৰীক্ষাত সমস্যা আহিল। অনুগ্ৰহ কৰি পুনৰ চেষ্টা কৰক। স্পষ্ট ফটোৰ লগত আকৌ।", suggestions: ["ফসল ৰোগ পৰীক্ষা পুনৰ কৰক", "কীটনাশক পৰামৰ্শ", "ওচৰৰ বজাৰৰ দাম"] },
              en: { msg: "📸 Crop disease analysis encountered an issue. Please try again. If the problem persists, resubmit with a clear photo.", suggestions: ["Retry crop scan", "Pesticide advice", "Nearby mandi prices"] },
            };

            const errData = errorMessages[langCode] || errorMessages.en;
            r = { possible_issue: errData.msg, health_status: "Error", confidence: 0, symptoms: [], recommendations: [], urgency: "N/A", next_steps_for_farmer: [] };
            assistantResponse = errData.msg;
            suggestions = errData.suggestions;
          }

          const lines: string[] = [];
          if (r.possible_issue) lines.push(`🩺 **${String(r.possible_issue)}**`);
          if (r.health_status) lines.push(`• **Health**: ${r.health_status}`);
          if (r.confidence != null) lines.push(`• **Confidence**: ${r.confidence}%`);
          if (Array.isArray(r.symptoms) && r.symptoms.length) lines.push(`• **Symptoms**: ${r.symptoms.join(", ")}`);
          if (Array.isArray(r.recommendations) && r.recommendations.length) lines.push(`• **Treatment**: ${r.recommendations.join("; ")}`);
          if (r.urgency) lines.push(`• **Urgency**: ${r.urgency}`);
          if (Array.isArray(r.next_steps_for_farmer) && r.next_steps_for_farmer.length) lines.push(`• **Next Steps**: ${r.next_steps_for_farmer.join(", ")}`);
          assistantResponse = lines.join("\n");
          suggestions = isHindi ? ["खाद की सही मात्रा बताएं", "सिंचाई का सही समय", "नजदीकी मंडी भाव"] : ["Fertilizer dosage", "Irrigation schedule", "Mandi prices"];
        }
      }
      // 3. Conversational AI Chat Mode: If text-only
      else {
        // VoiceEngine memory — remember facts the farmer shares mid-chat and
        // remind the assistant of everything it already knows about this farm.
        try {
          const facts = extractFacts(messageToSend);
          if (Object.keys(facts).length > 0) {
            const { updateMemory } = await import("@/core/voice");
            updateMemory((m) => {
              m.facts = { ...m.facts, ...facts };
              if (facts.name && !m.name) m.name = facts.name;
              if (facts.village && !m.village) m.village = facts.village;
              if (facts.crop && !m.crop) m.crop = facts.crop;
            });
          }
        } catch {
          // Memory is best-effort.
        }
        const memoryContext = buildMemoryContext(rememberProfile({
          crop: profile.crop, variety: profile.variety, stage: profile.stage,
          farmArea: profile.farmArea, soilType: profile.soilType,
        }));

        // Spec §17: give the assistant the user's latest crop scan context so
        // follow-ups like "Iske liye kya karu?" work without manual copy-paste.
        let scanContext = "";
        try {
          const { fetchLatestScan } = await import("@/lib/ai-persistence");
          const latest = await fetchLatestScan();
          if (latest?.possible_issue) {
            scanContext = `Latest crop scan for this farmer (auto-attached): ${JSON.stringify({
              crop: latest.crop,
              plant_part: latest.plant_part,
              health_status: latest.health_status,
              possible_issue: latest.possible_issue,
              confidence: latest.confidence,
              symptoms: latest.symptoms,
            })}. Answer any question that references "scan", "फसल रोग", "पत्ती", or the above issue using this context.`;
          }
        } catch {
          // Scan context is best-effort.
        }

        // Dynamic query language detection: If user types Hindi/Hinglish, enforce Hindi
        const queryLang = detectLanguageOf(messageToSend);
        const isQueryHindi = queryLang?.lang === "hi" || isHindi || isHinglish(messageToSend);
        const resolvedLang = isQueryHindi
          ? "Hindi (हिंदी)"
          : (queryLang?.lang ? queryLang.display : selectedLanguage);

        const { data: chatData, error: chatErr } = await invokeEdgeWithTimeout<{
          message?: string;
          suggestions?: string[];
          conversationId?: string;
          detectedLanguage?: string;
          toolsUsed?: string[];
        }>("kisan-chat", {
          messages: nextHistory.map(m => ({ role: m.role, content: m.content })),
          language: resolvedLang,
          persona: personaInstruction(
            isQueryHindi ? "hi"
            : resolvedLang.toLowerCase().includes("marathi") || resolvedLang.toLowerCase().includes("mr") ? "mr"
            : resolvedLang.toLowerCase().includes("gujarati") || resolvedLang.toLowerCase().includes("gu") ? "gu"
            : resolvedLang.toLowerCase().includes("punjabi") || resolvedLang.toLowerCase().includes("pa") ? "pa"
            : resolvedLang.toLowerCase().includes("tamil") || resolvedLang.toLowerCase().includes("ta") ? "ta"
            : resolvedLang.toLowerCase().includes("telugu") || resolvedLang.toLowerCase().includes("te") ? "te"
            : resolvedLang.toLowerCase().includes("kannada") || resolvedLang.toLowerCase().includes("kn") ? "kn"
            : resolvedLang.toLowerCase().includes("malayalam") || resolvedLang.toLowerCase().includes("ml") ? "ml"
            : resolvedLang.toLowerCase().includes("bengali") || resolvedLang.toLowerCase().includes("bn") ? "bn"
            : resolvedLang.toLowerCase().includes("odia") || resolvedLang.toLowerCase().includes("or") ? "or"
            : resolvedLang.toLowerCase().includes("assamese") || resolvedLang.toLowerCase().includes("as") ? "as"
            : "en"
          ),
          memoryContext: scanContext ? `${scanContext}\n\n${memoryContext}` : memoryContext,
          conversationId: serverConversationId,
          userLocation: (activeLocation?.status === 'ready' && typeof activeLocation.latitude === 'number' && typeof activeLocation.longitude === 'number')
            ? { latitude: activeLocation.latitude, longitude: activeLocation.longitude }
            : (userLocation ? { latitude: userLocation.lat, longitude: userLocation.lng } : undefined),
          farmContext: {
            crop: profile.crop,
            variety: profile.variety,
            stage: profile.stage,
            area: profile.farmArea,
            soil: profile.soilType,
          },
        }, 30000);

        if (chatErr || !chatData?.message) {
          throw new Error(chatErr || "No response from AI assistant");
        }

        assistantResponse = chatData.message;
        suggestions = chatData.suggestions || DEFAULT_SUGGESTIONS;

        // Crop Entity Consistency Protection (Part 4):
        // If user asked for Tomato, ensure the AI answer is about Tomato and NOT replaced by Soybean!
        const entities = extractEntities(messageToSend);
        if (entities.crop && !verifyCropConsistency(entities.crop, assistantResponse)) {
          console.warn(`[KisanAI] Crop mismatch detected. Requested "${entities.crop}", regenerating with guaranteed crop advisor.`);
          const localCropAnswer = getLocalAnswer(messageToSend, profile, localLang, chatHistory);
          if (localCropAnswer.matched) {
            assistantResponse = localCropAnswer.text;
            if (localCropAnswer.kind) {
              suggestions = LOCAL_SUGGESTIONS[localCropAnswer.kind] || suggestions;
            }
          }
        }

        if (chatData?.conversationId && serverConversationId !== chatData.conversationId) {
          setServerConversationId(chatData.conversationId);
        }
        // Once a server conversation exists, switch the local session to track
        // it so future turns keep writing to the same thread.
        if (chatData?.conversationId && chatData.conversationId !== "guest" && currentSessionId !== `server-${chatData.conversationId}`) {
          setCurrentSessionId(`server-${chatData.conversationId}`);
        }
      }

      const finalHistory = [...nextHistory, {
        role: "assistant" as const,
        content: assistantResponse,
        suggestions,
        source,
      }];
      setChatHistory(finalHistory);
      saveSession(finalHistory);

      // Premium word-by-word typing animation
      startTypingAnimation(assistantResponse);

      if (autoSpeak) {
        playAssistantVoice(assistantResponse);
      }

    } catch (err: any) {
      console.error("AI Assistant processing error:", err);
      // Smart local fallback with instant agricultural knowledge
      const local = getLocalAnswer(messageToSend, profile, localLang, chatHistory);
      const fallbackContent = local.matched ? local.text : (
        isHindi
          ? `🌾 **कृषि सलाह व सहायता**:\n\n` +
            `• **फसल सवाल**: आप किसी भी फसल की खाद मात्रा, बुआई, या सिंचाई पूछ सकते हैं।\n` +
            `• **कीट व रोग**: पत्ती पर धब्बे या कीड़े के लक्षण बताएं (जैसे: 'टमाटर में झुलसा', 'गेहूं में पीला रतुआ')।\n` +
            `• **मंडी भाव**: फसल का नाम लिखकर भाव पूछें (जैसे: 'सोयाबीन मंडी भाव')।\n\n` +
            `पूछें: "${profile.crop || 'गेहूं'} खाद मात्रा", "कीटनाशक स्प्रे", या "मंडी भाव"।`
          : `🌾 **Agricultural Advisor & Support**:\n\n` +
            `• **Crop Guidance**: Ask about fertilizer schedules, sowing, or irrigation for any crop.\n` +
            `• **Pest & Disease**: Describe leaf symptoms (e.g., 'Tomato early blight', 'Wheat yellow rust').\n` +
            `• **Mandi Rates**: Type crop name for market prices (e.g., 'Soybean mandi price').\n\n` +
            `Try asking: "${profile.crop || 'Wheat'} fertilizer dose", "Pesticide spray", or "Mandi prices".`
      );

      const finalHistory = [...nextHistory, {
        role: "assistant" as const,
        content: fallbackContent,
        source: "local" as const,
        suggestions: local.matched ? (LOCAL_SUGGESTIONS[local.kind] || DEFAULT_SUGGESTIONS) : [
          `${profile.crop || 'Wheat'} fertilizer dose`,
          `${profile.crop || 'Wheat'} irrigation schedule`,
          `${profile.crop || 'Wheat'} mandi price`,
        ],
      }];
      setChatHistory(finalHistory);
      saveSession(finalHistory);
      startTypingAnimation(fallbackContent);

      if (autoSpeak) {
        playAssistantVoice(fallbackContent);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSpeakMessage = (text: string) => {
    if (isSpeaking) {
      stopAllSpeaking();
      return;
    }
    playAssistantVoice(text);
  };

  const handleSpeakControls = {
    pause: () => {
      speakControllerRef.current?.pause();
      setSpeakPaused(true);
    },
    resume: () => {
      speakControllerRef.current?.resume();
      setSpeakPaused(false);
    },
    replay: () => {
      speakControllerRef.current?.replay();
      setSpeakPaused(false);
      setIsSpeaking(true);
    },
    rate: (r: number) => {
      speakControllerRef.current?.setRate(r);
      setSpeakRate(r);
    },
  };

  // Quick actions: nearby services + AI prompts
  const handleQuickAction = (actionId: string) => {
    if (actionId === "markets") {
      fetchNearby("markets");
      return;
    }
    if (actionId === "shops") {
      fetchNearby("shops");
      return;
    }
    const quickActionPrompts: Record<string, string> = {
      fertilizer: t('chat.qaPromptFertilizer'),
      irrigation: t('chat.qaPromptIrrigation'),
      pest: t('chat.qaPromptPest'),
      schemes: t('chat.qaPromptSchemes'),
    };
    const prompt = quickActionPrompts[actionId];
    if (prompt) {
      handleSend(prompt);
    }
  };

  const openInMaps = (place: NearbyPlace) => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.lng}`;
    window.open(url, "_blank");
  };

  const renderPlaceCard = (place: NearbyPlace) => (
    <div
      key={place.id}
      className="rounded-2xl border border-white/10 bg-card/10 p-3.5 hover:bg-card/20 transition-colors"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className={cn(
            "w-9 h-9 rounded-xl flex items-center justify-center shrink-0",
            place.type === "market" ? "bg-amber-500/15 text-amber-400" : "bg-emerald-500/15 text-emerald-400"
          )}>
            {place.type === "market" ? <MapPin size={16} /> : <Store size={16} />}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-extrabold text-white truncate">{place.name}</p>
            <p className="text-[10px] text-slate-400 truncate">
              {isHindi && place.nameHi ? place.nameHi : place.city}
            </p>
          </div>
        </div>
        <div className="flex flex-col items-end shrink-0 gap-1">
          {place.distance && (
            <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full whitespace-nowrap">
              {place.distance}
            </span>
          )}
          <span className="text-[10px] text-amber-400 flex items-center gap-0.5">
            <Star size={10} fill="currentColor" /> {place.rating?.toFixed(1)}
          </span>
        </div>
      </div>

      {place.specialty && (
        <p className="text-[10px] text-slate-300 mt-2">{place.specialty}</p>
      )}

      <div className="flex flex-wrap gap-2.5 mt-2 text-[10px] text-slate-400">
        <span className="flex items-center gap-1"><Phone size={11} /> {place.phone}</span>
        <span className="flex items-center gap-1"><Clock size={11} /> {place.timings}</span>
      </div>

      <button
        onClick={() => openInMaps(place)}
        className="mt-3 w-full flex items-center justify-center gap-1.5 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 rounded-xl py-2 transition-colors"
      >
        <Navigation size={12} />
        {isHindi ? "दिशा दिखाएं" : "Get Directions"}
      </button>
    </div>
  );

  // Lightweight markdown renderer (bold + bullet/numbered lists) for assistant bubbles
  const renderRichText = (text: string) => {
    const inline = (raw: string) => {
      const parts = raw.split(/\*\*(.+?)\*\*/g);
      if (parts.length === 1) return raw;
      return parts.map((p, i) =>
        i % 2 === 1 ? <strong key={i} className="font-extrabold text-emerald-300">{p}</strong> : p
      );
    };

    const blocks: React.ReactNode[] = [];
    let list: React.ReactNode[] = [];
    let listType: "bullet" | "number" | null = null;
    let key = 0;
    const flush = () => {
      if (list.length) {
        blocks.push(
          <ul key={key++} className={`mt-1.5 space-y-0.5 ${listType === "number" ? "list-decimal" : "list-disc"} pl-4 text-left`}>
            {list}
          </ul>
        );
        list = [];
        listType = null;
      }
    };

    for (const rawLine of text.split("\n")) {
      const line = rawLine.trim();
      const bullet = line.match(/^[-•]\s+(.*)/);
      const numbered = line.match(/^\d+[.)]\s+(.*)/);
      if (bullet) {
        if (listType !== "bullet") { flush(); listType = "bullet"; }
        list.push(<li key={list.length} className="pl-0.5">{inline(bullet[1])}</li>);
      } else if (numbered) {
        if (listType !== "number") { flush(); listType = "number"; }
        list.push(<li key={list.length} className="pl-0.5">{inline(numbered[1])}</li>);
      } else if (line) {
        flush();
        blocks.push(<div key={key++} className="mt-1 first:mt-0">{inline(line)}</div>);
      } else {
        flush();
      }
    }
    flush();
    return blocks;
  };

  const renderAssistantContent = (msg: ChatMessage, isLast: boolean) => {
    // Structured nearby results block
    if (msg.structured?.kind === "nearby") {
      return (
        <div className="space-y-3">
          <div className="whitespace-pre-wrap font-bold">{msg.content}</div>
          {!msg.structured.hasLocation && (
            <p className="text-[10px] text-slate-400 bg-card/10 border border-white/10 rounded-xl px-3 py-2">
              {isHindi
                ? "📍 स्थान की अनुमति नहीं मिली — देश के प्रमुख मंडी/दुकानें दिखा रहे हैं। सटीक नजदीकी परिणाम के लिए स्थान की अनुमति दें।"
                : "📍 Location permission not available — showing popular places. Allow location access for accurate nearby results."}
            </p>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {msg.structured?.places?.map(renderPlaceCard) ?? []}
          </div>
          {isLast && (
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => fetchNearby(msg.structured!.places[0]?.type === "market" ? "shops" : "markets")}
                className="text-[10px] font-bold text-slate-300 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full px-3 py-1.5 transition-colors"
              >
                {msg.structured!.places[0]?.type === "market"
                  ? isHindi ? "🏪 नजदीकी दुकानें" : "🏪 Nearby Shops"
                  : isHindi ? "📍 नजदीकी मंडी" : "📍 Nearby Mandis"}
              </button>
            </div>
          )}
        </div>
      );
    }

    // Word-by-word typing animation for the latest assistant message
    const showTyping = isLast && typingWordIndex !== null && !isLoading;
    const displayContent = showTyping
      ? msg.content.split(" ").slice(0, typingWordIndex).join(" ")
      : msg.content;

    return (
      <div>
        {renderRichText(displayContent)}
        {showTyping && (
          <span className="inline-block w-0.5 h-4 align-middle bg-emerald-400 ml-0.5 animate-pulse" />
        )}
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col bg-slate-950 text-white relative select-none">

      {/* VoiceEngine Listening Overlay — live transcript + silence auto-stop */}
      {isListening && (
        <ListeningOverlay
          transcript={voiceTranscript}
          lang={sttLang}
          isFinal={voiceFinal}
          onCommit={commitTranscript}
          onCancel={() => {
            sttRef.current?.abort();
            sttRef.current = null;
            setIsListening(false);
            setVoiceTranscript("");
          }}
        />
      )}

      {/* Header */}
      <div className="bg-slate-900/80 backdrop-blur-md border-b border-white/10 px-4 py-3 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-xl transition-colors"
            aria-label="Close chat"
          >
            <X size={20} className="text-slate-300 hover:text-white" />
          </button>
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="p-2 hover:bg-white/10 rounded-xl transition-colors text-slate-300 hover:text-white"
            title="View History Sessions"
            aria-label="Conversation history"
          >
            <Menu size={20} />
          </button>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 bg-gradient-to-tr from-emerald-600 to-teal-500 rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/10 relative">
              <Bot size={20} className="text-white" />
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-amber-400 rounded-full border-2 border-slate-900 animate-pulse" />
            </div>
            <div>
              <h2 className="font-black text-sm tracking-tight flex items-center gap-1.5 text-white">
                {t('chat.title')} <Sparkles size={13} className="text-emerald-400 animate-pulse" />
              </h2>
              <p className="text-[10px] text-slate-400 flex items-center gap-1">
                <span className={cn("w-1.5 h-1.5 rounded-full animate-pulse", isOffline ? "bg-amber-500" : "bg-emerald-500")} />
                {isOffline ? t('chat.statusOffline') : t('chat.statusOnline')}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleNewSession}
            className="p-2 bg-white/5 hover:bg-white/15 active:scale-95 text-emerald-400 rounded-xl transition-all border border-white/10 flex items-center gap-1 text-xs font-bold"
            title={t('chat.newChatTitle')}
          >
            <Plus size={14} />
            <span className="hidden sm:inline">{t('agr216')}</span>
          </button>

          <button
            onClick={() => setAutoSpeak(!autoSpeak)}
            className={cn(
              "p-2 rounded-xl transition-colors border",
              autoSpeak
                ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                : "text-slate-400 hover:text-white hover:bg-white/5 border-white/10"
            )}
            title={autoSpeak ? t('chat.autoVoiceOn') : t('chat.autoVoiceOff')}
          >
            {autoSpeak ? <Volume2 size={18} /> : <VolumeX size={18} />}
          </button>
        </div>
      </div>

      {/* Main Body with Sidebar Drawer layout */}
      <div className="flex-1 flex overflow-hidden relative">

        {/* Offline Banner alert */}
        {isOffline && (
          <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-amber-600/90 to-rose-700/90 text-center py-1.5 px-3 z-30 flex items-center justify-center gap-2 text-xs font-bold shadow-md border-b border-white/10">
            <WifiOff size={14} className="text-white animate-bounce" />
            <span>{t('agr217')}</span>
          </div>
        )}

        {/* Sidebar history list node drawer */}
        <div
          className={cn(
            "absolute inset-y-0 left-0 w-[250px] bg-slate-900 border-r border-white/15 z-40 transition-transform duration-300 transform",
            showHistory ? "translate-x-0" : "-translate-x-full"
          )}
        >
          <div className="p-3 border-b border-white/10 flex items-center justify-between">
            <span className="text-xs font-black uppercase text-slate-400 tracking-wider">{t('agr218')}</span>
            <button
              onClick={() => setShowHistory(false)}
              className="p-1.5 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors"
              aria-label="Close history"
            >
              <X size={16} />
            </button>
          </div>
          <div className="p-2 space-y-1 overflow-y-auto max-h-[85vh] no-scrollbar">
            {sessions.length === 0 ? (
              <p className="text-[11px] text-slate-500 italic p-3 text-center">{t('agr219')}</p>
            ) : (
              sessions.map(s => (
                <div
                  key={s.id}
                  onClick={() => handleLoadSession(s)}
                  className={cn(
                    "flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-all border text-xs font-medium",
                    currentSessionId === s.id
                      ? "bg-emerald-500/10 border-emerald-500/30 text-white"
                      : "bg-white/5 border-transparent text-slate-300 hover:bg-white/10"
                  )}
                >
                  <span className="truncate max-w-[155px]">{s.title}</span>
                  <button
                    onClick={(e) => handleDeleteSession(e, s.id)}
                    className="hover:text-rose-400 p-2 hover:bg-white/10 rounded-md transition-all shrink-0 ml-1"
                    aria-label="Delete conversation"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Chat feed section */}
        <div className="flex-1 flex flex-col justify-between overflow-y-auto no-scrollbar relative">

          <div className="flex-1 overflow-y-auto p-4 space-y-4">

            {/* Show greeting prompt chips on empty threads */}
            {chatHistory.length <= 1 && (
              <div className="py-6 flex flex-col items-center justify-center text-center space-y-4 max-w-sm mx-auto">
                <div className="w-16 h-16 bg-emerald-500/10 rounded-3xl flex items-center justify-center text-3xl border border-emerald-500/20 shadow-inner animate-pulse">
                  🌱
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-white">{t('agr220')}</h3>
                  <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                    {t('chat.emptyStateSubtitle')}
                  </p>
                </div>
                <div className="flex flex-wrap justify-center items-center gap-1.5">
                  <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 rounded-full px-3 py-1.5 flex items-center gap-1">
                    🌾 {t('chat.advisingFor', { crop: profile.crop, stage: profile.stage })}
                  </span>
                  {[
                    `${profile.crop} mandi price`,
                    `${profile.crop} fertilizer dose`,
                    `irrigation schedule for ${profile.crop}`,
                    `yellow leaves on ${profile.crop}`,
                  ].map((prompt) => (
                    <button
                      key={prompt}
                      onClick={() => handleSend(prompt)}
                      className="text-[10px] font-bold bg-white/5 border border-white/10 rounded-full px-3 py-1.5 text-slate-200 hover:bg-emerald-500/15 hover:border-emerald-500/40 hover:text-emerald-300 transition-all active:scale-95"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
                <div className="flex flex-wrap justify-center gap-2 pt-1">
                  {PROMPT_CHIPS.map(id => (
                    <button
                      key={id}
                      onClick={() => handleSend(chipPrompts[id])}
                      className="text-[10px] font-bold bg-white/5 border border-white/10 rounded-full px-3 py-1.5 text-slate-200 hover:bg-emerald-500/15 hover:border-emerald-500/40 hover:text-emerald-300 transition-all active:scale-95"
                    >
                      {chipLabels[id]}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Bubble Messages list */}
            {chatHistory.map((msg, idx) => {
              const isLast = idx === chatHistory.length - 1;
              return (
                <div
                  key={idx}
                  className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}
                >
                  <div className="flex items-start gap-2.5 max-w-[92%] sm:max-w-[85%]">
                    {msg.role === "assistant" && (
                      <div className="w-7 h-7 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shrink-0 text-xs">
                        🤖
                      </div>
                    )}
                    <div
                      className={cn(
                        "p-3.5 rounded-2xl text-xs sm:text-sm shadow-md transition-all font-medium leading-relaxed",
                        msg.role === "user"
                          ? "bg-gradient-to-r from-primary to-primary/80 text-primary-foreground rounded-br-sm border border-primary/20"
                          : "bg-slate-900 border border-white/10 text-slate-100 rounded-bl-sm"
                      )}
                    >
                      {/* Render attachment image if present */}
                      {msg.image && (
                        <div className="mb-3 max-w-[200px] rounded-xl overflow-hidden border border-white/20 shadow-sm">
                          <img src={msg.image} alt="Attached crop" onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = "https://images.pexels.com/photos/13888402/pexels-photo-13888402.jpeg?auto=compress&cs=tinysrgb&h=650&w=940"; }} className="w-full h-auto object-cover max-h-[150px]" />
                        </div>
                      )}

                      {renderAssistantContent(msg, isLast)}

                      {msg.role === "assistant" && !msg.structured && (
                        <div className="flex items-center justify-between gap-3 mt-3.5 pt-2 border-t border-white/5 text-[10px] text-slate-500 font-extrabold uppercase">
                          <button
                            onClick={() => handleSpeakMessage(msg.content)}
                            className="hover:text-emerald-400 flex items-center gap-1 transition-colors text-slate-500 dark:text-slate-300"
                          >
                            <Volume2 size={13} />
                            {isSpeaking && isLast ? t('chat.stopSpeakingBtn') : t('chat.listenBtn')}
                          </button>
                          {msg.source === "local" && (
                            <span className="flex items-center gap-1 text-[9px] font-bold text-amber-300/90 bg-amber-500/10 border border-amber-500/25 rounded-full px-2 py-0.5 normal-case">
                              ⚡ {t('chat.badgeSmartOffline')}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Suggestion chips for the latest assistant message */}
                      {msg.role === "assistant" && isLast && !msg.structured && msg.suggestions && msg.suggestions.length > 0 && typingWordIndex === null && !isLoading && (
                        <div className="flex flex-wrap gap-1.5 mt-3 pt-2.5 border-t border-white/5">
                          {msg.suggestions.map((s, i) => (
                            <button
                              key={i}
                              onClick={() => handleSend(s)}
                              className="text-[10px] font-bold text-slate-200 bg-white/5 hover:bg-emerald-500/15 hover:border-emerald-500/40 hover:text-emerald-300 border border-white/10 rounded-full px-3 py-1.5 transition-all active:scale-95"
                            >
                              {s}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Premium Typing Indicator */}
            {isLoading && (
              <div className="flex justify-start items-start gap-2.5">
                <div className="w-7 h-7 rounded-full bg-emerald-500/25 border border-emerald-500/35 flex items-center justify-center shrink-0 text-xs animate-pulse">
                  🤖
                </div>
                <div className="bg-slate-900/90 border border-white/10 p-3.5 rounded-2xl rounded-bl-sm flex items-center gap-1.5 shadow-md">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Actions Toolbar */}
          <div className="px-4 pb-1 bg-slate-900/80 backdrop-blur-md">
            <div className="flex gap-2 overflow-x-auto no-scrollbar py-2">
              <button
                onClick={() => fetchNearby("markets")}
                disabled={isLoading}
                className="flex items-center gap-1 shrink-0 text-[10px] font-bold text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 rounded-full px-3 py-1.5 transition-colors active:scale-95 disabled:opacity-40"
              >
                <MapPin size={11} /> {t('chat.qaMandi')}
              </button>
              <button
                onClick={() => fetchNearby("shops")}
                disabled={isLoading}
                className="flex items-center gap-1 shrink-0 text-[10px] font-bold text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 rounded-full px-3 py-1.5 transition-colors active:scale-95 disabled:opacity-40"
              >
                <Store size={11} /> {t('chat.qaShops')}
              </button>
              {QUICK_ACTIONS.filter(a => a.id !== "markets" && a.id !== "shops").map(action => (
                <button
                  key={action.id}
                  onClick={() => handleQuickAction(action.id)}
                  disabled={isLoading}
                  className="flex items-center gap-1 shrink-0 text-[10px] font-bold text-slate-300 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full px-3 py-1.5 transition-colors active:scale-95 disabled:opacity-40"
                >
                  {action.hint === "fertilizer" && "🧪"}
                  {action.hint === "irrigation" && "💧"}
                  {action.hint === "pest" && "🐛"}
                  {action.hint === "schemes" && "📜"}
                  {quickActionLabels[action.id]}
                </button>
              ))}
            </div>
          </div>

          {/* VoiceEngine Speaking Subtitle Bar */}
          {isSpeaking && speakActive === "engine" && (
            <VoicePlayerBar
              activeSentence={speakingSentence}
              progress={speakTotal > 0 ? (speakIndex + 1) / speakTotal : 0}
              paused={speakPaused}
              rate={speakRate}
              onPause={handleSpeakControls.pause}
              onResume={handleSpeakControls.resume}
              onReplay={handleSpeakControls.replay}
              onStop={stopAllSpeaking}
              onRate={handleSpeakControls.rate}
            />
          )}

          {/* Chat Form Area */}
          <div className="p-4 bg-slate-900/80 backdrop-blur-md border-t border-white/10 space-y-3">

            {/* Image Preview attachment Card */}
            {imagePreview && (
              <div className="flex items-center justify-between p-2.5 bg-white/5 border border-white/10 rounded-2xl max-w-xs animate-in slide-in-from-bottom-2 duration-300">
                <div className="flex items-center gap-2.5">
                  <div className="w-12 h-12 rounded-lg overflow-hidden border border-white/20 shrink-0">
                    <img src={imagePreview} alt="Attached upload" onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.style.display = 'none'; }} className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <span className="text-[10px] text-emerald-400 font-extrabold uppercase">{t('agr221')}</span>
                    <p className="text-[10px] text-slate-400 truncate max-w-[120px]">{t('agr222')}</p>
                  </div>
                </div>
                <button
                  onClick={clearAttachedImage}
                  className="p-1.5 bg-white/10 hover:bg-rose-500/20 hover:text-rose-400 rounded-full transition-colors text-slate-300"
                  aria-label="Remove attached image"
                >
                  <X size={14} />
                </button>
              </div>
            )}

            {/* Input elements bar */}
            <div className="flex items-center gap-2 relative">

              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                onChange={handleImageChange}
                accept="image/*"
              />

              <button
                onClick={triggerImageSelect}
                className={cn(
                  "p-3 rounded-full transition-all border",
                  imagePreview
                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                    : "bg-white/5 text-slate-400 hover:text-white border-white/10 hover:border-white/20 active:scale-95"
                )}
                title="Attach Crop Leaf Image for Diagnosis"
              >
                <Image size={18} />
              </button>

              <button
                onClick={toggleListening}
                className={cn(
                  "p-3 rounded-full transition-all border",
                  isListening
                    ? "bg-rose-500 text-white border-rose-500 animate-pulse"
                    : "bg-white/5 text-slate-400 hover:text-white border-white/10 hover:border-white/20 active:scale-95"
                )}
                title={t("chat.voiceInputTitle")}
              >
                <Mic size={18} />
              </button>

              <input
                type="text"
                placeholder={isOffline ? t('chat.placeholderOffline') : t('chat.placeholder')}
                className="flex-1 p-3 bg-white/5 rounded-full text-base sm:text-sm outline-none focus:ring-2 focus:ring-emerald-500 text-white placeholder:text-slate-500 border border-white/15 hover:border-white/25 focus:border-emerald-500 transition-all"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                aria-label="Ask Kisan AI a question"
              />

              <button
                onClick={() => handleSend()}
                disabled={isLoading || (!input.trim() && !imageBase64)}
                className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white p-3 rounded-full hover:brightness-110 disabled:opacity-30 disabled:pointer-events-none transition-all active:scale-95 shadow-md shadow-emerald-500/15"
                aria-label="Send message"
              >
                <Send size={18} />
              </button>

            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default KisanChat;
