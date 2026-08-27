export const DOMAIN = 'avantfix.ru';

export const BRAND = {
  name: 'АвантФикс',
  legalName: 'ИП Жуков Валентин Сергеевич',
  inn: '311404706888',
  ogrn: '325310000070089',
  slogan: 'Выездной ремонт крупной бытовой техники',
  email: 'info@avantfix.ru',
  foundedYear: 2026,
} as const;

export const WARRANTY = {
  workMonths: 24,
  partsMonths: 12,
  text: 'Гарантия до 2 лет на работу и до 1 года на запчасти',
} as const;

export const SOCIAL = {
  vk: '',
  telegram: '',
  whatsapp: '',
} as const;

export interface YandexCard {
  orgId: string;

  url: string;

  rating: number;

  count: number;

  checked: string;
}

const AVANTFIX_CARD: YandexCard = {
  orgId: '151022587783',
  url: 'https://yandex.ru/maps/org/avantfix/151022587783/',
  rating: 4.3,
  count: 5,
  checked: '2026-08-22',
};

export const CARD_CITY = 'belgorod';

export const YANDEX_CARD: Record<string, YandexCard> = {
  belgorod: AVANTFIX_CARD,
  oskol: AVANTFIX_CARD,
  gubkin: AVANTFIX_CARD,
};

export const LISTINGS: Record<string, string[]> = {
  belgorod: [AVANTFIX_CARD.url],
  oskol: [AVANTFIX_CARD.url],
  gubkin: [AVANTFIX_CARD.url],
};
