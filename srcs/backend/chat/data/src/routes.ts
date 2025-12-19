import { FastifyInstance } from 'fastify';
import * as handlers from './chat_methods';
import { ErrorResponseSchema, ChannelSchema, MessageSchema} from './shared/with_front/types';
import { Type } from '@sinclair/typebox/type';


const postChatSchema = {
}

export function chatRoutes(server: FastifyInstance) {

 	server.post('/chat', postChatSchema, handlers.postChat);
}
