import sys
sys.path.append(".")

from app.db.session import SessionLocal
from app.models.credit_package import CreditPackage
import uuid


def seed_packages():
    db = SessionLocal()

    existing = db.query(CreditPackage).count()
    if existing > 0:
        print(f"Already have {existing} packages, skipping seed.")
        db.close()
        return

    packages = [
        {"name": "入门套餐", "credits": 100, "price": 9.99, "display_order": 1},
        {"name": "标准套餐", "credits": 500, "price": 39.99, "display_order": 2},
        {"name": "专业套餐", "credits": 1000, "price": 69.99, "display_order": 3},
        {"name": "企业套餐", "credits": 5000, "price": 299.99, "display_order": 4},
    ]

    for pkg_data in packages:
        pkg = CreditPackage(id=str(uuid.uuid4()), **pkg_data)
        db.add(pkg)

    db.commit()
    db.close()
    print("Credit packages seeded!")


if __name__ == "__main__":
    seed_packages()
