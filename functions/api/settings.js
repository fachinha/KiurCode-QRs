import { updateSettings } from '../_shared/db.js';

const JSON_HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Access-Control-Allow-Origin': '*'
};

export async function onRequestPut(context) {
  try {
    const body = await context.request.json();
    const settings = await updateSettings(context.env, body);
    return new Response(JSON.stringify({ ok: true, settings }), {
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
