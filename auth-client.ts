import { createAuthClient } from "better-auth/client";
import type { auth } from "./auth.ts";
import {
    inferAdditionalFields,
    usernameClient,
    anonymousClient,
    phoneNumberClient,
    magicLinkClient,
    emailOTPClient,
    passkeyClient,
    genericOAuthClient,
    oneTapClient,
    apiKeyClient,
    adminClient,
    organizationClient,
    ssoClient,
    multiSessionClient,
    twoFactorClient,
} from "better-auth/client/plugins";

export const authClient = createAuthClient({
    baseURL: "http://localhost:3000",
    plugins: [
        inferAdditionalFields<typeof auth>(),
        usernameClient(),
        anonymousClient(),
        phoneNumberClient(),
        magicLinkClient(),
        emailOTPClient(),
        passkeyClient(),
        genericOAuthClient(),
        oneTapClient({ clientId: "MY_CLIENT_ID" }),
        apiKeyClient(),
        adminClient(),
        organizationClient(),
        ssoClient(),
        multiSessionClient(),
        twoFactorClient(),
    ],
});
