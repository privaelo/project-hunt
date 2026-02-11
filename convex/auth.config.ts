const region = process.env.COGNITO_REGION;
const userPoolId = process.env.COGNITO_USER_POOL_ID;
const issuer = `https://cognito-idp.${region}.amazonaws.com/${userPoolId}`;

const authConfig = {
  providers: [
    {
      type: 'customJwt',
      issuer,
      algorithm: 'RS256',
      jwks: `${issuer}/.well-known/jwks.json`,
    },
  ],
};

export default authConfig;
