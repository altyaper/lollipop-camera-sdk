import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { safeErrorMessage, summarizeCamera } from '../examples/sanitize.js';

describe('example output sanitization', () => {
  it('omits every API-provided string and permits only bounded numeric telemetry', () => {
    const summary = summarizeCamera(
      {
        objectId: 'sensitive-camera-id',
        hash_mac: 'sensitive-hash',
        internal_live_url: '192.168.1.20',
        preview_file: { url: 'https://private.example/preview.jpg' },
        camera_status: {
          status: 'https://private.example/sensitive-camera-id',
          firmwareVersion: 'Private Network 192.168.1.20',
          wifiQuality: 82,
          wifiSsid: 'Private Network',
        },
      },
      0,
    );

    expect(summary).toEqual({
      camera: 1,
      statusAvailable: true,
      firmwareAvailable: true,
      wifiQuality: 82,
    });
    expect(JSON.stringify(summary)).not.toMatch(
      /sensitive-camera-id|sensitive-hash|192\.168\.1\.20|private\.example|Private Network/,
    );
  });

  it('replaces invalid Wi-Fi telemetry with null', () => {
    expect(
      summarizeCamera({ camera_status: { wifiQuality: Number.POSITIVE_INFINITY } }, 0).wifiQuality,
    ).toBeNull();
    expect(summarizeCamera({ camera_status: { wifiQuality: 101 } }, 0).wifiQuality).toBeNull();
  });

  it('uses fixed text for untrusted errors', () => {
    const message = safeErrorMessage(
      new Error('request to https://private.example/192.168.1.20 failed for sensitive-camera-id'),
    );

    expect(message).toBe('Example failed. No sensitive details were printed.');
    expect(message).not.toMatch(/private\.example|192\.168\.1\.20|sensitive-camera-id/);
  });

  it('recognizes sanitized API errors across module constructors', () => {
    class OtherLollipopApiError extends Error {
      override name = 'LollipopApiError';
      readonly status = 401;
      readonly parseCode = 101;
    }

    expect(safeErrorMessage(new OtherLollipopApiError('untrusted server text'))).toBe(
      'API request failed (HTTP 401, Parse 101).',
    );
  });

  it('builds the SDK before running from a fresh checkout', async () => {
    const packageJson = JSON.parse(await readFile('package.json', 'utf8')) as {
      scripts: Record<string, string>;
    };

    expect(packageJson.scripts['example:list-resources']).toMatch(/^npm run build --silent && /);
  });

  it('type-checks from source before dist exists', async () => {
    const source = await readFile('examples/list-resources.ts', 'utf8');

    expect(source).toContain("from '../src/index.js'");
    expect(source).not.toContain("from '@altyaper/lollipop-camera-sdk'");
  });
});
