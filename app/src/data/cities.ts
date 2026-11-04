import type { CountryCode } from './countries';

export interface City {
  /** Stable id, also used to match the same city across trips. */
  id: string;
  en: string;
  zh: string;
  /** Name in the local language, as written on station signs. */
  local: string;
  country: CountryCode;
}

const c = (id: string, en: string, zh: string, country: CountryCode, local = en): City => ({
  id,
  en,
  zh,
  local,
  country,
});

/** A starter list of common Interrail cities. Any other city can be typed in by hand. */
export const CITIES: City[] = [
  c('amsterdam', 'Amsterdam', '阿姆斯特丹', 'NL'),
  c('antwerp', 'Antwerp', '安特卫普', 'BE', 'Antwerpen'),
  c('athens', 'Athens', '雅典', 'GR', 'Athína'),
  c('avignon', 'Avignon', '阿维尼翁', 'FR'),
  c('barcelona', 'Barcelona', '巴塞罗那', 'ES'),
  c('basel', 'Basel', '巴塞尔', 'CH'),
  c('bergen', 'Bergen', '卑尔根', 'NO'),
  c('berlin', 'Berlin', '柏林', 'DE'),
  c('bern', 'Bern', '伯尔尼', 'CH'),
  c('bologna', 'Bologna', '博洛尼亚', 'IT'),
  c('bordeaux', 'Bordeaux', '波尔多', 'FR'),
  c('bratislava', 'Bratislava', '布拉迪斯拉发', 'SK'),
  c('brno', 'Brno', '布尔诺', 'CZ'),
  c('bruges', 'Bruges', '布鲁日', 'BE', 'Brugge'),
  c('brussels', 'Brussels', '布鲁塞尔', 'BE', 'Bruxelles'),
  c('bucharest', 'Bucharest', '布加勒斯特', 'RO', 'București'),
  c('budapest', 'Budapest', '布达佩斯', 'HU'),
  c('cologne', 'Cologne', '科隆', 'DE', 'Köln'),
  c('copenhagen', 'Copenhagen', '哥本哈根', 'DK', 'København'),
  c('dresden', 'Dresden', '德累斯顿', 'DE'),
  c('dublin', 'Dublin', '都柏林', 'IE'),
  c('edinburgh', 'Edinburgh', '爱丁堡', 'GB'),
  c('florence', 'Florence', '佛罗伦萨', 'IT', 'Firenze'),
  c('frankfurt', 'Frankfurt', '法兰克福', 'DE', 'Frankfurt am Main'),
  c('gdansk', 'Gdańsk', '格但斯克', 'PL'),
  c('geneva', 'Geneva', '日内瓦', 'CH', 'Genève'),
  c('genoa', 'Genoa', '热那亚', 'IT', 'Genova'),
  c('ghent', 'Ghent', '根特', 'BE', 'Gent'),
  c('gothenburg', 'Gothenburg', '哥德堡', 'SE', 'Göteborg'),
  c('granada', 'Granada', '格拉纳达', 'ES'),
  c('graz', 'Graz', '格拉茨', 'AT'),
  c('hamburg', 'Hamburg', '汉堡', 'DE'),
  c('heidelberg', 'Heidelberg', '海德堡', 'DE'),
  c('helsinki', 'Helsinki', '赫尔辛基', 'FI'),
  c('innsbruck', 'Innsbruck', '因斯布鲁克', 'AT'),
  c('interlaken', 'Interlaken', '因特拉肯', 'CH'),
  c('krakow', 'Kraków', '克拉科夫', 'PL'),
  c('lausanne', 'Lausanne', '洛桑', 'CH'),
  c('leipzig', 'Leipzig', '莱比锡', 'DE'),
  c('lille', 'Lille', '里尔', 'FR'),
  c('lisbon', 'Lisbon', '里斯本', 'PT', 'Lisboa'),
  c('ljubljana', 'Ljubljana', '卢布尔雅那', 'SI'),
  c('london', 'London', '伦敦', 'GB'),
  c('lucerne', 'Lucerne', '卢塞恩', 'CH', 'Luzern'),
  c('luxembourg', 'Luxembourg', '卢森堡', 'LU'),
  c('lyon', 'Lyon', '里昂', 'FR'),
  c('madrid', 'Madrid', '马德里', 'ES'),
  c('malmo', 'Malmö', '马尔默', 'SE'),
  c('marseille', 'Marseille', '马赛', 'FR'),
  c('milan', 'Milan', '米兰', 'IT', 'Milano'),
  c('montpellier', 'Montpellier', '蒙彼利埃', 'FR'),
  c('munich', 'Munich', '慕尼黑', 'DE', 'München'),
  c('naples', 'Naples', '那不勒斯', 'IT', 'Napoli'),
  c('nice', 'Nice', '尼斯', 'FR'),
  c('nuremberg', 'Nuremberg', '纽伦堡', 'DE', 'Nürnberg'),
  c('oslo', 'Oslo', '奥斯陆', 'NO'),
  c('paris', 'Paris', '巴黎', 'FR'),
  c('pisa', 'Pisa', '比萨', 'IT'),
  c('porto', 'Porto', '波尔图', 'PT'),
  c('prague', 'Prague', '布拉格', 'CZ', 'Praha'),
  c('rome', 'Rome', '罗马', 'IT', 'Roma'),
  c('rotterdam', 'Rotterdam', '鹿特丹', 'NL'),
  c('salzburg', 'Salzburg', '萨尔茨堡', 'AT'),
  c('seville', 'Seville', '塞维利亚', 'ES', 'Sevilla'),
  c('sofia', 'Sofia', '索非亚', 'BG', 'Sofiya'),
  c('split', 'Split', '斯普利特', 'HR'),
  c('stockholm', 'Stockholm', '斯德哥尔摩', 'SE'),
  c('strasbourg', 'Strasbourg', '斯特拉斯堡', 'FR'),
  c('stuttgart', 'Stuttgart', '斯图加特', 'DE'),
  c('thessaloniki', 'Thessaloniki', '塞萨洛尼基', 'GR', 'Thessaloníki'),
  c('toulouse', 'Toulouse', '图卢兹', 'FR'),
  c('turin', 'Turin', '都灵', 'IT', 'Torino'),
  c('utrecht', 'Utrecht', '乌得勒支', 'NL'),
  c('valencia', 'Valencia', '瓦伦西亚', 'ES', 'València'),
  c('venice', 'Venice', '威尼斯', 'IT', 'Venezia'),
  c('verona', 'Verona', '维罗纳', 'IT'),
  c('vienna', 'Vienna', '维也纳', 'AT', 'Wien'),
  c('warsaw', 'Warsaw', '华沙', 'PL', 'Warszawa'),
  c('zagreb', 'Zagreb', '萨格勒布', 'HR'),
  c('zurich', 'Zurich', '苏黎世', 'CH', 'Zürich'),
];

const fold = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

/** Matches English, Chinese and local names, ignoring accents and case. Prefix matches rank first. */
export function searchCities(query: string, limit = 8): City[] {
  const q = fold(query.trim());
  if (!q) return [];
  const scored = CITIES.map((city) => {
    const names = [city.en, city.local, city.zh].map(fold);
    const score = names.some((n) => n.startsWith(q)) ? 0 : names.some((n) => n.includes(q)) ? 1 : 2;
    return { city, score };
  }).filter((x) => x.score < 2);
  scored.sort((a, b) => a.score - b.score || a.city.en.localeCompare(b.city.en));
  return scored.slice(0, limit).map((x) => x.city);
}
