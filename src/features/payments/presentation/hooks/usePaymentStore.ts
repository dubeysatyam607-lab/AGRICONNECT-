import { useSyncExternalStore } from 'react';
import { getPaymentState, subscribePaymentStore } from '../../domain/paymentStore';
import type { PaymentState } from '../../domain/paymentTypes';

/** Subscribe a component to the local-first payments store. */
export const usePaymentStore = (): PaymentState =>
  useSyncExternalStore(subscribePaymentStore, getPaymentState);
