import { FastifyReply, FastifyRequest } from "fastify";
import { User } from "./shared/types/with_front/typeBox";
import customFetch from "./shared/utils/fetch";

export async function registerUserHandler(
  req: FastifyRequest<{ Body: User }>,
  reply: FastifyReply
) {
  console.log("[USER] registerUserHandler called with body:", req.body);
  try {
    // Request body is already validated by schema at this point
    const userData: User = req.body;
    // TODO: Hash password before sending to database
    
    console.log("[USER] Calling database service at http://database:3000/database/user");
    // Call database service
    const result = await customFetch(
      'http://database:3000/database/user',
      'POST',
      userData
    );
    console.log("[USER] Database returned:", result);
    userData.id = result as string;
    
    // Get JWT from internal authenticate service for immediate login
    const token = await customFetch(
      'http://authenticate:3000/get_jwt',
      'POST',
      {
        id: userData.id,
        name: userData.name,
        email: userData.email,
      }
    );

    return {
      success: true,
      message: 'User registered successfully',
      userId: userData.id,
      access_token: token
    };
    
  } catch (error: any) {
    console.log("[USER] Error occurred:", error);
    // Propagate database errors to frontend
    const statusCode = error.statusCode || 500;
    const errorResponse = {
      error: error.error || 'Registration Failed',
      message: error.message || 'Failed to register user',
      statusCode: statusCode,
      service: error.service || 'user',
      details: error.details
    };
    
    req.log.error(errorResponse);
    return reply.status(statusCode).send(errorResponse);
  }
}

export async function loginUserHandler(
  req: FastifyRequest<{ Body: User }>,
  reply: FastifyReply
) {
  console.log("[USER] loginUserHandler called with body:", req.body);
  try {
    const credentials: User = req.body;
    // 1) Find user by email
    const users : User = await customFetch(
      'http://database:3000/database/user',
      'GET',
      { email: credentials.email }
    ) as Array<{ id: string; name: string; email: string }>;

    if (!users || users.length === 0) {
      return reply.status(401).send({
        error: 'Unauthorized',
        message: 'Invalid credentials',
        statusCode: 401,
        service: 'user'
      });
    }

    const user : User = users[0];
    console.log("[USER] Found user:", user);

    // 2) Get stored password hash (currently stored in password_hash)
    const storedHash = await customFetch(
      'http://database:3000/database/user/password_hash',
      'GET',
      { id: user.id }
    ) as string | null;

    if (!storedHash || storedHash !== credentials.password) {
      return reply.status(401).send({
        error: 'Unauthorized',
        message: 'Invalid credentials',
        statusCode: 401,
        service: 'user'
      });
    }

    // 3) Get JWT from internal authenticate service (signing only)
    const token = await customFetch(
      'http://authenticate:3000/get_jwt',
      'POST',
      {
        id: user.id,
        name: user.name,
        email: user.email,
      }
    );

    return { access_token: token };
  } catch (error: any) {
    console.log("[USER] Login error:", error);
    const statusCode = error.statusCode || 500;
    return reply.status(statusCode).send({
      error: error.error || 'Login Failed',
      message: error.message || 'Failed to login user',
      statusCode,
      service: error.service || 'user',
      details: error.details
    });
  }
}

export async function findUserHandler(
  req: FastifyRequest<{ Querystring: User }>,
  reply: FastifyReply
) {
  try {
    const query = req.query;
    
    const users = await customFetch(
      'http://database:3000/database/user',
      'GET',
      query
    );
    
    return users;
    
  } catch (error: any) {
    const statusCode = error.statusCode || 500;
    return reply.status(statusCode).send({
      error: error.error || 'Query Failed',
      message: error.message,
      statusCode: statusCode,
      service: error.service || 'user'
    });
  }
}

export async function updateUserHandler(
  req: FastifyRequest<{ Body: User }>,
  reply: FastifyReply
) {
  try {
    const updateData = req.body;
    
    const result = await customFetch(
      'http://database:3000/database/user',
      'PUT',
      updateData
    );
    
    return {
      success: true,
      message: 'User updated successfully'
    };
    
  } catch (error: any) {
    const statusCode = error.statusCode || 500;
    return reply.status(statusCode).send({
      error: error.error || 'Update Failed',
      message: error.message,
      statusCode: statusCode,
      service: error.service || 'user'
    });
  }
}

export async function deleteUserHandler(
  req: FastifyRequest<{ Body: { id: string } }>,
  reply: FastifyReply
) {
  try {
    const result = await customFetch(
      'http://database:3000/database/user',
      'DELETE',
      req.body
    );
    
    return {
      success: true,
      message: 'User deleted successfully'
    };
    
  } catch (error: any) {
    const statusCode = error.statusCode || 500;
    return reply.status(statusCode).send({
      error: error.error || 'Deletion Failed',
      message: error.message,
      statusCode: statusCode,
      service: error.service || 'user'
    });
  }
}