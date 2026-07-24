/**
 * Cloudflare Pages Function - Decision Lens API Proxy
 * Runs natively within the Pages deployment (same origin, no CORS issues).
 * Handles all requests to /dl-proxy/*
 */

const DEEPSEEK_ENDPOINT = 'https://api.deepseek.com/v1/chat/completions';

export const onRequestPost = async (context) => {
  const { request, env } = context;

  // Get API key from Pages environment variable
  const apiKey = env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'API key not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Determine target: use x-dl-target header if present, otherwise DeepSeek
  const targetHeader = request.headers.get('x-dl-target');
  let targetUrl;
  if (targetHeader) {
    const url = new URL(request.url);
    const path = url.pathname.replace(/^\/dl-proxy/, '') || '/';
    targetUrl = `${targetHeader.replace(/\/+$/, '')}${path}`;
  } else {
    targetUrl = DEEPSEEK_ENDPOINT;
  }

  // Forward the request
  const body = await request.text();
  const response = await fetch(targetUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: body,
  });

  const responseData = await response.text();
  return new Response(responseData, {
    status: response.status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
};

export const onRequestOptions = async (context) => {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, x-dl-target, Authorization',
    },
  });
};
