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

async function insertCategories() {
  const categories = [
    { name: 'Quiz', weightage: 10, displayOrder: 1 },
    { name: 'Assignment', weightage: 15, displayOrder: 2 },
    { name: 'Presentation', weightage: 10, displayOrder: 3 },
    { name: 'Attendance', weightage: 5, displayOrder: 4 },
    { name: 'Mid-term', weightage: 30, displayOrder: 5 },
    { name: 'Final', weightage: 50, displayOrder: 6 },
    { name: 'Others', weightage: 0, displayOrder: 7 },
  ];

  try {
    console.log('Creating assessment categories...\n');
    
    for (const category of categories) {
      const existing = await prisma.assessmentCategory.findFirst({
        where: { name: category.name },
      });

      if (!existing) {
        await prisma.assessmentCategory.create({
          data: category,
        });
        console.log(`  ✓ Created: ${category.name} (${category.weightage}%)`);
      } else {
        console.log(`  - Exists: ${category.name}`);
      }
    }
    
    console.log('\n✅ All assessment categories ready!\n');
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

insertCategories();
