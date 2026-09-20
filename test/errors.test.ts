import { describe, expect, it, vi } from 'vitest';
import { LollipopApiError, LollipopClient } from '../src/index.js';

const credentials = {
  applicationId: 'synthetic-app-id',
  restApiKey: 'synthetic-rest-key',
};

describe('safe failures', () => {
  it('reports Parse failures without exposing response text or secrets', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({ code: 101, error: 'Rejected synthetic-session-token and synthetic-password' }),
        { status: 401, headers: { 'content-type': 'application/json' } },
      ),
    );
    const client = new LollipopClient({
      ...credentials,
      fetch,
      sessionToken: 'synthetic-session-token',
    });

    const error = await client.listCameras().catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(LollipopApiError);
    expect(error).toMatchObject({ status: 401, parseCode: 101 });
    expect(String(error)).toBe('LollipopApiError: Lollipop API request failed with HTTP 401 (Parse code 101).');
    expect(String(error)).not.toContain('synthetic-session-token');
    expect(String(error)).not.toContain('synthetic-password');
  });

  it('rejects unsafe dynamic Parse resource names before sending a request', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>();
    const client = new LollipopClient({ ...credentials, fetch });

    await expect(client.findClass('../users')).rejects.toThrow('Invalid Parse class name.');
    await expect(client.callFunction('../login')).rejects.toThrow('Invalid Parse function name.');
    expect(fetch).not.toHaveBeenCalled();
  });

  it('rejects an insecure API base URL before credentials can be sent', () => {
    expect(
      () => new LollipopClient({ ...credentials, baseUrl: 'http://example.com/parse' }),
    ).toThrow('Lollipop API baseUrl must use HTTPS.');
  });
});
