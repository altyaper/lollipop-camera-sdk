import { input, password } from '@inquirer/prompts';
import { LollipopClient } from '../src/index.js';
import { safeErrorMessage, summarizeCamera } from './sanitize.js';

function requiredEnvironment(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is required. Copy examples/.env.example to examples/.env.local.`);
  }
  return value;
}

async function accountCredentials(): Promise<{ username: string; password: string }> {
  const username =
    process.env.LOLLIPOP_USERNAME?.trim() ??
    (await input({ message: 'Lollipop account email:', required: true })).trim();
  const accountPassword =
    process.env.LOLLIPOP_PASSWORD ??
    (await password({ message: 'Lollipop account password:', mask: '*', validate: Boolean }));

  // Keep credentials available only to this process and its children.
  process.env.LOLLIPOP_USERNAME = username;
  process.env.LOLLIPOP_PASSWORD = accountPassword;
  return { username, password: accountPassword };
}

async function main(): Promise<void> {
  const client = new LollipopClient({
    applicationId: requiredEnvironment('LOLLIPOP_APPLICATION_ID'),
    restApiKey: requiredEnvironment('LOLLIPOP_REST_API_KEY'),
  });

  try {
    const versions = await client.listAppVersions();
    console.log(`Public app-version records: ${versions.length}`);

    const credentials = await accountCredentials();
    const login = await client.login(credentials);
    if (login.status === 'otp-required') {
      const otpCode = await password({
        message: 'Lollipop verification code:',
        mask: '*',
        validate: Boolean,
      });
      await client.completeOtp({ ...login, otpCode });
    }

    const [cameras, profiles, firmwareRecords] = await Promise.all([
      client.listCameras(),
      client.listBabies(),
      client.findClass<Record<string, unknown>>('cam_version', { limit: 100 }),
    ]);

    console.log(`Authenticated camera records: ${cameras.length}`);
    for (const [index, camera] of cameras.entries()) console.log(summarizeCamera(camera, index));
    console.log(`Profile records: ${profiles.length}`);
    console.log(`Firmware/version records: ${firmwareRecords.length}`);
  } finally {
    client.clearSession();
    delete process.env.LOLLIPOP_USERNAME;
    delete process.env.LOLLIPOP_PASSWORD;
  }
}

main().catch((error: unknown) => {
  console.error(safeErrorMessage(error));
  process.exitCode = 1;
});
