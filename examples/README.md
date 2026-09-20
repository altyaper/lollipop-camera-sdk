# Runnable API example

`list-resources.ts` demonstrates real requests through the SDK:

1. Read the public `app_version` class.
2. Authenticate with username/password.
3. Complete OTP when the account requires it.
4. List cameras and print redacted status summaries.
5. List baby/profile records and print only the count.
6. Query `cam_version` through the generic class API and print only the count.
7. Clear the in-memory session and account credentials.

The repository and runnable example require Node.js 22.13 or newer.

## Setup

```bash
cp examples/.env.example examples/.env.local
chmod 600 examples/.env.local
```

Put your own Parse application ID and REST API key in `.env.local`. The file is ignored by Git.

Do not add the Lollipop username or password unless this is a disposable test environment. When they are absent, the example asks for them locally and masks the password and OTP. The values are assigned only to the example process environment and removed before exit.

## Run

```bash
./examples/run.command
```

`run.command` is a Bash/macOS convenience launcher. The npm command below is the cross-platform entry point. Both build the SDK first, so they work from a fresh clone.

Or, if all required variables are already supplied securely:

```bash
npm run example:list-resources
```

The example deliberately avoids printing account names, profile contents, camera IDs, hashes, addresses, URLs, Wi-Fi names, or session tokens.
