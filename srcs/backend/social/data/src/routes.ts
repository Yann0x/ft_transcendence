import { FastifyInstance } from 'fastify';
import * as handlers from './social_methods';
import { ErrorResponseSchema, SocialEventSchema } from './shared/with_front/types';
import { Type } from '@sinclair/typebox/type';

const socialWssSchema = {
  schema: {
    description: 'WebSocket endpoint',
    response: {
      101: Type.Object({
        message: Type.String(),
      }),
    },
  },
  websocket: true
};

export function socialRoutes(server: FastifyInstance) {
  // WebSocket endpoint for real-time social features
  server.get('/social/wss', socialWssSchema, handlers.socialWss);

  // REST endpoints for friend management
}
