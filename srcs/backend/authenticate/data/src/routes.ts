/* ROUTES */

import { FastifyInstance } from 'fastify'
import {
  buildCheckJwtHandler,
  buildGetJwtHandler,
  hashPassword,
  validHashPassword,
  buildOAuth42UrlHandler,
  buildOAuth42CallbackHandler,
  build2FASetupHandler,
  build2FAVerifyHandler,
  build2FAEnableHandler,
  build2FADisableHandler,
  build2FALoginVerifyHandler
} from './authenticate_methods'
import { ErrorResponseSchema, UserSchema } from './shared/with_front/types'
import { Type } from '@sinclair/typebox'

/* SCHEMAS */

const getJwtSchema = {
  schema: {
    body: Type.Object(
      Type.Pick(UserSchema, ['id', 'name', 'email']).properties,
      { required: ['id', 'email'] }
    ),
    response: {
      200: { type: 'string' },
      400: ErrorResponseSchema,
      500: ErrorResponseSchema,
    },
  },
}

const checkJwtSchema = {
  schema: {
    headers: {
      type: 'object',
      properties: {
        authorization: { type: 'string' },
      },
    },
    response: {
      200: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          email: { type: 'string' },
        },
      },
      401: ErrorResponseSchema,
      500: ErrorResponseSchema,
    },
  },
}

const hashPassSchema = {
  schema: {
    body : Type.String(),
    response: {
      200: Type.String(),
      401: ErrorResponseSchema,
    },
  },
}

const checkPassSchema = {
  schema: {
    body : Type.Object({
      to_check: Type.String(),
      valid: Type.String(),
    }) ,
    response: {
      200: Type.Boolean(),
      401: ErrorResponseSchema,
    },
  },
}

/* REGISTER ROUTES */

export function authenticateRoutes(server: FastifyInstance) {
  server.post('/get_jwt', getJwtSchema, buildGetJwtHandler(server))
  server.post('/check_jwt', checkJwtSchema, buildCheckJwtHandler(server))
  server.post('/hash_pass', hashPassSchema, hashPassword(server))
  server.post('/check_pass_match', checkPassSchema, validHashPassword(server))

  server.get('/authenticate/oauth/42', buildOAuth42UrlHandler(server))
  server.get('/authenticate/oauth/42/callback', buildOAuth42CallbackHandler(server))

  server.post('/authenticate/2fa/setup', {
    schema: {
      body: Type.Object({
        userId: Type.String(),
        email: Type.String()
      }),
      response: {
        200: Type.Object({
          secret: Type.String(),
          qrCode: Type.String(),
          otpauthUrl: Type.String()
        }),
        400: ErrorResponseSchema,
        500: ErrorResponseSchema
      }
    }
  }, build2FASetupHandler(server))

  server.post('/authenticate/2fa/verify', {
    schema: {
      body: Type.Object({
        secret: Type.String(),
        code: Type.String()
      }),
      response: {
        200: Type.Object({ valid: Type.Boolean() }),
        400: ErrorResponseSchema,
        500: ErrorResponseSchema
      }
    }
  }, build2FAVerifyHandler(server))

  server.post('/authenticate/2fa/enable', {
    schema: {
      body: Type.Object({
        userId: Type.String(),
        secret: Type.String(),
        code: Type.String()
      }),
      response: {
        200: Type.Object({
          success: Type.Boolean(),
          message: Type.String()
        }),
        400: ErrorResponseSchema,
        401: ErrorResponseSchema,
        500: ErrorResponseSchema
      }
    }
  }, build2FAEnableHandler(server))

  server.post('/authenticate/2fa/disable', {
    schema: {
      body: Type.Object({
        userId: Type.String(),
        code: Type.String()
      }),
      response: {
        200: Type.Object({
          success: Type.Boolean(),
          message: Type.String()
        }),
        400: ErrorResponseSchema,
        401: ErrorResponseSchema,
        404: ErrorResponseSchema,
        500: ErrorResponseSchema
      }
    }
  }, build2FADisableHandler(server))

  server.post('/authenticate/2fa/login-verify', {
    schema: {
      body: Type.Object({
        userId: Type.String(),
        code: Type.String()
      }),
      response: {
        200: Type.Object({ valid: Type.Boolean() }),
        400: ErrorResponseSchema,
        404: ErrorResponseSchema,
        500: ErrorResponseSchema
      }
    }
  }, build2FALoginVerifyHandler(server))
}
