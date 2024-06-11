import { SignJWT, importJWK, JWK, JWTPayload } from 'jose';

// Retrieve the private key from environment variables
const privateKey = process.env.PRIVATE_KEY;

if (!privateKey) {
  throw new Error('Private key not found in environment variables');
}

// Parse the private key JSON string
const parsedPrivateKey: JWK = JSON.parse(privateKey);

// Import the JWK
const keyPromise = importJWK(parsedPrivateKey, 'RS256');

export async function signJwt(payload: JWTPayload): Promise<string> {
  const key = await keyPromise;

  const jwt = await new SignJWT(payload)
    .setProtectedHeader({ alg: 'RS256', kid: parsedPrivateKey.kid })
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(key);

  return jwt;
}
