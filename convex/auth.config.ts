const region = process.env.COGNITO_REGION;
const userPoolId = process.env.COGNITO_USER_POOL_ID;
const clientId = process.env.COGNITO_CLIENT_ID;

const authConfig = {
  providers: [
    {
      // Standard OIDC provider: Convex auto-discovers JWKS via
      // ${domain}/.well-known/openid-configuration
      domain: `https://cognito-idp.${region}.amazonaws.com/${userPoolId}`,
      // applicationID must exactly match the "aud" claim in Cognito ID tokens,
      // which is the App Client ID.
      applicationID: clientId,
    },
  ],
};

export default authConfig;