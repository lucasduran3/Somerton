function requireEnv(key: string): string {
  const value = process.env[key];
  if (value === undefined) {
    throw new Error(`Environment variable not found: ${key}`);
  }

  return value;
}

export const config = {
  port: parseInt(requireEnv('PORT'), 10),
  clientUrl: requireEnv('CLIENT_URL'),
  redis: {
    host: requireEnv('REDIS_HOST'),
    port: parseInt(requireEnv('REDIS_PORT'), 10),
    password: requireEnv('REDIS_PASSWORD'),
  },
  nodeEnv: (process.env.NODE_ENV ?? 'development') as
    | 'development'
    | 'production'
    | 'test',
} as const;
