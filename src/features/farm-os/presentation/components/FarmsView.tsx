import React, { useState } from 'react';
import { CheckCircle2, MapPin, Plus, X } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import type { Irrigation, Ownership } from '../../domain/farmOsTypes';
import type { UseFarmOsResult } from '../hooks/useFarmOs';
import { SectionHead } from './OverviewView';

interface Props {
  data: UseFarmOsResult;
  onToast: (msg: string) => void;
}

const IRRIGATION: Irrigation[] = ['rainfed', 'drip', 'sprinkler', 'canal', 'well'];
const OWNERSHIP: Ownership[] = ['owned', 'leased', 'shared'];

export const FarmsView: React.FC<Props> = ({ data, onToast }) => {
  const { t } = useLanguage();
  const { state, activeFarm, actions } = data;
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [area, setArea] = useState('');
  const [village, setVillage] = useState('');
  const [district, setDistrict] = useState('');
  const [soil, setSoil] = useState('');
  const [irrigation, setIrrigation] = useState<Irrigation>('drip');
  const [waterSource, setWaterSource] = useState('');
  const [ownership, setOwnership] = useState<Ownership>('owned');

  const submit = () => {
    if (!name.trim() || !Number(area)) return;
    actions.addFarm({
      name: name.trim(),
      areaAcres: Number(area),
      village: village.trim() || activeFarm.village,
      district: district.trim() || activeFarm.district,
      state: activeFarm.state,
      soilType: soil.trim() || 'Alluvial Soil',
      irrigation,
      waterSource: waterSource.trim() || t(`fos.irrigation.${irrigation}`),
      ownership,
      livestock: [],
      machinery: [],
    });
    setName('');
    setArea('');
    setVillage('');
    setDistrict('');
    setSoil('');
    setWaterSource('');
    setOpen(false);
    onToast(t('fos.toast.farmAdded'));
  };

  return (
    <div className="mt-4 flex flex-col gap-4">
      <SectionHead title={t('fos.farms.title')} />

      {state.farms.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border bg-card/50 px-4 py-6 text-center text-xs font-semibold text-muted-foreground">
          {t('fos.farms.empty')}
        </p>
      ) : (
        <div className="flex flex-col gap-2.5">
          {state.farms.map((f) => {
            const crop = state.crops.find((c) => c.farmId === f.id && c.stage !== 'harvest');
            const isActive = f.id === activeFarm.id;
            return (
              <div
                key={f.id}
                className={cn(
                  'rounded-2xl border p-4 shadow-card transition-colors',
                  isActive ? 'border-emerald-400 bg-gradient-to-br from-emerald-500/10 to-card' : 'border-border bg-card',
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="truncate font-display text-[15px] font-black tracking-tight text-foreground">{f.name}</h4>
                      {isActive && (
                        <span className="flex shrink-0 items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[9px] font-black uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
                          <CheckCircle2 size={10} /> {t('fos.farms.active')}
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 flex items-center gap-1 text-[11px] font-semibold text-muted-foreground">
                      <MapPin size={11} /> {f.village}, {f.district}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-muted px-2 py-1 text-[10px] font-black text-muted-foreground">
                    {f.areaAcres} {t('fos.unit.acres')}
                  </span>
                </div>
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  <Chip>{f.soilType}</Chip>
                  <Chip>{t(`fos.irrigation.${f.irrigation}`)}</Chip>
                  <Chip>{t(`fos.twin.ownership.${f.ownership}`)}</Chip>
                  {crop && <Chip accent>{crop.crop} · {t(`fos.stage.${crop.stage}`)}</Chip>}
                </div>
                {!isActive && (
                  <button
                    onClick={() => {
                      actions.switchFarm(f.id);
                      onToast(t('fos.toast.switched').replace('{name}', f.name));
                    }}
                    className="mt-3 w-full rounded-xl border border-emerald-300 bg-emerald-500/5 py-2 text-xs font-black text-emerald-700 transition-colors hover:bg-emerald-500/10 dark:text-emerald-300"
                  >
                    {t('fos.farms.switch')}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      <button
        onClick={() => setOpen(true)}
        className="flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-emerald-300 bg-emerald-500/5 py-3 text-sm font-black text-emerald-700 transition-colors hover:bg-emerald-500/10 dark:text-emerald-300"
      >
        <Plus size={15} /> {t('fos.farms.add')}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4" onClick={() => setOpen(false)}>
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-4 shadow-xl" onClick={(ev) => ev.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-display text-sm font-black tracking-tight text-foreground">{t('fos.farms.formTitle')}</h3>
              <button onClick={() => setOpen(false)} className="rounded-full p-1 text-muted-foreground hover:bg-muted">
                <X size={15} />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Field value={name} onChange={setName} placeholder={t('fos.farms.namePh')} span />
              <Field value={area} onChange={setArea} type="number" placeholder={t('fos.farms.area')} />
              <Field value={village} onChange={setVillage} placeholder={t('fos.farms.village')} />
              <Field value={district} onChange={setDistrict} placeholder={t('fos.farms.district')} />
              <Field value={soil} onChange={setSoil} placeholder={t('fos.farms.soil')} />
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {OWNERSHIP.map((o) => (
                <button
                  key={o}
                  onClick={() => setOwnership(o)}
                  className={cn(
                    'rounded-full px-2.5 py-1 text-[10px] font-black transition-colors',
                    ownership === o ? 'bg-forest text-primary-foreground' : 'border border-border bg-background text-muted-foreground hover:text-foreground',
                  )}
                >
                  {t(`fos.twin.ownership.${o}`)}
                </button>
              ))}
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {IRRIGATION.map((i) => (
                <button
                  key={i}
                  onClick={() => setIrrigation(i)}
                  className={cn(
                    'rounded-full px-2.5 py-1 text-[10px] font-black transition-colors',
                    irrigation === i ? 'bg-forest text-primary-foreground' : 'border border-border bg-background text-muted-foreground hover:text-foreground',
                  )}
                >
                  {t(`fos.irrigation.${i}`)}
                </button>
              ))}
            </div>
            <button
              onClick={submit}
              disabled={!name.trim() || !Number(area)}
              className="mt-4 w-full rounded-xl bg-forest py-2.5 text-sm font-black text-primary-foreground disabled:opacity-40"
            >
              {t('fos.farms.submit')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const Field: React.FC<{ value: string; onChange: (v: string) => void; placeholder: string; type?: string; span?: boolean }> = ({ value, onChange, placeholder, type = 'text', span }) => (
  <input
    value={value}
    onChange={(e) => onChange(e.target.value)}
    type={type}
    placeholder={placeholder}
    className={cn(
      'w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm font-semibold text-foreground placeholder:text-muted-foreground focus:border-emerald-400 focus:outline-none',
      span && 'col-span-2',
    )}
  />
);

const Chip: React.FC<{ children: React.ReactNode; accent?: boolean }> = ({ children, accent }) => (
  <span
    className={cn(
      'rounded-full px-2 py-0.5 text-[10px] font-bold',
      accent ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300' : 'bg-muted text-muted-foreground',
    )}
  >
    {children}
  </span>
);
