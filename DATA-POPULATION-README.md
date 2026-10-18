# 🎓 Law College Data Population Guide

This guide will help you populate your law college management system with realistic Pakistani data.

## 📋 What Gets Created

### **Courses (40+ Courses)**
Complete 5-year LLB program curriculum:
- **Semester 1-2**: Foundation (Introduction to Law, Islamic Jurisprudence, Constitutional Law, etc.)
- **Semester 3-6**: Core Subjects (Contract Law, Criminal Law, Family Law, Civil Procedure, etc.)
- **Semester 7-8**: Advanced Topics (Banking Law, Taxation, IPR, Environmental Law, etc.)
- **Semester 9-10**: Specialization (Human Rights, Cyber Law, ADR, Legal Drafting, Moot Court)

### **Faculty (15 Members)**
- Pakistani names (Muhammad Ahmed Khan, Fatima Hassan, etc.)
- Designations: Lecturer, Assistant Professor, Associate Professor, Professor
- Qualifications: LLM, PhD in Law
- Random course allocations

### **Students (30 per Section)**
- Pakistani first names (Male: Muhammad, Ahmed, Ali, Hassan; Female: Fatima, Aisha, Maryam, Zainab)
- Pakistani last names (Khan, Ahmed, Malik, Siddiqui, Shah, etc.)
- Cities from all over Pakistan (Karachi, Lahore, Islamabad, etc.)
- Valid Pakistani CNIC numbers
- Pakistani phone numbers (0300, 0321, etc.)
- Email format: firstname.lastname@lawcollege.edu.pk

### **Additional Data**
- Semester course templates
- Batch course assignments
- Course allocations to faculty
- Course enrollments for students
- Student academic records

---

## ⚙️ Prerequisites

Before running the population script, make sure you have:

### 1. **Database Running**
```bash
# Your PostgreSQL database should be running
```

### 2. **Academic Session Created**
- Login to admin panel
- Go to Academic Management → Sessions
- Create at least one active session (e.g., "2024-2025")

### 3. **Batches Created**
- Go to Academic Management → Batches
- Create batches (e.g., "2024", "2023", "2022", "2021", "2020")

### 4. **Sections Created**
- Go to Academic Management → Sections
- Create sections for each batch (e.g., Section A, Section B)
- Each section needs:
  - Name (A, B, C, etc.)
  - Capacity (30-50)
  - Assigned to a batch

---

## 🚀 How to Run

### **Step 1: Navigate to Backend Directory**
```bash
cd /Users/rizwan/Desktop/law-college/academic-management-backend
```

### **Step 2: Run the Population Script**
```bash
npx tsx populate-data.ts
```

### **Step 3: Wait for Completion**
The script will:
1. ✓ Verify academic structure exists
2. ✓ Create 40+ law courses
3. ✓ Create semester course templates
4. ✓ Assign courses to batches
5. ✓ Create 15 faculty members
6. ✓ Allocate courses to faculty
7. ✓ Create 30 students per section
8. ✓ Enroll students in courses

This may take 2-5 minutes depending on the number of sections.

---

## 🔑 Default Login Credentials

### **Faculty Login**
```
Username: fac-001, fac-002, fac-003, ... fac-015
Password: faculty123
```

### **Student Login**
```
Format: {year}{section}{number}
Examples:
  - Username: 2024a001, 2024a002, ... 2024a030 (Batch 2024, Section A)
  - Username: 2024b001, 2024b002, ... 2024b030 (Batch 2024, Section B)
  - Username: 2023a001 (Batch 2023, Section A, Student 1)
Password: student123
```

---

## 📊 Example Data

### **Sample Faculty Members**
```
FAC-001: Muhammad Ahmed Khan (Professor, PhD in Law)
FAC-002: Fatima Hassan (Associate Professor, LLM)
FAC-003: Ali Malik (Assistant Professor, LLM, PhD)
FAC-004: Aisha Siddiqui (Lecturer, LLM)
...
```

### **Sample Students (Batch 2024, Section A)**
```
2024A001: Muhammad Ahmed Khan (Karachi)
2024A002: Fatima Hassan Shah (Lahore)
2024A003: Ali Hussain Malik (Islamabad)
2024A004: Aisha Zainab Butt (Rawalpindi)
...
```

### **Sample Courses**
```
Semester 1:
  - LAW-101: Introduction to Law (3 credits)
  - LAW-102: Islamic Jurisprudence I (3 credits)
  - LAW-103: Legal System of Pakistan (3 credits)

Semester 5:
  - LAW-501: Law of Evidence (3 credits)
  - LAW-502: Civil Procedure Code (3 credits)
  - LAW-503: Family Law II (3 credits)

Semester 10:
  - LAW-1001: Legal Drafting & Pleading II (3 credits)
  - LAW-1002: Moot Court (3 credits)
  - LAW-1004: Internship/Practical Training (4 credits)
```

---

## 🧪 Testing After Population

### **1. Test Faculty Portal**
```bash
1. Login as faculty: fac-001 / faculty123
2. Go to "My Courses"
3. You should see allocated courses
4. Click on a course
5. View enrolled students (30 students)
6. Create an assessment (Quiz, Assignment, etc.)
7. Enter marks for students
```

### **2. Test Admin Panel**
```bash
1. Login as admin
2. Go to "Course Management"
3. View courses (40+ law courses)
4. Go to "Course Allocations"
5. See faculty assigned to courses
6. Go to "Students"
7. View students with Pakistani names
```

### **3. Test Student Portal** (After you implement it)
```bash
1. Login as student: 2024a001 / student123
2. View enrolled courses
3. View marks/assessments
```

---

## ⚠️ Important Notes

1. **Run Only Once**: This script creates data, so running multiple times will create duplicates (though it has some duplicate checks)

2. **Existing Data**: The script checks for existing courses/faculty to avoid duplicates, but it's best to run on a fresh database

3. **Performance**: Creating data for multiple batches with multiple sections can take time. Be patient.

4. **Customization**: You can edit `populate-data.seed.ts` to:
   - Change number of students per section
   - Change number of faculty
   - Add more Pakistani names
   - Modify course list

---

## 🔄 Re-running the Script

If you need to repopulate data:

### **Option 1: Clear and Repopulate**
```bash
# Clear specific data (be careful!)
# Then run script again
npx tsx populate-data.ts
```

### **Option 2: Fresh Database**
```bash
# Reset database completely
npx prisma migrate reset

# Then run all seeds
npx prisma db seed

# Then populate data
npx tsx populate-data.ts
```

---

## 🐛 Troubleshooting

### **Error: "No active academic session found"**
```
Solution: Create an academic session in admin panel first
Go to: Academic Management → Sessions → Create Session
```

### **Error: "No batches found"**
```
Solution: Create batches in admin panel first
Go to: Academic Management → Batches → Create Batch
```

### **Error: "No sections found"**
```
Solution: Create sections for your batches
Go to: Academic Management → Sections → Create Section
```

### **Error: "Duplicate key value violates unique constraint"**
```
Solution: Data already exists. Either:
1. Skip if data is already populated
2. Clear existing data and re-run
```

---

## 📧 Sample Generated Data

### **Email Formats**
```
Faculty: muhammad.khan@lawcollege.edu.pk
Students: fatima.hassan@lawcollege.edu.pk
```

### **Phone Numbers**
```
Pakistani format: 0300-1234567, 0321-9876543
```

### **CNIC Numbers**
```
Pakistani format: 42101-1234567-1
```

---

## ✅ Verification Checklist

After running the script, verify:

- [ ] Courses exist in admin panel (40+ courses)
- [ ] Faculty members exist (15 members)
- [ ] Students exist (30 per section)
- [ ] Course allocations show faculty assigned
- [ ] Student enrollments show courses
- [ ] Faculty can login with fac-001, fac-002, etc.
- [ ] Students can login with {year}{section}{number}
- [ ] Faculty can see their allocated courses
- [ ] Faculty can see enrolled students in courses

---

## 🎉 Success!

If everything works:
- ✅ Your system now has realistic Pakistani law college data
- ✅ Faculty can manage courses and enter marks
- ✅ Ready to implement student portal features
- ✅ Ready to test complete workflows

**Happy Testing!** 🚀
