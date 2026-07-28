import type { ApiConfig, Stage2Response, Stage4Response, DialogueMessage } from '../types';

/* ===== System Prompts ===== */
const STAGE2_SYSTEM = `你是一位专业的决策分析师，擅长从情绪化的倾诉中提炼出真正的核心问题。
你的任务是：
1. 穿透用户的情绪化表达，找到底层真正的决策困境。
2. 判断决策类型：single（做/不做的二选一）、multi（多选一权衡）、priority（优先级排序）。
3. 揪出用户话语中隐含的、未经验证的假设。
4. 如果信息不足以做出判断，提出一个精准的追问。
5. 根据决策类型，提取对应的结构化数据：
   - single：提取推动因素(pros)和阻碍因素(cons)，每个因素包含文本、权重(1-10)、是否硬约束
   - multi：提取选项名称和3-5个评估维度
   - priority：提取待办任务列表，每个任务预估紧急度和重要度(1-10)
6. 提取硬性约束和软性约束（适用于所有决策类型）：
   - 硬性约束(hardConstraints)：不可违背的客观限制，如预算、时间、物理限制
   - 软性约束(softConstraints)：可以挑战的主观判断，如惯例、别人怎么看、历史遗留

你必须严格按照以下 JSON 格式返回结果，不要包含任何其他文字：
{
  "realIssue": "直击本质的问题重构文案，用'你'来称呼用户，语气温暖但一针见血",
  "decisionType": "single | multi | priority",
  "hiddenAssumptions": ["隐性假设1", "隐性假设2"],
  "followUpQuestion": "如果信息不足则提出追问，否则为空字符串",
  "factors": {
    "pros": [{"text": "推动因素", "weight": 7, "isHard": false}],
    "cons": [{"text": "阻碍因素", "weight": 8, "isHard": true}]
  },
  "options": ["选项A", "选项B"],
  "criteria": ["维度1", "维度2", "维度3"],
  "tasks": [{"text": "任务描述", "urgency": 7, "importance": 8}],
  "hardConstraints": ["不可违背的客观限制"],
  "softConstraints": ["可以挑战的主观判断"]
}

注意事项：
- 根据 decisionType 只填充对应的字段，其他字段留空或不返回。
- single 类型：必须返回 factors，包含 pros 和 cons 数组。
- multi 类型：必须返回 options 和 criteria。
- priority 类型：必须返回 tasks 数组。
- hiddenAssumptions 至少找1个，最多3个。
- followUpQuestion 只在真的缺少关键信息时才提出，最多追问1轮，第二轮必须给出完整分析结果。
- hardConstraints 和 softConstraints 必须提取，至少各1条。硬约束是客观的、不可违背的限制；软约束是主观的、可以被挑战的假设。`;

const STAGE4_SYSTEM = `你是一位务实的行动教练。用户已经完成了决策分析流程，现在需要你基于分析结果给出最终建议。
你的任务是：
1. 根据量化打分结果和约束条件，给出清晰的方向建议。
2. 写一段充满人文关怀但不回避真相的分析。
3. 设计一个极低成本的、今天或明天就能执行的"最小破冰实验"。

你必须严格按照以下 JSON 格式返回结果：
{
  "recommendation": "基于数据的建议方向",
  "analysisText": "充满人文关怀的分析陈词，敢于说出真话但语气温和",
  "testAction": "极低成本的、24小时内可启动的最小破冰实验，必须具体可执行",
  "keyAmbiguity": "当前最大的不确定性来源，可为空字符串",
  "verificationRule": {
    "metric": "验证指标：用什么衡量实验结果",
    "threshold": "验证阈值：达到什么数值算成功",
    "timeframe": "验证时间框架：多长时间内观察",
    "successAction": "如果成功，下一步做什么",
    "failureAction": "如果未成功，如何调整"
  }
}

核心原则：
- recommendation 不是命令，而是基于数据的建议方向。
- analysisText 要敢于说出用户不想听的真话，但语气要温和。
- testAction 必须满足三个条件：(1)成本极低 (2)24小时内可启动 (3)能获得真实反馈数据。
- 绝对不要给出"去"或"不去"这种空洞建议。
- verificationRule 必须满足：(1) 指标可量化 (2) 有明确时间框架 (3) 有成功/失败两个分支的具体行动。`;

/* ===== Failure Counter ===== */
let consecutiveFailures = 0;

export function getConsecutiveFailures() { return consecutiveFailures; }
export function resetFailures() { consecutiveFailures = 0; }

/* ===== Custom Error ===== */
export class ApiError extends Error {
  isAuthError: boolean;
  isTimeout: boolean;
  constructor(message: string, opts: { isAuthError?: boolean; isTimeout?: boolean } = {}) {
    super(message);
    this.isAuthError = opts.isAuthError ?? false;
    this.isTimeout = opts.isTimeout ?? false;
  }
}

/* ===== Proxy Helper for Custom Endpoints ===== */

/**
 * Get Supabase auth token from localStorage for usage tracking.
 */
function getSupabaseToken(): string | null {
  try {
    // Supabase stores session in localStorage with key 'sb-{project}-auth-token'
    const keys = Object.keys(localStorage);
    const authKey = keys.find(k => k.includes('-auth-token'));
    if (authKey) {
      const session = JSON.parse(localStorage.getItem(authKey) || '{}');
      return session?.access_token || null;
    }
  } catch {}
  return null;
}

/**
 * Route custom endpoint calls through /dl-proxy to bypass CORS.
 * - Dev: handled by Vite's dl-api-proxy plugin
 * - Production: handled by Cloudflare Pages Function
 */
function resolveCustomEndpoint(baseUrl: string): { url: string; extraHeaders: Record<string, string> } {
  if (!baseUrl) return { url: baseUrl, extraHeaders: {} };
  try {
    const urlObj = new URL(baseUrl);
    const headers: Record<string, string> = { 'x-dl-target': urlObj.origin };
    // Attach Supabase token for usage tracking
    const token = getSupabaseToken();
    if (token) {
      headers['x-dl-auth-token'] = token;
    }
    return {
      url: `/dl-proxy${urlObj.pathname}`,
      extraHeaders: headers,
    };
  } catch {
    return { url: baseUrl, extraHeaders: {} };
  }
}

/* ===== API Call Helper ===== */
async function callLLM(
  config: ApiConfig,
  systemPrompt: string,
  userMessage: string,
  dialogueHistory?: DialogueMessage[]
): Promise<string> {
  const messages: Array<{ role: string; content: string }> = [
    { role: 'system', content: systemPrompt },
  ];

  // Add dialogue history for multi-round
  if (dialogueHistory) {
    for (const msg of dialogueHistory) {
      messages.push({ role: msg.role, content: msg.content });
    }
  }

  messages.push({ role: 'user', content: userMessage });

  let url: string;
  let headers: Record<string, string>;
  let body: string;

  if (config.provider === 'anthropic') {
    url = 'https://api.anthropic.com/v1/messages';
    headers = {
      'Content-Type': 'application/json',
      'x-api-key': config.apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    };
    body = JSON.stringify({
      model: config.model || 'claude-3-5-sonnet-20241022',
      max_tokens: 4096,
      system: systemPrompt,
      messages: messages.filter(m => m.role !== 'system').map(m => ({
        role: m.role,
        content: m.content,
      })),
    });
  } else {
    // OpenAI-compatible (OpenAI or Custom)
    let extraHeaders: Record<string, string> = {};

    if (config.provider === 'custom' && config.baseUrl) {
      const resolved = resolveCustomEndpoint(config.baseUrl);
      url = resolved.url;
      extraHeaders = resolved.extraHeaders;
    } else {
      // Route through dl-proxy for usage tracking
      const token = getSupabaseToken();
      const authHeader: Record<string, string> = {};
      if (token) authHeader['x-dl-auth-token'] = token;
      url = '/dl-proxy/v1/chat/completions';
      extraHeaders = { 'x-dl-target': 'https://api.deepseek.com', ...authHeader };
    }

    headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`,
      ...extraHeaders,
    };
    body = JSON.stringify({
      model: config.model || 'gpt-4o',
      messages,
      temperature: 0.7,
      max_tokens: 4096,
    });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body,
      signal: controller.signal,
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => 'Unknown error');
      const isAuth = res.status === 401 || res.status === 403;
      throw new ApiError(`API Error ${res.status}: ${errText}`, { isAuthError: isAuth });
    }

    const data = await res.json();

    // Success - reset failure counter
    consecutiveFailures = 0;

    if (config.provider === 'anthropic') {
      return data.content?.[0]?.text ?? '';
    }
    return data.choices?.[0]?.message?.content ?? '';
  } catch (err) {
    if (err instanceof ApiError) throw err;
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new ApiError('请求超时（30秒），请检查网络连接', { isTimeout: true });
    }
    throw new ApiError(err instanceof Error ? err.message : '网络请求失败');
  } finally {
    clearTimeout(timeout);
  }
}

/* ===== JSON Extraction ===== */
function extractJSON(text: string): string {
  // Try to extract JSON from markdown code blocks
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) return codeBlockMatch[1].trim();

  // Try to find JSON object directly
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) return jsonMatch[0];

  return text;
}

/* ===== Stage 2: Clarification ===== */
export async function callStage2(
  config: ApiConfig,
  rawInput: string,
  dialogueHistory?: DialogueMessage[]
): Promise<Stage2Response> {
  const userMsg = dialogueHistory && dialogueHistory.length > 0
    ? rawInput  // follow-up response
    : `用户的倾诉：\n${rawInput}`;

  const responseText = await callLLM(config, STAGE2_SYSTEM, userMsg, dialogueHistory);
  const jsonStr = extractJSON(responseText);

  try {
    const result = JSON.parse(jsonStr) as Stage2Response;
    consecutiveFailures = 0;
    return result;
  } catch {
    // Retry 1: explicit JSON instruction
    try {
      const retryText = await callLLM(
        config,
        STAGE2_SYSTEM + '\n\n重要：请务必只返回合法 JSON，不要包含任何其他文字。',
        userMsg,
        dialogueHistory
      );
      const retryJson = extractJSON(retryText);
      const result = JSON.parse(retryJson) as Stage2Response;
      consecutiveFailures = 0;
      return result;
    } catch {
      // Retry 2 failed
      consecutiveFailures++;
      if (consecutiveFailures >= 2) {
        throw new ApiError('AI 当前状态不佳，返回的数据无法解析。请稍后再试或更换模型。');
      }
      throw new ApiError('AI 返回格式异常，请重试');
    }
  }
}

/* ===== Stage 4: Action Plan ===== */
export async function callStage4(
  config: ApiConfig,
  context: {
    realIssue: string;
    decisionType: string;
    modelSummary: string;
    hardConstraints?: string[];
    softConstraints?: string[];
  }
): Promise<Stage4Response> {
  const hardStr = context.hardConstraints?.join('；') || '无';
  const softStr = context.softConstraints?.join('；') || '无';
  const userMsg = `
用户的真实问题：${context.realIssue}
决策类型：${context.decisionType}
硬约束：${hardStr}
软约束：${softStr}
量化分析结果：
${context.modelSummary}

请基于以上分析结果，给出最终建议和最小破冰行动。`;

  const responseText = await callLLM(config, STAGE4_SYSTEM, userMsg);
  const jsonStr = extractJSON(responseText);

  try {
    const result = JSON.parse(jsonStr) as Stage4Response;
    consecutiveFailures = 0;
    return result;
  } catch {
    try {
      const retryText = await callLLM(
        config,
        STAGE4_SYSTEM + '\n\n重要：请务必只返回合法 JSON，不要包含任何其他文字。',
        userMsg
      );
      const retryJson = extractJSON(retryText);
      const result = JSON.parse(retryJson) as Stage4Response;
      consecutiveFailures = 0;
      return result;
    } catch {
      consecutiveFailures++;
      if (consecutiveFailures >= 2) {
        throw new ApiError('AI 当前状态不佳，返回的数据无法解析。请稍后再试或更换模型。');
      }
      throw new ApiError('AI 返回格式异常，请重试');
    }
  }
}

/* ===== Connection Test ===== */
export async function testConnection(config: ApiConfig): Promise<{ success: boolean; message: string }> {
  try {
    const messages = [{ role: 'user', content: 'Hi, just say "OK" in one word.' }];

    let url: string;
    let headers: Record<string, string>;
    let body: string;

    if (config.provider === 'anthropic') {
      url = 'https://api.anthropic.com/v1/messages';
      headers = {
        'Content-Type': 'application/json',
        'x-api-key': config.apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      };
      body = JSON.stringify({
        model: config.model || 'claude-3-5-sonnet-20241022',
        max_tokens: 10,
        messages,
      });
    } else {
      let extraHeaders: Record<string, string> = {};

      if (config.provider === 'custom' && config.baseUrl) {
        const resolved = resolveCustomEndpoint(config.baseUrl);
        url = resolved.url;
        extraHeaders = resolved.extraHeaders;
      } else {
        url = 'https://api.openai.com/v1/chat/completions';
      }

      headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
        ...extraHeaders,
      };
      body = JSON.stringify({
        model: config.model || 'gpt-4o',
        messages,
        max_tokens: 10,
      });
    }

    const res = await fetch(url, { method: 'POST', headers, body });
    if (!res.ok) {
      const isAuth = res.status === 401 || res.status === 403;
      return {
        success: false,
        message: isAuth
          ? `认证失败 (${res.status})：请检查 API Key 是否正确`
          : `HTTP ${res.status}: ${await res.text()}`,
      };
    }
    return { success: true, message: '连接成功！API Key 有效。' };
  } catch (err) {
    return { success: false, message: `连接失败: ${err instanceof Error ? err.message : '未知错误'}` };
  }
}
