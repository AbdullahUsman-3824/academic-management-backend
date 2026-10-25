import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../src/generated/prisma/client';
import * as argon2 from 'argon2';

// Pakistani Names
const pakistaniMaleFirstNames = [
  'Muhammad', 'Ahmed', 'Ali', 'Hassan', 'Hamza', 'Usman', 'Omar', 'Abdullah', 
  'Ibrahim', 'Bilal', 'Faisal', 'Zain', 'Arslan', 'Omer', 'Imran', 'Kamran',
  'Shahid', 'Tariq', 'Nadeem', 'Salman', 'Junaid', 'Adnan', 'Fahad', 'Asad',
  'Saad', 'Talha', 'Haris', 'Daniyal', 'Saqib', 'Waqas', 'Zia', 'Naveed'
];

const pakistaniFemaleFirstNames = [
  'Fatima', 'Aisha', 'Maryam', 'Zainab', 'Sana', 'Ayesha', 'Hira', 'Amna',
  'Khadija', 'Hafsa', 'Sarah', 'Aliza', 'Zara', 'Noor', 'Iqra', 'Bushra',
  'Rabia', 'Samina', 'Nazia', 'Farah', 'Sadia', 'Madiha', 'Arooj', 'Sidra',
  'Nimra', 'Mariam', 'Laiba', 'Hoorain', 'Ramsha', 'Eman', 'Mehak', 'Rida'
];

const pakistaniLastNames = [
  'Khan', 'Ahmed', 'Ali', 'Hassan', 'Hussain', 'Shah', 'Malik', 'Butt',
  'Siddiqui', 'Ansari', 'Qureshi', 'Sheikh', 'Awan', 'Chaudhry', 'Mirza', 
  'Baig', 'Javed', 'Rizvi', 'Raza', 'Iqbal', 'Akbar', 'Aziz', 'Haider',
  'Farooq', 'Rehman', 'Mahmood', 'Rashid', 'Sharif', 'Zaidi', 'Naqvi'
];

const cities = [
  'Karachi', 'Lahore', 'Islamabad', 'Rawalpindi', 'Faisalabad', 
  'Multan', 'Peshawar', 'Quetta', 'Sialkot', 'Gujranwala'
];

// Helper Functions
function getRandomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function generatePakistaniName(isMale: boolean) {
  const firstName = isMale 
    ? getRandomElement(pakistaniMaleFirstNames)
    : getRandomElement(pakistaniFemaleFirstNames);
  const lastName = getRandomElement(pakistaniLastNames);
  return { firstName, lastName };
}

function generateEmail(firstName: string, lastName: string): string {
  return `${firstName.toLowerCase()}.${lastName.toLowerCase()}@lawcollege.edu.pk`;
}

function generatePhone(): string {
  const prefix = getRandomElement(['0300', '0301', '0302', '0321', '0333', '0334']);
  const number = Math.floor(Math.random() * 10000000).toString().padStart(7, '0');
  return `${prefix}${number}`;
}

function generateCNIC(): string {
  const province = getRandomElement(['42101', '35202', '61101', '17301']);
  const random = Math.floor(Math.random() * 10000000).toString().padStart(7, '0');
  const digit = Math.floor(Math.random() * 10);
  return `${province}${random}${digit}`;
}

// Law College Courses for 5-Year LLB Program
const lawCourses = [
  // Semester 1
  { code: 'LAW-101', name: 'Introduction to Law', credits: 3, semester: 1 },
  { code: 'LAW-102', name: 'Islamic Jurisprudence I', credits: 3, semester: 1 },
  { code: 'LAW-103', name: 'Legal System of Pakistan', credits: 3, semester: 1 },
  { code: 'ENG-101', name: 'English I', credits: 3, semester: 1 },
  { code: 'PSC-101', name: 'Pakistan Studies', credits: 2, semester: 1 },
  
  // Semester 2
  { code: 'LAW-201', name: 'Law of Tort', credits: 3, semester: 2 },
  { code: 'LAW-202', name: 'Islamic Jurisprudence II', credits: 3, semester: 2 },
  { code: 'LAW-203', name: 'Constitutional Law I', credits: 3, semester: 2 },
  { code: 'ENG-102', name: 'English II', credits: 3, semester: 2 },
  { code: 'IST-101', name: 'Islamiat', credits: 2, semester: 2 },
  
  // Semester 3
  { code: 'LAW-301', name: 'Law of Contract I', credits: 3, semester: 3 },
  { code: 'LAW-302', name: 'Criminal Law I', credits: 3, semester: 3 },
  { code: 'LAW-303', name: 'Constitutional Law II', credits: 3, semester: 3 },
  { code: 'LAW-304', name: 'Jurisprudence I', credits: 3, semester: 3 },
  
  // Semester 4
  { code: 'LAW-401', name: 'Law of Contract II', credits: 3, semester: 4 },
  { code: 'LAW-402', name: 'Criminal Law II', credits: 3, semester: 4 },
  { code: 'LAW-403', name: 'Family Law I (Muslim)', credits: 3, semester: 4 },
  { code: 'LAW-404', name: 'Jurisprudence II', credits: 3, semester: 4 },
  
  // Semester 5
  { code: 'LAW-501', name: 'Law of Evidence', credits: 3, semester: 5 },
  { code: 'LAW-502', name: 'Civil Procedure Code', credits: 3, semester: 5 },
  { code: 'LAW-503', name: 'Family Law II', credits: 3, semester: 5 },
  { code: 'LAW-504', name: 'Company Law', credits: 3, semester: 5 },
  
  // Semester 6
  { code: 'LAW-601', name: 'Criminal Procedure Code', credits: 3, semester: 6 },
  { code: 'LAW-602', name: 'Law of Property', credits: 3, semester: 6 },
  { code: 'LAW-603', name: 'Administrative Law', credits: 3, semester: 6 },
  { code: 'LAW-604', name: 'International Law I', credits: 3, semester: 6 },
  
  // Semester 7
  { code: 'LAW-701', name: 'Law of Transfer of Property', credits: 3, semester: 7 },
  { code: 'LAW-702', name: 'Interpretation of Statutes', credits: 3, semester: 7 },
  { code: 'LAW-703', name: 'International Law II', credits: 3, semester: 7 },
  { code: 'LAW-704', name: 'Labour & Industrial Law', credits: 3, semester: 7 },
  
  // Semester 8
  { code: 'LAW-801', name: 'Environmental Law', credits: 3, semester: 8 },
  { code: 'LAW-802', name: 'Taxation Law', credits: 3, semester: 8 },
  { code: 'LAW-803', name: 'Banking Law', credits: 3, semester: 8 },
  { code: 'LAW-804', name: 'Intellectual Property Rights', credits: 3, semester: 8 },
  
  // Semester 9
  { code: 'LAW-901', name: 'Human Rights Law', credits: 3, semester: 9 },
  { code: 'LAW-902', name: 'Cyber Law', credits: 3, semester: 9 },
  { code: 'LAW-903', name: 'Alternative Dispute Resolution', credits: 3, semester: 9 },
  { code: 'LAW-904', name: 'Legal Drafting & Pleading I', credits: 3, semester: 9 },
  
  // Semester 10
  { code: 'LAW-1001', name: 'Legal Drafting & Pleading II', credits: 3, semester: 10 },
  { code: 'LAW-1002', name: 'Moot Court', credits: 3, semester: 10 },
  { code: 'LAW-1003', name: 'Professional Ethics', credits: 2, semester: 10 },
  { code: 'LAW-1004', name: 'Internship/Practical Training', credits: 4, semester: 10 },
];

export async function populateRealData(prismaInstance: PrismaClient) {
  const prisma = prismaInstance;
  
  console.log('🌱 Starting to populate real data with Pakistani names...\n');

  try {
    // Get existing academic structure
    const currentSession = await prisma.academicSession.findFirst({
      where: { status: 'ACTIVE' },
      orderBy: { name: 'desc' },
    });

    if (!currentSession) {
      console.error('❌ No active academic session found. Please create one first.');
      return;
    }

    console.log(`✓ Using session: ${currentSession.name}`);

    // Get batches
    const batches = await prisma.batch.findMany({
      orderBy: { name: 'asc' },
    });

    if (batches.length === 0) {
      console.error('❌ No batches found. Please create batches first.');
      return;
    }

    console.log(`✓ Found ${batches.length} batches`);

    // Get sections
    const sections = await prisma.section.findMany({
      include: { batch: true },
    });

    if (sections.length === 0) {
      console.error('❌ No sections found. Please create sections first.');
      return;
    }

    console.log(`✓ Found ${sections.length} sections`);

    // Get roles
    const facultyRole = await prisma.role.findUnique({ where: { name: 'faculty' } });
    const studentRole = await prisma.role.findUnique({ where: { name: 'student' } });

    if (!facultyRole || !studentRole) {
      console.error('❌ Faculty or Student role not found');
      return;
    }

    // 1. CREATE COURSES
    console.log('\n📚 Creating Law Courses...');
    const createdCourses: any[] = [];
    
    for (const courseData of lawCourses) {
      const existing = await prisma.course.findFirst({
        where: { code: courseData.code },
      });

      if (!existing) {
        const course = await prisma.course.create({
          data: {
            code: courseData.code,
            name: courseData.name,
            creditHours: courseData.credits,
            status: 'active',
          },
        });
        createdCourses.push(course);
      } else {
        createdCourses.push(existing);
      }
    }

    console.log(`✓ Created/Found ${createdCourses.length} courses`);

    // 2. CREATE SEMESTER COURSE TEMPLATES
    console.log('\n📋 Creating Semester Course Templates...');
    
    const semesters = await prisma.semester.findMany({
      orderBy: { number: 'asc' },
    });

    for (const semester of semesters) {
      const semesterCourses = lawCourses.filter(c => c.semester === semester.number);
      
      for (const courseData of semesterCourses) {
        const course = createdCourses.find(c => c.code === courseData.code);
        if (course) {
          await prisma.semesterCourse.upsert({
            where: {
              semesterId_courseId: {
                semesterId: semester.id,
                courseId: course.id,
              },
            },
            create: {
              semesterId: semester.id,
              semesterNumber: semester.number,
              courseId: course.id,
              isCompulsory: true,
              displayOrder: semesterCourses.indexOf(courseData) + 1,
            },
            update: {},
          });
        }
      }
    }

    console.log(`✓ Created semester course templates`);

    // 3. CREATE FACULTY MEMBERS
    console.log('\n👨‍🏫 Creating Faculty Members...');
    
    const facultyData: any[] = [];
    const numberOfFaculty = 15;

    for (let i = 0; i < numberOfFaculty; i++) {
      const isMale = Math.random() > 0.3;
      const { firstName, lastName } = generatePakistaniName(isMale);
      const email = generateEmail(firstName, lastName);
      const phone = generatePhone();
      const cnic = generateCNIC();
      const employeeNumber = `FAC-${(i + 1).toString().padStart(3, '0')}`;
      const username = employeeNumber.toLowerCase();

      // Check if user exists
      let user = await prisma.user.findUnique({ where: { username } });
      
      if (!user) {
        const hashedPassword = await argon2.hash('faculty123');
        user = await prisma.user.create({
          data: {
            username,
            passwordHash: hashedPassword,
            roleId: facultyRole.id,
          },
        });
      }

      // Check if faculty exists
      let faculty = await prisma.faculty.findUnique({
        where: { employeeNumber },
      });

      if (!faculty) {
        faculty = await prisma.faculty.create({
          data: {
            employeeNumber,
            userId: user.id,
            firstName,
            lastName,
            email,
            phone,
            cnic,
            designation: getRandomElement(['Lecturer', 'Assistant Professor', 'Associate Professor', 'Professor']),
            qualification: getRandomElement(['LLM', 'PhD in Law', 'LLM, PhD']),
            joiningDate: new Date(2020 + Math.floor(Math.random() * 6), Math.floor(Math.random() * 12), 1),
            status: 'active',
          },
        });
      }

      facultyData.push(faculty);
    }

    console.log(`✓ Created ${facultyData.length} faculty members`);

    // 4. CREATE COURSE ALLOCATIONS
    console.log('\n📝 Allocating Courses to Faculty...');
    
    let allocationCount = 0;
    
    for (const section of sections) {
      const batchYear = parseInt(section.batch.name);
      const currentYear = new Date().getFullYear();
      const yearsCompleted = currentYear - batchYear;
      const currentSemester = Math.min(Math.max(yearsCompleted * 2 + 1, 1), 10);

      const semesterCourses = lawCourses.filter(c => c.semester === currentSemester);
      
      for (const courseData of semesterCourses) {
        const course = createdCourses.find(c => c.code === courseData.code);
        const faculty = getRandomElement(facultyData);
        
        if (course && faculty) {
          const existing = await prisma.courseAllocation.findFirst({
            where: {
              courseId: course.id,
              sectionId: section.id,
              semesterNumber: currentSemester,
              academicSessionId: currentSession.id,
            },
          });

          if (!existing) {
            await prisma.courseAllocation.create({
              data: {
                courseId: course.id,
                facultyId: faculty.id,
                sectionId: section.id,
                semesterNumber: currentSemester,
                academicSessionId: currentSession.id,
                status: 'active',
              },
            });
            allocationCount++;
          }
        }
      }
    }

    console.log(`✓ Created ${allocationCount} course allocations`);

    // 5. CREATE STUDENTS
    console.log('\n👨‍🎓 Creating Students...');
    
    const studentsPerSection = 10; // Reduced for faster population
    let totalStudents = 0;

    for (const section of sections) {
      for (let i = 0; i < studentsPerSection; i++) {
        const isMale = Math.random() > 0.4;
        const { firstName, lastName } = generatePakistaniName(isMale);
        const email = generateEmail(firstName, lastName);
        const phone = generatePhone();
        const cnic = generateCNIC();
        
        const batchYear = parseInt(section.batch.name);
        const stdRegNumber = `${batchYear}${section.name}${(i + 1).toString().padStart(3, '0')}`;
        const username = stdRegNumber.toLowerCase();

        // Check if user exists
        let user = await prisma.user.findUnique({ where: { username } });
        
        if (!user) {
          const hashedPassword = await argon2.hash('student123');
          user = await prisma.user.create({
            data: {
              username,
              passwordHash: hashedPassword,
              roleId: studentRole.id,
            },
          });
        }

        // Check if student exists
        let student = await prisma.student.findFirst({
          where: { stdRegNumber },
        });

        if (!student) {
          student = await prisma.student.create({
            data: {
              batchId: section.batchId,
              userId: user.id,
              stdRegNumber,
              firstName,
              lastName,
              email,
              phone,
              cnic,
              gender: isMale ? 'male' : 'female',
              city: getRandomElement(cities),
              status: 'active',
              admissionDate: new Date(batchYear, 8, 1),
            },
          });
          totalStudents++;
        }

        // Create Academic Record
        const currentYear = new Date().getFullYear();
        const yearsCompleted = currentYear - batchYear;
        const currentSemester = Math.min(Math.max(yearsCompleted * 2 + 1, 1), 10);

        const existingRecord = await prisma.studentAcademicRecord.findFirst({
          where: {
            studentId: student.id,
            sectionId: section.id,
            semesterNumber: currentSemester,
            academicSessionId: currentSession.id,
          },
        });

        if (!existingRecord) {
          // Get the semester ID for this semester number
          const semester = semesters.find(s => s.number === currentSemester);
          if (!semester) {
            console.warn(`⚠️  Semester ${currentSemester} not found, skipping student ${student.stdRegNumber}`);
            continue;
          }

          const academicRecord = await prisma.studentAcademicRecord.create({
            data: {
              studentId: student.id,
              batchId: section.batchId,
              sectionId: section.id,
              semesterNumber: currentSemester,
              semesterId: semester.id,
              academicSessionId: currentSession.id,
              status: 'ENROLLED',
            },
          });

          // 6. CREATE COURSE ENROLLMENTS
          const semesterCourses = lawCourses.filter(c => c.semester === currentSemester);
          
          for (const courseData of semesterCourses) {
            const course = createdCourses.find(c => c.code === courseData.code);
            
            if (course) {
              await prisma.courseEnrollment.create({
                data: {
                  studentAcademicRecordId: academicRecord.id,
                  courseId: course.id,
                  status: 'enrolled',
                  isExtra: false,
                },
              });
            }
          }
        }
      }
    }

    console.log(`✓ Created ${totalStudents} students with enrollments`);

    console.log('\n✅ Data population completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`   - Courses: ${createdCourses.length}`);
    console.log(`   - Faculty: ${facultyData.length}`);
    console.log(`   - Students: ${totalStudents}`);
    console.log(`   - Course Allocations: ${allocationCount}`);
    console.log(`   - Sections: ${sections.length}`);
    console.log('\n🔑 Default Passwords:');
    console.log(`   - Faculty: faculty123`);
    console.log(`   - Students: student123`);
    console.log(`   - Faculty usernames: fac-001, fac-002, etc.`);
    console.log(`   - Student usernames: {year}{section}{number} (e.g., 2024a001)`);

  } catch (error) {
    console.error('❌ Error populating data:', error);
    throw error;
  }
}
