import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { PrismaClient } from './src/generated/prisma/client';

// Create pool with explicit configuration
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('sslmode=require') 
    ? { rejectUnauthorized: false } 
    : undefined,
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function verifyData() {
  console.log('='.repeat(60));
  console.log('  DATA VERIFICATION REPORT');
  console.log('='.repeat(60));
  console.log('');

  try {
    // 1. Check Courses
    const courses = await prisma.course.findMany({ where: { status: 'active' } });
    console.log(`✅ Courses: ${courses.length} courses found`);
    if (courses.length > 0) {
      const sample = courses.slice(0, 3);
      sample.forEach(c => console.log(`   - ${c.code}: ${c.name} (${c.creditHours} credits)`));
      if (courses.length > 3) console.log(`   ... and ${courses.length - 3} more`);
    }
    console.log('');

    // 2. Check Faculty
    const faculty = await prisma.faculty.findMany({
      include: { user: true },
      where: { status: 'active' },
    });
    console.log(`✅ Faculty: ${faculty.length} members found`);
    if (faculty.length > 0) {
      const sample = faculty.slice(0, 3);
      sample.forEach(f => console.log(`   - ${f.employeeNumber}: ${f.firstName} ${f.lastName} (${f.designation})`));
      console.log(`   🔑 Login: ${faculty[0].employeeNumber.toLowerCase()} / faculty123`);
      if (faculty.length > 3) console.log(`   ... and ${faculty.length - 3} more`);
    }
    console.log('');

    // 3. Check Students
    const students = await prisma.student.findMany({
      where: { status: 'active' },
      include: { batch: true },
    });
    console.log(`✅ Students: ${students.length} students found`);
    if (students.length > 0) {
      const sample = students.slice(0, 3);
      sample.forEach(s => console.log(`   - ${s.stdRegNumber}: ${s.firstName} ${s.lastName} (Batch ${s.batch.name})`));
      console.log(`   🔑 Login: ${students[0].stdRegNumber.toLowerCase()} / student123`);
      if (students.length > 3) console.log(`   ... and ${students.length - 3} more`);
    }
    console.log('');

    // 4. Check Course Allocations
    const allocations = await prisma.courseAllocation.findMany({
      include: {
        course: true,
        faculty: true,
        section: { include: { batch: true } },
      },
    });
    console.log(`✅ Course Allocations: ${allocations.length} allocations found`);
    if (allocations.length > 0) {
      const sample = allocations.slice(0, 3);
      sample.forEach(a => {
        const facultyName = `${a.faculty.firstName} ${a.faculty.lastName}`;
        console.log(`   - ${a.course.code} → ${facultyName} (${a.section.batch.name}-${a.section.name})`);
      });
      if (allocations.length > 3) console.log(`   ... and ${allocations.length - 3} more`);
    }
    console.log('');

    // 5. Check Course Enrollments
    const enrollments = await prisma.courseEnrollment.findMany({
      where: { status: 'enrolled' },
    });
    console.log(`✅ Course Enrollments: ${enrollments.length} enrollments found`);
    console.log('');

    // 6. Check Academic Records
    const records = await prisma.studentAcademicRecord.findMany({
      where: { status: 'ENROLLED' },
    });
    console.log(`✅ Student Academic Records: ${records.length} records found`);
    console.log('');

    // Summary Statistics
    console.log('='.repeat(60));
    console.log('  SUMMARY');
    console.log('='.repeat(60));
    
    const batches = await prisma.batch.findMany();
    const sections = await prisma.section.findMany();
    const sessions = await prisma.academicSession.findMany({ where: { status: 'ACTIVE' } });
    
    console.log(`📊 Academic Structure:`);
    console.log(`   - Active Sessions: ${sessions.length}`);
    console.log(`   - Batches: ${batches.length}`);
    console.log(`   - Sections: ${sections.length}`);
    console.log('');
    
    console.log(`📚 Academic Content:`);
    console.log(`   - Courses: ${courses.length}`);
    console.log('');
    
    console.log(`👥 People:`);
    console.log(`   - Faculty: ${faculty.length}`);
    console.log(`   - Students: ${students.length}`);
    console.log('');
    
    console.log(`📝 Operations:`);
    console.log(`   - Course Allocations: ${allocations.length}`);
    console.log(`   - Student Records: ${records.length}`);
    console.log(`   - Enrollments: ${enrollments.length}`);
    console.log('');

    // Check if data is adequate
    console.log('='.repeat(60));
    console.log('  READINESS CHECK');
    console.log('='.repeat(60));
    
    const checks = [
      { name: 'Courses Created', pass: courses.length >= 40, value: courses.length, expected: '40+' },
      { name: 'Faculty Created', pass: faculty.length >= 10, value: faculty.length, expected: '10+' },
      { name: 'Students Created', pass: students.length >= 20, value: students.length, expected: '20+' },
      { name: 'Allocations Created', pass: allocations.length >= 10, value: allocations.length, expected: '10+' },
      { name: 'Enrollments Created', pass: enrollments.length >= 50, value: enrollments.length, expected: '50+' },
    ];

    checks.forEach(check => {
      const icon = check.pass ? '✅' : '❌';
      console.log(`${icon} ${check.name}: ${check.value} (Expected: ${check.expected})`);
    });

    console.log('');
    
    const allPassed = checks.every(c => c.pass);
    
    if (allPassed) {
      console.log('🎉 ALL CHECKS PASSED! Your system is ready to use.');
      console.log('');
      console.log('Next Steps:');
      console.log('  1. Login as faculty: fac-001 / faculty123');
      console.log('  2. Go to "My Courses" and view allocated courses');
      console.log('  3. Create assessments and enter marks');
      console.log('  4. Login as student: {year}{section}{number} / student123');
    } else {
      console.log('⚠️  Some checks failed. You may need to run populate-data.ts again.');
    }

    console.log('');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('❌ Error during verification:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

verifyData()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
