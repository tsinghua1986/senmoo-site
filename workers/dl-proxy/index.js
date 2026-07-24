/**
 * Cloudflare Worker - Decision Lens API Proxy
 * Forwards requests to DeepSeek API, bypassing browser CORS restrictions.
 */

const DEEPSEEK_ENDPOINT = 'https://api.deepseek.com/v1/chat/completions';

export default {
  async fetch(request, env, ctx) {
    // Only allow POST requests
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    // Get API key from environment variable (set via Wrangler secret)
    const apiKey = env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      return new Response('API key not configured', { status: 500 });
    }

    // Determine target URL
    // If x-dl-target header is present, use it with the request path
    // Otherwise, default to DeepSeek API
    const targetHeader = request.headers.get('x-dl-target');
    let targetUrl;
    if (targetHeader) {
      // Extract path from request URL (strip /dl-proxy prefix)
      const url = new URL(request.url);
      const path = url.pathname.replace(/^\/dl-proxy/, '') || '/';
      targetUrl = `${targetHeader.replace(/\/+$/, '')}${path}`;
    } else {
      targetUrl = DEEPSEEK_ENDPOINT;
    }

    // Get the request body
    const body = await request.text();

    // Forward to target API
    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: body,
    });

    // Return the response with CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, x-dl-target, Authorization',
    };

    // Handle preflight requests
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders,
      });
    }

    // Forward the actual response
    const responseData = await response.text();
    return new Response(responseData, {
      status: response.status,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    });
  },
};
