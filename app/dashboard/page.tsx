'use client';

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { JWTClaims } from '@/app/models/jwt';
import { ALLOWED_ROLES } from '@/app/config';
import { GradebookColumnUser } from '@/app/models/blackboard';

const Dashboard = () => {
  const token = useSearchParams().get('token');
  const [userData, setUserData] = useState<JWTClaims | null>(null);
  const [grades, setGrades] = useState<{ overall: Array<GradebookColumnUser>; final: Array<GradebookColumnUser>; courseId: string }| null>(null);
  const [students, setStudents] = useState<Array<GradebookColumnUser>>([]);
  const [error, setError] = useState<string | null>(null);
  const [courseId, setCourseId] = useState<string | null>(null);

  useEffect(() => {
    const verifyAndFetchData = async () => {
      if (token) {
        localStorage.setItem('jwtToken', token as string);

        try {
          const user: JWTClaims = JSON.parse(atob((token as string).split('.')[1]));

          const roles: Array<string> = user.roles;
          const hasAllowedRole = roles && roles.some(role => ALLOWED_ROLES.includes(role));

          if (!hasAllowedRole) {
            setError('Access denied. You do not have the required role to access this dashboard.');
          } else {
            setUserData(user);
            await fetchGrades(token, user.context.label);
          }
        } catch (e) {
          setError('Invalid token.');
        }
      }
    };

    verifyAndFetchData();
  }, [token]);

  useEffect(() => {
    if (grades) {
      console.log(`fetch students for ${grades.courseId}`);
    }
  }, [grades])

  const fetchGrades = async (token: string, courseCode: string) => {
    try {
      const response = await fetch('/api/grades/get', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          courseCode,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch grades: ${response.statusText}`);
      }

      const data = await response.json();
      setGrades(data);
    } catch (error) {
      setError(`Error fetching grades: ${error}`);
    }
  };

  return (
    <div>
      <h1>Dashboard</h1>
      {error ? (
        <p>{error}</p>
      ) : (
        userData && (
          <div>
            <h1>Welcome 👋, {userData.name}</h1>
            <p>Label: {userData.context.label}</p>
            <p>Title: {userData.context.title}</p>
            {grades && (
              <SubmitGrade overallGrades={grades.overall} finalGrades={grades.final} />
            )}
          </div>
        )
      )}
    </div>
  );
};

const SubmitGrade = ({ overallGrades, finalGrades }: { overallGrades: Array<GradebookColumnUser>, finalGrades: Array<GradebookColumnUser> }) => {
  return (
    <div className='flex flex-col items-center'>
      <div className="box py-3">
        <select id="block-grade-submission-populategrade" className="select custom-select menupopulategrade" name="populategrade">
          <option selected={true} value="">Populate with overall grade...</option>
        </select>
      </div>
      <table className="table-auto border-separate border-spacing-2 border border-slate-500">
        <thead>
          <tr>
            <th className='border border-slate-600'>
              Name
            </th>
            <th className='border border-slate-600'>
              Overall Grade
            </th>
            <th className='border border-slate-600'>
              Final Grade
            </th>
          </tr>
        </thead>
        <tbody>
          {overallGrades.map((grade, index) => (
            <StudentGradeRow
              key={index}
              studentName={grade.userId}
              userId={grade.userId}
              overallGrade={grade.displayGrade?.score}
              finalGrade={finalGrades.find(finalGrade => finalGrade.userId === grade.userId)?.displayGrade?.score}
            />
          ))}
        </tbody>
      </table>
      <div className="mt-4">
        <input type="submit" value="Submit Grades" className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded" />
      </div>
    </div>
  );
};

const StudentGradeRow = ({ studentName, userId, overallGrade, finalGrade }: { studentName: string; userId: string; overallGrade: number | undefined, finalGrade: number | undefined }) => {
  return (
    <tr>
      <td className='border border-slate-700'>
        <input type="hidden" name="student" value={userId} />{studentName}
      </td>
      <td className='border border-slate-700'>
        {overallGrade || '-'}
      </td>
      <td className='border border-slate-700'>
        {finalGrade || "-"}
      </td>
    </tr>
  );
};

const Page: React.FC = () => {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <Dashboard />
    </Suspense>
  );
};

export default Page;
