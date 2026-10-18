import { Pool } from 'pg';
import 'dotenv/config';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function test() {
  try {
    const client = await pool.connect();
    console.log('✅ Database connection successful!');
    const result = await client.query('SELECT NOW()');
    console.log('Current time:', result.rows[0].now);
    client.release();
    await pool.end();
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    process.exit(1);
  }
}

test();
