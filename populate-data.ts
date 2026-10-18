import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { PrismaClient } from './src/generated/prisma/client';
import { populateRealData } from './prisma/seed/populate-data.seed';

// Create pool with explicit configuration
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('sslmode=require') 
    ? { rejectUnauthorized: false } 
    : undefined,
});

// Create the Prisma adapter with the pool
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

console.log('='.repeat(60));
console.log('  LAW COLLEGE MANAGEMENT SYSTEM - DATA POPULATION');
console.log('='.repeat(60));
console.log('\nThis will populate your database with:');
console.log('  • 40+ Law courses (Semester 1-10)');
console.log('  • 15 Faculty members');
console.log('  • 10 Students per section (fast mode)');
console.log('  • Course allocations & enrollments');
console.log('\nAll with Pakistani names and realistic data.\n');
console.log('='.repeat(60));
console.log('\n');

populateRealData(prisma)
  .then(() => {
    console.log('\n' + '='.repeat(60));
    console.log('  ✅ DATA POPULATION COMPLETED SUCCESSFULLY!');
    console.log('='.repeat(60));
    console.log('\nYou can now:');
    console.log('  1. Login as faculty: fac-001, fac-002, etc. (password: faculty123)');
    console.log('  2. Login as student: 2024a001, 2024a002, etc. (password: student123)');
    console.log('  3. View courses, allocations, and enrollments in admin panel');
    console.log('\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n' + '='.repeat(60));
    console.error('  ❌ ERROR DURING DATA POPULATION');
    console.error('='.repeat(60));
    console.error('\nError:', error.message);
    console.error('\nPlease ensure:');
    console.error('  1. Database is running');
    console.error('  2. Academic session is created (status: ACTIVE)');
    console.error('  3. Batches are created');
    console.error('  4. Sections are created');
    console.error('\n');
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
