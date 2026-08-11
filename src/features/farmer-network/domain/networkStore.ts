import type {
  Booking,
  BookingStatus,
  ChatMessage,
  ChatThread,
  ChatMessageType,
  CommunityPost,
  CommunityKind,
  NetworkState,
  RequirementType,
  Review,
} from './networkTypes';
import { NETWORK_SEED_VERSION, NETWORK_STORAGE_KEY } from './networkTypes';
import { seedNetwork } from './networkSeed';
import { notifyEvent } from '../../notifications/notify';

/**
 * Farmer Network Store — local-first engine.
 * Persists to `agri_network_v1`, holds farmers, providers, buyers, requirements,
 * community feed, chat threads, bookings, reviews. Cross-feature actions emit
 * in-app notifications through `notifyEvent`.
 */

let state: NetworkState | null = null;
const listeners = new Set<() => void>();

export const uid = (): string => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export const nowIso = (): string => new Date().toISOString();

export const seedState = (): NetworkState => seedNetwork();

function load(): NetworkState {
  if (state) return state;
  if (typeof window === 'undefined') {
    state = seedState();
    return state;
  }
  try {
    const raw = localStorage.getItem(NETWORK_STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as NetworkState) : null;
    if (parsed && parsed.version === NETWORK_SEED_VERSION && Array.isArray(parsed.providers)) {
      state = { ...seedState(), ...parsed };
    } else {
      state = seedState();
    }
  } catch {
    state = seedState();
  }
  return state;
}

function persist(next: NetworkState): void {
  state = next;
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(NETWORK_STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* storage full — in-memory only */
  }
  listeners.forEach((l) => l());
}

export const emit = (): void => listeners.forEach((l) => l());

export const subscribe = (l: () => void): (() => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export const getState = (): NetworkState => load();

export const resetNetworkData = (): void => {
  persist(seedState());
};

/* ── derived selectors ───────────────────────────────────────────────────── */

export const getOpenThreads = (s: NetworkState = load()): ChatThread[] =>
  [...s.threads].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

export const getUnreadThreadCount = (s: NetworkState = load()): number =>
  s.threads.reduce((acc, t) => acc + t.unread, 0);

export const getThreadMessages = (threadId: string, s: NetworkState = load()): ChatMessage[] => {
  const t = s.threads.find((x) => x.id === threadId);
  return t ? [...t.messages].sort((a, b) => a.createdAt.localeCompare(b.createdAt)) : [];
};

export const getProviderReviews = (targetId: string, s: NetworkState = load()): Review[] =>
  s.reviews.filter((r) => r.targetId === targetId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));

export const getMyBookings = (s: NetworkState = load()): Booking[] =>
  [...s.bookings].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

/* ── requirements ────────────────────────────────────────────────────────── */

export function postRequirement(input: {
  type: RequirementType;
  title: string;
  description: string;
  location: string;
  amount?: string;
  urgency: 'today' | 'week' | 'flexible';
}): void {
  const s = load();
  const req = {
    id: uid(),
    ...input,
    postedByName: s.myName,
    createdAt: nowIso(),
    responses: 0,
    open: true,
  };
  persist({ ...s, requirements: [req, ...s.requirements] });
  notifyEvent({
    category: 'system',
    titleKey: 'fnet.notif.requirementPosted.title',
    bodyKey: 'fnet.notif.requirementPosted.body',
    params: { title: input.title },
    tab: 'network',
  });
}

export function respondToRequirement(id: string): void {
  const s = load();
  persist({
    ...s,
    requirements: s.requirements.map((r) => (r.id === id ? { ...r, responses: r.responses + 1 } : r)),
  });
}

/* ── community ───────────────────────────────────────────────────────────── */

export function postCommunity(text: string, kind: CommunityKind = 'question'): void {
  const s = load();
  const post: CommunityPost = {
    id: uid(),
    kind,
    author: s.myName,
    authorType: 'farmer',
    text,
    likes: 0,
    comments: 0,
    createdAt: nowIso(),
  };
  persist({ ...s, community: [post, ...s.community] });
}

export function likePost(id: string): void {
  const s = load();
  persist({
    ...s,
    community: s.community.map((p) => (p.id === id ? { ...p, likes: p.likes + 1 } : p)),
  });
}

/* ── chat ────────────────────────────────────────────────────────────────── */

export function startThread(input: {
  participantId: string;
  participantName: string;
  participantType: 'farmer' | 'provider' | 'buyer';
  firstMessage: string;
  messageType?: ChatMessageType;
}): void {
  const s = load();
  const threadId = uid();
  const message: ChatMessage = {
    id: uid(),
    threadId,
    senderId: 'me',
    senderName: s.myName,
    type: input.messageType ?? 'text',
    text: input.firstMessage,
    createdAt: nowIso(),
  };
  const thread: ChatThread = {
    id: threadId,
    participantId: input.participantId,
    participantName: input.participantName,
    participantType: input.participantType,
    messages: [message],
    unread: 0,
    updatedAt: nowIso(),
  };
  persist({ ...s, threads: [thread, ...s.threads] });
}

export function sendMessage(threadId: string, text: string, messageType: ChatMessageType = 'text'): void {
  const s = load();
  const thread = s.threads.find((t) => t.id === threadId);
  if (!thread) return;
  const message: ChatMessage = {
    id: uid(),
    threadId,
    senderId: 'me',
    senderName: s.myName,
    type: messageType,
    text,
    createdAt: nowIso(),
  };
  persist({
    ...s,
    threads: s.threads.map((t) =>
      t.id === threadId
        ? { ...t, messages: [...t.messages, message], unread: t.unread + 1, updatedAt: nowIso() }
        : t,
    ),
  });
  if (messageType === 'voice' || messageType === 'image' || messageType === 'location') {
    notifyEvent({
      category: 'system',
      titleKey: 'fnet.notif.messageSent.title',
      bodyKey: 'fnet.notif.messageSent.body',
      tab: 'network',
      dedupeKey: `msg-${threadId}`,
    });
  }
}

export function markThreadRead(threadId: string): void {
  const s = load();
  persist({
    ...s,
    threads: s.threads.map((t) => (t.id === threadId ? { ...t, unread: 0 } : t)),
  });
}

export function sendEnquiry(
  targetId: string,
  targetName: string,
  targetType: 'farmer' | 'provider' | 'buyer',
  note: string,
): void {
  const s = load();
  const existing = s.threads.find((t) => t.participantId === targetId);
  if (existing) {
    sendMessage(existing.id, note);
    return;
  }
  startThread({ participantId: targetId, participantName: targetName, participantType: targetType, firstMessage: note });
  notifyEvent({
    category: 'order',
    titleKey: 'fnet.notif.enquirySent.title',
    bodyKey: 'fnet.notif.enquirySent.body',
    params: { name: targetName },
    tab: 'network',
    dedupeKey: `enq-${targetId}`,
  });
}

/* ── bookings ────────────────────────────────────────────────────────────── */

export function createBooking(input: {
  providerName: string;
  providerId: string;
  service: string;
  date: string;
  amount: string;
}): void {
  const s = load();
  const booking: Booking = {
    id: uid(),
    ...input,
    status: 'pending',
    createdAt: nowIso(),
  };
  persist({ ...s, bookings: [booking, ...s.bookings] });
  notifyEvent({
    category: 'booking',
    titleKey: 'fnet.notif.bookingCreated.title',
    bodyKey: 'fnet.notif.bookingCreated.body',
    params: { service: input.service, date: input.date },
    tab: 'network',
    dedupeKey: `bk-${booking.id}`,
  });
}

export function setBookingStatus(id: string, status: BookingStatus): void {
  const s = load();
  const booking = s.bookings.find((b) => b.id === id);
  if (!booking) return;
  const updated: Booking = { ...booking, status };
  if (status === 'completed' && !booking.invoice) {
    updated.invoice = {
      id: `INV-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      issuedAt: nowIso(),
      items: [{ label: booking.service, amount: booking.amount }],
      total: booking.amount,
    };
  }
  persist({ ...s, bookings: s.bookings.map((b) => (b.id === id ? updated : b)) });
  notifyEvent({
    category: 'booking',
    severity: status === 'completed' ? 'success' : 'info',
    titleKey:
      status === 'accepted' ? 'fnet.notif.bookingAccepted.title'
        : status === 'completed' ? 'fnet.notif.bookingCompleted.title'
          : 'fnet.notif.bookingCancelled.title',
    bodyKey:
      status === 'accepted' ? 'fnet.notif.bookingAccepted.body'
        : status === 'completed' ? 'fnet.notif.bookingCompleted.body'
          : 'fnet.notif.bookingCancelled.body',
    params: { service: booking.service },
    tab: 'network',
    dedupeKey: `bks-${booking.id}-${status}`,
  });
}

/* ── reviews & trust ─────────────────────────────────────────────────────── */

export function addReview(targetId: string, rating: number, comment: string): void {
  const s = load();
  const review: Review = {
    id: uid(),
    targetId,
    author: s.myName,
    rating,
    comment,
    createdAt: nowIso(),
  };
  const entity =
    s.providers.find((p) => p.id === targetId) ??
    s.farmers.find((f) => f.id === targetId) ??
    s.buyers.find((b) => b.id === targetId);

  let providers = s.providers;
  let farmers = s.farmers;
  let buyers = s.buyers;
  if (entity) {
    const rated = {
      rating: (entity.rating * entity.reviews + rating) / (entity.reviews + 1),
      reviews: entity.reviews + 1,
    };
    if (entity.type === 'provider') {
      providers = providers.map((p) => (p.id === targetId ? { ...p, ...rated } : p));
    } else if (entity.type === 'farmer') {
      farmers = farmers.map((f) => (f.id === targetId ? { ...f, ...rated } : f));
    } else {
      buyers = buyers.map((b) => (b.id === targetId ? { ...b, ...rated } : b));
    }
  }

  persist({ ...s, providers, farmers, buyers, reviews: [review, ...s.reviews] });
  notifyEvent({
    category: 'system',
    severity: 'success',
    titleKey: 'fnet.notif.reviewAdded.title',
    bodyKey: 'fnet.notif.reviewAdded.body',
    tab: 'network',
    dedupeKey: `rev-${targetId}`,
  });
}

/* ── profile meta ────────────────────────────────────────────────────────── */

export function setMyProfile(input: { name: string; village: string; crop: string }): void {
  const s = load();
  persist({ ...s, ...input });
}
