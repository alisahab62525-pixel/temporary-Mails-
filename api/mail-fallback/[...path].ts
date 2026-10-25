export const config = {
  runtime: 'edge',
};

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  try {
    const url = new URL(req.url);
    const subpath = url.pathname.replace(/^\/api\/mail-fallback/, '') || '/';
    const targetUrl = `https://api.mail.gw${subpath}${url.search}`;

    const headers = new Headers();
    headers.set('Content-Type', 'application/json');
    headers.set('Origin', 'https://mail.gw');
    headers.set('Referer', 'https://mail.gw/');

    const auth = req.headers.get('authorization');
    if (auth) {
      headers.set('authorization', auth);
    }

    const hasBody = req.method !== 'GET' && req.method !== 'HEAD';
    const bodyText = hasBody ? await req.text() : undefined;

    const upstreamRes = await fetch(targetUrl, {
      method: req.method,
      headers,
      body: bodyText,
    });

    const resHeaders = new Headers(upstreamRes.headers);
    resHeaders.set('Access-Control-Allow-Origin', '*');
    resHeaders.set('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    resHeaders.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    resHeaders.delete('content-encoding');

    return new Response(upstreamRes.body, {
      status: upstreamRes.status,
      headers: resHeaders,
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 502,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
}
