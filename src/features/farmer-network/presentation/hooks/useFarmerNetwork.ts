import { useSyncExternalStore, useMemo } from 'react';
import {
  subscribe,
  getState,
  getOpenThreads,
  getUnreadThreadCount,
  getMyBookings,
  addReview,
  createBooking,
  likePost,
  markThreadRead,
  postCommunity,
  postRequirement,
  respondToRequirement,
  sendEnquiry,
  sendMessage,
  setBookingStatus,
  startThread,
} from '../../domain/networkStore';
import {
  aiSuggestedDiscussions,
  bestBuyers,
  cheapestRental,
  fastestService,
  mostActiveCommunity,
  nearbyFarmers,
  recommendTrustedProviders,
} from '../../domain/networkAI';
import type { NetworkState } from '../../domain/networkTypes';

export interface UseFarmerNetworkResult {
  state: NetworkState;
  openThreads: ReturnType<typeof getOpenThreads>;
  unreadCount: number;
  myBookings: ReturnType<typeof getMyBookings>;
  recommendations: {
    trusted: ReturnType<typeof recommendTrustedProviders>;
    cheapest: ReturnType<typeof cheapestRental>;
    fastest: ReturnType<typeof fastestService>;
    buyers: ReturnType<typeof bestBuyers>;
    farmers: ReturnType<typeof nearbyFarmers>;
    community: ReturnType<typeof mostActiveCommunity>;
    discussions: ReturnType<typeof aiSuggestedDiscussions>;
  };
  actions: {
    postRequirement: (input: Parameters<typeof postRequirement>[0]) => void;
    respondToRequirement: (id: string) => void;
    postCommunity: (text: string, kind?: 'question' | 'tip' | 'photo' | 'success') => void;
    likePost: (id: string) => void;
    startThread: (input: Parameters<typeof startThread>[0]) => void;
    sendMessage: (threadId: string, text: string) => void;
    markThreadRead: (id: string) => void;
    sendEnquiry: (targetId: string, targetName: string, targetType: 'farmer' | 'provider' | 'buyer', note: string) => void;
    createBooking: (input: Parameters<typeof createBooking>[0]) => void;
    setBookingStatus: (id: string, status: Parameters<typeof setBookingStatus>[1]) => void;
    addReview: (targetId: string, rating: number, comment: string) => void;
  };
}

export function useFarmerNetwork(): UseFarmerNetworkResult {
  const state = useSyncExternalStore(subscribe, getState, getState);

  return useMemo(
    () => ({
      state,
      openThreads: getOpenThreads(state),
      unreadCount: getUnreadThreadCount(state),
      myBookings: getMyBookings(state),
      recommendations: {
        trusted: recommendTrustedProviders(undefined, 10, state),
        cheapest: cheapestRental('tractor', state),
        fastest: fastestService('tractor', state),
        buyers: bestBuyers(state.myCrop, state),
        farmers: nearbyFarmers(state),
        community: mostActiveCommunity(state),
        discussions: aiSuggestedDiscussions(state),
      },
      actions: {
        postRequirement,
        respondToRequirement,
        postCommunity,
        likePost,
        startThread,
        sendMessage,
        markThreadRead,
        sendEnquiry,
        createBooking,
        setBookingStatus,
        addReview,
      },
    }),
    [state],
  );
}
