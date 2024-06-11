import { jwtVerify, createRemoteJWKSet } from 'jose';
import { signJwt } from '@/utils/jwt';

const jwksUrl = process.env.JWKS_URL || '';
if (!jwksUrl) {
  throw new Error('JWKS URL not found in environment variables');
}
const JWKS_URI = new URL(jwksUrl);
const JWKS = createRemoteJWKSet(JWKS_URI);

export async function POST(request: Request) {
  const body = await request.json();
  const id_token = body.id_token;

  try {
    const audience = process.env.AUDIENCE || '';
    const issuer = process.env.ISSUER || '';
    if (!audience || !issuer) {
      throw new Error('Audience or issuer not found in environment variables');
    }
    const { payload } = await jwtVerify(id_token, JWKS, {
      issuer,
      audience,
    });

    // Create a response JWT signed with the private key
    const responsePayload = {
      sub: payload.sub,
      name: payload.name,
      admin: payload.admin,
    };

    const signedJwt = await signJwt(responsePayload);

    const dashboardUrl = process.env.DASHBOARD_URL || '';
    if (!dashboardUrl) {
      throw new Error('Dashboard URL not found in environment variables');
    }
    const redirectUrl = new URL(dashboardUrl);
    redirectUrl.searchParams.set('token', signedJwt);

    return Response.redirect(redirectUrl.toString(), 302);
  } catch (error) {
    return Response.json({ message: 'Invalid ID Token' }, { status: 401 });
  }
}
