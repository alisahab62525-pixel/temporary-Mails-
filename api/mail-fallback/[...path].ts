export const config = {
  runtime: 'edge',
};

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS, PUT, PATCH',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, Accept',
      },
    });
  }

  try {
    const url = new URL(req.url);
    let subpath = url.pathname.replace(/^\/api\/mail-fallback\/?/, '');
    if (!subpath || subpath === '') {
      subpath = url.searchParams.get('path') || 'domains?page=1';
    }
    if (!subpath.startsWith('/')) {
      subpath = '/' + subpath;
    }

    const search = url.search;
    const targetUrl = `https://api.mail.gw${subpath}${subpath.includes('?') ? '' : search}`;

    const headers: Record<string, string> = {
      'Accept': 'application/json, text/plain, */*',
      'Content-Type': 'application/json',
      'Origin': 'https://mail.gw',
      'Referer': 'https://mail.gw/',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    };

    const auth = req.headers.get('authorization');
    if (auth) {
      headers['authorization'] = auth;
    }

    const hasBody = req.method !== 'GET' && req.method !== 'HEAD';
    const bodyText = hasBody ? await req.text() : undefined;

    const upstreamRes = await fetch(targetUrl, {
      method: req.method,
      headers,
      body: bodyText,
    });

    const responseBody = await upstreamRes.text();

    return new Response(responseBody, {
      status: upstreamRes.status,
      headers: {
        'Content-Type': upstreamRes.headers.get('content-type') || 'application/json; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS, PUT, PATCH',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, Accept',
      },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || 'Upstream request failed' }), {
      status: 502,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
}
