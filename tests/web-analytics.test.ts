import test from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeWebAnalyticsEvent } from '../src/web-analytics';

test('web analytics strips query strings and fragments from the only public page', () => {
  assert.deepEqual(sanitizeWebAnalyticsEvent({type:'pageview', url:'https://example.test/?code=sample-code&state=sample-state#private-selection'}),
    {type:'pageview', url:'https://example.test/'});
});

test('web analytics drops OAuth callbacks, arbitrary paths and custom events', () => {
  for (const url of ['https://example.test/auth/spotify/callback?code=sample-code', 'https://example.test/spotify/user-data']) {
    assert.equal(sanitizeWebAnalyticsEvent({type:'pageview', url}), null);
  }
  assert.equal(sanitizeWebAnalyticsEvent({type:'event', url:'https://example.test/'}), null);
});

test('web analytics rejects invalid URLs and embedded credentials', () => {
  const credentialled = new URL('https://example.test/');
  credentialled.username = 'sample';
  credentialled.password = 'example';
  for (const url of ['invalid', 'data:text/plain,sample', 'ftp://example.test/', credentialled.href]) {
    assert.equal(sanitizeWebAnalyticsEvent({type:'pageview', url}), null);
  }
});
