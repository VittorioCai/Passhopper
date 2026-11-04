import type { TFunction } from 'i18next';
import type { PassProduct } from '../data/passes';

export const passName = (p: PassProduct, t: TFunction) =>
  p.kind === 'flexi' ? t('pass.flexi', { days: p.days }) : t('pass.continuous', { days: p.days });

export const passValidity = (p: PassProduct, t: TFunction) =>
  p.kind === 'continuous'
    ? t('pass.inARow')
    : t('pass.within', { count: Math.round(p.validityDays / 30.5) });
