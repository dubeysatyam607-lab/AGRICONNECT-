import { useSyncExternalStore } from 'react';
import { getAdminState, subscribeAdminStore } from '../../domain/adminStore';
import type { AdminState } from '../../domain/adminTypes';

/** Subscribe a component to the local-first admin store. */
export const useAdminStore = (): AdminState =>
  useSyncExternalStore(subscribeAdminStore, getAdminState);
