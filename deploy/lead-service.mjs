import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

import { mailConfig, sendMail } from './mailer.mjs';

const PORT = Number(process.env.PORT ?? 8787);
const LEADS_FILE = process.env.LEADS_FILE ?? '/var/log/avantfix/leads.jsonl';
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN ?? '';
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID ?? '';

const CITY_NAMES = {
  belgorod: 'Белгород',
  oskol: 'Старый Оскол',
  gubkin: 'Губкин',
};

const RATE_LIMIT = { max: 5, windowMs: 10 * 60 * 1000 };
const hits = new Map();

function rateLimited(ip) {
  const now = Date.now();
  const list = (hits.get(ip) ?? []).filter((t) => now - t < RATE_LIMIT.windowMs);
  list.push(now);
  hits.set(ip, list);
  return list.length > RATE_LIMIT.max;
}

setInterval(() => {
  const now = Date.now();
  for (const [ip, list] of hits) {
    const fresh = list.filter((t) => now - t < RATE_LIMIT.windowMs);
    if (fresh.length === 0) hits.delete(ip);
    else hits.set(ip, fresh);
  }
}, 60 * 60 * 1000).unref();

function readBody(req, limitBytes = 8 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > limitBytes) {
        reject(new Error('payload too large'));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function digits(value) {
  return String(value ?? '').replace(/\D/g, '');
}

function clean(value, max = 200) {
  return String(value ?? '')
    .split('')
    .filter((ch) => {
      const code = ch.charCodeAt(0);
      return code >= 32 && code !== 127;
    })
    .join('')
    .trim()
    .slice(0, max);
}

async function notifyMail(lead) {
  const config = mailConfig();
  if (!config.host || config.to.length === 0) return;

  const city = CITY_NAMES[lead.city] ?? lead.city;

  await sendMail(
    {
      subject: `Заявка ${city}: ${lead.name}, ${lead.phone}`,
      body: [
        `Город: ${city}`,
        `Имя: ${lead.name}`,
        `Телефон: ${lead.phone}`,
        lead.subject ? `Техника: ${lead.subject}` : null,
        `Страница: ${lead.page}`,
        `Время: ${new Date(lead.at).toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' })} МСК`,
        '',
        'Согласие на обработку персональных данных получено.',
      ]

        .filter((line) => line !== null)
        .join('\r\n'),
    },
    config,
  );
}

async function notifyTelegram(lead) {
  if (!TELEGRAM_TOKEN || !TELEGRAM_CHAT_ID) return;

  const text = [
    `Новая заявка — ${CITY_NAMES[lead.city] ?? lead.city}`,
    `Имя: ${lead.name}`,
    `Телефон: ${lead.phone}`,
    lead.subject ? `Техника: ${lead.subject}` : null,
    `Страница: ${lead.page}`,
  ]
    .filter(Boolean)
    .join('\n');

  try {
    await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text, disable_web_page_preview: true }),
    });
  } catch (err) {
    console.error('[lead] telegram:', err.message);
  }
}

function saveLead(lead) {
  fs.mkdirSync(path.dirname(LEADS_FILE), { recursive: true });
  fs.appendFileSync(LEADS_FILE, JSON.stringify(lead) + '\n', 'utf8');
}

const server = http.createServer(async (req, res) => {
  if (req.method !== 'POST' || !req.url?.startsWith('/api/lead')) {
    res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ ok: false, error: 'not found' }));
    return;
  }

  const ip = req.headers['x-real-ip'] ?? req.socket.remoteAddress ?? 'unknown';
  const wantsJson = String(req.headers.accept ?? '').includes('application/json');

  const reply = (status, payload, redirect) => {
    if (!wantsJson && redirect) {
      res.writeHead(303, { Location: redirect });
      res.end();
      return;
    }
    res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(payload));
  };

  try {
    if (rateLimited(ip)) {
      reply(429, { ok: false, error: 'too many requests' });
      return;
    }

    const raw = await readBody(req);
    const form = new URLSearchParams(raw);

    if (clean(form.get('company'))) {
      reply(200, { ok: true }, '/spasibo/');
      return;
    }

    const phone = digits(form.get('phone'));
    if (phone.length !== 11) {
      reply(400, { ok: false, error: 'phone' });
      return;
    }

    const lead = {
      at: new Date().toISOString(),
      city: clean(form.get('city'), 20),
      name: clean(form.get('name'), 80) || 'без имени',
      phone: `+${phone}`,
      subject: clean(form.get('subject'), 120),
      page: clean(form.get('page'), 200),
      consent: form.get('consent') != null,
      ip: String(ip),
      ua: clean(req.headers['user-agent'], 200),
    };

    if (!lead.consent) {
      reply(400, { ok: false, error: 'consent' });
      return;
    }

    saveLead(lead);

    await Promise.allSettled([notifyTelegram(lead), notifyMail(lead)]).then((results) => {
      for (const r of results) {
        if (r.status === 'rejected') console.error('[lead] уведомление:', r.reason?.message ?? r.reason);
      }
    });

    reply(200, { ok: true }, '/spasibo/');
  } catch (err) {
    console.error('[lead]', err.message);
    reply(500, { ok: false, error: 'server' });
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`[lead] слушает 127.0.0.1:${PORT}, журнал: ${LEADS_FILE}`);
});
