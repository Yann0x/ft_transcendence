import { FastifyInstance } from 'fastify';
import * as handlers from './social_methods';
import { ErrorResponseSchema, SocialEventSchema } from './shared/with_front/types';
import { Type } from '@sinclair/typebox/type';

const socialWssSchema = {
  schema: {
    description: 'WebSocket endpoint for real-time social features (friend requests, online status)',
    response: {
      101: Type.Object({
        message: Type.String(),
      }),
    },
  },
  websocket: true
};

const friendRequestSchema = {
  schema: {
    body: Type.Object({
      user_id: Type.String(),
      friend_id: Type.String()
    }, { required: ['user_id', 'friend_id'], additionalProperties: false }),
    response: {
      200: Type.Object({
        success: Type.Boolean(),
        message: Type.String()
      }),
      400: ErrorResponseSchema,
      500: ErrorResponseSchema
    }
  }
};

const removeFriendSchema = {
  schema: {
    body: Type.Object({
      user_id: Type.String(),
      friend_id: Type.String()
    }, { required: ['user_id', 'friend_id'], additionalProperties: false }),
    response: {
      200: Type.Object({
        success: Type.Boolean(),
        message: Type.String()
      }),
      404: ErrorResponseSchema,
      500: ErrorResponseSchema
    }
  }
};

const getFriendsSchema = {
  schema: {
    querystring: Type.Object({
      user_id: Type.String()
    }, { required: ['user_id'] }),
    response: {
      200: Type.Array(Type.Object({
        id: Type.String(),
        name: Type.Optional(Type.String()),
        avatar: Type.Optional(Type.String()),
        status: Type.String(),
        initiated_by: Type.String(),
        since: Type.String(),
        onlineStatus: Type.String()
      })),
      400: ErrorResponseSchema,
      500: ErrorResponseSchema
    }
  }
};

export function socialRoutes(server: FastifyInstance) {
  // WebSocket endpoint for real-time social features
  server.get('/social/wss', socialWssSchema, handlers.socialWss);

  // REST endpoints for friend management
  server.post('/social/friend/request', friendRequestSchema, handlers.sendFriendRequestHandler);
  server.post('/social/friend/accept', friendRequestSchema, handlers.acceptFriendRequestHandler);
  server.delete('/social/friend/remove', removeFriendSchema, handlers.removeFriendHandler);
  server.get('/social/friends', getFriendsSchema, handlers.getFriendsHandler);
}
