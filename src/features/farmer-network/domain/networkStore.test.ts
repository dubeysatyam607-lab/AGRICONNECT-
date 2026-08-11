import { describe, it, expect } from 'vitest';
import {
  seedState,
  resetNetworkData,
  postRequirement,
  respondToRequirement,
  postCommunity,
  likePost,
  startThread,
  sendMessage,
  markThreadRead,
  createBooking,
  setBookingStatus,
  addReview,
  getOpenThreads,
  getUnreadThreadCount,
  getMyBookings,
  getProviderReviews,
  getState,
} from './networkStore';
import { getActiveNotifications } from '../../notifications/domain/notificationStore';

const seedNetState = () => {
  resetNetworkData();
  return getState();
};

describe('networkStore', () => {
  it('seeds a complete network state', () => {
    const s = seedNetState();
    expect(s.providers.length).toBeGreaterThan(0);
    expect(s.farmers.length).toBeGreaterThan(0);
    expect(s.buyers.length).toBeGreaterThan(0);
    expect(s.requirements.length).toBeGreaterThan(0);
    expect(s.community.length).toBeGreaterThan(0);
    expect(s.version).toBe(1);
  });

  it('postRequirement prepends and notifies', () => {
    seedNetState();
    const before = getActiveNotifications().length;
    postRequirement({
      type: 'tractor',
      title: 'Need tractor for 2 acre',
      description: 'Urgent plowing',
      location: 'Shivpuri, Indore',
      urgency: 'today',
    });
    const s = getState();
    expect(s.requirements[0].title).toBe('Need tractor for 2 acre');
    expect(s.requirements[0].responses).toBe(0);
    expect(getActiveNotifications().length).toBe(before + 1);
  });

  it('respondToRequirement increments the response counter', () => {
    seedNetState();
    const id = getState().requirements[0].id;
    const before = getState().requirements[0].responses;
    respondToRequirement(id);
    expect(getState().requirements[0].responses).toBe(before + 1);
  });

  it('postCommunity prepends a post authored by the user', () => {
    seedNetState();
    postCommunity('My turmeric is ready!', 'success');
    const s = getState();
    expect(s.community[0].text).toBe('My turmeric is ready!');
    expect(s.community[0].kind).toBe('success');
  });

  it('likePost increments likes', () => {
    seedNetState();
    const id = getState().community[0].id;
    const before = getState().community[0].likes;
    likePost(id);
    expect(getState().community[0].likes).toBe(before + 1);
  });

  it('startThread creates a thread with the first message', () => {
    seedNetState();
    startThread({
      participantId: 'p1',
      participantName: 'Ramesh Yadav',
      participantType: 'provider',
      firstMessage: 'Tractor available tomorrow?',
    });
    const threads = getOpenThreads();
    expect(threads[0].participantId).toBe('p1');
    expect(threads[0].messages[0].text).toBe('Tractor available tomorrow?');
  });

  it('sendMessage appends and increments unread', () => {
    seedNetState();
    startThread({ participantId: 'p1', participantName: 'Ramesh Yadav', participantType: 'provider', firstMessage: 'Hi' });
    const threadId = getState().threads[0].id;
    sendMessage(threadId, 'Is rotavator included?');
    const t = getState().threads[0];
    expect(t.messages.length).toBe(2);
    expect(t.unread).toBe(1);
    markThreadRead(threadId);
    expect(getUnreadThreadCount()).toBe(0);
  });

  it('getUnreadThreadCount sums unread across threads', () => {
    seedNetState();
    startThread({ participantId: 'p1', participantName: 'Ramesh Yadav', participantType: 'provider', firstMessage: 'Hi' });
    startThread({ participantId: 'b1', participantName: 'Mahajan Traders', participantType: 'buyer', firstMessage: 'Hello' });
    const t1 = getState().threads[0].id;
    const t2 = getState().threads[1].id;
    sendMessage(t1, 'A');
    sendMessage(t2, 'B');
    sendMessage(t2, 'C');
    expect(getUnreadThreadCount()).toBe(3);
  });

  it('createBooking adds a pending booking and notifies', () => {
    seedNetState();
    const before = getActiveNotifications().length;
    createBooking({
      providerName: 'Ramesh Yadav',
      providerId: 'p1',
      service: 'Tractor — ₹800/day',
      date: '2026-08-10',
      amount: '₹800',
    });
    const bookings = getMyBookings();
    expect(bookings[0].status).toBe('pending');
    expect(bookings[0].providerId).toBe('p1');
    expect(getActiveNotifications().length).toBe(before + 1);
  });

  it('setBookingStatus transitions and generates an invoice on completion', () => {
    seedNetState();
    createBooking({
      providerName: 'Ramesh Yadav',
      providerId: 'p1',
      service: 'Tractor — ₹800/day',
      date: '2026-08-10',
      amount: '₹800',
    });
    const id = getMyBookings()[0].id;
    setBookingStatus(id, 'accepted');
    expect(getMyBookings()[0].status).toBe('accepted');
    expect(getMyBookings()[0].invoice).toBeUndefined();
    setBookingStatus(id, 'completed');
    const done = getMyBookings()[0];
    expect(done.status).toBe('completed');
    expect(done.invoice).toBeDefined();
    expect(done.invoice!.total).toBe('₹800');
  });

  it('addReview updates rating and records the review', () => {
    seedNetState();
    const before = getState().providers[0].rating;
    addReview('p1', 5, 'Great service');
    const s = getState();
    const provider = s.providers.find((p) => p.id === 'p1')!;
    expect(provider.reviews).toBeGreaterThan(0);
    expect(provider.rating).toBeGreaterThan(before);
    const reviews = getProviderReviews('p1');
    expect(reviews[0].comment).toBe('Great service');
  });
});
