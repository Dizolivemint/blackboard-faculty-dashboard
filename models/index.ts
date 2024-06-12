interface LTIRoles {
  roles: string[];
}

export interface JWTClaims extends LTIRoles {
  iss: string;
  sub: string;
  aud: string | string[];
  exp: number;
  nbf: number;
  iat: number;
  jti: string;
  name: string;
  admin: boolean;
  'https://purl.imsglobal.org/spec/lti/claim/roles': string[];
  'https://purl.imsglobal.org/spec/lti/claim/context': {
    id: string;
    label: string;
    title: string;
  };
  'https://purl.imsglobal.org/spec/lti/claim/resource_link': {
    id: string;
    title: string;
  };
}