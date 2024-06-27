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

const FlexContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
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

const ButtonContainer = styled.div`
  display: flex;
  justify-content: center;
  margin-top: 20px;
`;

const Button = styled.button`
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

const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
`;

const ModalContainer = styled.div`
  background: white;
  padding: 20px;
  border-radius: 10px;
  width: 300px;
  text-align: center;
`;

const ModalButton = styled(Button)`
  margin: 10px;
`;

const RedButton = styled(ModalButton)`
  background-color: #ff4c4c;

  &:hover {
    background-color: #d94444;
  }
`;

const Dashboard = () => {
  const token = useSearchParams().get('token');
  const [userData, setUserData] = useState<JWTClaims | null>(null);
  const [grades, setGrades] = useState<{ overall: Array<GradebookColumnUser>; final: Array<GradebookColumnUser>; courseId: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [users, setUsers] = useState<{ [key: string]: UserResponse }>({});
  const [expireTime, setExpireTime] = useState<number>(0);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [showModal, setShowModal] = useState<boolean>(false);

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
        setTimeLeft(expireTime - currentTime);
        if (currentTime >= expireTime) {
          setError('Access token has expired. To refresh, close and relaunch.');
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

      // Fetch user details in parallel
      const userIds: Array<string> = data.overall.map((grade: GradebookColumnUser) => grade.userId);
      await Promise.all(userIds.map(userId => fetchUser(token, userId)));
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
      setUsers(prevUsers => ({ ...prevUsers, [userId]: data }));
    } catch (error) {
      setError(`Error fetching user: ${error}`);
    }
  }

  const handlePopulateFinalGrades = () => {
    if (grades && grades.overall) {
      const finalGrades = grades.overall.map(overallGrade => {
        return {
          ...overallGrade,
          displayGrade: overallGrade.displayGrade,
        };
      });

      setGrades(prevGrades => {
        return prevGrades
          ? {
              ...prevGrades,
              final: finalGrades,
            }
          : null;
      });
    }
  }

  const handleConfirmSubmit = () => {
    setShowModal(true);
  }

  const handleSubmitGrades = async () => {
    setShowModal(false);
    if (grades && userData) {
      try {
        const response = await fetch('/api/grades/submit', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            token: localStorage.getItem('jwtToken'),
            courseId: grades.courseId,
            final: grades.final,
          }),
        });

        if (!response.ok) {
          throw new Error(`Failed to submit grades: ${response.statusText}`);
        }

        const data = await response.json();
        console.log(data);
      } catch (error) {
        setError(`Error submitting grades: ${error}`);
      }
    }
  }

  return (
    <Container>
      <Title>Submit Grades</Title>
      {error ? (
        <p>{error}</p>
      ) : (
        userData && (
          <div>
            <FlexContainer>
              <h1>Welcome 👋, {userData.name}</h1>
              <p>{userData.context.title} | {userData.context.label}</p>
            </FlexContainer>
            {grades && (
              <SubmitGrade overallGrades={grades.overall} finalGrades={grades.final} users={users} onPopulateFinalGrades={handlePopulateFinalGrades} onConfirmSubmit={handleConfirmSubmit} />
            )}
          </div>
        )
      )}
      {showModal && (
        <ModalOverlay>
          <ModalContainer>
            <p>Are you sure you want to submit the grades?</p>
            <ModalButton onClick={handleSubmitGrades}>Submit</ModalButton>
            <RedButton onClick={() => setShowModal(false)}>Cancel</RedButton>
          </ModalContainer>
        </ModalOverlay>
      )}
    </Container>
  );
};

const SubmitGrade = ({ overallGrades, finalGrades, users, onPopulateFinalGrades, onConfirmSubmit }: { overallGrades: Array<GradebookColumnUser>, finalGrades: Array<GradebookColumnUser>, users: { [key: string]: UserResponse }, onPopulateFinalGrades: () => void, onConfirmSubmit: () => void }) => {
  return (
    <div>
      <ButtonContainer>
        <Button onClick={onPopulateFinalGrades}>Populate with overall grade...</Button>
      </ButtonContainer>
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
              firstName={users[grade.userId]?.name.given || grade.userId}
              lastName={users[grade.userId]?.name.family || ''}
              overallGrade={grade.displayGrade?.score}
              finalGrade={finalGrades.find(finalGrade => finalGrade.userId === grade.userId)?.displayGrade?.score}
            />
          ))}
        </tbody>
      </Table>
      <ButtonContainer>
        <Button onClick={onConfirmSubmit}>Submit Grades</Button>
      </ButtonContainer>
    </div>
  );
};

const StudentGradeRow = ({ firstName, lastName, overallGrade, finalGrade }: { firstName: string; lastName: string; overallGrade: number | undefined, finalGrade: number | undefined }) => {
  return (
    <tr>
      <td>
        <input type="hidden" name="student" value={`${firstName} ${lastName}`} />{firstName} {lastName}
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
