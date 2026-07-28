/**
 * Cloudflare Worker - Decision Lens API Proxy
 * Forwards requests to DeepSeek API with:
 * - Supabase JWT validation
 * - Daily usage limit enforcement
 * - Usage logging
 */

const DEEPSEEK_ENDPOINT = 'https://api.deepseek.com/v1/chat/completions';

// Supabase project URL (set via environment variable or hardcode)
const SUPABASE_URL = 'https://your-project.supabase.co';
const SUPABASE_SERVICE_KEY = 'your-service-role-key';

export default {
  async fetch(request, env, ctx) {
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, x-dl-target, Authorization, x-dl-auth-token',
    };

    // Handle preflight (OPTIONS) requests
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405, headers: corsHeaders });
    }

    // Get API key from environment variable
    const apiKey = env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'API key not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Determine target URL
    const targetHeader = request.headers.get('x-dl-target');
    let targetUrl;
    if (targetHeader) {
      const url = new URL(request.url);
      const path = url.pathname.replace(/^\/dl-proxy/, '') || '/';
      targetUrl = `${targetHeader.replace(/\/+$/, '')}${path}`;
    } else {
      targetUrl = DEEPSEEK_ENDPOINT;
    }

    // ===== Auth & Usage Check =====
    const authToken = request.headers.get('x-dl-auth-token');
    let userId = null;
    let decisionType = 'unknown';

    if (authToken) {
      // Validate JWT with Supabase
      const supabaseUrl = env.SUPABASE_URL || SUPABASE_URL;
      const serviceKey = env.SUPABASE_SERVICE_KEY || SUPABASE_SERVICE_KEY;

      try {
        // Verify token by calling Supabase auth endpoint
        const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
          headers: { Authorization: `Bearer ${authToken}` },
        });

        if (!userRes.ok) {
          return new Response(JSON.stringify({ error: 'Invalid or expired token', code: 'AUTH_INVALID' }), {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const userData = await userRes.json();
        userId = userData.id;

        // Check if user is banned
        const profileRes = await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${userId}&select=status`, {
          headers: {
            Authorization: `Bearer ${serviceKey}`,
            apikey: serviceKey,
          },
        });
        const profiles = await profileRes.json();
        if (profiles.length > 0 && profiles[0].status === 'banned') {
          return new Response(JSON.stringify({ error: '账户已被封禁', code: 'USER_BANNED' }), {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Get daily limit from config
        const configRes = await fetch(`${supabaseUrl}/rest/v1/app_config?key=eq.daily_limit&select=value`, {
          headers: {
            Authorization: `Bearer ${serviceKey}`,
            apikey: serviceKey,
          },
        });
        const configData = await configRes.json();
        const dailyLimit = configData.length > 0 ? parseInt(configData[0].value, 10) : 10;

        // Count today's usage
        const today = new Date().toISOString().split('T')[0];
        const usageRes = await fetch(
          `${supabaseUrl}/rest/v1/usage_logs?user_id=eq.${userId}&created_at=gte.${today}&select=id`,
          {
            headers: {
              Authorization: `Bearer ${serviceKey}`,
              apikey: serviceKey,
            },
          }
        );
        const usageData = await usageRes.json();

        if (usageData.length >= dailyLimit) {
          return new Response(
            JSON.stringify({
              error: `今日使用次数已达上限（${dailyLimit}次），请明天再试`,
              code: 'DAILY_LIMIT_EXCEEDED',
              used: usageData.length,
              limit: dailyLimit,
            }),
            {
              status: 429,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          );
        }
      } catch (err) {
        // If auth check fails, still allow the request but don't track
        console.error('Auth check error:', err);
      }
    }

    // Get the request body
    const body = await request.text();

    // Try to extract decision type from body
    try {
      const parsed = JSON.parse(body);
      const messages = parsed.messages || [];
      const sysMsg = messages.find(m => m.role === 'system');
      if (sysMsg?.content?.includes('decisionType')) {
        // Will be updated after response
      }
    } catch {}

    // Forward headers (remove proxy-specific headers)
    const forwardHeaders = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    };

    // Forward to target API
    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: forwardHeaders,
      body: body,
    });

    // Forward the response
    const responseData = await response.text();

    // Log usage (async, don't block response)
    if (userId) {
      const supabaseUrl = env.SUPABASE_URL || SUPABASE_URL;
      const serviceKey = env.SUPABASE_SERVICE_KEY || SUPABASE_SERVICE_KEY;

      // Extract tokens used from response
      let tokensUsed = 0;
      try {
        const respJson = JSON.parse(responseData);
        tokensUsed = respJson.usage?.total_tokens || 0;
      } catch {}

      // Try to detect decision type from request body
      try {
        const parsed = JSON.parse(body);
        const userMsg = (parsed.messages || []).find(m => m.role === 'user')?.content || '';
        if (userMsg.includes('利弊') || userMsg.includes('pros') || userMsg.includes('cons')) {
          decisionType = 'single';
        } else if (userMsg.includes('选项') || userMsg.includes('options')) {
          decisionType = 'multi';
        } else if (userMsg.includes('任务') || userMsg.includes('tasks') || userMsg.includes('priority')) {
          decisionType = 'priority';
        }
      } catch {}

      // Log usage asynchronously
      ctx.waitUntil(
        fetch(`${supabaseUrl}/rest/v1/usage_logs`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${serviceKey}`,
            apikey: serviceKey,
            'Content-Type': 'application/json',
            Prefer: 'return=minimal',
          },
          body: JSON.stringify({
            user_id: userId,
            decision_type: decisionType,
            tokens_used: tokensUsed,
          }),
        })
      );
    }

    return new Response(responseData, {
      status: response.status,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    });
  },
};
/**
 * Cloudflare Worker - Decision Lens API Proxy
 * Forwards requests to DeepSeek API, bypassing browser CORS restrictions.
 */

const DEEPSEEK_ENDPOINT = 'https://api.deepseek.com/v1/chat/completions';

export default {
  async fetch(request, env, ctx) {
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, x-dl-target, Authorization',
    };

    // Handle preflight (OPTIONS) requests first
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders,
      });
    }

    // Only allow POST requests
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405, headers: corsHeaders });
    }

    // Get API key from environment variable (set via Wrangler secret)
    const apiKey = env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      return new Response('API key not configured', { status: 500 });
    }

    // Determine target URL
    const targetHeader = request.headers.get('x-dl-target');
    let targetUrl;
    if (targetHeader) {
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

    // Forward the response with CORS headers
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
