import { describe, expect, it } from 'vitest';
import { createApp } from '../../../server.js';

describe('local Express app', () => {
  it('mounts Advance without opening a listening port', () => {
    const app = createApp();
    const paths = app.router.stack
      .map((layer) => layer.route?.path)
      .filter(Boolean);
    expect(paths).toContain('/api/analyze-advance');
  });
});
