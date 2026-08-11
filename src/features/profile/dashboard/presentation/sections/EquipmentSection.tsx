import React, { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Wrench, CircleDot } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet';
import { EmptyState } from '@/components/ui/error-state';
import { MACHINERY_OPTIONS } from '@/features/auth/presentation/onboarding/onboardingData';
import type { DigitalEquipment, EquipmentStatus, EquipmentCondition } from '../../domain/digitalProfileStore';
import type { UseDigitalProfileReturn } from '../types';

interface EquipmentSectionProps {
  data: UseDigitalProfileReturn;
}

const STATUS_TONE: Record<EquipmentStatus, string> = {
  Owned: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  Leased: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20',
  'For Rent': 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20',
};

const CONDITION_TONE: Record<EquipmentCondition, string> = {
  Excellent: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  Good: 'bg-lime-500/10 text-lime-600 dark:text-lime-400',
  Fair: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  'Needs Repair': 'bg-red-500/10 text-red-600 dark:text-red-400',
};

const emptyForm = () => ({
  name: '',
  category: 'Tractor',
  status: 'Owned' as EquipmentStatus,
  condition: 'Good' as EquipmentCondition,
  since: String(new Date().getFullYear()),
  notes: '',
});

export const EquipmentSection: React.FC<EquipmentSectionProps> = ({ data }) => {
  const { t } = useLanguage();
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm());

  useEffect(() => {
    if (!formOpen) {
      setForm(emptyForm());
      setEditingId(null);
    }
  }, [formOpen]);

  const openAdd = () => {
    setEditingId(null);
    setForm(emptyForm());
    setFormOpen(true);
  };

  const openEdit = (item: DigitalEquipment) => {
    setEditingId(item.id);
    setForm({ name: item.name, category: item.category, status: item.status, condition: item.condition, since: item.since, notes: item.notes ?? '' });
    setFormOpen(true);
  };

  const handleSave = () => {
    if (!form.name.trim()) return;
    if (editingId) {
      data.updateEquipment(editingId, form);
    } else {
      data.addEquipment(form);
    }
    setFormOpen(false);
  };

  const handleRemove = (id: string) => {
    data.removeEquipment(id);
  };

  if (data.equipment.length === 0) {
    return (
      <div className="pb-24">
        <div className="flex justify-end mb-3">
          <button onClick={openAdd} className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-extrabold text-primary-foreground shadow-glow hover:bg-primary/90 active:scale-95 transition-all">
            <Plus size={14} /> {t('prof.addEquipment')}
          </button>
        </div>
        <EmptyState
          emoji="🚜"
          title={t('prof.equipEmpty')}
          description={t('prof.equipEmptyHint')}
          actionLabel={t('prof.addEquipment')}
          onAction={openAdd}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-24">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-extrabold text-foreground tracking-tight">{t('prof.equipment')}</h2>
        <button onClick={openAdd} className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-extrabold text-primary-foreground shadow-glow hover:bg-primary/90 active:scale-95 transition-all">
          <Plus size={14} /> {t('prof.addEquipment')}
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {data.equipment.map((item) => (
          <div key={item.id} className="group rounded-2xl border border-border bg-card p-4 shadow-card transition-all hover:-translate-y-0.5 hover:shadow-soft">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-3 min-w-0">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-feature-tractor/10 text-feature-tractor">
                  <Wrench size={20} />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-extrabold text-foreground truncate">{item.name}</p>
                  <p className="text-[11px] font-semibold text-muted-foreground">{item.category} · {item.since}</p>
                </div>
              </div>
              <span className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-extrabold ${STATUS_TONE[item.status]}`}>
                <CircleDot size={10} /> {t(`equip.status.${item.status}`) || item.status}
              </span>
            </div>

            <div className="mt-3 flex items-center justify-between gap-2">
              <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-extrabold ${CONDITION_TONE[item.condition]}`}>
                {t(`equip.condition.${item.condition}`) || item.condition}
              </span>
              <div className="flex items-center gap-1.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                <button onClick={() => openEdit(item)} aria-label={t('prof.editEquipment')} className="rounded-full p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                  <Pencil size={14} />
                </button>
                <button onClick={() => handleRemove(item.id)} aria-label={t('prof.delete')} className="rounded-full p-2 text-red-500 hover:bg-red-500/10 transition-colors">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>

            {item.notes && <p className="mt-2 text-[11px] text-muted-foreground leading-relaxed line-clamp-2">{item.notes}</p>}
          </div>
        ))}
      </div>

      <Sheet open={formOpen} onOpenChange={setFormOpen}>
        <SheetContent side="bottom" className="max-h-[92vh] overflow-y-auto rounded-t-[28px]">
          <SheetHeader className="text-left">
            <SheetTitle>{editingId ? t('prof.editEquipment') : t('prof.addEquipment')}</SheetTitle>
            <SheetDescription>{t('prof.equipFormHint')}</SheetDescription>
          </SheetHeader>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-5">
            <label className="space-y-1.5 sm:col-span-2">
              <span className="text-xs font-bold text-foreground">{t('prof.equipName')}</span>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder={t('prof.equipNamePh')}
                className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </label>

            <label className="space-y-1.5">
              <span className="text-xs font-bold text-foreground">{t('prof.equipCategory')}</span>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              >
                {MACHINERY_OPTIONS.map((m) => (
                  <option key={m} value={m}>{t(`opt:${m}`) || m}</option>
                ))}
              </select>
            </label>

            <label className="space-y-1.5">
              <span className="text-xs font-bold text-foreground">{t('prof.equipSince')}</span>
              <input
                value={form.since}
                onChange={(e) => setForm({ ...form, since: e.target.value })}
                className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </label>

            <label className="space-y-1.5">
              <span className="text-xs font-bold text-foreground">{t('prof.rentalStatus')}</span>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as EquipmentStatus })}
                className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              >
                {(['Owned', 'Leased', 'For Rent'] as EquipmentStatus[]).map((s) => (
                  <option key={s} value={s}>{t(`equip.status.${s}`) || s}</option>
                ))}
              </select>
            </label>

            <label className="space-y-1.5">
              <span className="text-xs font-bold text-foreground">{t('prof.equipCondition')}</span>
              <select
                value={form.condition}
                onChange={(e) => setForm({ ...form, condition: e.target.value as EquipmentCondition })}
                className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              >
                {(['Excellent', 'Good', 'Fair', 'Needs Repair'] as EquipmentCondition[]).map((c) => (
                  <option key={c} value={c}>{t(`equip.condition.${c}`) || c}</option>
                ))}
              </select>
            </label>

            <label className="space-y-1.5 sm:col-span-2">
              <span className="text-xs font-bold text-foreground">{t('prof.equipNotes')}</span>
              <textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={2}
                className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
              />
            </label>
          </div>

          <SheetFooter className="mt-6 flex gap-3 sm:justify-end">
            <button onClick={() => setFormOpen(false)} className="rounded-full px-5 py-2.5 text-xs font-extrabold text-muted-foreground hover:bg-muted transition-colors">
              {t('prof.cancel')}
            </button>
            <button onClick={handleSave} className="rounded-full bg-primary px-6 py-2.5 text-xs font-extrabold text-primary-foreground shadow-glow hover:bg-primary/90 active:scale-95 transition-all">
              {t('prof.save')}
            </button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
};
