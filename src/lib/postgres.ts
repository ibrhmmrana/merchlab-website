import { Pool } from 'pg';

let pool: Pool | null = null;

export function getPostgresPool(): Pool {
  if (pool) return pool;

  const host = process.env.POSTGRES_HOST || 'aws-1-eu-west-2.pooler.supabase.com';
  const database = process.env.POSTGRES_DATABASE || 'postgres';
  const user = process.env.POSTGRES_USER || 'postgres.bmkdwnfrldoqvduhpgsu';
  const password = process.env.POSTGRES_PASSWORD;
  const port = parseInt(process.env.POSTGRES_PORT || '6543', 10);
  const maxConnections = parseInt(process.env.POSTGRES_MAX_CONNECTIONS || '100', 10);

  if (!password) {
    throw new Error('POSTGRES_PASSWORD environment variable is required');
  }

  pool = new Pool({
    host,
    database,
    user,
    password,
    port,
    max: maxConnections,
    ssl: false, // SSL disabled as per user requirements
  });

  return pool;
}

