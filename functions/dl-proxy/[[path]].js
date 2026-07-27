/**
 * Cloudflare Pages Function - Decision Lens API Proxy
 * Runs natively within the Pages deployment (same origin, no CORS issues).
 * Handles all requests to /dl-proxy/*
 */

const DEEPSEEK_ENDPOINT = 'https://api.deepseek.com/v1/chat/completions';

export const onRequestPost = async (context) => {
  const { request, env } = context;

  // Get API key: prefer env variable, fallback to built-in key
  const apiKey = env.DEEPSEEK_API_KEY || 'sk-1146afeb19f74274b55b9ebb0e9eb00b';

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
