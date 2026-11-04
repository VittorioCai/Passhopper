/** Countries with Interrail-relevant rail networks and their metro-map line colours (light, dark). */
export const COUNTRIES = {
  AT: { en: 'Austria', zh: '奥地利', line: ['#E8641C', '#FF9A55'] },
  BE: { en: 'Belgium', zh: '比利时', line: ['#B45309', '#F0A040'] },
  BG: { en: 'Bulgaria', zh: '保加利亚', line: ['#0F766E', '#5EEAD4'] },
  CH: { en: 'Switzerland', zh: '瑞士', line: ['#E23B3E', '#FF6B6B'] },
  CZ: { en: 'Czechia', zh: '捷克', line: ['#7C5CFA', '#A08BFF'] },
  DE: { en: 'Germany', zh: '德国', line: ['#2F6BFF', '#5B8CFF'] },
  DK: { en: 'Denmark', zh: '丹麦', line: ['#C2185B', '#F06292'] },
  ES: { en: 'Spain', zh: '西班牙', line: ['#D97706', '#FBBF24'] },
  FI: { en: 'Finland', zh: '芬兰', line: ['#0E7490', '#38BDF8'] },
  FR: { en: 'France', zh: '法国', line: ['#4338CA', '#818CF8'] },
  GB: { en: 'United Kingdom', zh: '英国', line: ['#475569', '#94A3B8'] },
  GR: { en: 'Greece', zh: '希腊', line: ['#0369A1', '#7DD3FC'] },
  HR: { en: 'Croatia', zh: '克罗地亚', line: ['#B91C1C', '#FCA5A5'] },
  HU: { en: 'Hungary', zh: '匈牙利', line: ['#15803D', '#4ADE80'] },
  IE: { en: 'Ireland', zh: '爱尔兰', line: ['#166534', '#86EFAC'] },
  IT: { en: 'Italy', zh: '意大利', line: ['#0C9F72', '#2DD4A0'] },
  LU: { en: 'Luxembourg', zh: '卢森堡', line: ['#0E7490', '#67E8F9'] },
  NL: { en: 'Netherlands', zh: '荷兰', line: ['#EA580C', '#FB923C'] },
  NO: { en: 'Norway', zh: '挪威', line: ['#BE123C', '#FB7185'] },
  PL: { en: 'Poland', zh: '波兰', line: ['#DB2777', '#F472B6'] },
  PT: { en: 'Portugal', zh: '葡萄牙', line: ['#4D7C0F', '#A3E635'] },
  RO: { en: 'Romania', zh: '罗马尼亚', line: ['#A16207', '#FACC15'] },
  SE: { en: 'Sweden', zh: '瑞典', line: ['#1D4ED8', '#60A5FA'] },
  SI: { en: 'Slovenia', zh: '斯洛文尼亚', line: ['#047857', '#34D399'] },
  SK: { en: 'Slovakia', zh: '斯洛伐克', line: ['#9333EA', '#C084FC'] },
} as const satisfies Record<string, { en: string; zh: string; line: readonly [string, string] }>;

export type CountryCode = keyof typeof COUNTRIES;
export const COUNTRY_CODES = Object.keys(COUNTRIES) as CountryCode[];
export const isCountryCode = (v: string): v is CountryCode => v in COUNTRIES;
