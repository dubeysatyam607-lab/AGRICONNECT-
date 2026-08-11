import { useCallback, useEffect, useMemo, useState } from 'react';
import { useProfileViewModel } from '@/features/profile/presentation/viewmodels/useProfileViewModel';
import { useFarm } from '@/contexts/FarmContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { loadOnboardingData, generateRecommendations, type IRecommendations } from '@/features/auth/presentation/onboarding/onboardingData';
import { deriveFarmAdvice, type FarmAdvice } from '@/lib/farm-advisor';
import { readStaleCache } from '@/lib/offline-cache';
import type { IWeatherModuleData } from '@/features/weather/domain/models/WeatherModels';
import {
  loadEquipment,
  saveEquipment,
  loadTasks,
  saveTasks,
  loadActivities,
  saveActivities,
  pushActivity,
  loadInvoices,
  saveInvoices,
  loadNotifPrefs,
  saveNotifPrefs,
  loadFarmExtras,
  saveFarmExtras as persistFarmExtras,
  uid,
  type DigitalEquipment,
  type DigitalTask,
  type DigitalActivity,
  type Invoice,
  type NotificationPrefs,
  type FarmExtras,
} from '../../domain/digitalProfileStore';

export interface LedgerEntry {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  category: string;
  description: string;
  date: string;
}

export interface TractorBooking {
  id: string;
  tractorName: string;
  status: string;
  total: number;
  createdAt: string;
}

const readLedger = (): LedgerEntry[] => {
  try {
    const raw = localStorage.getItem('farm_ledger');
    return raw ? (JSON.parse(raw) as LedgerEntry[]) : [];
  } catch {
    return [];
  }
};

const readBookings = (): TractorBooking[] => {
  try {
    const raw = localStorage.getItem('tractor_bookings');
    const list = raw ? (JSON.parse(raw) as TractorBooking[]) : [];
    return list.map((b) => ({
      id: b.id,
      tractorName: b.tractorName,
      status: b.status,
      total: b.total,
      createdAt: b.createdAt,
    }));
  } catch {
    return [];
  }
};

const readFavs = (): string[] => {
  try {
    return JSON.parse(localStorage.getItem('tractor_favs') || '[]') as string[];
  } catch {
    return [];
  }
};

const readChatCount = (): number => {
  try {
    const raw = localStorage.getItem('kisan_chat_sessions');
    const arr = raw ? (JSON.parse(raw) as unknown[]) : [];
    return Array.isArray(arr) ? arr.length : 0;
  } catch {
    return 0;
  }
};

const stageIndex = (stage: string): number => {
  const order = ['Pre-sowing', 'Sowing', 'Vegetative growth', 'Flowering', 'Harvesting', 'Harvested'];
  const i = order.indexOf(stage);
  return i === -1 ? 3 : i;
};

export function useDigitalProfile() {
  const [profileState, { saveProfile }] = useProfileViewModel();
  const { profile: farm } = useFarm();
  const { t, language } = useLanguage();

  const [equipment, setEquipment] = useState<DigitalEquipment[]>([]);
  const [tasks, setTasks] = useState<DigitalTask[]>([]);
  const [activities, setActivities] = useState<DigitalActivity[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [notifPrefs, setNotifPrefs] = useState<NotificationPrefs>(loadNotifPrefs);
  const [farmExtras, setFarmExtras] = useState<FarmExtras>(loadFarmExtras);
  const [weather, setWeather] = useState<IWeatherModuleData | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const profile = profileState.profile;

  useEffect(() => {
    setEquipment(loadEquipment(profile));
  }, [profile]);

  useEffect(() => {
    setTasks(loadTasks());
    setActivities(loadActivities());
    setInvoices(loadInvoices());
  }, [refreshKey]);

  useEffect(() => {
    const cached = readStaleCache<IWeatherModuleData>('weather:home');
    if (cached) setWeather(cached);
  }, [refreshKey]);

  const onboarding = useMemo(() => loadOnboardingData(language), [language, refreshKey]);

  const advice: FarmAdvice | null = useMemo(() => {
    if (profileState.isLoading) return null;
    return deriveFarmAdvice(farm, weather);
  }, [farm, weather, profileState.isLoading]);

  const recommendations: IRecommendations = useMemo(
    () => generateRecommendations(onboarding, t),
    [onboarding, t],
  );

  const ledger = useMemo(() => readLedger(), [refreshKey]);
  const bookings = useMemo(() => readBookings(), [refreshKey]);
  const favCount = useMemo(() => readFavs().length, [refreshKey]);
  const chatCount = useMemo(() => readChatCount(), [refreshKey]);

  const activeBookings = useMemo(() => bookings.filter((b) => b.status === 'active' || b.status === 'confirmed'), [bookings]);
  const pastRentals = useMemo(() => bookings.filter((b) => b.status === 'completed' || b.status === 'done' || b.status === 'cancelled'), [bookings]);

  const totalIncome = useMemo(() => ledger.filter((l) => l.type === 'income').reduce((s, l) => s + l.amount, 0), [ledger]);
  const totalExpense = useMemo(() => ledger.filter((l) => l.type === 'expense').reduce((s, l) => s + l.amount, 0), [ledger]);

  const cropStage = onboarding.cropStage || farm.stage || 'Flowering';
  const stageProgress = Math.round(((stageIndex(cropStage) + 1) / 6) * 100);

  /* ── Derived scores ─────────────────────────────────────────────────── */

  const computeCompletion = useCallback((): number => {
    if (!profile) return 55;
    const checks = [
      profile.personal.fullName.trim().length > 0,
      profile.personal.mobileNumber.trim().length > 0,
      profile.location.villageOrTehsil.trim().length > 0,
      profile.location.state.trim().length > 0,
      profile.farmSpecs.totalArea > 0,
      profile.crops.length > 0,
      profile.machineryOwned.length > 0,
      Object.values(profile.livestock ?? {}).some((v) => (v ?? 0) > 0),
    ];
    return Math.min(100, Math.round((checks.filter(Boolean).length / checks.length) * 100));
  }, [profile]);

  const completion = computeCompletion();

  const farmScore = useMemo(() => {
    let score = 20;
    if (profile) {
      if (profile.farmSpecs.totalArea > 0) score += 20;
      if (profile.crops.length > 0) score += 20;
      if (profile.farmSpecs.soilType) score += 10;
      if (profile.farmSpecs.irrigationType) score += 10;
    }
    if (onboarding.ownership) score += 10;
    if (onboarding.waterSources.length > 0) score += 10;
    return Math.min(100, score);
  }, [profile, onboarding]);

  const aiReadiness = useMemo(() => {
    let score = 15;
    if (onboarding.primaryCrops.length > 0) score += 20;
    if (onboarding.cropStage) score += 20;
    if (onboarding.permissions.location) score += 15;
    if (onboarding.permissions.notifications) score += 15;
    if (onboarding.interests.length > 0) score += 15;
    return Math.min(100, score);
  }, [onboarding]);

  const memberSince = useMemo(() => {
    const d = profile?.createdAt ? new Date(profile.createdAt) : new Date();
    return d;
  }, [profile]);

  /* ── Mutations ──────────────────────────────────────────────────────── */

  const addEquipment = useCallback((item: Omit<DigitalEquipment, 'id'>) => {
    setEquipment((prev) => {
      const next = [...prev, { ...item, id: uid() }];
      saveEquipment(next);
      return next;
    });
    pushActivity({ kind: 'bookmark', title: `Added equipment — ${item.name}`, meta: 'Equipment' });
  }, []);

  const updateEquipment = useCallback((id: string, patch: Partial<DigitalEquipment>) => {
    setEquipment((prev) => {
      const next = prev.map((e) => (e.id === id ? { ...e, ...patch } : e));
      saveEquipment(next);
      return next;
    });
  }, []);

  const removeEquipment = useCallback((id: string) => {
    setEquipment((prev) => {
      const next = prev.filter((e) => e.id !== id);
      saveEquipment(next);
      return next;
    });
  }, []);

  const saveFarmExtras = useCallback((extras: FarmExtras) => {
    setFarmExtras(extras);
    persistFarmExtras(extras);
  }, []);

  const updateCropStage = useCallback((stage: string) => {
    const next = { ...onboarding, cropStage: stage };
    try {
      localStorage.setItem('agri_farm_onboarding_v1', JSON.stringify(next));
    } catch {
      /* ignore */
    }
  }, [onboarding]);

  const addTask = useCallback((label: string, date: string) => {
    setTasks((prev) => {
      const next = [...prev, { id: uid(), label, date, done: false, source: 'planned' as const }];
      saveTasks(next);
      return next;
    });
  }, []);

  const toggleTask = useCallback((id: string) => {
    setTasks((prev) => {
      const next = prev.map((task) => (task.id === id ? { ...task, done: !task.done } : task));
      saveTasks(next);
      return next;
    });
  }, []);

  const toggleNotif = useCallback((key: keyof NotificationPrefs) => {
    setNotifPrefs((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      saveNotifPrefs(next);
      return next;
    });
  }, []);

  const toggleInvoice = useCallback((id: string) => {
    setInvoices((prev) => {
      const next = prev.map((inv) => (inv.id === id ? { ...inv, paid: !inv.paid } : inv));
      saveInvoices(next);
      return next;
    });
  }, []);

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  const todayStr = new Date().toISOString().split('T')[0];
  const todayTasks = useMemo(
    () => tasks.filter((task) => task.date === todayStr || (task.date < todayStr && !task.done)),
    [tasks, todayStr],
  );
  const upcomingTasks = useMemo(
    () => tasks.filter((task) => task.date > todayStr),
    [tasks, todayStr],
  );
  const completedTasks = useMemo(
    () => tasks.filter((task) => task.done),
    [tasks],
  );

  return {
    profile,
    profileLoading: profileState.isLoading,
    saveProfile,
    farm,
    onboarding,
    advice,
    recommendations,
    equipment,
    addEquipment,
    updateEquipment,
    removeEquipment,
    tasks,
    todayTasks,
    upcomingTasks,
    completedTasks,
    addTask,
    toggleTask,
    activities,
    pushActivity,
    invoices,
    toggleInvoice,
    notifPrefs,
    toggleNotif,
    farmExtras,
    saveFarmExtras,
    updateCropStage,
    cropStage,
    stageProgress,
    bookings,
    activeBookings,
    pastRentals,
    favCount,
    chatCount,
    ledger,
    totalIncome,
    totalExpense,
    completion,
    farmScore,
    aiReadiness,
    memberSince,
    refresh,
    weather,
  };
}
