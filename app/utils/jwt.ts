import { SignJWT, importJWK, JWK, jwtVerify, JWTPayload } from 'jose';

// Retrieve the private key from environment variables
const privateKey = process.env.PRIVATE_JWK;
const publicKey = process.env.PUBLIC_JWK;

if (!privateKey || !publicKey) {
  throw new Error('Private or public key not found in environment variables');
}

// Parse the private and public key JSON strings
let parsedPrivateKey: JWK;
let parsedPublicKey: JWK;
try {
  parsedPrivateKey = JSON.parse(privateKey);
  parsedPublicKey = JSON.parse(publicKey);
} catch (error) {
  throw new Error('Failed to parse keys from environment variables');
}

// Import the JWKs
const keyPromise = importJWK(parsedPrivateKey, 'RS256');
const publicKeyPromise = importJWK(parsedPublicKey, 'RS256');

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

export async function verifyJwt(token: string): Promise<JWTPayload> {
  try {
    const key = await publicKeyPromise;
    const { payload } = await jwtVerify(token, key, {
      algorithms: ['RS256'],
    });

    return payload;
  } catch (error) {
    console.error('Error verifying JWT:', error);
    throw new Error('Failed to verify JWT');
  }
}
