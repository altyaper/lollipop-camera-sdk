# API reference

## `new LollipopClient(options)`

Options:

- `applicationId: string` — required Parse application ID; not bundled with the SDK.
- `restApiKey: string` — required Parse REST API key; not bundled with the SDK.
- `sessionToken?: string` — existing Parse session token.
- `baseUrl?: string` — defaults to `https://parse-api.lollipop.camera:443/parse`; custom URLs must use HTTPS and cannot contain userinfo credentials.
- `fetch?: typeof fetch` — custom transport or test double.
- `installationId?: () => string` — ID factory; defaults to `crypto.randomUUID`.

The client keeps the active session token in memory. Read it through `client.sessionToken` only when it must be transferred to a secure secret store.

## Authentication

### `login(credentials)`

```ts
login({ username: string, password: string }): Promise<LoginResult>
```

The username is normalized to lowercase. The request identifies itself as the web client and uses one installation ID.

Possible results:

```ts
type LoginResult =
  | { status: 'authenticated'; sessionToken: string }
  | {
      status: 'otp-required';
      username: string;
      timestamp: number;
      installationId: string;
    };
```

On immediate authentication, the session token is stored on the client.
Starting a new login clears any existing session first, including when the new login requires OTP or fails.

### `completeOtp(input)`

```ts
completeOtp({
  username: string;
  timestamp: number;
  otpCode: string;
  installationId: string;
}): Promise<AuthenticatedResult>
```

Pass the fields from the `otp-required` result plus the user's OTP. OTP verification clears any existing session before sending the request; on success, the returned token becomes the client's active session.

### `clearSession()`

Immediately removes the current in-memory session token.

## Captured resources

### `listCameras()`

Returns `Promise<LollipopCamera[]>`. It queries the `camera` Parse class with `limit=100` and `include=cam_setting`, matching the observed web flow.

### `getCamera(objectId)`

Returns one `LollipopCamera` from `classes/camera/:objectId`. The object ID is URL-encoded.

### `listBabies()`

Returns `Promise<LollipopBaby[]>` from the observed `baby` Parse class.

### `listAppVersions()`

Returns `Promise<AppVersion[]>` from the observed public `app_version` Parse class. This request never sends the client's session token.

## Generic Parse access

### `findClass<T>(className, query?)`

```ts
findClass<T>(
  className: string,
  query?: Record<string, string | number>,
): Promise<T[]>
```

Performs a Parse class query. The class name must match `^[A-Za-z_][A-Za-z0-9_]*$`. Query values are encoded with `URLSearchParams`.

### `callFunction<T>(name, payload?)`

```ts
callFunction<T>(
  name: string,
  payload?: Record<string, unknown>,
): Promise<T>
```

Calls a Parse cloud function and returns its `result`. The function name uses the same strict identifier validation as class names. This supports observed operations such as `getEventTypesCount` without inventing an undocumented payload type.

## Models

### `LollipopCamera`

Known captured fields include:

- Parse metadata: `objectId`, `createdAt`, `updatedAt`, `ACL`
- `baby`
- `camera_status`
- `cam_setting`
- `freePlan.cameraShare`
- `hash_mac`
- `internal_live_url`
- `preview_file`
- `sceneClassificationPointer`
- `user_id`

### `LollipopBaby`

The capture established a baby/profile Parse object and its `objectId`, but the retained evidence was insufficient to assign stable semantics to additional profile fields. The interface therefore types standard captured Parse metadata explicitly and keeps undocumented fields as `unknown`.

### `CameraStatus`

Known captured fields include:

- `air`
- `bindSensor`
- `bindSensorName`
- `bindStatus`
- `firmwareVersion`
- `humidity`
- `noise`
- `playingMusic`
- `privacyMode`
- `standby_mode`
- `status`
- `temp`
- `timeStamp`
- `wifiQuality`
- `wifiSsid`

Fields whose captured semantics or exact value types were not established remain `unknown` rather than being guessed.

### `AppVersion`

Known fields:

- `android_lowest_version`
- `android_recommend_version`
- `ios_itunes_connect_version`
- `ios_lowest_version`
- `ios_recommend_version`

## Errors

Non-successful HTTP responses throw `LollipopApiError`:

```ts
try {
  await client.listCameras();
} catch (error) {
  if (error instanceof LollipopApiError) {
    console.error(error.status, error.parseCode);
  }
}
```

Properties:

- `status` — HTTP status.
- `parseCode` — numeric Parse error code when present.

The exception message never includes the response body. This is deliberate: authentication services can echo usernames, tokens, credentials, or record metadata in error text.

## API stability

Lollipop's API is undocumented. Treat all methods and response fields as best-effort wrappers around behavior observed during development. Pin SDK versions and test integrations against your own account before production use.
