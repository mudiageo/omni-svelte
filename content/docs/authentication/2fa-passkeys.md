---
title: 2FA & Passkeys
description: Add two-factor authentication and WebAuthn passkeys to your OmniSvelte app.
section: Authentication
order: 5
---

# 2FA & Passkeys

## Two-Factor Authentication (TOTP)

Enable 2FA in config:

```js
omni: {
  auth: {
    plugins: { twoFactor: true }
  }
}
```

### Setup flow

```ts
import { authClient } from '$auth/client';

// 1. Enable 2FA for the current user — returns TOTP secret and QR code URI
const { totpURI, backupCodes } = await authClient.twoFactor.enable({
  password: 'current-password'
});

// 2. Display QR code (use a library like qrcode)
// 3. User scans with authenticator app

// 4. Verify TOTP code to confirm setup
await authClient.twoFactor.verifyTotp({ code: '123456' });
```

### Sign in with 2FA

When 2FA is enabled, sign-in returns a `twoFactorRedirect` status:

```ts
const { data, error } = await authClient.signIn.email({ email, password });

if (data?.twoFactorRedirect) {
  // Prompt for TOTP code
  await authClient.twoFactor.verifyTotp({ code: userEnteredCode });
  // Now fully signed in
}
```

### Backup codes

```ts
// Generate new backup codes
const { backupCodes } = await authClient.twoFactor.generateBackupCodes({
  password: 'current-password'
});

// Sign in with backup code
await authClient.signIn.backupCode({ code: 'XXXXX-XXXXX' });
```

## Passkeys (WebAuthn)

Enable passkeys in config:

```js
omni: {
  auth: {
    plugins: { passkey: true }
  }
}
```

### Register a passkey

```ts
await authClient.passkey.addPasskey({
  name: 'My MacBook'   // optional label
});
```

### Sign in with passkey

```ts
await authClient.signIn.passkey();
```

The browser prompts the user to authenticate with their platform authenticator (Face ID, Touch ID, Windows Hello, etc.).
