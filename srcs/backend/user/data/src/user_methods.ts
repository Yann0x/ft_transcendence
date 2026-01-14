import { FastifyReply, FastifyRequest } from "fastify";
import { User, UserPublic, Message } from "./shared/with_front/types";
import customFetch from "./shared/utils/fetch";
import { userManager } from "./user_manager.js";

async function fillUser(user : User): Promise<User> {

      user.channels = await userManager.getChannels(user.id);

      try {
        // TODO: Implement endpoint to get user's tournaments
        // user.tournaments = await customFetch('http://game:3000/game/user-tournaments', 'GET', { user_id: user.id });
        user.tournaments = [];
      } catch (error) {
        user.tournaments = [];
      }

      // Fetch user's matches
      try {
        // TODO: Implement endpoint to get user's matches
        // user.matches = await customFetch('http://game:3000/game/user-matches', 'GET', { user_id: user.id });
        user.matches = [];
      } catch (error) {
        user.matches = [];
      }

      // Fetch user's stats
      try {
        // TODO: Implement endpoint to get user's stats
        // user.stats = await customFetch('http://game:3000/game/user-stats', 'GET', { user_id: user.id });
        user.stats = {
          user_id: user.id!,
          games_played: 0,
          games_won: 0,
          games_lost: 0,
          win_rate: 0
        };
      } catch (error) {
        user.stats = {
          user_id: user.id!,
          games_played: 0,
          games_won: 0,
          games_lost: 0,
          win_rate: 0
        };
      }

      // Fetch user's friends from UserManager
      try {
        user.friends = await userManager.getFriends(user.id!);
      } catch (error) {
        user.friends = [];
      }

      // Fetch user's blocked users
      try {
        const blockedUsers = await customFetch('http://database:3000/database/blocked', 'GET', {
          user_id: user.id
        }) as string[];
        user.blocked_users = blockedUsers || [];
      } catch (error) {
        console.error('[USER] Failed to load blocked users:', error);
        user.blocked_users = [];
      }

      // Fetch user's channels/chats

      return user;
}

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

    // Fill user data (friends, channels, stats, etc.) for auto-login
    await fillUser(userData);

    // Return same format as login for automatic login
    return { token, user: userData };

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
    ) as Array<User>;

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

    await fillUser(user);

    return { token, user };
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

export async function logoutUserHandler(
  req: FastifyRequest<{ Body: User }>,
  reply: FastifyReply
  ){ 
    // NO LOGOUT LOGIC NEED YET
  }

export async function findUserHandler(
  req: FastifyRequest<{ Querystring: User }>,
  reply: FastifyReply
) {
  try {
    const query = req.query;
    const requestingUserId = req.headers['x-sender-id'] as string;

    const users = await customFetch(
      'http://database:3000/database/user',
      'GET',
      query
    ) as User[];

    if (!users || users.length === 0) {
      return [];
    }

    // Map users: if requesting user searches for themselves, return full user, else public data
    const result = await Promise.all(users.map(async (user) => {
      // Check if this is the requesting user searching for themselves
      const isOwnData = requestingUserId && user.id && requestingUserId === user.id;
      console.log(`[USER] Processing user ${user.id}, requestingUserId: ${requestingUserId}, isOwnData: ${isOwnData}`);

      if (isOwnData) {
        // Return full user data with friends, stats, etc.
        await fillUser(user);
        console.log(`[USER] Returning full user data for ${user.id}`, user);
        return user as User;
      } else {
        console.log(`[USER] Returning public user data for ${user.id}`, user);
        return user as UserPublic;
      }
   }
));
    return result;

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

export async function addFriendHandler(
  req: FastifyRequest<{ Body: { friendId: string } }>,
  reply: FastifyReply
) {
  try {
    const userId = req.headers['x-sender-id'] as string;
    const { friendId } = req.body;

    if (!userId) {
      return reply.status(401).send({ success: false, message: 'Unauthorized' });
    }

    if (userId === friendId) {
      return reply.status(400).send({ success: false, message: 'Cannot add yourself as friend' });
    }

    const success = await userManager.addFriend(userId, friendId);

    if (!success) {
      return reply.status(400).send({ success: false, message: 'Failed to add friend' });
    }

    // Get or create DM channel and notify both users
    try {
      // Check if DM channel already exists (userManager.addFriend may have created it)
      let channelId = await customFetch('http://database:3000/database/channel/find-dm', 'GET', {
        user1_id: userId,
        user2_id: friendId
      }) as number | null;

      // If channel doesn't exist yet, create it
      if (!channelId) {
        const currentUser = await userManager.getUser(userId);
        const otherUser = await userManager.getUser(friendId);

        if (currentUser && otherUser) {
          const channelName = `${currentUser.name}&${otherUser.name}`;
          const channelData = {
            name: channelName,
            type: 'private',
            created_by: userId,
            created_at: new Date().toISOString()
          };

          const newChannelId = await customFetch('http://database:3000/database/channel', 'POST', channelData) as string;

          if (newChannelId) {
            channelId = parseInt(newChannelId);

            // Add both users as members
            await customFetch('http://database:3000/database/channel/member', 'POST', {
              channel_id: channelId,
              user_id: userId
            });

            await customFetch('http://database:3000/database/channel/member', 'POST', {
              channel_id: channelId,
              user_id: friendId
            });

            console.log(`[USER] Created DM channel ${channelId} for new friendship ${userId} <-> ${friendId}`);
          }
        }
      }

      // Always notify both users about the channel (whether new or existing)
      if (channelId) {
        const channel = await userManager.getChannel(String(channelId));
        if (channel) {
          await customFetch('http://social:3000/social/notify/channel_update', 'POST', {
            userIds: [userId, friendId],
            channel: channel
          });
          console.log(`[USER] Sent channel_update for DM channel ${channelId} to both users`);
        }
      }
    } catch (error) {
      console.error('[USER] Failed to handle DM channel for new friendship:', error);
      // Don't fail the whole request if channel creation fails
    }

    // Notify both users that they need to refresh their own data
    try {
      await customFetch('http://social:3000/social/notify/user_update', 'POST', {
        notifyUserIds: [userId, friendId],
        updatedUserId: userId
      });
      await customFetch('http://social:3000/social/notify/user_update', 'POST', {
        notifyUserIds: [userId, friendId],
        updatedUserId: friendId
      });
    } catch (error) {
      console.error('[USER] Failed to notify social service:', error);
    }

    return reply.status(200).send({ success: true, message: 'Friend added' });
  } catch (error: any) {
    console.error('[USER] addFriend error:', error);
    return reply.status(500).send({ success: false, message: 'Internal server error' });
  }
}

export async function removeFriendHandler(
  req: FastifyRequest<{ Body: { friendId: string } }>,
  reply: FastifyReply
) {
  try {
    const userId = req.headers['x-sender-id'] as string;
    const { friendId } = req.body;

    if (!userId) {
      return reply.status(401).send({ success: false, message: 'Unauthorized' });
    }

    const success = await userManager.removeFriend(userId, friendId);

    if (!success) {
      return reply.status(400).send({ success: false, message: 'Failed to remove friend' });
    }

    // Notify both users that they need to refresh their own data
    try {
      await customFetch('http://social:3000/social/notify/user_update', 'POST', {
        notifyUserIds: [userId, friendId],
        updatedUserId: userId
      });
      await customFetch('http://social:3000/social/notify/user_update', 'POST', {
        notifyUserIds: [userId, friendId],
        updatedUserId: friendId
      });
    } catch (error) {
      console.error('[USER] Failed to notify social service:', error);
    }

    return reply.status(200).send({ success: true, message: 'Friend removed' });
  } catch (error: any) {
    console.error('[USER] removeFriend error:', error);
    return reply.status(500).send({ success: false, message: 'Internal server error' });
  }
}

export async function getFriendsHandler(
  req: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const userId = req.headers['x-sender-id'] as string;

    if (!userId) {
      return reply.status(401).send([]);
    }

    const friends = await userManager.getFriends(userId);
    return reply.status(200).send(friends);
  } catch (error: any) {
    console.error('[USER] getFriends error:', error);
    return reply.status(500).send([]);
  }
}

export async function getChannelHandler(
  req: FastifyRequest<{ Params: { channelId: string } }>,
  reply: FastifyReply
) {
  try {
    const userId = req.headers['x-sender-id'] as string;
    const { channelId } = req.params;

    if (!userId) {
      return reply.status(401).send({ error: 'Unauthorized', message: 'User not authenticated' });
    }

    // Fetch the channel from user manager (which gets fresh data from database)
    const channel = await userManager.getChannel(channelId);

    if (!channel) {
      return reply.status(404).send({ error: 'Not Found', message: 'Channel not found' });
    }

    // Check if user is a member of this channel
    if (!channel.members.includes(userId)) {
      return reply.status(403).send({ error: 'Forbidden', message: 'You are not a member of this channel' });
    }

    // Check if this conversation is blocked (symmetric check)
    if (channel.type === 'private' && channel.members && channel.members.length === 2) {
      const otherUserId = channel.members.find((id: string) => id !== userId);
      if (otherUserId) {
        const currentUser = await userManager.getUser(userId);
        const otherUser = await userManager.getUser(otherUserId);

        const iBlockedThem = currentUser?.blocked_users?.includes(otherUserId) || false;
        const theyBlockedMe = otherUser?.blocked_users?.includes(userId) || false;

        (channel as any).isBlocked = iBlockedThem || theyBlockedMe;
      }
    }

    return reply.status(200).send(channel);
  } catch (error: any) {
    console.error('[USER] getChannel error:', error);
    return reply.status(500).send({ error: 'Internal Server Error', message: 'Failed to fetch channel' });
  }
}

export async function markChannelReadHandler(
  req: FastifyRequest<{ Params: { channelId: string } }>,
  reply: FastifyReply
) {
  try {
    const userId = req.headers['x-sender-id'] as string;
    const { channelId } = req.params;

    if (!userId) {
      return reply.status(401).send({ error: 'Unauthorized', message: 'User not authenticated' });
    }

    // Get channel from user manager
    const channel = await userManager.getChannel(channelId);
    if (!channel) {
      return reply.status(404).send({ error: 'Not Found', message: 'Channel not found' });
    }

    // Check if user is member
    if (!channel.members.includes(userId)) {
      return reply.status(403).send({ error: 'Forbidden', message: 'You are not a member of this channel' });
    }

    // Mark all messages as read in database
    const success = await customFetch('http://database:3000/database/channel/mark-read', 'PUT', {
      channel_id: parseInt(channelId),
      user_id: userId
    });

    if (!success) {
      return reply.status(500).send({ error: 'Failed to mark as read', message: 'Database update failed' });
    }

    // Update in-memory cache
    const now = new Date().toISOString();
    channel.messages.forEach((msg: Message) => {
      if (msg.sender_id !== userId && msg.read_at === null) {
        msg.read_at = now;
      }
    });

    // Notify all channel members about the updated channel (with read status)
    try {
      await customFetch('http://social:3000/social/notify/channel_update', 'POST', {
        userIds: channel.members,
        channel: channel
      });
      console.log(`[USER] Sent channel_update event for channel ${channelId} after marking as read`);
    } catch (error) {
      console.error('[USER] Failed to notify social service about channel update:', error);
      // Don't fail the request if notification fails
    }

    return reply.status(200).send({ success: true, message: 'Marked as read' });
  } catch (error: any) {
    console.error('[USER] markChannelRead error:', error);
    return reply.status(500).send({ error: 'Internal Server Error', message: 'Failed to mark channel as read' });
  }
}

export async function sendMessage(req: FastifyRequest, reply: FastifyReply)
{
  try {
    const sender_id = req.headers['x-sender-id'] as string;
    const message = req.body as Message;

    if (!message.content || !message.channel_id)
      return reply.status(400).send({error: 'sendMessage', message: 'Empty content or empty channel_id'});

    message.sender_id = sender_id;
    message.sent_at = new Date().toISOString();
    message.read_at = null;

    const response = await userManager.sendMessage(message);
    if (!response.success)
      return reply.status(400).send({error: 'sendMessage', message: 'Cannot send message - blocked or invalid' });

    return reply.status(200).send({ success: true, message: response.message });
    }
    catch (error: any)
    {
      return reply.status(400).send({error: 'in sendMessage', message: `Catch error : ${error}`})
    }
}

export async function blockUserHandler(
  req: FastifyRequest<{ Body: { blockedUserId: string } }>,
  reply: FastifyReply
) {
  try {
    const userId = req.headers['x-sender-id'] as string;
    const { blockedUserId } = req.body;

    if (!userId) {
      return reply.status(401).send({ success: false, message: 'Unauthorized' });
    }

    if (userId === blockedUserId) {
      return reply.status(400).send({ success: false, message: 'Cannot block yourself' });
    }

    const success = await customFetch('http://database:3000/database/blocked', 'POST', {
      user_id: userId,
      blocked_user_id: blockedUserId
    });

    if (!success) {
      return reply.status(400).send({ success: false, message: 'Failed to block user' });
    }

    // Update user manager cache
    const user = await userManager.getUser(userId);
    if (user) {
      if (!user.blocked_users) user.blocked_users = [];
      if (!user.blocked_users.includes(blockedUserId)) {
        user.blocked_users.push(blockedUserId);
      }
    }

    // Remove friend relationship if exists (symmetric blocking)
    try {
      const isFriend = await userManager.isFriend(userId, blockedUserId);
      if (isFriend) {
        console.log(`[USER] Removing friend relationship between ${userId} and ${blockedUserId}`);
        await userManager.removeFriend(userId, blockedUserId);
      }
    } catch (error) {
      console.error('[USER] Failed to remove friend relationship:', error);
      // Don't fail the block request if friend removal fails
    }

    // Always send user_update events after blocking (to refresh friends lists and blocked lists)
    try {
      await customFetch('http://social:3000/social/notify/user_update', 'POST', {
        notifyUserIds: [userId, blockedUserId],
        updatedUserId: userId
      });

      await customFetch('http://social:3000/social/notify/user_update', 'POST', {
        notifyUserIds: [userId, blockedUserId],
        updatedUserId: blockedUserId
      });

      console.log(`[USER] Sent user_update events to both users after blocking`);
    } catch (error) {
      console.error('[USER] Failed to send user_update events:', error);
    }

    // Send channel_update to both users for symmetric UI update
    try {
      const channelId = await customFetch('http://database:3000/database/channel/find-dm', 'GET', {
        user1_id: userId,
        user2_id: blockedUserId
      }) as number | null;

      if (channelId) {
        const channel = await userManager.getChannel(String(channelId));
        if (channel) {
          // Add isBlocked flag (true after blocking)
          (channel as any).isBlocked = true;
          // Send channel_update to BOTH users (symmetric)
          await customFetch('http://social:3000/social/notify/channel_update', 'POST', {
            userIds: [userId, blockedUserId],
            channel: channel
          });
          console.log(`[USER] Sent channel_update for channel ${channelId} to both users after blocking`);
        }
      }
    } catch (error) {
      console.error('[USER] Failed to send channel_update after blocking:', error);
      // Don't fail the request if notification fails
    }

    return reply.status(200).send({ success: true, message: 'User blocked' });
  } catch (error: any) {
    console.error('[USER] blockUser error:', error);
    return reply.status(500).send({ success: false, message: 'Internal server error' });
  }
}

export async function unblockUserHandler(
  req: FastifyRequest<{ Body: { blockedUserId: string } }>,
  reply: FastifyReply
) {
  try {
    const userId = req.headers['x-sender-id'] as string;
    const { blockedUserId } = req.body;

    if (!userId) {
      return reply.status(401).send({ success: false, message: 'Unauthorized' });
    }

    // Remove from database
    const success = await customFetch('http://database:3000/database/blocked', 'DELETE', {
      user_id: userId,
      blocked_user_id: blockedUserId
    });

    if (!success) {
      return reply.status(400).send({ success: false, message: 'Failed to unblock user' });
    }

    // Update user manager cache
    const user = await userManager.getUser(userId);
    if (user && user.blocked_users) {
      user.blocked_users = user.blocked_users.filter((id: string) => id !== blockedUserId);
    }

    // Send user_update events to both users (to refresh blocked lists)
    try {
      await customFetch('http://social:3000/social/notify/user_update', 'POST', {
        notifyUserIds: [userId, blockedUserId],
        updatedUserId: userId
      });

      await customFetch('http://social:3000/social/notify/user_update', 'POST', {
        notifyUserIds: [userId, blockedUserId],
        updatedUserId: blockedUserId
      });

      console.log(`[USER] Sent user_update events to both users after unblocking`);
    } catch (error) {
      console.error('[USER] Failed to send user_update events:', error);
    }

    // Send channel_update to both users for symmetric UI update
    try {
      const channelId = await customFetch('http://database:3000/database/channel/find-dm', 'GET', {
        user1_id: userId,
        user2_id: blockedUserId
      }) as number | null;

      if (channelId) {
        const channel = await userManager.getChannel(String(channelId));
        if (channel) {
          // Add isBlocked flag (false after unblocking)
          (channel as any).isBlocked = false;
          // Send channel_update to BOTH users (symmetric)
          await customFetch('http://social:3000/social/notify/channel_update', 'POST', {
            userIds: [userId, blockedUserId],
            channel: channel
          });
          console.log(`[USER] Sent channel_update for channel ${channelId} to both users after unblocking`);
        }
      }
    } catch (error) {
      console.error('[USER] Failed to send channel_update after unblocking:', error);
      // Don't fail the request if notification fails
    }

    return reply.status(200).send({ success: true, message: 'User unblocked' });
  } catch (error: any) {
    console.error('[USER] unblockUser error:', error);
    return reply.status(500).send({ success: false, message: 'Internal server error' });
  }
}

export async function getBlockedUsersHandler(
  req: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const userId = req.headers['x-sender-id'] as string;

    if (!userId) {
      return reply.status(401).send([]);
    }

    const blockedIds = await customFetch('http://database:3000/database/blocked', 'GET', {
      user_id: userId
    }) as string[];

    return reply.status(200).send(blockedIds || []);
  } catch (error: any) {
    console.error('[USER] getBlockedUsers error:', error);
    return reply.status(500).send([]);
  }
}

export async function getBlockedUsersByIdHandler(
  req: FastifyRequest<{ Params: { userId: string } }>,
  reply: FastifyReply
) {
  try {
    const { userId } = req.params;

    if (!userId) {
      return reply.status(400).send([]);
    }

    const blockedIds = await customFetch('http://database:3000/database/blocked', 'GET', {
      user_id: userId
    }) as string[];

    return reply.status(200).send(blockedIds || []);
  } catch (error) {
    console.error('[USER] getBlockedUsersById error:', error);
    return reply.status(500).send([]);
  }
}

export async function findDMChannelHandler(
  req: FastifyRequest<{ Querystring: { userId: string } }>,
  reply: FastifyReply
) {
  try {
    const currentUserId = req.headers['x-sender-id'] as string;
    const { userId: otherUserId } = req.query;

    if (!currentUserId) {
      return reply.status(401).send({ error: 'Unauthorized', message: 'User not authenticated' });
    }

    if (!otherUserId) {
      return reply.status(400).send({ error: 'Bad Request', message: 'userId query parameter is required' });
    }

    // Find DM channel between current user and other user
    const channelId = await customFetch('http://database:3000/database/channel/find-dm', 'GET', {
      user1_id: currentUserId,
      user2_id: otherUserId
    }) as number | null;

    if (!channelId) {
      return reply.status(404).send({ error: 'Not Found', message: 'No DM channel exists between these users' });
    }

    // Get full channel data
    const channel = await userManager.getChannel(String(channelId));
    if (!channel) {
      return reply.status(404).send({ error: 'Not Found', message: 'Channel not found' });
    }

    return reply.status(200).send(channel);
  } catch (error: any) {
    console.error('[USER] findDMChannel error:', error);
    return reply.status(500).send({ error: 'Internal Server Error', message: 'Failed to find DM channel' });
  }
}

export async function createDMChannelHandler(
  req: FastifyRequest<{ Body: { userId: string } }>,
  reply: FastifyReply
) {
  try {
    const currentUserId = req.headers['x-sender-id'] as string;
    const { userId: otherUserId } = req.body;

    if (!currentUserId) {
      return reply.status(401).send({ error: 'Unauthorized', message: 'User not authenticated' });
    }

    if (!otherUserId) {
      return reply.status(400).send({ error: 'Bad Request', message: 'userId is required in request body' });
    }

    // Check if DM channel already exists
    const existingChannelId = await customFetch('http://database:3000/database/channel/find-dm', 'GET', {
      user1_id: currentUserId,
      user2_id: otherUserId
    }) as number | null;

    if (existingChannelId) {
      // Channel already exists, return it
      const channel = await userManager.getChannel(String(existingChannelId));
      return reply.status(200).send(channel);
    }

    // Get user data for channel name
    const currentUser = await userManager.getUser(currentUserId);
    const otherUser = await userManager.getUser(otherUserId);

    if (!currentUser || !otherUser) {
      return reply.status(404).send({ error: 'Not Found', message: 'User not found' });
    }

    // Create new DM channel
    const channelName = `${currentUser.name}&${otherUser.name}`;
    const channelData = {
      name: channelName,
      type: 'private',
      created_by: currentUserId,
      created_at: new Date().toISOString()
    };

    const newChannelId = await customFetch('http://database:3000/database/channel', 'POST', channelData) as string;

    if (!newChannelId) {
      return reply.status(500).send({ error: 'Internal Server Error', message: 'Failed to create channel' });
    }

    // Add both users as members
    await customFetch('http://database:3000/database/channel/member', 'POST', {
      channel_id: parseInt(newChannelId),
      user_id: currentUserId
    });

    await customFetch('http://database:3000/database/channel/member', 'POST', {
      channel_id: parseInt(newChannelId),
      user_id: otherUserId
    });

    // Get full channel data
    const channel = await userManager.getChannel(newChannelId);

    // Notify both users via WebSocket
    await customFetch('http://social:3000/social/notify/channel_update', 'POST', {
      userIds: [currentUserId, otherUserId],
      channel: channel
    });

    return reply.status(200).send(channel);
  } catch (error: any) {
    console.error('[USER] createDMChannel error:', error);
    return reply.status(500).send({ error: 'Internal Server Error', message: 'Failed to create DM channel' });
  }
}