import random
from datetime import datetime, timedelta

def generate_audit_data():
    """
    Generates a synthetic dataset of 75-100 audit transactions
    and saves it to audit_sample_data.csv.
    
    Includes 4 deliberately planted anomalies for testing:
    1. Duplicate transaction amount to the same vendor within 30 days.
    2. Round number amount strictly greater than $10,000 (e.g. 25000.00).
    3. Transaction with a weekend date (Saturday or Sunday).
    4. Transaction with a null/blank approved_by field.
    """
    random.seed(42)
    
    vendors = [
        "Acme Corp", "TechSupplies Inc", "Global Logistics", "OfficeMax",
        "Cloud Services LLC", "Vertex Consulting", "Apex Media", "Prime Stationers",
        "DataHub Inc", "Precision Tools"
    ]
    account_codes = ["6010", "6020", "6050", "6100", "6200", "7010", "7020"]
    approvers = ["John Doe", "Sarah Smith", "Michael Brown", "Emma Davis", "Alex Wilson", "Rachel Green"]
    departments = ["IT", "Marketing", "Finance", "Operations", "Sales", "HR", "Legal"]

    # Date range: May 1, 2026 to July 15, 2026
    start_date = datetime(2026, 5, 1)
    end_date = datetime(2026, 7, 15)

    def get_random_weekday(start, end):
        while True:
            days = (end - start).days
            random_days = random.randint(0, days)
            candidate = start + timedelta(days=random_days)
            if candidate.weekday() < 5:  # Monday to Friday
                return candidate

    records = []

    # 1. Generate 85 normal weekday transactions under $5,000
    for _ in range(85):
        dt = get_random_weekday(start_date, end_date)
        amount = round(random.uniform(25.00, 4850.00), 2)
        vendor = random.choice(vendors)
        account_code = random.choice(account_codes)
        approved_by = random.choice(approvers)
        department = random.choice(departments)

        records.append({
            "date": dt.strftime("%Y-%m-%d"),
            "amount": f"{amount:.2f}",
            "vendor": vendor,
            "account_code": account_code,
            "approved_by": approved_by,
            "department": department
        })

    # 2. Plant Anomaly 1: Duplicate transaction amount to the same vendor within a 30-day window
    base_date = datetime(2026, 6, 2)
    dup_date = base_date + timedelta(days=14)  # 14 days apart (within 30 days)
    dup_vendor = "TechSupplies Inc"
    dup_amount = "3450.75"
    
    records.append({
        "date": base_date.strftime("%Y-%m-%d"),
        "amount": dup_amount,
        "vendor": dup_vendor,
        "account_code": "6010",
        "approved_by": "Sarah Smith",
        "department": "IT"
    })
    records.append({
        "date": dup_date.strftime("%Y-%m-%d"),
        "amount": dup_amount,  # Duplicate amount to same vendor within 30 days
        "vendor": dup_vendor,
        "account_code": "6010",
        "approved_by": "Michael Brown",
        "department": "IT"
    })

    # 3. Plant Anomaly 2: Round number amount strictly greater than $10,000
    records.append({
        "date": datetime(2026, 6, 17).strftime("%Y-%m-%d"),
        "amount": "25000.00",  # Round number > $10,000
        "vendor": "Acme Corp",
        "account_code": "7010",
        "approved_by": "John Doe",
        "department": "Finance"
    })

    # 4. Plant Anomaly 3: Transaction on a weekend date (Sunday June 14, 2026)
    weekend_dt = datetime(2026, 6, 14)  # Sunday
    records.append({
        "date": weekend_dt.strftime("%Y-%m-%d"),
        "amount": "1850.00",
        "vendor": "Cloud Services LLC",
        "account_code": "6050",
        "approved_by": "Alex Wilson",
        "department": "Operations"
    })

    # 5. Plant Anomaly 4: Transaction with null/blank approved_by
    records.append({
        "date": datetime(2026, 6, 22).strftime("%Y-%m-%d"),
        "amount": "4200.00",
        "vendor": "Apex Media",
        "account_code": "6200",
        "approved_by": "",  # Blank / null / NaN
        "department": "Marketing"
    })

    # Shuffle so anomalies are distributed throughout dataset
    random.shuffle(records)

    # Output filename
    output_filename = "audit_sample_data.csv"

    # Try using pandas if available, otherwise fallback to standard csv module
    try:
        import pandas as pd
        df = pd.DataFrame(records)
        df.to_csv(output_filename, index=False)
    except ImportError:
        import csv
        fieldnames = ["date", "amount", "vendor", "account_code", "approved_by", "department"]
        with open(output_filename, mode="w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(records)

    print(f"Successfully generated synthetic dataset with {len(records)} transactions in '{output_filename}'.")

if __name__ == "__main__":
    generate_audit_data()
