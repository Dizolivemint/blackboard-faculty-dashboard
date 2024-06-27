import { jwtVerify, createRemoteJWKSet, decodeProtectedHeader } from 'jose';
import { signJwt } from '@/app/utils/jwt';
import { randomBytes } from 'crypto';

const requiredEnvVars = ['JWKS_URL', 'CLIENT_ID', 'DASHBOARD_URL', 'ISSUER'];
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

  if (!iss || !login_hint || !target_link_uri || !lti_message_hint) {
    return new Response(JSON.stringify({ message: 'Missing required query parameters' }), {
      status: 400,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  if (iss !== 'https://blackboard.com') {
    return new Response(JSON.stringify({ message: 'Invalid issuer' }), {
      status: 401,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  const state = randomBytes(16).toString('hex');
  const nonce = randomBytes(16).toString('hex');

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

  const authUrl = new URL('/api/v1/gateway/oauth2/jwttoken', 'https://developer.blackboard.com');

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
  authRedirectUrl.searchParams.set('lti_message_hint', lti_message_hint);

  headers.append('Location', authRedirectUrl.toString());

  return new Response(null, {
    status: 302,
    headers: headers,
  });
}

export async function POST(request: Request): Promise<Response> {
  const formData = await request.formData();
  const state = formData.get('state') as string;
  const id_token = formData.get('id_token') as string;
  const dashboardUrl = process.env.DASHBOARD_URL;

  if (!dashboardUrl) {
    return new Response(JSON.stringify({ message: 'Redirect URL not found in environment variables' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  if (!state || !id_token) {
    return new Response(JSON.stringify({ message: 'Missing required parameters' }), {
      status: 400,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  const cookiesHeader = request.headers.get('cookie');
  const cookies = new Map(
    cookiesHeader?.split('; ').map(cookie => {
      const [name, ...rest] = cookie.split('=');
      return [name, rest.join('=')];
    }) || []
  );

  const savedState = cookies.get('lti_state');
  const savedNonce = cookies.get('lti_nonce');

  if (state !== savedState || !savedNonce) {
    return new Response(JSON.stringify({ message: 'Invalid state or nonce' }), {
      status: 401,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  try {
    const clientId = process.env.CLIENT_ID || '';
    const issuer = process.env.ISSUER || '';

    const { payload } = await jwtVerify(id_token, JWKS, {
      issuer,
      audience: clientId,
    });

    if (payload.nonce !== savedNonce) {
      return new Response(JSON.stringify({ message: 'Invalid nonce' }), {
        status: 401,
        headers: {
          'Content-Type': 'application/json',
        },
      });
    }

    const roles = payload['https://purl.imsglobal.org/spec/lti/claim/roles'];
    const name = payload.name;
    const lis = payload['https://purl.imsglobal.org/spec/lti/claim/lis'];
    const context = payload['https://purl.imsglobal.org/spec/lti/claim/context'];

    const headers = new Headers();
    headers.append('Set-Cookie', 'lti_state=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Strict');
    headers.append('Set-Cookie', 'lti_nonce=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Strict');

    const responsePayload = {
      sub: payload.sub,
      name,
      roles,
      lis,
      context
    };

    const signedJwt = await signJwt(responsePayload);

    const redirectUrl = new URL(dashboardUrl);
    redirectUrl.searchParams.set('token', signedJwt);

    headers.append('Location', redirectUrl.toString());

    return new Response(null, {
      status: 302,
      headers: headers,
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
