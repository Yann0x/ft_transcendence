import { FastifyReply, FastifyRequest } from "fastify";
import { randomUUID } from "crypto";
import { User, UserPublic, Message, LoginResponse } from "./shared/with_front/types";
import customFetch from "./shared/utils/fetch";
import { userManager } from "./user_manager.js";

async function fillUser(user : User): Promise<User>
{
      user.tournaments = [];
      user.matches = [];
      user.stats = {
        user_id: user.id!,
        games_played: 0,
        games_won: 0,
        games_lost: 0,
        win_rate: 0
      };

      return user;
}

async function buildLoginResponse(user: User, token: string): Promise<LoginResponse>
{
  const friends = await userManager.getFriends(user.id!);
  const blockedUsers = await userManager.getBlockedUsers(user.id!);
  const friendIds = friends.map(friend => friend.id!);
  const blockedIds = blockedUsers.map(blocked => blocked.id!);
  const cachedUsers: UserPublic[] = [...friends, ...blockedUsers];

  const uniqueCachedUsers = cachedUsers.filter((user, index, self) =>
    index === self.findIndex(u => u.id === user.id)
  );

  return {
    user,
    cachedUsers: uniqueCachedUsers,
    friendIds,
    blockedIds,
    token
  };
}

export async function registerUserHandler(
  req: FastifyRequest<{ Body: User }>,
  reply: FastifyReply
) {
  try {
    const userData: User = req.body;
    userData.id = randomUUID();
    userData.password = await customFetch(
      'http://authenticate:3000/hash_pass',
      'POST',
      userData.password
    );

    await customFetch(
      'http://database:3000/database/user',
      'POST',
      userData
    );

    const token = await customFetch(
      'http://authenticate:3000/get_jwt',
      'POST',
      {
        id: userData.id,
        name: userData.name,
        email: userData.email,
      }
    );

    await fillUser(userData);

    const loginResponse = await buildLoginResponse(userData, token as string);
    return loginResponse;

  } catch (error: any) {
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
  try {
    const credentials: User = req.body;
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

    const storedHash = await customFetch(
      'http://database:3000/database/user/password_hash',
      'GET',
      { id: user.id }
    ) as string | null;

    await customFetch('http://authenticate:3000/check_pass_match', 'POST', { to_check: credentials.password, valid: storedHash } );

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

    const loginResponse = await buildLoginResponse(user, token as string);
    return loginResponse;
  } catch (error: any) {
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

    const result = await Promise.all(users.map(async (user) => {
      const isOwnData = requestingUserId && user.id && requestingUserId === user.id;

      if (isOwnData) {
        await fillUser(user);
        return user as User;
      } else {
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
    const updateData = req.body as User;

    const result = await customFetch(
      'http://database:3000/database/user',
      'PUT',
      updateData
    );

    const userId = updateData.id;
    if (userId) {
      try {
        const friends = await customFetch(
          `http://database:3000/database/friends?user_id=${userId}`,
          'GET'
        ) as Array<{ id: string }>;

        if (friends && friends.length > 0) {
          const friendIds = friends.map(f => f.id);
          await customFetch('http://social:3000/social/notify/user_update', 'POST', {
            notifyUserIds: friendIds,
            updatedUserId: userId
          });
        }
      } catch (notifyError) {
        console.error('Failed to notify friends about profile update:', notifyError);
      }
    }

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

    try {
      let channelId = await customFetch('http://database:3000/database/channel/find-dm', 'GET', {
        user1_id: userId,
        user2_id: friendId
      }) as number | null;

      if (!channelId) {
        const channelData = {
          id : randomUUID(),
          type: 'private',
          created_by: userId,
          created_at: new Date().toISOString()
        };

        const newChannelId = await customFetch('http://database:3000/database/channel', 'POST', channelData) as string;

        if (newChannelId) {
          channelId = newChannelId as unknown as number;
          // Add both users as members
          await customFetch('http://database:3000/database/channel/member', 'POST', {
            channel_id: newChannelId,
            user_id: userId
          });

          await customFetch('http://database:3000/database/channel/member', 'POST', {
            channel_id: newChannelId,
            user_id: friendId
          });

        }
      }

      if (channelId) {
        const channel = await userManager.getChannel(String(channelId));
        if (channel) {
          await customFetch('http://social:3000/social/notify/channel_update', 'POST', {
            userIds: [userId, friendId],
            channel: channel
          });
        }
      }
    } catch (error) {
      console.error('[USER] Failed to handle DM channel for new friendship:', error);
    }

    try {
      const currentUser = await userManager.getUser(userId);
      const friendUser = await userManager.getUser(friendId);

      if (currentUser && friendUser) {
        const currentUserPublic = { id: currentUser.id, name: currentUser.name, avatar: currentUser.avatar, status: currentUser.status };
        const friendUserPublic = { id: friendUser.id, name: friendUser.name, avatar: friendUser.avatar, status: friendUser.status };

        await customFetch('http://social:3000/social/notify/friend_add', 'POST', {
          userIds: [userId],
          friend: friendUserPublic
        });

        await customFetch('http://social:3000/social/notify/friend_add', 'POST', {
          userIds: [friendId],
          friend: currentUserPublic
        });
      }
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

    try {
      await customFetch('http://social:3000/social/notify/friend_remove', 'POST', {
        userIds: [userId],
        friendId: friendId
      });

      await customFetch('http://social:3000/social/notify/friend_remove', 'POST', {
        userIds: [friendId],
        friendId: userId
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

    // Get friends directly from database
    const friends = await customFetch(
      `http://database:3000/database/friends?user_id=${userId}`,
      'GET'
    );

    return reply.status(200).send(friends || []);
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

    const channel = await userManager.getChannel(channelId);

    if (!channel) {
      return reply.status(404).send({ error: 'Not Found', message: 'Channel not found' });
    }

    if (!channel.members.includes(userId)) {
      return reply.status(403).send({ error: 'Forbidden', message: 'You are not a member of this channel' });
    }

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

    const channel = await userManager.getChannel(channelId);
    if (!channel) {
      return reply.status(404).send({ error: 'Not Found', message: 'Channel not found' });
    }

    if (!channel.members.includes(userId)) {
      return reply.status(403).send({ error: 'Forbidden', message: 'You are not a member of this channel' });
    }

    const success = await customFetch('http://database:3000/database/channel/mark-read', 'PUT', {
      channel_id: channelId,
      user_id: userId
    });

    if (!success) {
      return reply.status(500).send({ error: 'Failed to mark as read', message: 'Database update failed' });
    }

    const now = new Date().toISOString();
    channel.messages.forEach((msg: Message) => {
      if (msg.sender_id !== userId && msg.read_at === null) {
        msg.read_at = now;
      }
    });

    try {
      await customFetch('http://social:3000/social/notify/channel_update', 'POST', {
        userIds: channel.members,
        channel: channel
      });
    } catch (error) {
      console.error('[USER] Failed to notify social service about channel update:', error);
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

    const user = await userManager.getUser(userId);
    if (user) {
      if (!user.blocked_users) user.blocked_users = [];
      if (!user.blocked_users.includes(blockedUserId)) {
        user.blocked_users.push(blockedUserId);
      }
    }

    try {
      await userManager.removeFriend(userId, blockedUserId);
    } catch (error) {
      console.error('[USER] Failed to remove friend relationship:', error);
    }

    try {
      await customFetch('http://social:3000/social/notify/user_update', 'POST', {
        notifyUserIds: [userId, blockedUserId],
        updatedUserId: userId
      });

      await customFetch('http://social:3000/social/notify/user_update', 'POST', {
        notifyUserIds: [userId, blockedUserId],
        updatedUserId: blockedUserId
      });
    } catch (error) {
      console.error('[USER] Failed to send user_update events:', error);
    }

    try {
      const channelId = await customFetch('http://database:3000/database/channel/find-dm', 'GET', {
        user1_id: userId,
        user2_id: blockedUserId
      }) as number | null;

      if (channelId) {
        const channel = await userManager.getChannel(String(channelId));
        if (channel) {
          (channel as any).isBlocked = true;
          await customFetch('http://social:3000/social/notify/channel_update', 'POST', {
            userIds: [userId, blockedUserId],
            channel: channel
          });
        }
      }
    } catch (error) {
      console.error('[USER] Failed to send channel_update after blocking:', error);
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

    const success = await customFetch('http://database:3000/database/blocked', 'DELETE', {
      user_id: userId,
      blocked_user_id: blockedUserId
    });

    if (!success) {
      return reply.status(400).send({ success: false, message: 'Failed to unblock user' });
    }

    const user = await userManager.getUser(userId);
    if (user && user.blocked_users) {
      user.blocked_users = user.blocked_users.filter((id: string) => id !== blockedUserId);
    }

    try {
      await customFetch('http://social:3000/social/notify/user_update', 'POST', {
        notifyUserIds: [userId, blockedUserId],
        updatedUserId: userId
      });

      await customFetch('http://social:3000/social/notify/user_update', 'POST', {
        notifyUserIds: [userId, blockedUserId],
        updatedUserId: blockedUserId
      });
    } catch (error) {
      console.error('[USER] Failed to send user_update events:', error);
    }

    try {
      const channelId = await customFetch('http://database:3000/database/channel/find-dm', 'GET', {
        user1_id: userId,
        user2_id: blockedUserId
      }) as number | null;

      if (channelId) {
        const channel = await userManager.getChannel(String(channelId));
        if (channel) {
          (channel as any).isBlocked = false;
          await customFetch('http://social:3000/social/notify/channel_update', 'POST', {
            userIds: [userId, blockedUserId],
            channel: channel
          });
        }
      }
    } catch (error) {
      console.error('[USER] Failed to send channel_update after unblocking:', error);
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

    const existingChannelId = await customFetch('http://database:3000/database/channel/find-dm', 'GET', {
      user1_id: currentUserId,
      user2_id: otherUserId
    }) as number | null;

    if (existingChannelId) {
      const channel = await userManager.getChannel(String(existingChannelId));
      return reply.status(200).send(channel);
    }

    const channelData = {
      type: 'private',
      created_by: currentUserId,
      created_at: new Date().toISOString()
    };

    const newChannelId = await customFetch('http://database:3000/database/channel', 'POST', channelData) as string;

    if (!newChannelId) {
      return reply.status(500).send({ error: 'Internal Server Error', message: 'Failed to create channel' });
    }

    await customFetch('http://database:3000/database/channel/member', 'POST', {
      channel_id: newChannelId,
      user_id: currentUserId
    });

    await customFetch('http://database:3000/database/channel/member', 'POST', {
      channel_id: newChannelId,
      user_id: otherUserId
    });

    const channel = await userManager.getChannel(newChannelId);

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

export async function getUserChannels(request: FastifyRequest, reply: FastifyReply) {
  const userId = request.headers['x-sender-id'] as string;
  if (!userId) {
    return reply.status(401).send({ error: 'Unauthorized' });
  }

  try {
    const channels = await customFetch(
      `http://database:3000/database/user/channels?user_id=${userId}`,
      'GET'
    );

    return reply.send(channels);
  } catch (error: any) {
    console.error('[USER] getUserChannels error:', error);
    return reply.status(500).send({ error: 'Internal Server Error', message: 'Failed to load channels' });
  }
}