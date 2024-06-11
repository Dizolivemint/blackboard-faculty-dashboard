export async function GET() {
  try {
    const publicJwk = process.env.PUBLIC_JWK || '';
    if (!publicJwk) {
      throw new Error('Public JWK not found in environment variables');
    }
    const parsedPublicJwk = JSON.parse(publicJwk);
    return new Response(JSON.stringify({ keys: [parsedPublicJwk] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ message: 'JWK not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
