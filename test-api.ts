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

async function testCategories() {
  try {
    console.log('\n1️⃣ Testing without isActive filter:');
    const allCategories = await prisma.assessmentCategory.findMany({
      orderBy: { displayOrder: 'asc' },
    });
    console.log(`   Found ${allCategories.length} categories`);
    allCategories.forEach(cat => {
      console.log(`   - ${cat.name}: isActive = ${cat.isActive}`);
    });

    console.log('\n2️⃣ Testing WITH isActive=true filter:');
    const activeCategories = await prisma.assessmentCategory.findMany({
      where: { isActive: true },
      orderBy: { displayOrder: 'asc' },
    });
    console.log(`   Found ${activeCategories.length} active categories`);
    activeCategories.forEach(cat => {
      console.log(`   - ${cat.name} (${cat.weightage}%)`);
    });

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

testCategories();
