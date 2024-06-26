import { verifyJwt } from '@/app/utils/jwt';
import { ALLOWED_ROLES } from '@/app/config';
import Blackboard from '@/app/integrations/blackboard';

const BB_API_URL = process.env.AUDIENCE || '';

export async function POST(request: Request): Promise<Response> {
  const { token, course_section_sourcedid } = await request.json();

  if (!token || !course_section_sourcedid) {
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

    const blackboard = Blackboard.getInstance();
    await blackboard.init();

    // Get course ID
    const courseId = await blackboard.getCourseId(course_section_sourcedid);
    if (!courseId) {
      return new Response(JSON.stringify({ message: 'Course ID not found' }), {
        status: 404,
        headers: {
          'Content-Type': 'application/json',
        },
      });
    }

    // Get overall grade and final grade column IDs
    const overallColumnId = await blackboard.getGradeColumnId(courseId, 'Overall Grade');
    const finalColumnId = await blackboard.getGradeColumnId(courseId, 'Final Grade');
    
    // Get overall grade and final grade column rows
    if (!overallColumnId || !finalColumnId) {
      return new Response(JSON.stringify({ message: 'Grade column ID not found' }), {
        status: 404,
        headers: {
          'Content-Type': 'application/json',
        },
      });
    }
    const overallResponse = await blackboard.getGradeColumnUsers(courseId, overallColumnId);
    const finalResponse = await blackboard.getGradeColumnUsers(courseId, finalColumnId);

    if (!overallResponse || !finalResponse) {
      return new Response(JSON.stringify({ message: 'No grades found' }), {
        status: 404,
        headers: {
          'Content-Type': 'application/json',
        },
      });
    }

    const overall = overallResponse.results;
    const final = finalResponse.results;

    const grades = {
      overall,
      final
    };

    return new Response(JSON.stringify(grades), {
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