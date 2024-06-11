export async function GET(request: Request) {
  const redirectUrl = process.env.REDIRECT_URL;
  if (!redirectUrl) {
    return new Response('Missing REDIRECT_URL', { status: 500 });
  }
  const redirectUri = new URL(redirectUrl);
  const url = new URL(request.url);
  const query = new URLSearchParams(url.search);
  
  const login_hint = query.get('login_hint');
  const target_link_uri = query.get('target_link_uri');
  const lti_message_hint = query.get('lti_message_hint');

  if (!login_hint || !target_link_uri || !lti_message_hint) {
    return new Response('Missing required parameters', { status: 400 });
  }

  const params = new URLSearchParams({
    iss: 'https://blackboard.com',
    login_hint,
    target_link_uri,
    lti_message_hint,
  });

  redirectUri.search = params.toString();

  return Response.redirect(redirectUri.toString());
}
