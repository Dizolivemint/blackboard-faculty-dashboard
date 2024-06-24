import { verifyJwt } from '@/app/utils/jwt';
import { ALLOWED_ROLES } from '@/app/config';

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

    // Make the fetch request to get the list of grades
    // 1. Get course ID
    const courseId = await getCourseId(course_section_sourcedid);
    if (!courseId) {
      return new Response(JSON.stringify({ message: 'Course ID not found' }), {
        status: 404,
        headers: {
          'Content-Type': 'application/json',
        },
      });
    }

    // 2. Get overall grade and final grade column IDs
    const overallColumnId = await getGradeColumnId(courseId, 'Overall Grade');
    const finalColumnId = await getGradeColumnId(courseId, 'Final Grade');
    
    // 4. Get overall grade and final grade column rows
    if (!overallColumnId || !finalColumnId) {
      return new Response(JSON.stringify({ message: 'Grade column ID not found' }), {
        status: 404,
        headers: {
          'Content-Type': 'application/json',
        },
      });
    }
    const overallGradeColumnRows = await getOverallGradeColumnRows(courseId, overallColumnId);
    const finalGradeColumnRows = await getOverallGradeColumnRows(courseId, finalColumnId);

    const grades = {
      overall: overallGradeColumnRows,
      final: finalGradeColumnRows,
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

async function getCourseId(course_section_sourcedid: string): Promise<string | void> {
  try {
    const response = await fetch(`${BB_API_URL}/learn/api/public/v3/courses?courseId=$${course_section_sourcedid}&fields=id`);
    const data = await response.json();
    return data.id;
  } catch (error) {
    console.error('Error getting course ID:', error);
    return
  }
}

async function getGradeColumnId(courseId: string, title: string): Promise<string | void> {
  // const exampleResponse = {
  //   "results": [
  //     {
  //       "id": "_1147_1",
  //       "name": "Overall Grade"
  //     }
  //   ]
  // }
  try {
    const response = await fetch(`${BB_API_URL}/learn/api/public/v1/courses/${courseId}/gradebook/columns?name=${title}&fields=name,id`);
    const data = await response.json();
    return data.results[0].id;
  } catch (error) {
    console.error('Error getting overall grade column:', error);
    return
  }
}

interface GradeColumnRows {
    "userId": string,
    "columnId": string,
    "status": string,
    "displayGrade": {
      "scaleType": string,
      "score": number,
      "possible": number,
      "text": string
    },
    "text": string,
    "score": number,
    "overridden": string,
    "exempt": boolean,
    "changeIndex": number,
    "firstRelevantDate": string,
    "lastRelevantDate": string,
  }

async function getOverallGradeColumnRows(courseId: string, columnId: string): Promise<Array<GradeColumnRows> | void> {
  // const exampleResponse = {
    // "results": [
    //   {
    //     "userId": "_102_1",
    //     "columnId": "_5839_1",
    //     "status": "Graded",
    //     "displayGrade": {
    //       "scaleType": "Tabular",
    //       "score": 70.00000,
    //       "possible": 100.000000000000000,
    //       "text": "C-"
    //     },
    //     "text": "C-",
    //     "score": 70.00000,
    //     "overridden": "2024-04-01T18:11:44.745Z",
    //     "exempt": false,
    //     "changeIndex": 128935,
    //     "firstRelevantDate": "2024-04-01T18:11:44.745Z",
    //     "lastRelevantDate": "2024-04-01T18:11:44.745Z"
    //   }
    // ]
  // }
  try {
    const response = await fetch(`${BB_API_URL}/learn/api/public/v2/courses/${courseId}/gradebook/columns/${columnId}/users`);
    const data = await response.json();
    return data.results;
  } catch (error) {
    console.error('Error getting overall grade column rows:', error);
    return
  }
}