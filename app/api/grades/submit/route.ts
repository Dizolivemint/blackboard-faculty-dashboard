import { verifyJwt } from '@/app/utils/jwt';
import { ALLOWED_ROLES } from '@/app/config';
import Blackboard from '@/app/integrations/blackboard';
import { GradebookColumnUser } from '@/app/models/blackboard';

const BB_API_URL = process.env.AUDIENCE || '';

export async function POST(request: Request): Promise<Response> {
  const data = await request.json();
  const { token, courseId } = data;
  const final: Array<GradebookColumnUser> = data.final;
  const overall: Array<GradebookColumnUser> = data.overall;

  if (!token || !final || !overall) {
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

    const roles = payload['https://purl.imsglobal.org/spec/lti/claim/roles'] as Array<string>;
    const hasAllowedRole = roles && roles.some(role => ALLOWED_ROLES.includes(role));

    if (!hasAllowedRole) {
      return new Response(JSON.stringify({ message: 'Access denied. You do not have the required role.' }), {
        status: 403,
        headers: {
          'Content-Type': 'application/json',
        },
      });
    }

  } catch (error) {
    return new Response(JSON.stringify({ message: 'Error verifying JWT token' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  const blackboard = Blackboard.getInstance();
  await blackboard.init();

  try {
    for (const user of overall) {
      // Only patch grades not in the final grade column
      if (final.filter(finalGrade => finalGrade.userId === user.userId).length === 0) {
        const { score, text, notes, feedback, exempt, gradeNotationId, columnId, userId } = user;
        const finalGradeUpdateBody = {
          text,
          score,
          notes,
          feedback,
          exempt,
          gradeNotationId
        }
        // Update final grade
        const response = await blackboard.patchGradeColumnUsers(courseId, columnId, userId, finalGradeUpdateBody);
        if (!response) {
          throw new Error('Error updating final grade');
        }
      }
    }
  } catch (error) {
    return new Response(JSON.stringify({ message: 'Error updating grades' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  

  return new Response(JSON.stringify({ message: 'Success' }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}