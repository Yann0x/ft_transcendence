import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { SenderIdentity, User } from './shared/with_front/types'
import crypto from 'crypto'
import { authenticator } from '@otplib/preset-default'
import QRCode from 'qrcode'

// Store pending OAuth states (in-memory for CSRF protection)
const pendingOAuthStates = new Map<string, { createdAt: number }>()

export function buildGetJwtHandler(server: FastifyInstance) {
  return async (request: FastifyRequest<{ Body: SenderIdentity }>, reply: FastifyReply) => {
    const user: SenderIdentity = request.body
    const token = server.jwt.sign(user)
    return token
  }
}

export function buildCheckJwtHandler(server: FastifyInstance) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const authHeader = request.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      reply.status(401).send({ error: 'Unauthorized', statusCode: 401, service: 'authenticate' })
      return
    }
    const token = authHeader.replace('Bearer ', '')
    try {
      server.jwt.verify(token)
      const decoded = server.jwt.decode<SenderIdentity>(token)
      return decoded
    } catch (err) {
      reply.status(401).send({ error: 'Unauthorized', statusCode: 401, service: 'authenticate' })
      return
    }
  }
}

export  function hashPassword(server: FastifyInstance)
{
  return async (req: FastifyRequest, rep: FastifyReply) => {
    const toHash = req.body as string;
    if (!toHash)
      rep.status(401).send({error: 'No pass to Hash', statusCode:401, service : 'authenticate'});
    const newHash = server.bcrypt.hash(toHash);
    return newHash;
  }
};

type validHashBody = {
  to_check: string,
  valid: string
}

export  function validHashPassword(server: FastifyInstance)
{
  return async (req: FastifyRequest<{Body: validHashBody}>, rep: FastifyReply) => {
    const toCheck = req.body?.to_check as string;
    const realHash = req.body?.valid as string;
    if (!toCheck || !realHash)
      return rep.status(401).send({error: 'Missing pass', statusCode: 401, service:  'authenticate'});
   const result = await server.bcrypt.compare(toCheck, realHash);
   if (!result)
      return rep.status(401).send({
        error: 'Unauthorized',
        message: 'Invalid credentials',
        statusCode: 401,
        service: 'authenticate'
      });
      rep.status(200).send(true);
  }
};

// OAuth 2.0 with 42 API

export function buildOAuth42UrlHandler(server: FastifyInstance) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const clientId = process.env.FT_CLIENT_ID;
    const redirectUri = process.env.FT_REDIRECT_URI;

    if (!clientId || !redirectUri) {
      console.error('[OAUTH] Missing FT_CLIENT_ID or FT_REDIRECT_URI environment variables');
      return reply.status(500).send({ error: '42 OAuth not configured' });
    }

    // Generate random state for CSRF protection
    const state = crypto.randomBytes(32).toString('hex');
    pendingOAuthStates.set(state, { createdAt: Date.now() });

    // Clean old states (older than 10 minutes)
    const tenMinutesAgo = Date.now() - 10 * 60 * 1000;
    for (const [key, value] of pendingOAuthStates) {
      if (value.createdAt < tenMinutesAgo) pendingOAuthStates.delete(key);
    }

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'public',
      state: state
    });

    console.log('[OAUTH] Generated 42 authorization URL');
    return { url: `https://api.intra.42.fr/oauth/authorize?${params}` };
  };
}

export function buildOAuth42CallbackHandler(server: FastifyInstance) {
  return async (request: FastifyRequest<{ Querystring: { code?: string; state?: string; error?: string } }>, reply: FastifyReply) => {
    const { code, state, error } = request.query;

    // Handle user cancellation or errors from 42
    if (error) {
      console.log('[OAUTH] User cancelled or error from 42:', error);
      return reply.redirect('/?oauth_error=' + encodeURIComponent(error));
    }

    if (!code || !state) {
      console.error('[OAUTH] Missing code or state in callback');
      return reply.redirect('/?oauth_error=missing_params');
    }

    // Verify state
    if (!pendingOAuthStates.has(state)) {
      console.error('[OAUTH] Invalid or expired state');
      return reply.redirect('/?oauth_error=invalid_state');
    }
    pendingOAuthStates.delete(state);

    const clientId = process.env.FT_CLIENT_ID;
    const clientSecret = process.env.FT_CLIENT_SECRET;
    const redirectUri = process.env.FT_REDIRECT_URI;

    if (!clientId || !clientSecret || !redirectUri) {
      console.error('[OAUTH] Missing OAuth configuration');
      return reply.redirect('/?oauth_error=config_error');
    }

    try {
      // Exchange code for access token
      console.log('[OAUTH] Exchanging code for access token...');
      const tokenResponse = await fetch('https://api.intra.42.fr/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          client_id: clientId,
          client_secret: clientSecret,
          code: code,
          redirect_uri: redirectUri
        })
      });

      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        console.error('[OAUTH] Token exchange failed:', errorText);
        return reply.redirect('/?oauth_error=token_exchange_failed');
      }

      const tokenData = await tokenResponse.json() as { access_token: string };
      const accessToken = tokenData.access_token;

      // Fetch user info from 42 API
      console.log('[OAUTH] Fetching user info from 42 API...');
      const userResponse = await fetch('https://api.intra.42.fr/v2/me', {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });

      if (!userResponse.ok) {
        const errorText = await userResponse.text();
        console.error('[OAUTH] Failed to fetch user info:', errorText);
        return reply.redirect('/?oauth_error=user_fetch_failed');
      }

      const ftUser = await userResponse.json() as {
        id: number;
        login: string;
        email: string;
        image?: { link?: string };
      };

      console.log('[OAUTH] 42 user:', ftUser.login, ftUser.email);

      // Find or create user in our database
      const user = await findOrCreateOAuthUser(ftUser);

      // Generate JWT
      const token = server.jwt.sign({
        id: user.id,
        name: user.name,
        email: user.email
      });

      console.log('[OAUTH] Successfully authenticated user:', user.name);

      // Redirect to frontend with token
      return reply.redirect(`/?token=${token}`);

    } catch (error) {
      console.error('[OAUTH] Error during OAuth callback:', error);
      return reply.redirect('/?oauth_error=internal_error');
    }
  };
}

async function findOrCreateOAuthUser(ftUser: { id: number; login: string; email: string; image?: { link?: string } }): Promise<User> {
  const ftIdStr = String(ftUser.id);

  // Check if user exists by ft_id
  let response = await fetch(`http://database:3000/database/user?ft_id=${ftIdStr}`);
  let users = await response.json() as User[];

  if (users && users.length > 0) {
    console.log('[OAUTH] Found existing user by ft_id');
    return users[0];
  }

  // Check if email already exists (user registered manually)
  response = await fetch(`http://database:3000/database/user?email=${encodeURIComponent(ftUser.email)}`);
  users = await response.json() as User[];

  if (users && users.length > 0) {
    // Link existing account to 42
    console.log('[OAUTH] Linking existing user to 42 account');
    await fetch('http://database:3000/database/user', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: users[0].id,
        ft_id: ftIdStr
      })
    });
    return users[0];
  }

  // Create new user
  console.log('[OAUTH] Creating new user from 42 account');
  const newUser: User & { ft_id: string } = {
    id: crypto.randomUUID(),
    name: ftUser.login,
    email: ftUser.email,
    ft_id: ftIdStr,
    avatar: ftUser.image?.link || undefined,
    status: 'offline'
  };

  const createResponse = await fetch('http://database:3000/database/user', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(newUser)
  });

  if (!createResponse.ok) {
    const errorText = await createResponse.text();
    console.error('[OAUTH] Failed to create user:', createResponse.status, errorText);
    throw new Error(`Failed to create user: ${errorText}`);
  }

  console.log('[OAUTH] User created successfully with id:', newUser.id);
  return newUser;
}

// ============================================
// 2FA (TOTP) Authentication Methods
// ============================================

/**
 * Generate a new 2FA secret and QR code for setup
 */
export function build2FASetupHandler(server: FastifyInstance) {
  return async (request: FastifyRequest<{ Body: { userId: string; email: string } }>, reply: FastifyReply) => {
    const { userId, email } = request.body;

    if (!userId || !email) {
      return reply.status(400).send({ error: 'Bad Request', message: 'userId and email are required' });
    }

    try {
      // Generate a new TOTP secret
      const secret = authenticator.generateSecret();
      
      // Generate the otpauth URL for QR code
      const serviceName = 'ft_transcendance';
      const otpauthUrl = authenticator.keyuri(email, serviceName, secret);
      
      // Generate QR code as data URL
      const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);

      console.log('[2FA] Generated setup secret for user:', userId);
      
      return reply.send({
        secret,
        qrCode: qrCodeDataUrl,
        otpauthUrl
      });
    } catch (error) {
      console.error('[2FA] Error generating setup:', error);
      return reply.status(500).send({ error: 'Internal Server Error', message: 'Failed to generate 2FA setup' });
    }
  };
}

/**
 * Verify a TOTP code
 */
export function build2FAVerifyHandler(server: FastifyInstance) {
  return async (request: FastifyRequest<{ Body: { secret: string; code: string } }>, reply: FastifyReply) => {
    const { secret, code } = request.body;

    if (!secret || !code) {
      return reply.status(400).send({ error: 'Bad Request', message: 'secret and code are required' });
    }

    try {
      const isValid = authenticator.verify({ token: code, secret });
      
      console.log('[2FA] Code verification result:', isValid);
      
      return reply.send({ valid: isValid });
    } catch (error) {
      console.error('[2FA] Error verifying code:', error);
      return reply.status(500).send({ error: 'Internal Server Error', message: 'Failed to verify 2FA code' });
    }
  };
}

/**
 * Enable 2FA for a user (after successful verification)
 */
export function build2FAEnableHandler(server: FastifyInstance) {
  return async (request: FastifyRequest<{ Body: { userId: string; secret: string; code: string } }>, reply: FastifyReply) => {
    const { userId, secret, code } = request.body;

    if (!userId || !secret || !code) {
      return reply.status(400).send({ error: 'Bad Request', message: 'userId, secret, and code are required' });
    }

    try {
      // Verify the code first
      const isValid = authenticator.verify({ token: code, secret });
      
      if (!isValid) {
        return reply.status(401).send({ error: 'Unauthorized', message: 'Invalid 2FA code' });
      }

      // Update user in database with 2FA enabled
      console.log('[2FA] Sending update to database for user:', userId);
      const updateResponse = await fetch('http://database:3000/database/user', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: userId,
          twoAuth_secret: secret,
          twoAuth_enabled: true
        })
      });

      const responseText = await updateResponse.text();
      console.log('[2FA] Database response:', updateResponse.status, responseText);

      if (!updateResponse.ok) {
        console.error('[2FA] Failed to enable 2FA:', responseText);
        return reply.status(500).send({ error: 'Internal Server Error', message: 'Failed to enable 2FA' });
      }

      console.log('[2FA] 2FA enabled for user:', userId);
      
      return reply.send({ success: true, message: '2FA enabled successfully' });
    } catch (error) {
      console.error('[2FA] Error enabling 2FA:', error);
      return reply.status(500).send({ error: 'Internal Server Error', message: 'Failed to enable 2FA' });
    }
  };
}

/**
 * Disable 2FA for a user
 */
export function build2FADisableHandler(server: FastifyInstance) {
  return async (request: FastifyRequest<{ Body: { userId: string; code: string } }>, reply: FastifyReply) => {
    const { userId, code } = request.body;

    if (!userId || !code) {
      return reply.status(400).send({ error: 'Bad Request', message: 'userId and code are required' });
    }

    try {
      // Get user's current secret from database
      const userResponse = await fetch(`http://database:3000/database/user?id=${userId}`);
      const users = await userResponse.json() as Array<{ twoAuth_secret: string | null; twoAuth_enabled: number }>;
      
      if (!users || users.length === 0) {
        return reply.status(404).send({ error: 'Not Found', message: 'User not found' });
      }

      const user = users[0]!;
      const secret = user.twoAuth_secret;
      
      if (!user.twoAuth_enabled || !secret) {
        return reply.status(400).send({ error: 'Bad Request', message: '2FA is not enabled' });
      }

      // Verify the code
      const isValid = authenticator.verify({ token: code, secret });
      
      if (!isValid) {
        return reply.status(401).send({ error: 'Unauthorized', message: 'Invalid 2FA code' });
      }

      // Disable 2FA in database
      const updateResponse = await fetch('http://database:3000/database/user', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: userId,
          twoAuth_secret: null,
          twoAuth_enabled: false
        })
      });

      if (!updateResponse.ok) {
        const errorText = await updateResponse.text();
        console.error('[2FA] Failed to disable 2FA:', errorText);
        return reply.status(500).send({ error: 'Internal Server Error', message: 'Failed to disable 2FA' });
      }

      console.log('[2FA] 2FA disabled for user:', userId);
      
      return reply.send({ success: true, message: '2FA disabled successfully' });
    } catch (error) {
      console.error('[2FA] Error disabling 2FA:', error);
      return reply.status(500).send({ error: 'Internal Server Error', message: 'Failed to disable 2FA' });
    }
  };
}

/**
 * Verify 2FA code during login (used by user service)
 */
export function build2FALoginVerifyHandler(server: FastifyInstance) {
  return async (request: FastifyRequest<{ Body: { userId: string; code: string } }>, reply: FastifyReply) => {
    const { userId, code } = request.body;

    if (!userId || !code) {
      return reply.status(400).send({ error: 'Bad Request', message: 'userId and code are required' });
    }

    try {
      // Get user's secret from database
      const userResponse = await fetch(`http://database:3000/database/user?id=${userId}`);
      const users = await userResponse.json() as Array<{ twoAuth_secret: string | null; twoAuth_enabled: number }>;
      
      if (!users || users.length === 0) {
        return reply.status(404).send({ error: 'Not Found', message: 'User not found' });
      }

      const user = users[0]!;
      const secret = user.twoAuth_secret;
      
      if (!user.twoAuth_enabled || !secret) {
        return reply.status(400).send({ error: 'Bad Request', message: '2FA is not enabled for this user' });
      }

      // Verify the code
      const isValid = authenticator.verify({ token: code, secret });
      
      console.log('[2FA] Login verification for user:', userId, 'result:', isValid);
      
      return reply.send({ valid: isValid });
    } catch (error) {
      console.error('[2FA] Error during login verification:', error);
      return reply.status(500).send({ error: 'Internal Server Error', message: 'Failed to verify 2FA code' });
    }
  };
}