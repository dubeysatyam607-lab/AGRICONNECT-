/**
 * Localizing data-driven option chips. The stored value is always the English
 * label (used as the id across the profile/crop models); only the display
 * label is translated via `opt:<label>` journey keys.
 */

type T = (key: string) => string;

export const optLabel = (t: T, label: string): string => t(`opt:${label}`);

export const optOptions = (t: T, values: string[]): { id: string; label: string }[] =>
  values.map((v) => ({ id: v, label: t(`opt:${v}`) }));

export const optChipOptions = <T0 extends { id: string; label: string; emoji?: string }>(
  t: T,
  options: T0[],
): (T0 & { label: string })[] => options.map((o) => ({ ...o, label: t(`opt:${o.label}`) }));
