import { jwtVerify, createRemoteJWKSet } from 'jose';
import { signJwt } from '@/app/utils/jwt';

const jwksUrl = process.env.JWKS_URL || '';
if (!jwksUrl) {
  throw new Error('JWKS URL not found in environment variables');
}
const JWKS_URI = new URL(jwksUrl);
const JWKS = createRemoteJWKSet(JWKS_URI);

export async function GET(request: Request) {
  const url = new URL(request.url);
  const iss = url.searchParams.get('iss');
  const login_hint = url.searchParams.get('login_hint');
  const target_link_uri = url.searchParams.get('target_link_uri');
  const lti_message_hint = url.searchParams.get('lti_message_hint');

  if (!iss || !login_hint || !target_link_uri || !lti_message_hint) {
    return new Response(JSON.stringify({ message: 'Missing required query parameters' }), {
      status: 400,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  try {
    const audience = process.env.AUDIENCE || '';
    const issuer = process.env.ISSUER || '';
    if (!audience || !issuer) {
      throw new Error('Audience or issuer not found in environment variables');
    }

    // Verifying the lti_message_hint token
    const { payload } = await jwtVerify(lti_message_hint, JWKS, { issuer, audience });

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
    return new Response(JSON.stringify({ message: error }), {
      status: 401,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
}
