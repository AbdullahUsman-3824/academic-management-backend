import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { PrismaClient } from './src/generated/prisma/client';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function checkCategories() {
  try {
    const categories = await prisma.assessmentCategory.findMany({
      orderBy: { displayOrder: 'asc' },
    });
    
    console.log('\n📋 Assessment Categories:\n');
    categories.forEach(cat => {
      console.log(`  ✓ ${cat.name.padEnd(15)} - ${cat.weightage}% weightage`);
    });
    console.log(`\n  Total: ${categories.length} categories\n`);
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

checkCategories();
