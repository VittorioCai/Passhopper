import { describe, expect, it } from 'vitest';
import { ideaPass, ideaStats, ROUTE_IDEAS } from './routeIdeas';

describe('ideaPass', () => {
  it('suggests a pass for every route idea that covers its train days and length', () => {
    for (const r of ROUTE_IDEAS) {
      const p = ideaPass(r);
      const st = ideaStats(r);
      expect(p, r.id).not.toBeNull();
      expect(p!.product.validityDays, r.id).toBeGreaterThanOrEqual(st.days);
      if (p!.product.kind === 'flexi')
        expect(p!.product.days, r.id).toBeGreaterThanOrEqual(st.trainDays);
    }
  });

  it('picks the smallest Flexi pass that fits', () => {
    const italy = ROUTE_IDEAS.find((r) => r.id === 'italy')!;
    const p = ideaPass(italy)!;
    expect(p.product.id).toBe('flexi-4-1m');
    expect(p.spare).toBe(0);
  });
});
