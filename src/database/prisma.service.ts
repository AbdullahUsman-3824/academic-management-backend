import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '../generated/prisma/client.js';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly pool: Pool;

  constructor() {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL is not defined');
    }

    // pehle pool banao (this use kiye baghair)
    const pool = new Pool({
      connectionString,
      max: 20, // Increased from 10 to 20
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 15000, // Increased from 5000 to 15000 (15 seconds)
    });

    const adapter = new PrismaPg(pool);

    // ab super call karo
    super({ adapter });

    // ab this use kar sakte ho   
    this.pool = pool;
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
    await this.pool.end();
  }
}
