'use client';

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { JWTClaims } from '@/app/models/jwt';
import { ALLOWED_ROLES } from '@/app/config';
import { GradebookColumnUser, UserResponse } from '@/app/models/blackboard';
import styled, { keyframes } from 'styled-components';

const fadeIn = keyframes`
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
`;

const Container = styled.div`
  border: 2px solid #ccc;
  padding: 20px;
  margin: 20px auto;
  max-width: 800px;
  border-radius: 10px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  animation: ${fadeIn} 0.5s ease-in-out;
`;

const Title = styled.h1`
  text-align: center;
  margin-bottom: 20px;
`;

const SelectContainer = styled.div`
  display: flex;
  justify-content: center;
  margin-bottom: 20px;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 20px;

  th, td {
    border: 1px solid #ddd;
    padding: 8px;
    text-align: left;
  }

  th {
    background-color: #f4f4f4;
  }
`;

const SubmitButtonContainer = styled.div`
  display: flex;
  justify-content: center;
  margin-top: 20px;
`;

const SubmitButton = styled.button`
  background-color: #007bff;
  color: white;
  font-weight: bold;
  padding: 10px 20px;
  border: none;
  border-radius: 5px;
  cursor: pointer;

  &:hover {
    background-color: #0056b3;
  }
`;

const Dashboard = () => {
  const token = useSearchParams().get('token');
  const [userData, setUserData] = useState<JWTClaims | null>(null);
  const [grades, setGrades] = useState<{ overall: Array<GradebookColumnUser>; final: Array<GradebookColumnUser>; courseId: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [users, setUsers] = useState<Array<UserResponse>>([]);
  const [expireTime, setExpireTime] = useState<number>(0);

  useEffect(() => {
    const verifyAndFetchData = async () => {
      if (token) {
        localStorage.setItem('jwtToken', token as string);

        try {
          const user: JWTClaims = JSON.parse(atob((token as string).split('.')[1]));

          const roles: Array<string> = user.roles;
          const hasAllowedRole = roles && roles.some(role => ALLOWED_ROLES.includes(role));

          const currentTime = Math.floor(Date.now() / 1000);
          const expireTime = user.exp;
          setExpireTime(expireTime);

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
    if (expireTime) {
      const interval = setInterval(() => {
        const currentTime = Math.floor(Date.now() / 1000);

        if (currentTime >= expireTime) {
          setError('Access token has expired. Close this tab and relaunch the tool.');
          clearInterval(interval);
        }
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [expireTime]);

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

  const fetchUser = async (token: string, userId: string) => {
    try {
      const response = await fetch('/api/users/get', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          userId,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch user: ${response.statusText}`);
      }

      const data = await response.json();
      setUsers([...users, data]);
    } catch (error) {
      setError(`Error fetching user: ${error}`);
    }
  }

  return (
    <Container>
      <Title>Dashboard</Title>
      {error ? (
        <p>{error}</p>
      ) : (
        userData && (
          <div>
            <h1>Welcome 👋, {userData.name}</h1>
            <p>Label: {userData.context.label}</p>
            <p>Title: {userData.context.title}</p>
            <p>Time left: {(expireTime - Date.now()) / 1000}</p>
            {grades && (
              <SubmitGrade overallGrades={grades.overall} finalGrades={grades.final} users={users}/>
            )}
          </div>
        )
      )}
    </Container>
  );
};

const SubmitGrade = ({ overallGrades, finalGrades, users }: { overallGrades: Array<GradebookColumnUser>, finalGrades: Array<GradebookColumnUser>, users: Array<UserResponse> }) => {
  return (
    <div>
      <SelectContainer>
        <select>
          <option selected={true} value="">Populate with overall grade...</option>
        </select>
      </SelectContainer>
      <Table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Overall Grade</th>
            <th>Final Grade</th>
          </tr>
        </thead>
        <tbody>
          {overallGrades.map((grade, index) => (
            <StudentGradeRow
              key={index}
              firstName={users.find(user => user.id === grade.userId)?.name.given || grade.userId}
              lastName={users.find(user => user.id === grade.userId)?.name.family || grade.userId}
              overallGrade={grade.displayGrade?.score}
              finalGrade={finalGrades.find(finalGrade => finalGrade.userId === grade.userId)?.displayGrade?.score}
            />
          ))}
        </tbody>
      </Table>
      <SubmitButtonContainer>
        <SubmitButton>Submit Grades</SubmitButton>
      </SubmitButtonContainer>
    </div>
  );
};

const StudentGradeRow = ({ firstName, lastName, overallGrade, finalGrade }: { firstName: string; lastName: string; overallGrade: number | undefined, finalGrade: number | undefined }) => {
  return (
    <tr>
      <td>
        <input type="hidden" name="student" value={name} />{firstName}&nbsp;{lastName}
      </td>
      <td>
        {overallGrade !== undefined ? overallGrade : '-'}
      </td>
      <td>
        {finalGrade !== undefined ? finalGrade : "-"}
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
