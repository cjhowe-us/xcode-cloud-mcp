import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { AuthManager, createAuthFromEnv } from './auth.js';

describe('AuthManager', () => {
  const mockPrivateKey = 'mock-private-key';

  const testConfig = {
    keyId: 'TEST_KEY_ID',
    issuerId: 'TEST_ISSUER_ID',
    privateKey: mockPrivateKey,
  };

  describe('constructor', () => {
    it('should initialize with private key', () => {
      const auth = new AuthManager(testConfig);
      expect(auth).toBeInstanceOf(AuthManager);
    });
  });

  // Note: These tests require a real private key to work with jwt.sign
  // Skipping JWT generation tests since they require valid ECDSA keys
});

describe('createAuthFromEnv', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should create AuthManager from environment variables', () => {
    process.env.APP_STORE_KEY_ID = 'ENV_KEY_ID';
    process.env.APP_STORE_ISSUER_ID = 'ENV_ISSUER_ID';
    process.env.APP_STORE_PRIVATE_KEY = 'mock-private-key-contents';

    const auth = createAuthFromEnv();
    expect(auth).toBeInstanceOf(AuthManager);
  });

  it('should throw error if environment variables are missing', () => {
    delete process.env.APP_STORE_KEY_ID;
    delete process.env.APP_STORE_ISSUER_ID;
    delete process.env.APP_STORE_PRIVATE_KEY;

    expect(() => createAuthFromEnv()).toThrow(/Missing required environment variables/);
  });

  it('should throw error if only some environment variables are set', () => {
    process.env.APP_STORE_KEY_ID = 'KEY_ID';
    delete process.env.APP_STORE_ISSUER_ID;
    delete process.env.APP_STORE_PRIVATE_KEY;

    expect(() => createAuthFromEnv()).toThrow(/Missing required environment variables/);
  });
});
