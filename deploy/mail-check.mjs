import tls from 'node:tls';
import os from 'node:os';

const host = process.env.SMTP_HOST;
const port = Number(process.env.SMTP_PORT ?? 465);
const user = process.env.SMTP_USER;
const pass = process.env.SMTP_PASS;

const socket = tls.connect({ host, port, servername: host });
let buffer = '';
const lines = [];
const waiters = [];

socket.setEncoding('utf8');
socket.on('data', (chunk) => {
  buffer += chunk;
  let cut;
  while ((cut = buffer.indexOf('\r\n')) >= 0) {
    const line = buffer.slice(0, cut);
    buffer = buffer.slice(cut + 2);
    if (!/^\d{3} /.test(line)) continue;
    const w = waiters.shift();
    if (w) w(line);
    else lines.push(line);
  }
});

const expect = () =>
  lines.length ? Promise.resolve(lines.shift()) : new Promise((r) => waiters.push(r));

socket.on('secureConnect', async () => {
  console.log('соединение:', socket.authorized ? 'ok' : socket.authorizationError);
  console.log('приветствие:', await expect());

  socket.write(`EHLO ${os.hostname()}\r\n`);
  console.log('EHLO:', await expect());

  socket.write('AUTH LOGIN\r\n');
  console.log('AUTH LOGIN:', await expect());

  socket.write(Buffer.from(user, 'utf8').toString('base64') + '\r\n');
  console.log('логин:', await expect());

  socket.write(Buffer.from(pass, 'utf8').toString('base64') + '\r\n');
  console.log('пароль:', await expect());

  console.log('длина пароля:', pass.length, 'символов, пробелы:', /\s/.test(pass) ? 'есть' : 'нет');

  socket.write('QUIT\r\n');
  socket.end();
});

socket.on('error', (e) => console.log('ошибка сокета:', e.message));
setTimeout(() => process.exit(0), 15000);
