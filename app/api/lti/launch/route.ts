import { jwtVerify, createRemoteJWKSet } from 'jose';
import { signJwt } from '@/app/utils/jwt';
import { randomBytes } from 'crypto';
import { redirect } from 'next/dist/server/api-utils';

const jwksUrl = process.env.JWKS_URL || '';
if (!jwksUrl) {
  throw new Error('JWKS URL not found in environment variables');
}
const JWKS_URI = new URL(jwksUrl);
const JWKS = createRemoteJWKSet(JWKS_URI);

export async function GET(request: Request): Promise<Response> {
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

  const state = randomBytes(16).toString('hex');
  const nonce = randomBytes(16).toString('hex');

  // Save state and nonce in cookies
  const headers = new Headers();
  headers.append('Set-Cookie', `lti_state=${state}; Path=/; HttpOnly; Secure`);
  headers.append('Set-Cookie', `lti_nonce=${nonce}; Path=/; HttpOnly; Secure`);

  const clientId = process.env.CLIENT_ID;
  const authUrl = `${iss}/auth`;
  if (!clientId) {
    return new Response(JSON.stringify({ message: 'Client ID not found in environment variables' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  const authRedirectUrl = new URL(authUrl);
  authRedirectUrl.searchParams.set('scope', 'openid');
  authRedirectUrl.searchParams.set('response_type', 'id_token');
  authRedirectUrl.searchParams.set('client_id', clientId);
  authRedirectUrl.searchParams.set('redirect_uri', target_link_uri);
  authRedirectUrl.searchParams.set('login_hint', login_hint);
  authRedirectUrl.searchParams.set('state', state);
  authRedirectUrl.searchParams.set('response_mode', 'form_post');
  authRedirectUrl.searchParams.set('nonce', nonce);
  authRedirectUrl.searchParams.set('prompt', 'none');

  return new Response(null, {
    status: 302,
    headers: {
      ...headers,
      'Location': authRedirectUrl.toString(),
    },
  });
}

export async function POST(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const state = url.searchParams.get('state');
  const id_token = url.searchParams.get('id_token');
  const redirectUri = process.env.REDIRECT_URL;

  if (!redirectUri) {
    throw new Error('Redirect URL not found in environment variables');
  }

  if (!state || !id_token) {
    return new Response(JSON.stringify({ message: 'Missing required parameters' }), {
      status: 400,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  const cookies = request.headers.get('cookie');
  const savedState = cookies?.split('; ').find(row => row.startsWith('lti_state='))?.split('=')[1];
  const savedNonce = cookies?.split('; ').find(row => row.startsWith('lti_nonce='))?.split('=')[1];

  if (state !== savedState) {
    return new Response(JSON.stringify({ message: 'Invalid state' }), {
      status: 401,
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

    const { payload } = await jwtVerify(id_token, JWKS, {
      issuer,
      audience,
    });

    // Clear the state and nonce cookies
    const headers = new Headers();
    headers.append('Set-Cookie', 'lti_state=; Path=/; Max-Age=0');
    headers.append('Set-Cookie', 'lti_nonce=; Path=/; Max-Age=0');

    // Create a response JWT signed with the private key
    const responsePayload = {
      sub: payload.sub,
      name: payload.name,
      admin: payload.admin,
    };

    const signedJwt = await signJwt(responsePayload);

    const redirectUrl = new URL(redirectUri);
    redirectUrl.searchParams.set('token', signedJwt);

    headers.append('Location', redirectUrl.toString());

    return new Response(null, {
      status: 302,
      headers,
    });
  } catch (error) {
    return new Response(JSON.stringify({ message: 'Invalid ID Token', error }), {
      status: 401,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
}
