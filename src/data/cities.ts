export type CitySlug = 'belgorod' | 'oskol' | 'gubkin';

export interface City {
  slug: CitySlug;

  subdomain: string;

  name: string;

  inPrep: string;

  genitive: string;

  dative: string;

  adj: string;

  yandexRegion: string;
  timezone: string;
  geo: { lat: number; lon: number };

  phoneCity: string;
  phoneMobile: string;

  address: { street: string; postalCode: string } | null;
  workHours: { open: string; close: string; days: string };

  arrivalMinutes: number;

  priceFactor: number;

  districts: string[];

  nearby: string[];
}

export const CITIES: Record<CitySlug, City> = {
  belgorod: {
    slug: 'belgorod',
    subdomain: '',
    name: 'Белгород',
    inPrep: 'в Белгороде',
    genitive: 'Белгорода',
    dative: 'Белгороду',
    adj: 'белгородский',
    yandexRegion: 'Белгород',
    timezone: 'Europe/Moscow',
    geo: { lat: 50.5977, lon: 36.5858 },
    phoneCity: '+7 (4722) 56-78-76',
    phoneMobile: '+7 (951) 156-78-76',
    address: null,
    workHours: { open: '09:00', close: '21:00', days: 'ежедневно' },
    arrivalMinutes: 30,
    priceFactor: 1,
    districts: [
      'Центр', 'Харьковская гора', 'Крейда', 'Савино', 'Водстрой',
      'Болховец', 'Юго-Западный', 'Новый город', 'Черёмушки', 'Спутник',
    ],
    nearby: ['Дубовое', 'Разумное', 'Северный', 'Майский', 'Стрелецкое', 'Таврово', 'Новосадовый'],
  },

  oskol: {
    slug: 'oskol',
    subdomain: 'oskol',
    name: 'Старый Оскол',
    inPrep: 'в Старом Осколе',
    genitive: 'Старого Оскола',
    dative: 'Старому Осколу',
    adj: 'старооскольский',
    yandexRegion: 'Старый Оскол',
    timezone: 'Europe/Moscow',
    geo: { lat: 51.2967, lon: 37.8351 },
    phoneCity: '',
    phoneMobile: '+7 (951) 156-78-76',
    address: null,
    workHours: { open: '09:00', close: '21:00', days: 'ежедневно' },
    arrivalMinutes: 40,
    priceFactor: 0.95,
    districts: [
      'Юбилейный', 'Восточный', 'Северный', 'Олимпийский', 'Дубрава',
      'Зелёный Лог', 'Макаренко', 'Приборостроитель', 'Солнечный', 'Лебединец',
      'Королёва', 'Жукова', 'Космос', 'Весенний', 'Парковый',
    ],
    nearby: ['Ямская', 'Стойло', 'Незнамово', 'Обуховка', 'Городище'],
  },

  gubkin: {
    slug: 'gubkin',
    subdomain: 'gubkin',
    name: 'Губкин',
    inPrep: 'в Губкине',
    genitive: 'Губкина',
    dative: 'Губкину',
    adj: 'губкинский',
    yandexRegion: 'Губкин',
    timezone: 'Europe/Moscow',
    geo: { lat: 51.2836, lon: 37.5619 },
    phoneCity: '',
    phoneMobile: '+7 (951) 156-78-76',
    address: null,
    workHours: { open: '09:00', close: '21:00', days: 'ежедневно' },
    arrivalMinutes: 45,
    priceFactor: 0.9,
    districts: [
      'Журавлики', 'Лебеди', 'Форум', 'Строитель', 'Юбилейный',
      'Аврора', 'Мирный', 'Северный', 'Первомайский', 'Молодёжный',
    ],
    nearby: ['Троицкий', 'Бобровы Дворы', 'Сергиевка', 'Скородное'],
  },
};

export const CITY_LIST = Object.values(CITIES);

export function activeCitySlug(): CitySlug {
  const v = (process.env.SITE_CITY ?? 'belgorod') as CitySlug;
  if (!(v in CITIES)) throw new Error(`SITE_CITY=${v} — неизвестный город`);
  return v;
}

export function cityHost(city: City, domain: string): string {
  return city.subdomain ? `${city.subdomain}.${domain}` : domain;
}

export function cityOrigin(city: City, domain: string): string {
  return `https://${cityHost(city, domain)}`;
}
