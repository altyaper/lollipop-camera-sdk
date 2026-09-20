import { randomUUID } from 'node:crypto';
import { LollipopApiError } from './errors.js';
import type {
  AppVersion,
  AuthenticatedResult,
  CompleteOtpInput,
  Fetch,
  LoginCredentials,
  LoginResult,
  LollipopBaby,
  LollipopCamera,
  LollipopClientOptions,
  ParseListResponse,
} from './types.js';

const DEFAULT_BASE_URL = 'https://parse-api.lollipop.camera:443/parse';

export class LollipopClient {
  readonly #applicationId: string;
  readonly #restApiKey: string;
  readonly #baseUrl: string;
  readonly #fetch: Fetch;
  readonly #installationId: () => string;
  #sessionToken: string | undefined;

  constructor(options: LollipopClientOptions) {
    this.#applicationId = options.applicationId;
    this.#restApiKey = options.restApiKey;
    const rawBaseUrl = options.baseUrl ?? DEFAULT_BASE_URL;
    const baseUrl = new URL(rawBaseUrl);
    if (baseUrl.protocol !== 'https:') {
      throw new TypeError('Lollipop API baseUrl must use HTTPS.');
    }
    if (baseUrl.username !== '' || baseUrl.password !== '') {
      throw new TypeError('Lollipop API baseUrl must not contain credentials.');
    }
    this.#baseUrl = rawBaseUrl.replace(/\/$/, '');
    this.#fetch = options.fetch ?? globalThis.fetch;
    this.#installationId = options.installationId ?? randomUUID;
    this.#sessionToken = options.sessionToken;
  }

  get sessionToken(): string | undefined {
    return this.#sessionToken;
  }

  clearSession(): void {
    this.#sessionToken = undefined;
  }

  async listCameras(): Promise<LollipopCamera[]> {
    return this.findClass<LollipopCamera>('camera', { limit: 100, include: 'cam_setting' });
  }

  async getCamera(objectId: string): Promise<LollipopCamera> {
    return this.#request<LollipopCamera>(
      `/classes/camera/${encodeURIComponent(objectId)}`,
      { method: 'GET' },
      true,
    );
  }

  async listBabies(): Promise<LollipopBaby[]> {
    return this.findClass<LollipopBaby>('baby', { limit: 100 });
  }

  async listAppVersions(): Promise<AppVersion[]> {
    const body = await this.#request<ParseListResponse<AppVersion>>(
      '/classes/app_version',
      { method: 'GET' },
      false,
    );
    return body.results;
  }

  async findClass<T>(className: string, query: Record<string, string | number> = {}): Promise<T[]> {
    this.#assertResourceName(className, 'class');
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) search.set(key, String(value));
    const suffix = search.size > 0 ? `?${search.toString()}` : '';
    const body = await this.#request<ParseListResponse<T>>(`/classes/${className}${suffix}`, {
      method: 'GET',
    }, true);
    return body.results;
  }

  async callFunction<T>(name: string, payload: Record<string, unknown> = {}): Promise<T> {
    this.#assertResourceName(name, 'function');
    const body = await this.#request<{ result: T }>(
      `/functions/${name}`,
      { method: 'POST', body: JSON.stringify(payload) },
      true,
    );
    return body.result;
  }

  #assertResourceName(name: string, kind: 'class' | 'function'): void {
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) {
      throw new TypeError(`Invalid Parse ${kind} name.`);
    }
  }

  async #request<T>(path: string, init: RequestInit, authenticated = false): Promise<T> {
    const response = await this.#fetch(`${this.#baseUrl}${path}`, {
      ...init,
      headers: { ...this.#headers(authenticated), ...init.headers },
    });
    let body: unknown;
    try {
      body = await response.json();
    } catch {
      body = undefined;
    }
    if (!response.ok) {
      const parseCode =
        typeof body === 'object' && body !== null && typeof (body as { code?: unknown }).code === 'number'
          ? (body as { code: number }).code
          : undefined;
      throw new LollipopApiError(response.status, parseCode);
    }
    return body as T;
  }

  #headers(authenticated = false): Record<string, string> {
    const headers: Record<string, string> = {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'X-Parse-Application-Id': this.#applicationId,
      'X-Parse-REST-API-Key': this.#restApiKey,
    };
    if (authenticated && this.#sessionToken !== undefined) {
      headers['X-Parse-Session-Token'] = this.#sessionToken;
    }
    return headers;
  }

  async login(credentials: LoginCredentials): Promise<LoginResult> {
    this.clearSession();
    const username = credentials.username.toLowerCase();
    const installationId = this.#installationId();
    const body = await this.#request<{
      result?: { sessionToken?: unknown; timestamp?: unknown };
    }>('/functions/loginV2', {
      method: 'POST',
      body: JSON.stringify({
        username,
        password: credentials.password,
        deviceType: 'web',
        installationId,
      }),
    });
    const token = body.result?.sessionToken;
    if (typeof token === 'string' && token.length > 0) {
      this.#sessionToken = token;
      const result: AuthenticatedResult = { status: 'authenticated', sessionToken: token };
      return result;
    }
    const timestamp = body.result?.timestamp;
    if (typeof timestamp === 'number') {
      return { status: 'otp-required', username, timestamp, installationId };
    }
    throw new Error('Lollipop login did not return a session or OTP challenge.');
  }

  async completeOtp(input: CompleteOtpInput): Promise<AuthenticatedResult> {
    this.clearSession();
    const body = await this.#request<{ result?: { sessionToken?: unknown } }>(
      '/functions/userFinishLoginOTP',
      {
      method: 'POST',
      body: JSON.stringify({
        username: input.username.toLowerCase(),
        timestamp: input.timestamp,
        otpCode: input.otpCode,
        deviceType: 'web',
        installationId: input.installationId,
      }),
      },
    );
    const token = body.result?.sessionToken;
    if (typeof token !== 'string' || token.length === 0) {
      throw new Error('Lollipop OTP verification did not return a session token.');
    }
    this.#sessionToken = token;
    return { status: 'authenticated', sessionToken: token };
  }
}
