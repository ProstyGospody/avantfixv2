export function plural(n: number, forms: [string, string, string]): string {
  const abs = Math.abs(n) % 100;
  const last = abs % 10;
  if (abs > 10 && abs < 20) return forms[2];
  if (last > 1 && last < 5) return forms[1];
  if (last === 1) return forms[0];
  return forms[2];
}

const NBSP = String.fromCharCode(0x00a0);

export function price(value: number): string {
  return value.toLocaleString('ru-RU').replace(/\s/g, NBSP) + NBSP + '₽';
}

export function priceFrom(value: number): string {
  return value === 0 ? 'бесплатно' : `от ${price(value)}`;
}

export function duration(minutes: number): string {
  if (minutes < 60) return `${minutes} ${plural(minutes, ['минута', 'минуты', 'минут'])}`;
  const hours = minutes / 60;
  if (Number.isInteger(hours)) {
    return `${hours} ${plural(hours, ['час', 'часа', 'часов'])}`;
  }
  return `${hours.toFixed(1).replace('.', ',')} часа`;
}

export function isoDuration(minutes: number): string {
  if (minutes <= 0) return 'PT0M';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `PT${h ? `${h}H` : ''}${m ? `${m}M` : ''}`;
}

export function telHref(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  return `tel:+${digits}`;
}

export function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function typo(s: string): string {
  const short = /(^|[\s(«"—])([а-яёa-z]{1,2})[ \t]+/gi;
  const numeric = /(\d)[ \t]+(?=[а-яё₽%$€])/gi;
  let out = s;
  for (let i = 0; i < 2; i++) out = out.replace(short, (_, pre, w) => `${pre}${w} `);
  return out.replace(numeric, '$1 ');
}
