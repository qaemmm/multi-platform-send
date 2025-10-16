import type { Config } from 'drizzle-kit';

export default {
  schema: './src/lib/db/schema.ts',
  out: './drizzle/migrations',
  dialect: 'sqlite',
  dbCredentials: process.env.TURSO_DATABASE_URL && process.env.TURSO_AUTH_TOKEN
    ? ({
        url: process.env.TURSO_DATABASE_URL,
        authToken: process.env.TURSO_AUTH_TOKEN,
      } as any)
    : {
        url: 'file:./dev.db',
      },
} satisfies Config;
