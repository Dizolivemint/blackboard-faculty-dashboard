'use client';

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { JWTClaims } from '@/app/models/jwt';
import jwt from 'jsonwebtoken';
import { ALLOWED_ROLES } from '@/app/config';

const publicKey = process.env.PUBLIC_JWK || '';

const Dashboard = () => {
  const token = useSearchParams().get('token');
  const [userData, setUserData] = useState<JWTClaims | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!publicKey) {
      setError('Public JWK not found in environment variables');
      return;
    }
    if (token) {
      localStorage.setItem('jwtToken', token as string);

      try {
        const verified = jwt.verify(token, publicKey, { algorithms: ['RS256'] });
        if (!verified) {
          setError('Invalid token.');
          return;
        }

        const user = JSON.parse(atob((token as string).split('.')[1]));

        const roles: Array<string> = user.roles;
        const hasAllowedRole = roles && roles.some(role => ALLOWED_ROLES.includes(role));

        if (!hasAllowedRole) {
          setError('Access denied. You do not have the required role to access this dashboard.');
        } else {
          setUserData(user);
        }
      } catch (e) {
        setError('Invalid token.');
      }
    }
  }, [token]);

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
          </div>
        )
      )}
    </div>
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
