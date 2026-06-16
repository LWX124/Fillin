import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from pydantic import BaseModel
from datetime import datetime
from decimal import Decimal

from app.db.session import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.credit_transaction import CreditTransaction
from app.models.credit_package import CreditPackage

router = APIRouter()


class CreditBalanceResponse(BaseModel):
    credits: int


class CreditTransactionResponse(BaseModel):
    id: str
    amount: int
    transaction_type: str
    description: str | None
    created_at: datetime

    class Config:
        from_attributes = True


class PurchaseRequest(BaseModel):
    package_id: str
    payment_method: str = "mock"


class CreditPackageResponse(BaseModel):
    id: str
    name: str
    credits: int
    price: Decimal
    display_order: int

    class Config:
        from_attributes = True


class PurchaseResponse(BaseModel):
    success: bool
    credits_added: int
    new_balance: int


@router.get("/balance", response_model=CreditBalanceResponse)
def get_balance(current_user: User = Depends(get_current_user)):
    return CreditBalanceResponse(credits=current_user.credits)


@router.get("/transactions", response_model=List[CreditTransactionResponse])
def list_transactions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return (
        db.query(CreditTransaction)
        .filter(CreditTransaction.user_id == current_user.id)
        .order_by(CreditTransaction.created_at.desc())
        .limit(50)
        .all()
    )


@router.get("/packages", response_model=List[CreditPackageResponse])
def list_credit_packages(db: Session = Depends(get_db)):
    return (
        db.query(CreditPackage)
        .filter(CreditPackage.is_active == True)
        .order_by(CreditPackage.display_order)
        .all()
    )


@router.post("/purchase", response_model=PurchaseResponse)
def purchase_credits(
    req: PurchaseRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    package = db.query(CreditPackage).filter(
        CreditPackage.id == req.package_id,
        CreditPackage.is_active == True,
    ).first()
    if not package:
        raise HTTPException(status_code=404, detail="Package not found")

    if req.payment_method != "mock":
        raise HTTPException(status_code=400, detail="Payment method not supported yet")

    current_user.credits += package.credits
    transaction = CreditTransaction(
        id=str(uuid.uuid4()),
        user_id=current_user.id,
        amount=package.credits,
        transaction_type="purchase",
        description=f"Purchased {package.name}",
    )
    db.add(transaction)
    db.commit()

    return PurchaseResponse(
        success=True,
        credits_added=package.credits,
        new_balance=current_user.credits,
    )
