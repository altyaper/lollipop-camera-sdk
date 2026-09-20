import type { LollipopCamera } from '../src/index.js';

export interface SafeCameraSummary {
  camera: number;
  statusAvailable: boolean;
  firmwareAvailable: boolean;
  wifiQuality: number | null;
}

export function summarizeCamera(camera: LollipopCamera, index: number): SafeCameraSummary {
  const wifiQuality = camera.camera_status?.wifiQuality;
  return {
    camera: index + 1,
    statusAvailable: camera.camera_status?.status !== undefined,
    firmwareAvailable: camera.camera_status?.firmwareVersion !== undefined,
    wifiQuality:
      typeof wifiQuality === 'number' &&
      Number.isFinite(wifiQuality) &&
      wifiQuality >= 0 &&
      wifiQuality <= 100
        ? wifiQuality
        : null,
  };
}

interface SafeApiErrorShape {
  name: 'LollipopApiError';
  status: number;
  parseCode?: number;
}

function isSafeApiError(error: unknown): error is SafeApiErrorShape {
  if (typeof error !== 'object' || error === null) return false;
  const candidate = error as { name?: unknown; status?: unknown; parseCode?: unknown };
  return (
    candidate.name === 'LollipopApiError' &&
    typeof candidate.status === 'number' &&
    Number.isInteger(candidate.status) &&
    candidate.status >= 100 &&
    candidate.status <= 599 &&
    (candidate.parseCode === undefined ||
      (typeof candidate.parseCode === 'number' &&
        Number.isInteger(candidate.parseCode) &&
        Math.abs(candidate.parseCode) <= 1_000_000_000))
  );
}

export function safeErrorMessage(error: unknown): string {
  if (isSafeApiError(error)) {
    const parse = error.parseCode === undefined ? '' : `, Parse ${error.parseCode}`;
    return `API request failed (HTTP ${error.status}${parse}).`;
  }
  return 'Example failed. No sensitive details were printed.';
}
