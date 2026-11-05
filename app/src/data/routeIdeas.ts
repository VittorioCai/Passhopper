import { CITIES } from './cities';
import type { Place } from '../model/schema';
import { createTrip } from '../model/trip';
/**
 * Ready-made routes people can learn from or use as they are. Written for Passhopper from common
 * Interrail patterns (official "recommended routes", Seat61, travel guides); nights are suggestions.
 * Every city is in CITIES, so maps and timetable search work. Train facts are kept general on
 * purpose: services change every timetable year, so the app's own search and rules give the details.
 */
export type Tag = 'first' | 'scenic' | 'budget' | 'food' | 'nature' | 'long';
type T = { en: string; zh: string };

export interface RouteIdea {
  id: string;
  title: T;
  summary: T;
  /** Where the trip starts; you arrive here (by plane, or from home). */
  origin: string;
  stops: { city: string; nights: number; note: T }[];
  tags: Tag[];
  best: T;
  tips: T[];
}

export const ROUTE_IDEAS: RouteIdea[] = [
  {
    id: 'classic-central',
    title: { en: 'The classic: Amsterdam to Budapest', zh: '经典线：阿姆斯特丹到布达佩斯' },
    summary: {
      en: 'Five capitals in two weeks with easy, direct trains. The route most people start with.',
      zh: '两周五座首都，段段都有直达车，是最多人选的入门路线。',
    },
    origin: 'amsterdam',
    stops: [
      {
        city: 'berlin',
        nights: 3,
        note: {
          en: 'About 6 hours by direct InterCity from Amsterdam. Museum Island, the Wall at Bernauer Straße, Tempelhof field.',
          zh: '从阿姆斯特丹坐直达 IC 约 6 小时。博物馆岛、伯瑙尔大街柏林墙遗址、滕珀尔霍夫机场公园。',
        },
      },
      {
        city: 'prague',
        nights: 3,
        note: {
          en: 'The Berlin to Prague EuroCity follows the Elbe valley: sit on the left (west) side after Dresden. Old Town, Charles Bridge early in the morning, Letná beer garden.',
          zh: '柏林到布拉格的 EuroCity 沿易北河谷行驶，过了德累斯顿坐左侧（西侧）风景最好。老城、清晨的查理大桥、莱特纳公园啤酒花园。',
        },
      },
      {
        city: 'vienna',
        nights: 3,
        note: {
          en: 'Railjet from Prague in about 4 hours, no reservation needed. Coffee houses, the Naschmarkt, Schönbrunn.',
          zh: '从布拉格坐 Railjet 约 4 小时，不用订座。咖啡馆、纳旭市场、美泉宫。',
        },
      },
      {
        city: 'budapest',
        nights: 3,
        note: {
          en: 'Under 3 hours from Vienna. Thermal baths (Széchenyi or Gellért), the Danube at night, ruin bars in the Jewish Quarter.',
          zh: '从维也纳不到 3 小时。温泉浴场（塞切尼或盖勒特）、多瑙河夜景、犹太区的废墟酒吧。',
        },
      },
    ],
    tags: ['first', 'budget'],
    best: {
      en: 'All year; May–June and September are calmest.',
      zh: '全年都适合；5–6 月和 9 月人少。',
    },
    tips: [
      {
        en: 'Four train days: a 4-day Flexi pass is enough, so you can spend nights where you like.',
        zh: '只需 4 个旅行日，4 天 Flexi 就够，住几晚可以随意调整。',
      },
      {
        en: 'None of these trains need a reservation, so you can decide on the day.',
        zh: '这几段车都不用订座，当天决定也可以。',
      },
    ],
  },
  {
    id: 'italy',
    title: { en: 'Italy highlights', zh: '意大利精华' },
    summary: {
      en: 'Milan, Venice, Florence, Rome and Naples on fast trains, with day trips to Pisa and Pompeii.',
      zh: '坐高铁串起米兰、威尼斯、佛罗伦萨、罗马和那不勒斯，再加比萨、庞贝一日游。',
    },
    origin: 'milan',
    stops: [
      {
        city: 'venice',
        nights: 2,
        note: {
          en: 'Get off at Venezia Santa Lucia, not Mestre. Walk instead of taking the vaporetto; go to Burano early.',
          zh: '在威尼斯圣卢西亚站下车，不是梅斯特雷。多走路少坐水上巴士；彩色岛布拉诺早点去。',
        },
      },
      {
        city: 'florence',
        nights: 3,
        note: {
          en: 'Book the Uffizi and the Accademia ahead. Pisa and Lucca are easy day trips on regional trains (no reservation).',
          zh: '乌菲兹美术馆和学院美术馆要提前订票。比萨、卢卡坐区域火车一日游很方便（不用订座）。',
        },
      },
      {
        city: 'rome',
        nights: 4,
        note: {
          en: 'Florence to Rome is one of the busiest pass routes: reserve the Frecciarossa early. Vatican and Colosseum need timed tickets.',
          zh: '佛罗伦萨到罗马是最热门的通票线路之一，红箭要早订座。梵蒂冈和斗兽场要预约时段票。',
        },
      },
      {
        city: 'naples',
        nights: 2,
        note: {
          en: 'Pizza, the archaeological museum, and Pompeii by the Circumvesuviana local train, which the pass does not cover.',
          zh: '披萨、国家考古博物馆；去庞贝坐环维苏威火车，通票不适用，要另外买票。',
        },
      },
    ],
    tags: ['first', 'food'],
    best: {
      en: 'April–June or September–October; August is hot and busy.',
      zh: '4–6 月或 9–10 月；8 月又热又挤。',
    },
    tips: [
      {
        en: 'Frecciarossa and Italo look alike, but the pass only covers Trenitalia (Frecce, Intercity, regional).',
        zh: '红箭和 Italo 看起来很像，但通票只能坐 Trenitalia 的车（Frecce、Intercity、区域车）。',
      },
      {
        en: 'Each Frecce reservation costs extra. For short hops, regional trains are free with the pass but slower.',
        zh: 'Frecce 每段都要另付订座费。短途可以坐区域车，持通票免费，只是慢一些。',
      },
    ],
  },
  {
    id: 'alps',
    title: { en: 'Across the Alps', zh: '穿越阿尔卑斯' },
    summary: {
      en: 'Lakes, mountains and some of Europe’s most scenic lines, from Munich to Milan through Austria and Switzerland.',
      zh: '湖泊、雪山和欧洲最美的几段铁路，从慕尼黑经奥地利、瑞士到米兰。',
    },
    origin: 'munich',
    stops: [
      {
        city: 'salzburg',
        nights: 2,
        note: {
          en: 'Under 2 hours from Munich. Old town, Hohensalzburg fortress, a day trip to Hallstatt.',
          zh: '从慕尼黑不到 2 小时。老城、萨尔茨堡城堡，可一日游哈尔施塔特。',
        },
      },
      {
        city: 'innsbruck',
        nights: 2,
        note: {
          en: 'The Nordkette cable car goes from the city centre almost to the summit.',
          zh: '北链山缆车从市中心几乎直达山顶。',
        },
      },
      {
        city: 'zurich',
        nights: 2,
        note: {
          en: 'The line from Innsbruck over the Arlberg is spectacular: sit by a window.',
          zh: '从因斯布鲁克出发翻越阿尔贝格山口的一段风景极好，记得坐窗边。',
        },
      },
      {
        city: 'lucerne',
        nights: 2,
        note: {
          en: 'Chapel Bridge, a boat on the lake, and Mount Rigi or Pilatus (mountain railways cost extra).',
          zh: '卡佩尔廊桥、湖上游船，还有瑞吉山或皮拉图斯山（登山铁路要另付费）。',
        },
      },
      {
        city: 'interlaken',
        nights: 2,
        note: {
          en: 'The line from Lucerne over the Brünig Pass is one of the prettiest in Switzerland. Mountain trains above Interlaken are not covered by the pass.',
          zh: '从卢塞恩翻越布吕尼希山口到因特拉肯是瑞士最美的线路之一。因特拉肯往上的登山火车通票不适用。',
        },
      },
      {
        city: 'milan',
        nights: 2,
        note: {
          en: 'EuroCity trains between Switzerland and Italy need a reservation. The Duomo roof and the Last Supper (book weeks ahead).',
          zh: '瑞士到意大利的 EuroCity 必须订座。米兰大教堂屋顶、《最后的晚餐》（要提前几周预约）。',
        },
      },
    ],
    tags: ['scenic', 'nature'],
    best: {
      en: 'June–September for hiking; December for snow and markets.',
      zh: '6–9 月适合徒步；12 月有雪景和圣诞市集。',
    },
    tips: [
      {
        en: 'Switzerland is expensive: a stop with a supermarket picnic saves a lot.',
        zh: '瑞士物价高，在超市买东西野餐能省不少。',
      },
      {
        en: 'Six short train days: consider a 7-day Flexi so you can add a scenic detour.',
        zh: '6 个旅行日都不长，可以考虑 7 天 Flexi，多出一天坐一段观光线。',
      },
    ],
  },
  {
    id: 'france-spain',
    title: { en: 'Paris to Madrid by the sea', zh: '巴黎经南法到马德里' },
    summary: {
      en: 'Lyon’s food, Provence, Barcelona and the Mediterranean coast, ending in Madrid on high-speed trains.',
      zh: '里昂美食、普罗旺斯、巴塞罗那和地中海海岸，坐高铁一路到马德里。',
    },
    origin: 'paris',
    stops: [
      {
        city: 'lyon',
        nights: 2,
        note: {
          en: 'Two hours by TGV. Eat in a bouchon, walk the traboules of the old town.',
          zh: '坐 TGV 约 2 小时。去传统小酒馆 bouchon 吃饭，逛老城的穿廊小巷。',
        },
      },
      {
        city: 'avignon',
        nights: 2,
        note: {
          en: 'Papal Palace and the bridge. Arles and the Pont du Gard are close; Avignon has two stations (TGV and Centre).',
          zh: '教皇宫和断桥。阿尔勒、加尔桥都在附近；阿维尼翁有两个车站（TGV 站和市中心站）。',
        },
      },
      {
        city: 'barcelona',
        nights: 3,
        note: {
          en: 'Direct high-speed trains run from southern France to Barcelona; reserve early. Book the Sagrada Família ahead.',
          zh: '南法有直达巴塞罗那的高铁，要尽早订座。圣家堂需提前预约。',
        },
      },
      {
        city: 'valencia',
        nights: 2,
        note: {
          en: 'Along the coast by Euromed. Paella where it was invented, the City of Arts and Sciences, the beach.',
          zh: '坐 Euromed 沿海岸南下。在海鲜饭的发源地吃海鲜饭，艺术科学城，海滩。',
        },
      },
      {
        city: 'madrid',
        nights: 3,
        note: {
          en: 'Under 2 hours by AVE. The Prado, Retiro park, tapas in La Latina; Toledo is a short day trip.',
          zh: '坐 AVE 不到 2 小时。普拉多博物馆、丽池公园、拉蒂纳区的小吃；托莱多可一日游。',
        },
      },
    ],
    tags: ['food', 'first'],
    best: {
      en: 'May–June and September; southern Spain is very hot in July and August.',
      zh: '5–6 月和 9 月；西班牙南部 7、8 月非常热。',
    },
    tips: [
      {
        en: 'French TGVs have a limited number of pass seats and sell out in summer. Reserve as soon as your dates are fixed.',
        zh: '法国 TGV 给通票的座位有限，夏天经常订满。日期一定就去订座。',
      },
      {
        en: 'Every long-distance train in Spain needs a reservation, even with the pass.',
        zh: '西班牙的长途车即使持通票也都必须订座。',
      },
    ],
  },
  {
    id: 'spain',
    title: { en: 'Spain: Barcelona to Andalusia', zh: '西班牙：巴塞罗那到安达卢西亚' },
    summary: {
      en: 'Gaudí, Madrid’s museums, Seville’s flamenco and the Alhambra, linked by some of Europe’s fastest trains.',
      zh: '高迪、马德里的博物馆、塞维利亚的弗拉门戈和阿尔罕布拉宫，用欧洲最快的高铁串起来。',
    },
    origin: 'barcelona',
    stops: [
      {
        city: 'madrid',
        nights: 3,
        note: {
          en: 'About 2½ hours by AVE. Prado, Reina Sofía, and evenings in Malasaña.',
          zh: '坐 AVE 约 2 个半小时。普拉多、索菲亚王后艺术中心，晚上去马拉萨尼亚区。',
        },
      },
      {
        city: 'seville',
        nights: 3,
        note: {
          en: 'The Alcázar, the cathedral, Plaza de España and a flamenco show in Triana. Córdoba is a day trip on the same line.',
          zh: '王宫、大教堂、西班牙广场，在特里亚纳区看弗拉门戈。科尔多瓦在同一条线上，可一日游。',
        },
      },
      {
        city: 'granada',
        nights: 2,
        note: {
          en: 'Alhambra tickets sell out weeks ahead: book before you book anything else. Sunset from the Mirador de San Nicolás.',
          zh: '阿尔罕布拉宫门票要提前几周订，比车票还要先订。在圣尼古拉斯观景台看日落。',
        },
      },
    ],
    tags: ['food', 'budget'],
    best: {
      en: 'March–May and October; avoid July–August in Andalusia.',
      zh: '3–5 月和 10 月；7–8 月的安达卢西亚太热。',
    },
    tips: [
      {
        en: 'Reservations are required on every leg; book them in one go on the Renfe website.',
        zh: '每段都要订座，可以在 Renfe 官网一次订好。',
      },
      {
        en: 'Spanish trains are cheap when bought early. With only three train days, compare tickets with the pass.',
        zh: '西班牙火车票提前买很便宜。只有 3 个旅行日，记得比较一下单独买票和通票哪个划算。',
      },
    ],
  },
  {
    id: 'scandinavia',
    title: { en: 'Scandinavian capitals and fjords', zh: '北欧首都与峡湾' },
    summary: {
      en: 'Copenhagen, Stockholm and Oslo, then the Bergen line across the mountains to the fjords.',
      zh: '哥本哈根、斯德哥尔摩、奥斯陆，再坐卑尔根铁路翻山到峡湾。',
    },
    origin: 'copenhagen',
    stops: [
      {
        city: 'stockholm',
        nights: 3,
        note: {
          en: 'About 5 hours on SJ high-speed trains (reservation required). Gamla Stan, the Vasa Museum, the archipelago by boat.',
          zh: '坐 SJ 高铁约 5 小时（必须订座）。老城、瓦萨沉船博物馆，坐船游群岛。',
        },
      },
      {
        city: 'oslo',
        nights: 3,
        note: {
          en: 'Through Swedish lakes and forests. The Opera House roof, Vigeland park, the fjord ferries on your Ruter ticket.',
          zh: '一路是瑞典的湖泊和森林。歌剧院屋顶、维格兰雕塑公园，用当地公交票就能坐峡湾渡轮。',
        },
      },
      {
        city: 'bergen',
        nights: 3,
        note: {
          en: 'The Bergen line crosses the Hardangervidda plateau above the tree line; book a seat early. Add the Flåm railway from Myrdal.',
          zh: '卑尔根铁路穿越森林线以上的哈当厄高原，要早点订座。可以在米达尔转弗洛姆铁路。',
        },
      },
    ],
    tags: ['scenic', 'nature'],
    best: {
      en: 'June–August for long days; September for autumn colours.',
      zh: '6–8 月白天最长；9 月看秋色。',
    },
    tips: [
      {
        en: 'Scandinavia is expensive, which makes the pass better value than usual.',
        zh: '北欧车票很贵，通票在这里通常更划算。',
      },
      {
        en: 'The Flåm railway is a private line: pass holders get a discount, not a free ride.',
        zh: '弗洛姆铁路是私营线路，持通票只能打折，不能免费坐。',
      },
    ],
  },
  {
    id: 'balkans',
    title: { en: 'Vienna to the Adriatic', zh: '维也纳到亚得里亚海' },
    summary: {
      en: 'From Vienna south through Graz and Ljubljana to Zagreb and the Dalmatian coast. Slow trains, low prices.',
      zh: '从维也纳一路南下，经格拉茨、卢布尔雅那、萨格勒布到达尔马提亚海岸。车慢，物价低。',
    },
    origin: 'vienna',
    stops: [
      {
        city: 'graz',
        nights: 1,
        note: {
          en: 'The Semmering railway on the way is a UNESCO World Heritage line. Climb the Schlossberg.',
          zh: '途中的塞默灵铁路是世界文化遗产。可以爬城堡山。',
        },
      },
      {
        city: 'ljubljana',
        nights: 3,
        note: {
          en: 'A small, green capital. Lake Bled is an hour away by bus (not covered).',
          zh: '小巧又绿意盎然的首都。布莱德湖坐巴士 1 小时（通票不适用）。',
        },
      },
      {
        city: 'zagreb',
        nights: 2,
        note: {
          en: 'Upper Town, the Museum of Broken Relationships, coffee culture on Tkalčićeva.',
          zh: '上城、失恋博物馆，在特卡尔契切瓦街体验咖啡文化。',
        },
      },
      {
        city: 'split',
        nights: 3,
        note: {
          en: 'The Zagreb to Split train is slow but runs through wild karst mountains. Diocletian’s Palace and island ferries.',
          zh: '萨格勒布到斯普利特的火车很慢，但一路穿过荒野的喀斯特山地。戴克里先宫，可坐渡轮去海岛。',
        },
      },
    ],
    tags: ['budget', 'scenic'],
    best: {
      en: 'May–June and September; the coast is crowded in August.',
      zh: '5–6 月和 9 月；8 月海边人很多。',
    },
    tips: [
      {
        en: 'Trains in Croatia are few: check the timetable before fixing your dates.',
        zh: '克罗地亚的车次很少，定日期前先查好时刻表。',
      },
      {
        en: 'Dubrovnik has no railway; buses from Split take about 4 hours.',
        zh: '杜布罗夫尼克没有铁路，从斯普利特坐巴士约 4 小时。',
      },
    ],
  },
  {
    id: 'benelux',
    title: { en: 'Paris, Belgium and Amsterdam', zh: '巴黎、比利时和阿姆斯特丹' },
    summary: {
      en: 'A short trip with short train rides: Brussels, medieval Bruges, Amsterdam and Cologne cathedral.',
      zh: '路程短、坐车时间也短：布鲁塞尔、中世纪小城布鲁日、阿姆斯特丹和科隆大教堂。',
    },
    origin: 'paris',
    stops: [
      {
        city: 'brussels',
        nights: 2,
        note: {
          en: 'The fast trains from Paris need a reservation; slower regional trains via Lille don’t. Grand-Place, waffles, comic-strip murals.',
          zh: '从巴黎出发的高铁必须订座；经里尔转区域车则不用订座，只是慢一些。大广场、华夫饼、漫画墙。',
        },
      },
      {
        city: 'bruges',
        nights: 2,
        note: {
          en: 'One hour by InterCity, no reservation. Canals, the Belfry, and Ghent for an afternoon on the way.',
          zh: '坐 IC 1 小时，不用订座。运河、钟楼，途中可以在根特停留一个下午。',
        },
      },
      {
        city: 'amsterdam',
        nights: 3,
        note: {
          en: 'Book the Anne Frank House and Rijksmuseum online. Rent a bike for a day.',
          zh: '安妮之家和国家博物馆要在网上预约。租一天自行车。',
        },
      },
      {
        city: 'cologne',
        nights: 2,
        note: {
          en: 'The cathedral is right outside the station. Kölsch beer in small glasses, the Rhine promenade.',
          zh: '大教堂就在火车站门口。小杯科隆啤酒，莱茵河畔散步。',
        },
      },
    ],
    tags: ['first'],
    best: { en: 'April for tulips; any time for cities.', zh: '4 月看郁金香；城市游全年都行。' },
    tips: [
      {
        en: 'Distances are short, so cheap tickets bought ahead can beat the pass. Compare on the Savings page.',
        zh: '距离都很短，提前买的特价票可能比通票便宜，可以在回本页比较。',
      },
    ],
  },
  {
    id: 'poland',
    title: { en: 'Berlin to the Baltic through Poland', zh: '柏林经波兰到波罗的海' },
    summary: {
      en: 'Dresden, Prague, Kraków, Warsaw and Gdańsk: great value, rich history, good trains.',
      zh: '德累斯顿、布拉格、克拉科夫、华沙、格但斯克：物价低、历史厚重，火车也不错。',
    },
    origin: 'berlin',
    stops: [
      {
        city: 'dresden',
        nights: 1,
        note: {
          en: 'Two hours from Berlin. The rebuilt Frauenkirche and the Zwinger.',
          zh: '离柏林 2 小时。重建的圣母教堂和茨温格宫。',
        },
      },
      {
        city: 'prague',
        nights: 3,
        note: {
          en: 'Along the Elbe valley. Vyšehrad is a quiet alternative to the castle crowds.',
          zh: '沿易北河谷进入捷克。高堡比城堡区清静得多。',
        },
      },
      {
        city: 'krakow',
        nights: 3,
        note: {
          en: 'Old Town square, Kazimierz, and a day for Auschwitz-Birkenau (book the guided tour ahead).',
          zh: '老城广场、卡齐米日犹太区，留一天去奥斯维辛-比克瑙（提前预约导览）。',
        },
      },
      {
        city: 'warsaw',
        nights: 2,
        note: {
          en: 'About 2½ hours on Express InterCity Premium (reservation required). The Uprising Museum is essential.',
          zh: '坐 EIP 高速列车约 2 个半小时（必须订座）。华沙起义博物馆一定要去。',
        },
      },
      {
        city: 'gdansk',
        nights: 2,
        note: {
          en: 'The rebuilt Hanseatic old town and the European Solidarity Centre. Malbork castle is on the way.',
          zh: '重建的汉萨老城和欧洲团结中心。马尔堡城堡就在途中。',
        },
      },
    ],
    tags: ['budget', 'long'],
    best: { en: 'May–September.', zh: '5–9 月。' },
    tips: [
      {
        en: 'Polish trains are cheap; with five train days, check whether tickets beat the pass.',
        zh: '波兰火车票便宜，5 个旅行日的话，比较一下单独买票是否更省。',
      },
    ],
  },
  {
    id: 'grand-tour',
    title: { en: 'The grand tour: Paris to Rome in three weeks', zh: '大环游：三周从巴黎到罗马' },
    summary: {
      en: 'Seven countries in three weeks, from the canals of Amsterdam to Venice and Rome over the Alps.',
      zh: '三周七个国家，从阿姆斯特丹的运河，翻越阿尔卑斯到威尼斯和罗马。',
    },
    origin: 'paris',
    stops: [
      {
        city: 'amsterdam',
        nights: 3,
        note: {
          en: 'Direct high-speed train with a compulsory reservation; book early in summer.',
          zh: '高铁直达，必须订座；夏天要早订。',
        },
      },
      {
        city: 'berlin',
        nights: 3,
        note: {
          en: 'A long but easy day on one direct InterCity.',
          zh: '一班直达 IC 坐一整天，但很轻松。',
        },
      },
      {
        city: 'prague',
        nights: 3,
        note: {
          en: 'Sit on the left after Dresden for the Elbe valley.',
          zh: '过了德累斯顿坐左侧，看易北河谷。',
        },
      },
      {
        city: 'vienna',
        nights: 3,
        note: {
          en: 'Railjet from Prague. A Nightjet from Vienna to Italy can save a hotel night instead of the day train.',
          zh: '从布拉格坐 Railjet。从维也纳去意大利也可以坐 Nightjet 夜车，省一晚住宿。',
        },
      },
      {
        city: 'venice',
        nights: 2,
        note: {
          en: 'The Railjet over the Semmering and through Carinthia takes most of a day, and it is beautiful all the way.',
          zh: '这班 Railjet 翻越塞默灵、穿过克恩滕州，要坐大半天，一路都是风景。',
        },
      },
      {
        city: 'florence',
        nights: 3,
        note: {
          en: 'Two hours by Frecciarossa (reservation). Day trips to Siena or Pisa.',
          zh: '坐红箭 2 小时（要订座）。可一日游锡耶纳或比萨。',
        },
      },
      {
        city: 'rome',
        nights: 3,
        note: {
          en: 'End of the line. From Rome, Nightjet trains run north if you want to keep going.',
          zh: '终点站。如果还想继续，罗马有北上的 Nightjet 夜车。',
        },
      },
    ],
    tags: ['long', 'first'],
    best: { en: 'May–June or September.', zh: '5–6 月或 9 月。' },
    tips: [
      {
        en: 'Seven train days within a month: a 7-day Flexi fits exactly.',
        zh: '一个月内 7 个旅行日，正好用 7 天 Flexi。',
      },
      {
        en: 'If you live in one of these countries, your home-country rule changes which trains the pass covers. The app works it out for you.',
        zh: '如果你住在途经的国家，居住国规则会影响哪些车能用通票，App 会自动算好。',
      },
    ],
  },
];

export const ideaById = (id: string | undefined) => ROUTE_IDEAS.find((r) => r.id === id);

export const cityPlace = (id: string): Place => {
  const c = CITIES.find((x) => x.id === id)!;
  return { id: c.id, en: c.en, zh: c.zh, local: c.local, country: c.country };
};

/** Days, cities and train days of an idea. */
export function ideaStats(r: RouteIdea) {
  const nights = r.stops.reduce((n, s) => n + s.nights, 0);
  const countries = [
    ...new Set([r.origin, ...r.stops.map((s) => s.city)].map((id) => cityPlace(id).country)),
  ];
  return { days: nights + 1, cities: r.stops.length + 1, trainDays: r.stops.length, countries };
}

/** A throwaway trip for previews (map, timeline). Not saved. */
export function previewTrip(r: RouteIdea, lang: string) {
  return createTrip({
    name: lang.startsWith('zh') ? r.title.zh : r.title.en,
    traveller: { residence: { type: 'non_europe' }, ageGroup: 'adult', travelClass: 2, count: 1 },
    startDate: '2030-06-01',
    places: [cityPlace(r.origin), ...r.stops.map((s) => cityPlace(s.city))],
    nights: r.stops.map((s) => s.nights),
    returnToStart: false,
  });
}
