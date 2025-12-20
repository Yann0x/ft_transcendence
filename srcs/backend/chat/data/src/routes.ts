import { FastifyInstance } from 'fastify';
import * as handlers from './chat_methods';
import { ErrorResponseSchema, ChannelSchema, MessageSchema} from './shared/with_front/types';
import { Type } from '@sinclair/typebox/type';



const postChatSchema = {


}

const chatWssSchema = {
	schema: {
		description: 'WebSocket endpoint for chat communication',
		response: {
			101: Type.Object({
				message: Type.String(),
			}),
		},
	},
	websocket: true
};	

export function chatRoutes(server: FastifyInstance) {
  server.get('/chat/wss', {
    websocket: true,
    schema: {
      description: 'WebSocket endpoint for chat communication',
      response: {
        101: Type.Object({
          message: Type.String(),
        }),
      },
    }
  }, handlers.chatWss);
}
