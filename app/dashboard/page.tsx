'use client'

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react';
import { JWTClaims } from '@/app/models';

const ALLOWED_ROLES = [
  "http://purl.imsglobal.org/vocab/lis/v2/system/person#Administrator",
  "http://purl.imsglobal.org/vocab/lis/v2/membership#Administrator",
  "http://purl.imsglobal.org/vocab/lis/v2/institution/person#Instructor"
];

const Dashboard = () => {
  const token = useSearchParams().get('token');
  const [userData, setUserData] = useState<JWTClaims | null>(null);
  const [error, setError] = useState<string | null>(null);


  useEffect(() => {
    if (token) {
      // Save the token in localStorage or use it directly
      localStorage.setItem('jwtToken', token as string);

      try {
        // Decode the token to extract user information
        const user = JSON.parse(atob((token as string).split('.')[1]));
        
        // Check if the user has one of the allowed roles
        const roles: Array<string> = user['https://purl.imsglobal.org/spec/lti/claim/roles'];
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
            <p>Welcome, {userData.name}</p>
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
