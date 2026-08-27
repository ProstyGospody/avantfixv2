import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';

const UA = 'avantfix-site-build/1.0 (+https://avantfix.ru; rbtbelgorod31@yandex.ru)';
const TILE = 'https://tile.openstreetmap.org';
const OUT_IMG = path.join('src', 'images', 'maps');
const OUT_DATA = path.join('src', 'data', 'cityMaps.ts');

const citiesSrc = fs.readFileSync(path.join('src', 'data', 'cities.ts'), 'utf8');

function listOf(slug, key) {
  const city = citiesSrc.slice(citiesSrc.indexOf(`${slug}: {`));
  const m = city.match(new RegExp(`${key}:\\s*\\[([^\\]]*)\\]`));
  return m ? [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1]) : [];
}

const CITIES = [
  { slug: 'belgorod', name: 'Белгород', area: 'Белгородский район' },
  { slug: 'oskol', name: 'Старый Оскол', area: 'Старооскольский городской округ' },
  { slug: 'gubkin', name: 'Губкин', area: 'Губкинский городской округ' },
].map((c) => ({ ...c, districts: listOf(c.slug, 'districts'), nearby: listOf(c.slug, 'nearby') }));

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const mercY = (lat) => Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 180 / 2));
const lonToX = (lon, z) => ((lon + 180) / 360) * 2 ** z;
const latToY = (lat, z) => ((1 - mercY(lat) / Math.PI) / 2) * 2 ** z;
const xToLon = (x, z) => (x / 2 ** z) * 360 - 180;
const yToLat = (y, z) => {
  const n = Math.PI - 2 * Math.PI * (y / 2 ** z);
  return (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
};

async function geocode(q) {
  const url =
    'https://nominatim.openstreetmap.org/search?' +
    new URLSearchParams({ q, format: 'json', limit: '1', 'accept-language': 'ru' });
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  await sleep(1250);
  if (!res.ok) return null;
  const hits = await res.json();
  if (!hits.length) return null;
  return { lat: Number(hits[0].lat), lon: Number(hits[0].lon) };
}

const CACHE = path.join(os.tmpdir(), 'avantfix-osm-tiles');

async function tile(z, x, y) {
  const file = path.join(CACHE, String(z), String(x), `${y}.png`);
  if (fs.existsSync(file)) return fs.readFileSync(file);

  const res = await fetch(`${TILE}/${z}/${x}/${y}.png`, { headers: { 'User-Agent': UA } });
  await sleep(160);
  if (!res.ok) throw new Error(`плитка ${z}/${x}/${y} → ${res.status}`);

  const buf = Buffer.from(await res.arrayBuffer());
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, buf);
  return buf;
}

function simplify(points, tolerance) {
  if (points.length < 3) return points;

  const dist = ([px, py], [ax, ay], [bx, by]) => {
    const dx = bx - ax;
    const dy = by - ay;
    if (!dx && !dy) return Math.hypot(px - ax, py - ay);
    const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)));
    return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
  };

  const keep = new Array(points.length).fill(false);
  keep[0] = keep[points.length - 1] = true;
  const stack = [[0, points.length - 1]];

  while (stack.length) {
    const [a, b] = stack.pop();
    let far = -1;
    let best = tolerance;
    for (let i = a + 1; i < b; i++) {
      const d = dist(points[i], points[a], points[b]);
      if (d > best) {
        best = d;
        far = i;
      }
    }
    if (far > 0) {
      keep[far] = true;
      stack.push([a, far], [far, b]);
    }
  }
  return points.filter((_, i) => keep[i]);
}

async function outlineOf(name) {
  const url =
    'https://nominatim.openstreetmap.org/search?' +
    new URLSearchParams({
      q: `${name}, Россия`,
      format: 'json',
      limit: '1',
      polygon_geojson: '1',
      'accept-language': 'ru',
    });
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  await sleep(1250);
  if (!res.ok) return null;
  const hit = (await res.json())[0];
  const g = hit && hit.geojson;
  if (!g) return null;
  if (g.type === 'Polygon') return g.coordinates[0];
  if (g.type === 'MultiPolygon')
    return g.coordinates.map((poly) => poly[0]).sort((a, b) => b.length - a.length)[0];
  return null;
}

fs.mkdirSync(OUT_IMG, { recursive: true });
const result = {};

for (const city of CITIES) {
  console.log(`\n=== ${city.name}`);
  const center = await geocode(`${city.name}, Россия`);
  if (!center) {
    console.log('  центр не найден — пропуск');
    continue;
  }

  const points = [];
  const missed = [];
  for (const [kind, list] of [['district', city.districts], ['nearby', city.nearby]]) {
    for (const name of list) {
      const tries =
        kind === 'district'
          ? [`${name}, ${city.name}`, `микрорайон ${name}, ${city.name}`, `${name}, ${city.area}`]
          : [`${name}, ${city.name}`, `${name}, ${city.area}`, `${name}, Белгородская область`];

      let at = null;
      for (const q of tries) {
        at = await geocode(q);
        if (at) break;
      }
      if (!at) {
        console.log(`  ✗ ${name}`);
        missed.push(name);
        continue;
      }

      const dx = (at.lon - center.lon) * 111 * Math.cos((center.lat * Math.PI) / 180);
      const dy = (at.lat - center.lat) * 111;
      const km = Math.hypot(dx, dy);
      if (km > 40) {
        console.log(`  ✗ ${name} — ${km.toFixed(0)} км от центра, отброшен`);
        missed.push(name);
        continue;
      }
      points.push({ name, kind, ...at });
      console.log(`  ✓ ${name.padEnd(20)} ${km.toFixed(1)} км`);
    }
  }

  if (missed.length) console.log(`  не нашлись: ${missed.join(', ')}`);

  const lats = [center.lat, ...points.map((p) => p.lat)];
  const lons = [center.lon, ...points.map((p) => p.lon)];
  const padLat = (Math.max(...lats) - Math.min(...lats)) * 0.12 + 0.012;
  const padLon = (Math.max(...lons) - Math.min(...lons)) * 0.12 + 0.018;
  let north = Math.max(...lats) + padLat;
  let south = Math.min(...lats) - padLat;
  let west = Math.min(...lons) - padLon;
  let east = Math.max(...lons) + padLon;

  const kx = Math.cos((center.lat * Math.PI) / 180);
  for (let i = 0; i < 40; i++) {
    const w = (east - west) * kx;
    const h = north - south;
    if (w / h < 0.95) {
      const add = (h * 0.95 - w) / 2 / kx;
      west -= add;
      east += add;
    } else if (w / h > 1.3) {
      const add = (w / 1.3 - h) / 2;
      north += add;
      south -= add;
    } else break;
  }

  const TARGET_PX = 1200;
  let z = 9;
  let best = Infinity;
  for (let cand = 9; cand <= 14; cand++) {
    const px = (lonToX(east, cand) - lonToX(west, cand)) * 256;
    const miss = Math.abs(px - TARGET_PX);
    if (miss < best) {
      best = miss;
      z = cand;
    }
  }

  const x0 = Math.floor(lonToX(west, z));
  const x1 = Math.floor(lonToX(east, z));
  const y0 = Math.floor(latToY(north, z));
  const y1 = Math.floor(latToY(south, z));
  const cols = x1 - x0 + 1;
  const rows = y1 - y0 + 1;
  console.log(`  зум ${z}, плиток ${cols}×${rows}`);

  const parts = [];
  for (let x = x0; x <= x1; x++) {
    for (let y = y0; y <= y1; y++) {
      parts.push({ input: await tile(z, x, y), left: (x - x0) * 256, top: (y - y0) * 256 });
    }
  }

  const stitched = await sharp({
    create: { width: cols * 256, height: rows * 256, channels: 4, background: '#ffffff' },
  })
    .composite(parts)
    .png()
    .toBuffer();

  const cropLeft = Math.round((lonToX(west, z) - x0) * 256);
  const cropTop = Math.round((latToY(north, z) - y0) * 256);
  const cropW = Math.round((lonToX(east, z) - lonToX(west, z)) * 256);
  const cropH = Math.round((latToY(south, z) - latToY(north, z)) * 256);

  const file = path.join(OUT_IMG, `${city.slug}.png`);
  await sharp(stitched)
    .extract({ left: cropLeft, top: cropTop, width: cropW, height: cropH })

    .modulate({ saturation: 0.5, brightness: 1.04 })
    .linear(0.9, 16)
    .png({ compressionLevel: 9 })
    .toFile(file);

  const meta = await sharp(file).metadata();
  console.log(`  ${file} — ${meta.width}×${meta.height}, ${(fs.statSync(file).size / 1024).toFixed(0)} КБ`);

  const frameN = yToLat(y0 + cropTop / 256, z);
  const frameS = yToLat(y0 + (cropTop + cropH) / 256, z);
  const frameW = xToLon(x0 + cropLeft / 256, z);
  const frameE = xToLon(x0 + (cropLeft + cropW) / 256, z);

  const viewH = Math.round((1000 * meta.height) / meta.width);
  const my = (lat) => Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 180 / 2));
  const yTop = my(frameN);
  const ySpan = my(frameS) - yTop;
  const toXY = ([lon, lat]) => [
    ((lon - frameW) / (frameE - frameW)) * 1000,
    ((my(lat) - yTop) / ySpan) * viewH,
  ];

  const ring = await outlineOf(city.name);
  let outline = '';
  if (ring) {
    const flat = simplify(ring.map(toXY), 0.5);
    outline =
      'M' +
      flat.map(([x, y]) => `${Math.round(x * 10) / 10} ${Math.round(y * 10) / 10}`).join('L') +
      'Z';
    console.log(`  контур: ${ring.length} точек → ${flat.length}, ${outline.length} символов`);
  } else {
    console.log('  контур не найден');
  }

  result[city.slug] = {
    viewH,
    outline,
    width: meta.width,
    height: meta.height,
    bounds: {
      north: yToLat(y0 + cropTop / 256, z),
      south: yToLat(y0 + (cropTop + cropH) / 256, z),
      west: xToLon(x0 + cropLeft / 256, z),
      east: xToLon(x0 + (cropLeft + cropW) / 256, z),
    },
    center,
    points,
  };
}

const body = Object.entries(result)
  .map(([slug, v]) => {
    const pts = v.points
      .map((p) => `      { name: ${JSON.stringify(p.name)}, kind: '${p.kind}', lat: ${p.lat}, lon: ${p.lon} },`)
      .join('\n');
    return `  ${slug}: {
    width: ${v.width},
    height: ${v.height},
    viewH: ${v.viewH},
    outline: '${v.outline}',
    bounds: { north: ${v.bounds.north}, south: ${v.bounds.south}, west: ${v.bounds.west}, east: ${v.bounds.east} },
    center: { lat: ${v.center.lat}, lon: ${v.center.lon} },
    points: [
${pts}
    ],
  },`;
  })
  .join('\n');

fs.writeFileSync(
  OUT_DATA,
  `import type { CitySlug } from '@/data/cities';

export interface CityMapPoint {
  name: string;
  kind: 'district' | 'nearby';
  lat: number;
  lon: number;
}

export interface CityMap {
  width: number;
  height: number;
  viewH: number;
  outline: string;
  bounds: { north: number; south: number; west: number; east: number };
  center: { lat: number; lon: number };
  points: CityMapPoint[];
}

export const CITY_MAPS: Record<CitySlug, CityMap> = {
${body}
};
`,
  'utf8',
);

console.log('\n' + OUT_DATA + ' записан');
