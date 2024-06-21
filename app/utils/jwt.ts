import { SignJWT, importJWK, JWK, JWTPayload } from 'jose';

// Retrieve the private key from environment variables
const privateKey = process.env.PRIVATE_JWK;

if (!privateKey) {
  throw new Error('Private key not found in environment variables');
}

// Parse the private key JSON string
let parsedPrivateKey: JWK;
try {
  parsedPrivateKey = JSON.parse(privateKey);
} catch (error) {
  throw new Error('Failed to parse private key from environment variables');
}

// Import the JWK
const keyPromise = importJWK(parsedPrivateKey, 'RS256');

export async function signJwt(payload: JWTPayload): Promise<string> {
  try {
    const key = await keyPromise;

    const jwt = await new SignJWT(payload)
      .setProtectedHeader({ alg: 'RS256', kid: parsedPrivateKey.kid })
      .setIssuedAt()
      .setExpirationTime('1h')
      .sign(key);

    return jwt;
  } catch (error) {
    console.error('Error signing JWT:', error);
    throw new Error('Failed to sign JWT');
  }
}
