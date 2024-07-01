import { verifyJwt } from '@/app/utils/jwt';
import { ALLOWED_ROLES } from '@/app/config';
import Blackboard from '@/app/integrations/blackboard';
import { GradebookColumnUserResponse, GradebookColumnUser } from '@/app/models/blackboard';

const BB_API_URL = process.env.AUDIENCE || '';

export async function POST(request: Request): Promise<Response> {
  const data = await request.json();
  const { token, courseId, final } = data as { token: string; courseId: string; final: Array<GradebookColumnUser> };

  if (!token || !final || !courseId) {
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
  } catch (error) {
    return new Response(JSON.stringify({ message: 'Error verifying JWT token', error }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  const blackboard = Blackboard.getInstance();
  await blackboard.init();

  let columnId: string | void;
  let finalResponse: GradebookColumnUserResponse | void;
  let finalExisting: Array<GradebookColumnUser>;

  try {
    columnId = await blackboard.getGradeColumnId(courseId, 'Final Grade');
    if (!columnId) {
      throw new Error('Error getting final grade column ID');
    }
    finalResponse = await blackboard.getGradeColumnUsers(courseId, columnId);
    if (!finalResponse) {
      throw new Error('Error getting final grade column');
    }
    finalExisting = finalResponse.results;
  } catch (error) {
    return new Response(JSON.stringify({ message: 'Error getting final grade column', error }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  const updateBodies: Array<any> = [];
  try {
    for (const user of final) {
      if (finalExisting.some((row) => row.userId === user.userId)) {
        continue;
      }
      const { score, text, notes, feedback, exempt, gradeNotationId, userId } = user;
      if ((!score || score === 0) && (!user.displayGrade?.score || user.displayGrade?.score === 0)) continue
      const finalGradeUpdateBody = {
        text: text || calculateTextScore(score),
        score: score || user.displayGrade?.score,
        notes,
        feedback,
        exempt,
        gradeNotationId
      };
      // Update final grade
      const response = await blackboard.patchGradeColumnUsers(courseId, columnId, userId, finalGradeUpdateBody);
          
      if (isResponse(response) && !response.ok) {
        throw new Error(response?.statusText);
      }

      if (!isResponse(response)) {
        throw new Error('Error updating final grade');
      }

      updateBodies.push(finalGradeUpdateBody);
    }
  } catch (error) {
    return new Response(JSON.stringify({ message: error }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  return new Response(JSON.stringify({ message: updateBodies }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
    }
  });
}

// Type guard to check if data is a Response
function isResponse(data: any): data is Response {
  return 'ok' in data;
}

function calculateTextScore(score: number): string {
  if (score >= 93.5) return 'A';
  if (score >= 89.5) return 'A-';
  if (score >= 86.5) return 'B+';
  if (score >= 83.5) return 'B';
  if (score >= 79.5) return 'B-';
  if (score >= 76.5) return 'C+';
  if (score >= 69.5) return 'C';
  return 'F';
}