import { describe, expect, it, vi } from 'vitest';
import { LollipopClient } from '../src/index.js';

const credentials = {
  applicationId: 'synthetic-app-id',
  restApiKey: 'synthetic-rest-key',
};

function jsonResponse(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

describe('captured Lollipop API resources', () => {
  it('lists typed camera records with the observed default include', async () => {
    const camera = {
      objectId: 'synthetic-camera-id',
      internal_live_url: '192.0.2.10',
      hash_mac: '0000000000000000000000000000000000000000',
      camera_status: {
        status: 'online',
        firmwareVersion: 'synthetic-firmware',
        wifiQuality: 82,
        wifiSsid: 'Synthetic Wi-Fi',
      },
      preview_file: { url: 'https://example.invalid/preview.jpg' },
      cam_setting: { objectId: 'synthetic-setting-id', camera_id: 'synthetic-camera-id' },
    };
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(jsonResponse({ results: [camera] }));
    const client = new LollipopClient({
      ...credentials,
      fetch,
      sessionToken: 'synthetic-session-token',
    });

    const result = await client.listCameras();

    expect(result).toEqual([camera]);
    expect(fetch).toHaveBeenCalledWith(
      'https://parse-api.lollipop.camera:443/parse/classes/camera?limit=100&include=cam_setting',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          'X-Parse-Session-Token': 'synthetic-session-token',
        }),
      }),
    );
  });

  it('lists baby/profile records', async () => {
    const baby = { objectId: 'synthetic-baby-id', name: 'Synthetic Profile' };
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(jsonResponse({ results: [baby] }));
    const client = new LollipopClient({ ...credentials, fetch, sessionToken: 'synthetic-session-token' });

    await expect(client.listBabies()).resolves.toEqual([baby]);
    expect(fetch).toHaveBeenCalledWith(
      'https://parse-api.lollipop.camera:443/parse/classes/baby?limit=100',
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('lists app-version records without requiring a user session', async () => {
    const version = {
      objectId: 'synthetic-version-id',
      android_lowest_version: '1.0.0',
      android_recommend_version: '1.1.0',
      ios_lowest_version: '1.0.0',
      ios_recommend_version: '1.1.0',
      ios_itunes_connect_version: '1.1.0',
    };
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(jsonResponse({ results: [version] }));
    const client = new LollipopClient({
      ...credentials,
      fetch,
      sessionToken: 'synthetic-session-token',
    });

    await expect(client.listAppVersions()).resolves.toEqual([version]);
    const [, init] = fetch.mock.calls[0]!;
    expect(fetch.mock.calls[0]![0]).toBe(
      'https://parse-api.lollipop.camera:443/parse/classes/app_version',
    );
    expect((init?.headers as Record<string, string>)['X-Parse-Session-Token']).toBeUndefined();
  });

  it('calls additional Parse cloud functions with the active session', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(
      jsonResponse({ result: { syntheticCount: 3 } }),
    );
    const client = new LollipopClient({ ...credentials, fetch, sessionToken: 'synthetic-session-token' });

    const result = await client.callFunction<{ syntheticCount: number }>(
      'getEventTypesCount',
      { cameraId: 'synthetic-camera-id' },
    );

    expect(result).toEqual({ syntheticCount: 3 });
    expect(fetch).toHaveBeenCalledWith(
      'https://parse-api.lollipop.camera:443/parse/functions/getEventTypesCount',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ cameraId: 'synthetic-camera-id' }),
        headers: expect.objectContaining({ 'X-Parse-Session-Token': 'synthetic-session-token' }),
      }),
    );
  });

  it('gets one camera record by Parse object ID', async () => {
    const camera = { objectId: 'synthetic-camera-id', internal_live_url: '192.0.2.10' };
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(jsonResponse(camera));
    const client = new LollipopClient({ ...credentials, fetch, sessionToken: 'synthetic-session-token' });

    await expect(client.getCamera('synthetic-camera-id')).resolves.toEqual(camera);
    expect(fetch.mock.calls[0]![0]).toBe(
      'https://parse-api.lollipop.camera:443/parse/classes/camera/synthetic-camera-id',
    );
  });
});
