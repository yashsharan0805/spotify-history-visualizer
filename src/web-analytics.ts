import type { BeforeSendEvent } from '@vercel/analytics';

// This single-page app has one public URL. Never send OAuth URLs or application data.
export function sanitizeWebAnalyticsEvent(event: BeforeSendEvent): BeforeSendEvent | null {
  if (event.type !== 'pageview') return null;
  try {
    const url = new URL(event.url);
    if (!['http:', 'https:'].includes(url.protocol) || url.pathname !== '/' || url.username || url.password) return null;
    return { type: 'pageview', url: `${url.origin}/` };
  } catch {
    return null;
  }
}
