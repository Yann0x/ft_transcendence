import { FastifyReply, FastifyRequest } from 'fastify';

function handleThisError(error: any, request: FastifyRequest, reply: FastifyReply) {
  const response = {
    error: error?.name ?? 'Unknow Error',
    message: error?.message,
    statusCode: error?.statusCode ?? 500,
    service: 'unknow',
    details: error?.validation ?? error?.detail,
  };
  // Use request logger when available
  if (request?.log?.error) {
    request.log.error(response);
  } else {
    console.error(response);
  }
    reply.code(response.statusCode).send(response);
}

module.exports = handleThisError;