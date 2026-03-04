/**
 * Omni Mail - Email sending and templating
 * 
 * Provides a unified API for sending emails with support for
 * multiple providers (SMTP, Resend, SendGrid, etc.)
 */

// Types
export interface MailConfig {
    provider: 'smtp' | 'resend' | 'sendgrid' | 'postmark' | 'ses' | 'console';
    from?: string;
    replyTo?: string;
    smtp?: {
        host: string;
        port: number;
        secure?: boolean;
        auth?: {
            user: string;
            pass: string;
        };
    };
    apiKey?: string;
}

export interface MailMessage {
    to: string | string[];
    subject: string;
    html?: string;
    text?: string;
    from?: string;
    replyTo?: string;
    cc?: string | string[];
    bcc?: string | string[];
    attachments?: MailAttachment[];
}

export interface MailAttachment {
    filename: string;
    content: string | Buffer;
    contentType?: string;
}

export interface SendResult {
    success: boolean;
    messageId?: string;
    error?: string;
}

// Default config - logs to console in development
let mailConfig: MailConfig = {
    provider: 'console',
};

/**
 * Configure the mail system
 */
export function configureMail(config: MailConfig): void {
    mailConfig = { ...mailConfig, ...config };
}

/**
 * Send an email
 */
export async function sendMail(message: MailMessage): Promise<SendResult> {
    const from = message.from || mailConfig.from || 'noreply@localhost';

    if (mailConfig.provider === 'console') {
        console.log('📧 [Mail - Console Provider]');
        console.log(`   From: ${from}`);
        console.log(`   To: ${Array.isArray(message.to) ? message.to.join(', ') : message.to}`);
        console.log(`   Subject: ${message.subject}`);
        if (message.text) console.log(`   Body: ${message.text.substring(0, 200)}...`);
        return { success: true, messageId: `console-${Date.now()}` };
    }

    // TODO: Implement actual providers (SMTP, Resend, SendGrid, etc.)
    console.warn(`📧 [Mail] Provider '${mailConfig.provider}' not yet implemented. Email not sent.`);
    return { success: false, error: `Provider '${mailConfig.provider}' not implemented` };
}

// ─── Auth Email Helpers ──────────────────────────────────────────────────────
// These are called by the auth generator's generated config code

/**
 * Send password reset email
 */
export async function sendResetPasswordEmail(
    user: { email: string; name?: string },
    url: string,
    _request?: Request
): Promise<void> {
    await sendMail({
        to: user.email,
        subject: 'Reset Your Password',
        html: `
      <h2>Password Reset</h2>
      <p>Hi${user.name ? ` ${user.name}` : ''},</p>
      <p>You requested a password reset. Click the link below to reset your password:</p>
      <p><a href="${url}">Reset Password</a></p>
      <p>If you didn't request this, you can safely ignore this email.</p>
    `,
        text: `Reset your password: ${url}`,
    });
}

/**
 * Send email verification email
 */
export async function sendVerificationEmail(
    user: { email: string; name?: string },
    url: string,
    _request?: Request
): Promise<void> {
    await sendMail({
        to: user.email,
        subject: 'Verify Your Email',
        html: `
      <h2>Email Verification</h2>
      <p>Hi${user.name ? ` ${user.name}` : ''},</p>
      <p>Please verify your email address by clicking the link below:</p>
      <p><a href="${url}">Verify Email</a></p>
    `,
        text: `Verify your email: ${url}`,
    });
}

/**
 * Send magic link email
 */
export async function sendMagicLink(
    { email, token, url }: { email: string; token: string; url: string },
    _request?: Request
): Promise<void> {
    await sendMail({
        to: email,
        subject: 'Your Login Link',
        html: `
      <h2>Magic Link Login</h2>
      <p>Click the link below to log in:</p>
      <p><a href="${url}">Log In</a></p>
      <p>This link will expire shortly. If you didn't request this, you can safely ignore this email.</p>
    `,
        text: `Log in with this link: ${url}`,
    });
}

/**
 * Send OTP verification email
 */
export async function sendVerificationOTP(
    { email, otp, type }: { email: string; otp: string; type: string },
    _request?: Request
): Promise<void> {
    await sendMail({
        to: email,
        subject: `Your Verification Code: ${otp}`,
        html: `
      <h2>Verification Code</h2>
      <p>Your ${type} verification code is:</p>
      <p style="font-size: 32px; font-weight: bold; letter-spacing: 4px;">${otp}</p>
      <p>This code will expire shortly.</p>
    `,
        text: `Your ${type} verification code is: ${otp}`,
    });
}
