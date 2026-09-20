# Lollipop Camera SDK

Unofficial, typed TypeScript SDK for the Lollipop Camera cloud API.

This library is based on observed Lollipop web/mobile API traffic. It is not affiliated with or supported by Lollipop Technology. The API is undocumented and can change without notice.

## Features

- Username/password login through `loginV2`
- Two-step OTP login through `userFinishLoginOTP`
- Parse session-token management
- Typed camera, camera-status, baby/profile, and app-version models
- Camera listing and lookup
- Generic Parse class queries and cloud-function calls
- Dependency-injected `fetch` for testing and custom transports
- Sanitized API errors that do not include response bodies, tokens, credentials, or record identifiers
- Zero runtime dependencies

## Installation

The package is not published to npm yet. Install it directly from GitHub:

```bash
npm install github:altyaper/lollipop-camera-sdk
```

## Requirements

- Node.js 20 or newer
- Your own Lollipop Parse application ID and REST API key
- A Lollipop account

The SDK intentionally does **not** contain captured application keys, session tokens, camera identifiers, account records, or credentials. Supply the Parse application credentials at runtime from a secure source such as environment variables or a secret manager.

## Quick start

```ts
import { LollipopClient } from '@altyaper/lollipop-camera-sdk';

const applicationId = process.env.LOLLIPOP_APPLICATION_ID;
const restApiKey = process.env.LOLLIPOP_REST_API_KEY;
const username = process.env.LOLLIPOP_USERNAME;
const password = process.env.LOLLIPOP_PASSWORD;

if (!applicationId || !restApiKey || !username || !password) {
  throw new Error('Missing required Lollipop configuration.');
}

const client = new LollipopClient({ applicationId, restApiKey });
const login = await client.login({ username, password });

if (login.status === 'otp-required') {
  // Obtain the OTP without logging or persisting it.
  const otpCode = await readOtpSecurely();
  await client.completeOtp({ ...login, otpCode });
}

const cameras = await client.listCameras();
for (const camera of cameras) {
  console.log(camera.camera_status?.status);
}
```

`readOtpSecurely()` is an application-provided function. In a CLI, use a hidden prompt rather than command-line arguments or shell history.

## Restore an existing session

```ts
const client = new LollipopClient({
  applicationId: process.env.LOLLIPOP_APPLICATION_ID!,
  restApiKey: process.env.LOLLIPOP_REST_API_KEY!,
  sessionToken: await secretStore.get('lollipop-session-token'),
});

const cameras = await client.listCameras();
```

Treat a session token like a password. Do not log it, commit it, or expose it to browser code.

Call `client.clearSession()` when the token is no longer needed. Starting a new `login()` also clears any existing token before the authentication request, preventing a partially completed login from retaining another account's session.

## Additional classes and cloud functions

```ts
const records = await client.findClass<MyRecord>('cam_version', {
  limit: 25,
});

const counts = await client.callFunction<EventCounts>(
  'getEventTypesCount',
  { cameraId: 'your-camera-object-id' },
);
```

Dynamic class/function names are validated before a request is sent.

## API reference

See [docs/API.md](docs/API.md) for constructors, methods, types, authentication flow, and error behavior.

## Captured response coverage

The typed models include fields observed in the supplied captures, including:

- camera object and Parse object metadata
- `camera_status` firmware, Wi-Fi, temperature, humidity, noise, privacy, standby, and sensor fields
- `cam_setting`, preview file, `hash_mac`, and `internal_live_url`
- baby/profile Parse objects
- Android/iOS app-version records

Models retain an `unknown` index signature so newer server fields remain accessible without pretending undocumented fields have stable types.

## Local video limitation

The cloud camera record observed during development returned `internal_live_url` as only the camera's LAN IP. It did **not** return the local RTSP/HLS Digest username or password. This SDK therefore does not claim to produce an authenticated local stream URL.

The current camera firmware can expose local RTSP/HLS endpoints protected by Digest authentication. Those local credentials must be obtained separately and must never be logged or committed.

## Security

- Never embed Lollipop username/password, OTP, Parse credentials, or session tokens in source code.
- Never commit HAR/PCAP captures; they can contain account sessions and device metadata.
- Do not log complete camera records without first redacting identifiers and URLs.
- `LollipopApiError` intentionally excludes server-provided error text because servers may echo sensitive input.
- The SDK performs no automatic logging.

## Development

```bash
npm install
npm run check
npm test
npm run build
npm pack --dry-run
```

## License

MIT
