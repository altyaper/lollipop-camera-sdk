export type Fetch = typeof globalThis.fetch;

export interface LollipopClientOptions {
  applicationId: string;
  restApiKey: string;
  baseUrl?: string;
  fetch?: Fetch;
  installationId?: () => string;
  sessionToken?: string;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface CompleteOtpInput {
  username: string;
  timestamp: number;
  otpCode: string;
  installationId: string;
}

export interface AuthenticatedResult {
  status: 'authenticated';
  sessionToken: string;
}

export interface OtpChallenge {
  status: 'otp-required';
  username: string;
  timestamp: number;
  installationId: string;
}

export type LoginResult = AuthenticatedResult | OtpChallenge;

export interface ParseObject {
  objectId?: string;
  createdAt?: string;
  updatedAt?: string;
  ACL?: unknown;
  [key: string]: unknown;
}

export interface CameraStatus {
  air?: unknown;
  bindSensor?: unknown;
  bindSensorName?: string;
  bindStatus?: unknown;
  firmwareVersion?: string;
  humidity?: number;
  noise?: number;
  playingMusic?: boolean;
  privacyMode?: boolean;
  standby_mode?: boolean;
  status?: unknown;
  temp?: number;
  timeStamp?: number;
  wifiQuality?: number;
  wifiSsid?: string;
  [key: string]: unknown;
}

export interface ParseFile {
  name?: string;
  url?: string;
  __type?: 'File';
  [key: string]: unknown;
}

export interface CameraSetting extends ParseObject {
  camera_id?: string;
}

export interface LollipopCamera extends ParseObject {
  baby?: LollipopBaby;
  camera_status?: CameraStatus;
  cam_setting?: CameraSetting;
  freePlan?: { cameraShare?: unknown; [key: string]: unknown };
  hash_mac?: string;
  internal_live_url?: string;
  preview_file?: ParseFile;
  sceneClassificationPointer?: ParseObject;
  user_id?: unknown;
}

/** Profile shape confirmed by capture; undocumented fields remain unknown. */
export interface LollipopBaby {
  objectId?: string;
  createdAt?: string;
  updatedAt?: string;
  ACL?: unknown;
  [key: string]: unknown;
}

export interface AppVersion extends ParseObject {
  android_lowest_version?: string;
  android_recommend_version?: string;
  ios_itunes_connect_version?: string;
  ios_lowest_version?: string;
  ios_recommend_version?: string;
}

export interface ParseListResponse<T> {
  results: T[];
}
