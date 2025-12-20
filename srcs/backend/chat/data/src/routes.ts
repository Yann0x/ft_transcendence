import { FastifyInstance } from 'fastify';
import * as handlers from './chat_methods';
import { ErrorResponseSchema, ChannelSchema, MessageSchema} from './shared/with_front/types';
import { Type } from '@sinclair/typebox/type';



const postChatSchema = {


}

const chatWssSchema = {
  description: 'WebSocket endpoint for chat communication',
  tags: ['chat'],
  response: {
	101: Type.Object({
		message: Type.String(),
	}),
	'4xx': ErrorResponseSchema,
	'5xx': ErrorResponseSchema,
  },
};	

export function chatRoutes(server: FastifyInstance) {

 	server.post('/chat/channel', postChatSchema, handlers.postChat);

	server.get('/chat/wss', 
}
