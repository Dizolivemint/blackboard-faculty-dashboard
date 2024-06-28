import { verifyJwt } from '@/app/utils/jwt';
import { ALLOWED_ROLES } from '@/app/config';
import Blackboard from '@/app/integrations/blackboard';

const BB_API_URL = process.env.AUDIENCE || '';

export async function POST(request: Request): Promise<Response> {
  const { token, userId } = await request.json();

  if (!token || !userId) {
    return new Response(JSON.stringify({ message: 'Missing required parameters' }), {
      status: 400,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  if (!BB_API_URL) {
    return new Response(JSON.stringify({ message: 'Blackboard API URL not found' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  try {
    const payload = await verifyJwt(token);

    const roles = payload.roles as Array<string>;
    const hasAllowedRole = roles && roles.some(role => ALLOWED_ROLES.includes(role));

    if (!hasAllowedRole) {
      return new Response(JSON.stringify({ message: 'Access denied. You do not have the required role.' }), {
        status: 403,
        headers: {
          'Content-Type': 'application/json',
        },
      });
    }

    const blackboard = Blackboard.getInstance();
    await blackboard.init();

    const data = await blackboard.getUser(userId);

    if (!data.ok) {
      return new Response(JSON.stringify({ message: 'User not found' }), {
        status: 404,
        headers: {
          'Content-Type': 'application/json',
        },
      });
    }

    const user = {
      id: data.id,
      name: {
        given: data.name.given,
        family: data.name.family
      }
    }

    return new Response(JSON.stringify(user), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ message: 'Internal server error', error }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
}