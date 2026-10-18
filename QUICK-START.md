# 🚀 Quick Start - Populate Data

## Prerequisites (Do These First in Admin Panel)

```
1. Create Academic Session
   Admin Panel → Academic Management → Sessions → Create "2024-2025"

2. Create Batches  
   Admin Panel → Academic Management → Batches → Create "2024", "2023", "2022"

3. Create Sections
   Admin Panel → Academic Management → Sections → Create "A", "B" for each batch
```

---

## Run Population Script

```bash
cd /Users/rizwan/Desktop/law-college/academic-management-backend
npx tsx populate-data.ts
```

**Wait 2-5 minutes...**

---

## What You Get

### **40+ Law Courses**
- Complete 5-year LLB program (Semester 1-10)
- All courses with Pakistani law curriculum

### **15 Faculty Members**
- Pakistani names (Muhammad Ahmed Khan, Fatima Hassan, etc.)
- Usernames: `fac-001` to `fac-015`
- Password: `faculty123`

### **30 Students Per Section**
- Pakistani names
- Usernames: `{year}{section}{number}` (e.g., `2024a001`)
- Password: `student123`

### **Everything Connected**
- Courses assigned to faculty
- Students enrolled in semester courses
- Ready to use immediately

---

## Test Login

### **Faculty**
```
Username: fac-001
Password: faculty123
```

### **Student**
```
Username: 2024a001  (Batch 2024, Section A, Student 1)
Password: student123
```

---

## Done! 🎉

Your system now has:
- ✅ Complete course catalog
- ✅ Faculty with course allocations
- ✅ Students with enrollments
- ✅ Ready for marks entry & assessments
