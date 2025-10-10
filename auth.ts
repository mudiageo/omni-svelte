import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "./database.ts";
import {
    username,
    anonymous,
    phoneNumber,
    magicLink,
    emailOTP,
    genericOAuth,
    oneTap,
    apiKey,
    admin,
    organization,
    bearer,
    multiSession,
    openAPI,
    jwt,
    twoFactor,
} from "better-auth/plugins";
import { passkey } from "better-auth/plugins/passkey";
import { sso } from "better-auth/plugins/sso";
import { betterAuth } from "better-auth";

export const auth = betterAuth({
    database: drizzleAdapter(db, {
        provider: "pg",
    }),
    appName: "omni-svelte",
    plugins: [
        twoFactor(),
        jwt(),
        openAPI(),
        multiSession(),
        bearer(),
        sso(),
        organization(),
        admin(),
        apiKey(),
        oneTap(),
        genericOAuth({
            config: [],
        }),
        passkey(),
        emailOTP({
            async sendVerificationOTP({ email, otp, type }, request) {
                // Send email with OTP
            },
        }),
        magicLink({
            sendMagicLink({ email, token, url }, request) {
                // Send email with magic link
            },
        }),
        phoneNumber(),
        anonymous(),
        username(),
    ],
});
