import os
import sys
import secrets
from datetime import datetime, timedelta, date

# Ensure backend directory is in path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy.orm import Session
from app.db import SessionLocal, engine
from app.models.users import User, RoleEnum
from app.models.branches import Branch
from app.models.courses import Course
from app.models.students import Student, GenderEnum
from app.models.exam_slots import ExamSlot
from app.core.security import get_password_hash
from app.config import settings

def seed():
    db = SessionLocal()
    try:
        # Seed Admin
        admin_email = "admin@examslot.test"
        admin_pass = settings.SEED_ADMIN_PASSWORD or "Admin123!"
        admin = db.query(User).filter(User.email == admin_email).first()
        if not admin:
            admin = User(
                email=admin_email,
                role=RoleEnum.admin,
                password_hash=get_password_hash(admin_pass)
            )
            db.add(admin)
            print(f"Created Admin: {admin_email} | Password: {admin_pass}")

        # Seed Branches
        branches_data = [
            {"name": "Karachi Main", "code": "KHI-01", "city": "Karachi", "address": "Main Campus, Karachi", "contact_number": "021-111-222-333"},
            {"name": "Lahore Campus", "code": "LHR-01", "city": "Lahore", "address": "Gulberg, Lahore", "contact_number": "042-111-222-333"},
            {"name": "Islamabad Campus", "code": "ISB-01", "city": "Islamabad", "address": "F-8, Islamabad", "contact_number": "051-111-222-333"},
        ]
        branches = []
        for b_data in branches_data:
            branch = db.query(Branch).filter(Branch.code == b_data["code"]).first()
            if not branch:
                branch = Branch(**b_data)
                db.add(branch)
            branches.append(branch)
        db.flush()

        # Seed Courses
        courses_data = [
            {"code": "CS101", "title": "Intro to CS", "credit_hours": 3, "department": "CS"},
            {"code": "CS102", "title": "Programming", "credit_hours": 4, "department": "CS"},
            {"code": "MTH101", "title": "Calculus I", "credit_hours": 3, "department": "Math"},
            {"code": "MTH102", "title": "Calculus II", "credit_hours": 3, "department": "Math"},
            {"code": "ENG101", "title": "English I", "credit_hours": 3, "department": "Humanities"},
            {"code": "PHY101", "title": "Physics I", "credit_hours": 3, "department": "Sciences"},
            {"code": "STA201", "title": "Statistics", "credit_hours": 3, "department": "Math"},
            {"code": "HUM101", "title": "Islamic Studies", "credit_hours": 2, "department": "Humanities"},
        ]
        courses = []
        for c_data in courses_data:
            course = db.query(Course).filter(Course.code == c_data["code"]).first()
            if not course:
                course = Course(**c_data)
                db.add(course)
            courses.append(course)
        db.flush()

        # Seed Exam Slots
        if not db.query(ExamSlot).first():
            import random
            today = date.today()
            for course in courses:
                # 3 slots per course in the next 30 days
                for i in range(3):
                    exam_date = today + timedelta(days=random.randint(1, 30))
                    start_time = datetime.strptime(random.choice(["09:00", "13:00", "17:00"]), "%H:%M").time()
                    slot = ExamSlot(
                        course_id=course.id,
                        exam_date=exam_date,
                        start_time=start_time,
                        capacity=50
                    )
                    db.add(slot)
            print("Created exam slots.")

        # Seed Students
        student_pass = "Student123!"
        student_hash = get_password_hash(student_pass)
        
        for i in range(1, 6):
            email = f"student{i}@examslot.test"
            reg_no = f"REG-2026-{i:03d}"
            
            user = db.query(User).filter(User.email == email).first()
            if not user:
                user = User(
                    email=email,
                    role=RoleEnum.student,
                    password_hash=student_hash
                )
                db.add(user)
                db.flush()
                
                student = Student(
                    user_id=user.id,
                    full_name=f"Demo Student {i}",
                    email=email,
                    phone=f"0300000000{i}",
                    cnic_or_bform=f"42201-000000{i}-1",
                    date_of_birth=date(2000, 1, 1),
                    gender=GenderEnum.male,
                    address="Demo Address",
                    father_or_guardian_name="Demo Guardian",
                    guardian_cnic=f"42201-000000{i}-2",
                    guardian_occupation="Business",
                    guardian_contact=f"0300000001{i}",
                    emergency_contact=f"0300000001{i}",
                    registration_no=reg_no,
                    program="BSCS",
                    semester=1,
                    session_batch="Fall 2026",
                    previous_qualification="FSc",
                    previous_institute="Govt College",
                    marks_or_cgpa=85.5,
                    branch_id=branches[i%3].id if branches else None
                )
                db.add(student)
                print(f"Created Student: {email} | Password: {student_pass}")

        db.commit()
        print("Seeding complete.")
    finally:
        db.close()

if __name__ == "__main__":
    seed()
