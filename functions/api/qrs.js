import { upsertQR, createBatchQRs, deleteQR, bulkImportQRs, seedD1Database } from '../_shared/db.js';

const JSON_HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Access-Control-Allow-Origin': '*'
};

export async function onRequestPut(context) {
  try {
    const body = await context.request.json();
    const updated = await upsertQR(context.env, body);
    return new Response(JSON.stringify({ ok: true, qr: updated }), {
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

export async function onRequestPost(context) {
  try {
    const body = await context.request.json();
    const action = body.action || 'add';

    if (action === 'batch') {
      const created = await createBatchQRs(context.env, body.count || 10);
      return new Response(JSON.stringify({ ok: true, created }), {
        status: 200,
        headers: JSON_HEADERS
      });
    }

    if (action === 'import') {
      const res = await bulkImportQRs(context.env, body.qrs || []);
      return new Response(JSON.stringify({ ok: true, ...res }), {
        status: 200,
        headers: JSON_HEADERS
      });
    }

    if (action === 'reset_seed') {
      if (context.env?.DB) {
        await seedD1Database(context.env.DB);
      }
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: JSON_HEADERS
      });
    }

    const created = await upsertQR(context.env, body);
    return new Response(JSON.stringify({ ok: true, qr: created }), {
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
    let key = url.searchParams.get('key');
    if (!key) {
      const body = await context.request.json().catch(() => ({}));
      key = body.key;
    }
    if (!key) throw new Error('Falta la clave del QR a eliminar');

    const res = await deleteQR(context.env, key);
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
