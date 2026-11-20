import { deleteHit, resolveAndRecordHit } from '../_shared/db.js';

const JSON_HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Access-Control-Allow-Origin': '*'
};

export async function onRequestPost(context) {
  try {
    const body = await context.request.json();
    const res = await resolveAndRecordHit(context.env, body.key, context.waitUntil);
    return new Response(JSON.stringify({ ok: true, ...res }), {
      status: 200,
      headers: JSON_HEADERS
    });
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: err.message }), {
      status: 400,
      headers: JSON_HEADERS
    });
  }
}

export async function onRequestDelete(context) {
  try {
    const url = new URL(context.request.url);
    let id = url.searchParams.get('id');
    if (!id) {
      const body = await context.request.json().catch(() => ({}));
      id = body.id;
    }
    if (!id) throw new Error('Falta el ID del hit a eliminar');

    const res = await deleteHit(context.env, id);
    return new Response(JSON.stringify({ ok: true, ...res }), {
      status: 200,
      headers: JSON_HEADERS
    });
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: err.message }), {
      status: 400,
      headers: JSON_HEADERS
    });
  }
}
