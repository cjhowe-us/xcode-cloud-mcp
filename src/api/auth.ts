import jwt from 'jsonwebtoken';

/**
 * Configuration for App Store Connect API authentication
 */
export interface AuthConfig {
  keyId: string;
  issuerId: string;
  privateKey: string;
}

/**
 * Cached JWT token with expiration
 */
interface CachedToken {
  token: string;
  expiresAt: number;
}

/**
 * Manages JWT token generation and caching for App Store Connect API
 */
export class AuthManager {
  private config: AuthConfig;
  private privateKey: string;
  private cachedToken: CachedToken | null = null;

  constructor(config: AuthConfig) {
    this.config = config;
    this.privateKey = config.privateKey;
  }

  /**
   * Get a valid JWT token, using cached token if still valid
   */
  getToken(): string {
    const now = Math.floor(Date.now() / 1000);

    // Return cached token if it's still valid (with 1 minute buffer)
    if (this.cachedToken && this.cachedToken.expiresAt > now + 60) {
      return this.cachedToken.token;
    }

    // Generate new token
    this.cachedToken = this.generateToken();
    return this.cachedToken.token;
  }

  /**
   * Generate a new JWT token
   */
  private generateToken(): CachedToken {
    const now = Math.floor(Date.now() / 1000);
    const expiresIn = 20 * 60; // 20 minutes
    const expiresAt = now + expiresIn;

    const token = jwt.sign(
      {
        iss: this.config.issuerId,
        iat: now,
        exp: expiresAt,
        aud: 'appstoreconnect-v1',
      },
      this.privateKey,
      {
        algorithm: 'ES256',
        header: {
          alg: 'ES256',
          kid: this.config.keyId,
          typ: 'JWT',
        },
      }
    );

    return { token, expiresAt };
  }

  /**
   * Clear cached token (force regeneration on next getToken call)
   */
  clearCache(): void {
    this.cachedToken = null;
  }
}

/**
 * Create AuthManager from environment variables
 */
export function createAuthFromEnv(): AuthManager {
  const keyId = process.env.APP_STORE_KEY_ID;
  if (!keyId) {
    throw new Error('Missing required environment variables: APP_STORE_KEY_ID');
  }

  const issuerId = process.env.APP_STORE_ISSUER_ID;
  if (!issuerId) {
    throw new Error('Missing required environment variables: APP_STORE_ISSUER_ID');
  }

  const privateKey = process.env.APP_STORE_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error('Missing required environment variables: APP_STORE_PRIVATE_KEY');
  }

  // Remove surrounding quotes from all credentials
  const formattedKeyId = keyId.replace(/^["']|["']$/g, '');
  const formattedIssuerId = issuerId.replace(/^["']|["']$/g, '');
  // Remove surrounding quotes and replace escaped newlines with actual newlines
  const formattedPrivateKey = privateKey.replace(/^["']|["']$/g, '').replace(/\\n/g, '\n');

  return new AuthManager({
    keyId: formattedKeyId,
    issuerId: formattedIssuerId,
    privateKey: formattedPrivateKey,
  });
}
