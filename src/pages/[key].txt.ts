import type { APIRoute, GetStaticPaths } from 'astro';

const key = process.env.INDEXNOW_KEY ?? '';

export const getStaticPaths: GetStaticPaths = () =>
  /^[A-Za-z0-9-]{8,128}$/.test(key) ? [{ params: { key } }] : [];

export const GET: APIRoute = ({ params }) =>
  new Response(params.key, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
