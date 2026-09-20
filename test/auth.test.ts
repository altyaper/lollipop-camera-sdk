import { describe, expect, it, vi } from 'vitest';
import { LollipopClient } from '../src/index.js';

const credentials = {
  applicationId: 'synthetic-app-id',
  restApiKey: 'synthetic-rest-key',
};

describe('authentication', () => {
  it('exchanges username and password for a session token', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(
      new Response(JSON.stringify({ result: { sessionToken: 'synthetic-session-token' } }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );
    const client = new LollipopClient({
      ...credentials,
      fetch,
      installationId: () => 'synthetic-installation-id',
    });

    const result = await client.login({
      username: 'Person@Example.com',
      password: 'synthetic-password',
    });

    expect(result).toEqual({ status: 'authenticated', sessionToken: 'synthetic-session-token' });
    expect(client.sessionToken).toBe('synthetic-session-token');
    expect(fetch).toHaveBeenCalledWith(
      'https://parse-api.lollipop.camera:443/parse/functions/loginV2',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'X-Parse-Application-Id': 'synthetic-app-id',
          'X-Parse-REST-API-Key': 'synthetic-rest-key',
        }),
        body: JSON.stringify({
          username: 'person@example.com',
          password: 'synthetic-password',
          deviceType: 'web',
          installationId: 'synthetic-installation-id',
        }),
      }),
    );
  });

  it('returns an OTP challenge while preserving the installation ID', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(
      new Response(JSON.stringify({ result: { timestamp: 1_789_000_000 } }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );
    const client = new LollipopClient({
      ...credentials,
      fetch,
      installationId: () => 'synthetic-installation-id',
    });

    const result = await client.login({
      username: 'person@example.com',
      password: 'synthetic-password',
    });

    expect(result).toEqual({
      status: 'otp-required',
      username: 'person@example.com',
      timestamp: 1_789_000_000,
      installationId: 'synthetic-installation-id',
    });
  });

  it('completes an OTP challenge and stores the returned session token', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(
      new Response(JSON.stringify({ result: { sessionToken: 'synthetic-otp-session-token' } }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );
    const client = new LollipopClient({ ...credentials, fetch });

    const result = await client.completeOtp({
      username: 'Person@Example.com',
      timestamp: 1_789_000_000,
      otpCode: '123456',
      installationId: 'synthetic-installation-id',
    });

    expect(result).toEqual({
      status: 'authenticated',
      sessionToken: 'synthetic-otp-session-token',
    });
    expect(fetch).toHaveBeenCalledWith(
      'https://parse-api.lollipop.camera:443/parse/functions/userFinishLoginOTP',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          username: 'person@example.com',
          timestamp: 1_789_000_000,
          otpCode: '123456',
          deviceType: 'web',
          installationId: 'synthetic-installation-id',
        }),
      }),
    );
  });

  it('clears an existing session before a new login that requires OTP', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(
      new Response(JSON.stringify({ result: { timestamp: 1_789_000_000 } }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );
    const client = new LollipopClient({
      ...credentials,
      fetch,
      sessionToken: 'stale-synthetic-session-token',
      installationId: () => 'synthetic-installation-id',
    });

    await client.login({ username: 'person@example.com', password: 'synthetic-password' });

    expect(client.sessionToken).toBeUndefined();
  });

  it('can explicitly clear an in-memory session', () => {
    const client = new LollipopClient({
      ...credentials,
      sessionToken: 'synthetic-session-token',
    });

    client.clearSession();

    expect(client.sessionToken).toBeUndefined();
  });

  it('clears an existing session when OTP verification fails', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(
      new Response(JSON.stringify({ code: 101, error: 'Rejected' }), {
        status: 401,
        headers: { 'content-type': 'application/json' },
      }),
    );
    const client = new LollipopClient({
      ...credentials,
      fetch,
      sessionToken: 'stale-synthetic-session-token',
    });

    await expect(
      client.completeOtp({
        username: 'person@example.com',
        timestamp: 1_789_000_000,
        otpCode: '000000',
        installationId: 'synthetic-installation-id',
      }),
    ).rejects.toThrow('Lollipop API request failed with HTTP 401');
    expect(client.sessionToken).toBeUndefined();
  });

  it('clears an existing session when OTP succeeds without returning a token', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(
      new Response(JSON.stringify({ result: {} }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );
    const client = new LollipopClient({
      ...credentials,
      fetch,
      sessionToken: 'stale-synthetic-session-token',
    });

    await expect(
      client.completeOtp({
        username: 'person@example.com',
        timestamp: 1_789_000_000,
        otpCode: '000000',
        installationId: 'synthetic-installation-id',
      }),
    ).rejects.toThrow('did not return a session token');
    expect(client.sessionToken).toBeUndefined();
  });
});
