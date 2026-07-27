import type { AnalyticsEvent, AnalyticsEventType } from '../types';

const ANALYTICS_KEY = 'decision_lens_analytics';

function getEvents(): AnalyticsEvent[] {
  try {
    const raw = localStorage.getItem(ANALYTICS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function trackEvent(type: AnalyticsEventType, data: Record<string, unknown> = {}) {
  const events = getEvents();
  events.push({ type, timestamp: Date.now(), data });
  try {
    localStorage.setItem(ANALYTICS_KEY, JSON.stringify(events));
  } catch {
    // LocalStorage full - silently fail, analytics is non-critical
  }
}

export function getAnalyticsEvents(): AnalyticsEvent[] {
  return getEvents();
}

export function clearAnalytics() {
  localStorage.removeItem(ANALYTICS_KEY);
}
