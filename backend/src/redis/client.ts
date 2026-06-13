import { createClient, RedisClientType } from 'redis';
import type { UserProfile, UserTier, InvestmentPreferences } from '../../shared/index.js';

let client: RedisClientType | null = null;

export async function connectRedis(): Promise<RedisClientType> {
  const url = process.env.REDIS_URL || 'redis://default:jPfXuA8jYZGFNcLbzFUodyDxnnivweYi@definitive-seashore-development-19437.db.redis.io:18163';
  
  client = createClient({ url });
  
  client.on('error', (err) => {
    console.warn('[redis] Connection error:', err.message);
  });
  
  await client.connect();
  console.log('[redis] Connected successfully');
  return client;
}

export function getRedisClient(): RedisClientType | null {
  return client;
}

// ── User Profile Operations ──

export async function saveUserProfile(userId: string, tier: UserTier): Promise<UserProfile> {
  const profile: UserProfile = {
    userId,
    tier,
    fundsDeposited: 0,
    preferences: null,
    createdAt: new Date().toISOString(),
  };
  
  if (client) {
    await client.set(
      `user:${userId}:profile`,
      JSON.stringify(profile),
      { EX: 3600 } // 1 hour TTL
    );
  }
  
  return profile;
}

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  if (!client) return null;
  
  const data = await client.get(`user:${userId}:profile`);
  if (!data) return null;
  
  return JSON.parse(data) as UserProfile;
}

export async function updateUserPreferences(
  userId: string, 
  preferences: InvestmentPreferences
): Promise<void> {
  if (!client) return;
  
  const profile = await getUserProfile(userId);
  if (!profile) return;
  
  profile.preferences = preferences;
  await client.set(
    `user:${userId}:profile`,
    JSON.stringify(profile),
    { EX: 3600 }
  );
}

export async function updateFundsDeposited(
  userId: string, 
  amount: number
): Promise<void> {
  if (!client) return;
  
  const profile = await getUserProfile(userId);
  if (!profile) return;
  
  profile.fundsDeposited = amount;
  await client.set(
    `user:${userId}:profile`,
    JSON.stringify(profile),
    { EX: 3600 }
  );
}

// ── Session / Conversation State ──

export async function saveConversationState(
  userId: string,
  state: Record<string, unknown>
): Promise<void> {
  if (!client) return;
  await client.set(
    `user:${userId}:conversation`,
    JSON.stringify(state),
    { EX: 3600 }
  );
}

export async function getConversationState(userId: string): Promise<Record<string, unknown> | null> {
  if (!client) return null;
  const data = await client.get(`user:${userId}:conversation`);
  return data ? JSON.parse(data) : null;
}

// ── Market Data Cache (for Linkup responses) ──

export async function cacheMarketData(
  key: string,
  data: unknown,
  ttlSeconds: number = 900 // 15 minutes
): Promise<void> {
  if (!client) return;
  await client.set(
    `cache:market:${key}`,
    JSON.stringify(data),
    { EX: ttlSeconds }
  );
}

export async function getCachedMarketData(key: string): Promise<unknown | null> {
  if (!client) return null;
  const data = await client.get(`cache:market:${key}`);
  return data ? JSON.parse(data) : null;
}
