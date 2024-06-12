'use client'
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { JWTClaims } from './models';

const ALLOWED_ROLES = [
  'lti:role:ims/lis/Administrator',
  'urn:lti:instrole:ims/lis/Instructor',
];

const Page = () => {
  const router = useRouter();
  const { token } = router.query;
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

export default Page;
