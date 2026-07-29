const configuration = () => ({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  api: {
    port: parseInt(process.env.API_PORT ?? '4000', 10),
    url: process.env.API_URL ?? 'http://localhost:4000',
    prefix: process.env.API_PREFIX ?? 'api/v1',
  },
  database: {
    url: process.env.DATABASE_URL,
    directUrl: process.env.DIRECT_URL ?? process.env.DATABASE_URL,
  },
  supabase: {
    url: process.env.SUPABASE_URL,
  },
  redis: {
    url: process.env.REDIS_URL,
  },
  cors: {
    origins: (process.env.CORS_ORIGINS ?? 'http://localhost:3000')
      .split(',')
      .map((o) => o.trim())
      .filter(Boolean),
  },
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET,
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
  },
});

export default configuration;

export type AppConfig = ReturnType<typeof configuration>;
