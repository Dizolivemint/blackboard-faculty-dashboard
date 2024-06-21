import { jwtVerify, createRemoteJWKSet } from 'jose';
import { signJwt } from '@/app/utils/jwt';
import { randomBytes } from 'crypto';

const requiredEnvVars = ['JWKS_URL', 'CLIENT_ID', 'DASHBOARD_URL', 'AUDIENCE', 'ISSUER'];
requiredEnvVars.forEach((envVar) => {
  if (!process.env[envVar]) {
    throw new Error(`${envVar} not found in environment variables`);
  }
});

const jwksUrl = process.env.JWKS_URL || '';
const JWKS_URI = new URL(jwksUrl);
const JWKS = createRemoteJWKSet(JWKS_URI);

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const iss = url.searchParams.get('iss');
  const login_hint = url.searchParams.get('login_hint');
  const target_link_uri = url.searchParams.get('target_link_uri');
  const lti_message_hint = url.searchParams.get('lti_message_hint');

  // Validate required query parameters
  if (!iss || !login_hint || !target_link_uri || !lti_message_hint) {
    return new Response(JSON.stringify({ message: 'Missing required query parameters' }), {
      status: 400,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  // Generate state and nonce
  const state = randomBytes(16).toString('hex');
  const nonce = randomBytes(16).toString('hex');

  // Set secure cookies for state and nonce
  const headers = new Headers();
  headers.append('Set-Cookie', `lti_state=${state}; Path=/; HttpOnly; Secure; SameSite=Strict`);
  headers.append('Set-Cookie', `lti_nonce=${nonce}; Path=/; HttpOnly; Secure; SameSite=Strict`);

  const clientId = process.env.CLIENT_ID;
  if (!clientId) {
    return new Response(JSON.stringify({ message: 'Client ID not found in environment variables' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  // Ensure authUrl has the correct scheme (https)
  const authUrl = new URL('/auth', iss);
  authUrl.protocol = 'https';

  // Build the authorization redirect URL
  const authRedirectUrl = new URL(authUrl.toString());
  authRedirectUrl.searchParams.set('scope', 'openid');
  authRedirectUrl.searchParams.set('response_type', 'id_token');
  authRedirectUrl.searchParams.set('client_id', clientId);
  authRedirectUrl.searchParams.set('redirect_uri', target_link_uri);
  authRedirectUrl.searchParams.set('login_hint', login_hint);
  authRedirectUrl.searchParams.set('state', state);
  authRedirectUrl.searchParams.set('response_mode', 'form_post');
  authRedirectUrl.searchParams.set('nonce', nonce);
  authRedirectUrl.searchParams.set('prompt', 'none');

  headers.append('Location', authRedirectUrl.toString());

  return new Response(null, {
    status: 302,
    headers: headers,
  });
}

export async function POST(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const state = url.searchParams.get('state');
  const id_token = url.searchParams.get('id_token');
  const dashboardUrl = process.env.DASHBOARD_URL;

  if (!dashboardUrl) {
    return new Response(JSON.stringify({ message: 'Redirect URL not found in environment variables' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  // Validate required parameters
  if (!state || !id_token) {
    return new Response(JSON.stringify({ message: 'Missing required parameters' }), {
      status: 400,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  // Parse cookies into a Map
  const cookiesHeader = request.headers.get('cookie');
  const cookies = new Map(
    cookiesHeader?.split('; ').map(cookie => {
      const [name, ...rest] = cookie.split('=');
      return [name, rest.join('=')];
    }) || []
  );

  const savedState = cookies.get('lti_state');
  const savedNonce = cookies.get('lti_nonce');

  // Validate state and nonce to prevent CSRF and replay attacks
  if (state !== savedState || !savedNonce) {
    return new Response(JSON.stringify({ message: 'Invalid state or nonce' }), {
      status: 401,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  try {
    const audience = process.env.AUDIENCE || '';
    const issuer = process.env.ISSUER || '';
    
    // Verify the JWT received in the id_token
    const { payload } = await jwtVerify(id_token, JWKS, {
      issuer,
      audience,
    });

    // Ensure nonce in JWT matches the saved nonce
    if (payload.nonce !== savedNonce) {
      return new Response(JSON.stringify({ message: 'Invalid nonce' }), {
        status: 401,
        headers: {
          'Content-Type': 'application/json',
        },
      });
    }

    // Clear the state and nonce cookies
    const headers = new Headers();
    headers.append('Set-Cookie', 'lti_state=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Strict');
    headers.append('Set-Cookie', 'lti_nonce=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Strict');

    // Prepare the response payload and sign it
    const responsePayload = {
      sub: payload.sub,
      name: payload.name,
      admin: payload.admin,
    };

    const signedJwt = await signJwt(responsePayload);

    // Redirect to the provided redirect URL with the signed token
    const redirectUrl = new URL(dashboardUrl);
    redirectUrl.searchParams.set('token', signedJwt);

    headers.append('Location', redirectUrl.toString());

    return new Response(null, {
      status: 302,
      headers,
    });
  } catch (error) {
    console.error('Error during token verification:', error);
    return new Response(JSON.stringify({ message: 'Invalid ID Token', error }), {
      status: 401,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
}
