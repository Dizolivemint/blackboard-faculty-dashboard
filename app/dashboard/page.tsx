'use client';

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { JWTClaims } from '@/app/models/jwt';
import jwt from 'jsonwebtoken';
import { ALLOWED_ROLES } from '@/app/config';
import { GradebookColumnUser } from '@/app/models/blackboard';

const Dashboard = () => {
  const token = useSearchParams().get('token');
  const [userData, setUserData] = useState<JWTClaims | null>(null);
  const [grades, setGrades] = useState<{ overall: Array<GradebookColumnUser>; final: Array<GradebookColumnUser> }| null>(null);
  const [students, setStudents] = useState<Array<GradebookColumnUser>>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const verifyAndFetchData = async () => {
      if (token) {
        localStorage.setItem('jwtToken', token as string);

        try {
          const user = JSON.parse(atob((token as string).split('.')[1]));

          const roles: Array<string> = user.roles;
          const hasAllowedRole = roles && roles.some(role => ALLOWED_ROLES.includes(role));

          if (!hasAllowedRole) {
            setError('Access denied. You do not have the required role to access this dashboard.');
          } else {
            setUserData(user);
            await fetchGrades(token, user.lis.course_section_sourcedid);
          }
        } catch (e) {
          setError('Invalid token.');
        }
      }
    };

    verifyAndFetchData();
  }, [token]);

  const fetchGrades = async (token: string, courseSectionSourcedid: string) => {
    try {
      const response = await fetch('/api/grades', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          course_section_sourcedid: courseSectionSourcedid,
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
            <h2>Roles</h2>
            <ul>
              {userData.roles.map((role, index) => (
                <li key={index}>{role}</li>
              ))}
            </ul>
            <h2>Context</h2>
            <p>ID: {userData.context.id}</p>
            <p>Label: {userData.context.label}</p>
            <p>Title: {userData.context.title}</p>
            <h2>LIS</h2>
            <p>Person SourcedID: {userData.lis?.person_sourcedid}</p>
            <p>Course Section SourcedID: {userData.lis?.course_section_sourcedid}</p>
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
    <div>
      <input name="courseid" type="hidden" value="14157" />
      <div className="box py-3">
        <select id="block-grade-submission-populategrade" className="select custom-select menupopulategrade" name="populategrade">
          <option selected={true} value="">Populate with overall grade...</option>
        </select>
      </div>
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr className="top">
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              First name / Last name
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Current Grade</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Final Grade</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {overallGrades.map((grade, index) => (
            <StudentGradeRow
              key={index}
              studentName={grade.userId}
              userId={grade.userId}
              overallGrade={grade.score}
              finalGrade={finalGrades[index].score}
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

const StudentGradeRow = ({ studentName, userId, overallGrade, finalGrade }: { studentName: string; userId: string; overallGrade: number, finalGrade: number }) => {
  return (
    <tr className="block-grade-submission-tr odd last">
      <td className="px-6 py-4 whitespace-nowrap">
        <input type="hidden" name="student" value={userId} />{studentName}
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        {overallGrade}
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <input className="border rounded px-2 py-1" id={`finalgrade_${userId}`} type="text" name={`finalgrade_${userId}`} size={5} value={finalGrade}/>
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
