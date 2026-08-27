import net from 'node:net';
import os from 'node:os';
import tls from 'node:tls';

export const mailConfig = () => ({
  host: process.env.SMTP_HOST ?? '',
  port: Number(process.env.SMTP_PORT ?? 465),
  user: process.env.SMTP_USER ?? '',
  pass: process.env.SMTP_PASS ?? '',
  from: process.env.MAIL_FROM || process.env.SMTP_USER || '',
  to: (process.env.MAIL_TO ?? '')
    .split(',')
    .map((a) => a.trim())
    .filter(Boolean),
});

function dialogue(socket) {
  let buffer = '';

  const ready = [];
  const waiting = [];

  socket.setEncoding('utf8');
  socket.on('data', (chunk) => {
    buffer += chunk;
    let cut;
    while ((cut = buffer.indexOf('\r\n')) >= 0) {
      const line = buffer.slice(0, cut);
      buffer = buffer.slice(cut + 2);

      if (!/^\d{3} /.test(line)) continue;
      const waiter = waiting.shift();
      if (waiter) waiter(line);
      else ready.push(line);
    }
  });

  return {
    expect: () =>
      ready.length ? Promise.resolve(ready.shift()) : new Promise((r) => waiting.push(r)),
    send: (line) => socket.write(line + '\r\n'),
  };
}

const mimeWord = (text) => `=?UTF-8?B?${Buffer.from(text, 'utf8').toString('base64')}?=`;

export function letter({ from, to, subject, body }) {
  const encoded = Buffer.from(body, 'utf8')
    .toString('base64')
    .replace(/(.{76})/g, '$1\r\n');

  return [
    `From: ${mimeWord('АвантФикс')} <${from}>`,
    `To: ${to.join(', ')}`,
    `Subject: ${mimeWord(subject)}`,
    `Date: ${new Date().toUTCString()}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
    encoded,
  ].join('\r\n');
}

export async function sendMail({ subject, body }, config = mailConfig()) {
  const { host, port, user, pass, from, to } = config;
  if (!host || to.length === 0) return false;

  await new Promise((resolve, reject) => {
    const options = { host, port, servername: host };
    const secure = port === 465;
    const socket = secure ? tls.connect(options) : net.connect(options);

    let settled = false;
    const done = (err) => {
      if (settled) return;
      settled = true;
      socket.removeAllListeners('error');
      socket.end();
      err ? reject(err) : resolve();
    };

    socket.setTimeout(10_000, () => done(new Error('таймаут')));
    socket.on('error', done);

    socket.on(secure ? 'secureConnect' : 'connect', async () => {
      const talk = dialogue(socket);
      const say = async (line, expected, label) => {
        if (line !== null) talk.send(line);
        const answer = await talk.expect();
        if (!expected.test(answer)) throw new Error(`${label ?? line ?? 'приветствие'} → ${answer}`);
        return answer;
      };

      try {
        await say(null, /^220 /);
        await say(`EHLO ${os.hostname()}`, /^250 /);

        if (user) {
          await say('AUTH LOGIN', /^334 /);
          await say(Buffer.from(user, 'utf8').toString('base64'), /^334 /, `логин ${user}`);
          await say(Buffer.from(pass, 'utf8').toString('base64'), /^235 /, 'пароль');
        }

        await say(`MAIL FROM:<${from}>`, /^250 /);
        for (const address of to) await say(`RCPT TO:<${address}>`, /^250 /);
        await say('DATA', /^354 /);
        await say(letter({ from, to, subject, body }) + '\r\n.', /^250 /, 'письмо');
        talk.send('QUIT');
        done();
      } catch (err) {
        done(err);
      }
    });
  });

  return true;
}
