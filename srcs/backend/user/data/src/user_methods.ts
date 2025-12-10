import { FastifyError, FastifyReply, FastifyRequest } from "fastify";
import { UserRegister } from "./shared/types";

export function registerUserHandler(
  req: FastifyRequest<{ Body: UserRegister }>,
  repl: FastifyReply
  ) : string
{
  console.log("Register MOCCCK");
  return "Register MOCCCK"
}

export function loginUserHandler(
  req: FastifyRequest<{ Body: UserLogin }>,
  repl: FastifyReply
  ) : string
{
  console.log("Login MOCCCK");
  return "Login MOCCCK"
}

export function updateUserHandler(
  req: FastifyRequest<{ Body: UserRegister }>,
  repl: FastifyReply
  ) : string
{
  console.log("Update MOCCCK");
  return "Update MOCCCK"
}

export function deleteUserHandler(
  req: FastifyRequest<{ Body: UserRegister }>,
  repl: FastifyReply
  ) : string
{
  console.log("delete MOCCCK");
  return "delete MOCCCK"
}

export function findUserHandler(
  req: FastifyRequest<{ Body: UserRegister }>,
  repl: FastifyReply
  ) : string
{
  console.log("find MOCCCK");
  return "find MOCCCK"
}