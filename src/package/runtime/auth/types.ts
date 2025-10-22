export interface AuthConfig {
  enabled?: boolean;
  sync?: boolean;
  executionMode?: 'import' | 'node' | 'bin' | 'package-manager';
  
  // Basic Configuration
  appName?: string;
  baseURL?: string;
  basePath?: string;
  secret?: string;
  trustedOrigins?: string[];
  redirectOnError?: string;
  redirectOnSuccess?: string;
  
  // Social Providers
  socialProviders?: {
    [key: string]: {
      enabled?: boolean;
      clientId: string;
      clientSecret: string;
      redirectURI?: string;
      scope?: string[];
    };
  };
  
  // Email & Password
  emailAndPassword?: {
    enabled: boolean;
    requireEmailVerification?: boolean;
    autoSignIn?: boolean;
    minPasswordLength?: number;
    maxPasswordLength?: number;
    sendResetPasswordEmail?: boolean;
    sendVerificationEmail?: boolean;
  };
  
  // Session
  session?: {
    expiresIn?: number;
    updateAge?: number;
    cookieCache?: {
      enabled?: boolean;
      maxAge?: number;
    };
    freshAge?: number;
  };
  
  // Security
  security?: {
    rateLimit?: {
      enabled?: boolean;
      window?: number;
      max?: number;
    };
    csrf?: {
      enabled?: boolean;
    };
  };
  
  // Account
  account?: {
    accountLinking?: {
      enabled?: boolean;
      trustedProviders?: string[];
    };
  };
  
  // User
  user?: {
    additionalFields?: Record<string, any>;
    deleteUser?: {
      enabled?: boolean;
    };
    changeEmail?: {
      enabled?: boolean;
      requireVerification?: boolean;
    };
    changePassword?: {
      enabled?: boolean;
      requireVerification?: boolean;
    };
  };
  
  // Advanced
  advanced?: {
    useSecureCookies?: boolean;
    cookiePrefix?: string;
    generateId?: boolean;
    crossSubDomainCookies?: {
      enabled?: boolean;
    };
    defaultCookieAttributes?: Record<string, any>;
  };
  
  // Migrations
  migrations?: {
    autoMigrate?: boolean;
    strategy?: 'push' | 'migrate';
  };

  // Plugins
  plugins?: {
    username?: boolean;
    anonymous?: boolean;
    phoneNumber?: boolean | object;
    magicLink?: boolean | {
      sendMagicLink?: boolean;
    };
    emailOTP?: boolean | {
      sendVerificationOTP?: boolean;
    };
    genericOAuth?: {
      config: any[];
    };
    oneTap?: boolean | object;
    passkey?: boolean | object;
    apiKey?: boolean;
    admin?: boolean | object;
    organization?: boolean | object;
    bearer?: boolean;
    multiSession?: boolean | object;
    openAPI?: boolean | object;
    jwt?: boolean | object;
    twoFactor?: boolean | object;
    sso?: boolean | object;
  };
}