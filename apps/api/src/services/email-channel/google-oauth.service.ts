import { OAuth2Client } from 'google-auth-library';
import { prisma } from '../../config/database.js';
import { logger } from '../../config/logger.js';

const GOOGLE_SCOPES = [
  'https://mail.google.com/',
  'https://www.googleapis.com/auth/userinfo.email',
];

const GMAIL_IMAP = { host: 'imap.gmail.com', port: 993, tls: true };
const GMAIL_SMTP = { host: 'smtp.gmail.com', port: 465, tls: true };

function getClientConfig() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error('GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET devem estar configurados no .env');
  }
  return { clientId, clientSecret };
}

function getRedirectUri(): string {
  const base = process.env.API_URL || 'http://localhost:3001';
  return `${base}/api/email-connections/oauth/google/callback`;
}

function createOAuth2Client(): OAuth2Client {
  const { clientId, clientSecret } = getClientConfig();
  return new OAuth2Client(clientId, clientSecret, getRedirectUri());
}

export class GoogleOAuthService {
  /**
   * Generate the Google consent URL to start the OAuth flow.
   * `state` carries companyId and connectionName so the callback can create the connection.
   */
  static generateAuthUrl(state: string): string {
    const client = createOAuth2Client();
    return client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: GOOGLE_SCOPES,
      state,
    });
  }

  /**
   * Exchange authorization code for tokens and return user info + tokens.
   */
  static async exchangeCode(code: string) {
    const client = createOAuth2Client();
    const { tokens } = await client.getToken(code);

    if (!tokens.refresh_token) {
      throw new Error('Nenhum refresh_token retornado. Revogue o acesso em https://myaccount.google.com/permissions e tente novamente.');
    }

    client.setCredentials(tokens);
    const info = await client.getTokenInfo(tokens.access_token!);
    const email = info.email;
    if (!email) throw new Error('Não foi possível obter o email da conta Google');

    return {
      email,
      accessToken: tokens.access_token!,
      refreshToken: tokens.refresh_token,
      expiry: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
    };
  }

  /**
   * Ensure we have a valid access token for the given EmailConnection.
   * Refreshes automatically if expired or about to expire (5 min buffer).
   */
  static async getAccessToken(emailConnectionId: string): Promise<string> {
    const conn = await prisma.emailConnection.findUniqueOrThrow({
      where: { id: emailConnectionId },
      select: {
        id: true,
        authType: true,
        oauthRefreshToken: true,
        oauthAccessToken: true,
        oauthTokenExpiry: true,
        email: true,
      },
    });

    if (conn.authType !== 'OAUTH2' || !conn.oauthRefreshToken) {
      throw new Error('Esta conexão não usa OAuth2');
    }

    const bufferMs = 5 * 60 * 1000;
    const isExpired = !conn.oauthTokenExpiry || conn.oauthTokenExpiry.getTime() - Date.now() < bufferMs;

    if (!isExpired && conn.oauthAccessToken) {
      return conn.oauthAccessToken;
    }

    logger.debug(`Refreshing OAuth2 token for ${conn.email}`);

    const client = createOAuth2Client();
    client.setCredentials({ refresh_token: conn.oauthRefreshToken });
    const { credentials } = await client.refreshAccessToken();

    const newAccessToken = credentials.access_token!;
    const newExpiry = credentials.expiry_date ? new Date(credentials.expiry_date) : null;

    await prisma.emailConnection.update({
      where: { id: conn.id },
      data: {
        oauthAccessToken: newAccessToken,
        oauthTokenExpiry: newExpiry,
        ...(credentials.refresh_token ? { oauthRefreshToken: credentials.refresh_token } : {}),
      },
    });

    return newAccessToken;
  }

  /** Gmail preset IMAP/SMTP config */
  static get gmailImap() { return GMAIL_IMAP; }
  static get gmailSmtp() { return GMAIL_SMTP; }
}
