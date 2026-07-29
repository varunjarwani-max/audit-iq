export const REQUIREMENTS_TXT = `streamlit>=1.30.0
pandas>=2.0.0
`;

export const GENERATE_DATA_PY = `import random
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
`;

export const APP_PY = `import streamlit as st
import pandas as pd

# 1. Page Configuration: Wide Layout & Page Title
st.set_page_config(
    page_title="AuditIQ - POC Step 1",
    layout="wide",
    page_icon="🔍"
)

# Title and header description
st.title("AuditIQ - POC Step 1")
st.subheader("Data Ingestion & Schema Validation")
st.markdown("Upload transactional CSV files for automated external audit schema verification.")

# 2. Required Schema Definition
REQUIRED_COLUMNS = ['date', 'amount', 'vendor', 'account_code', 'approved_by', 'department']

# 3. File Uploader Widget (Accepts CSV files only)
uploaded_file = st.file_uploader("Upload CSV file", type=["csv"], help="Upload an audit sample CSV file to validate schema.")

if uploaded_file is not None:
    try:
        # Read CSV into Pandas DataFrame
        df = pd.read_csv(uploaded_file)
        
        # 4. Validate Schema
        uploaded_cols = list(df.columns)
        missing_cols = [col for col in REQUIRED_COLUMNS if col not in uploaded_cols]
        
        # If any columns are missing, halt execution and display strict st.error listing missing columns
        if missing_cols:
            st.error(f"❌ Schema Validation Error: The uploaded CSV file is missing required columns:\\n\\n" + 
                     "\\n".join([f"- \`{col}\`" for col in missing_cols]))
            st.warning(f"Expected schema: \`{REQUIRED_COLUMNS}\`\\n\\nFound columns: \`{uploaded_cols}\`")
            st.stop()
            
        # 5. Validation Success Response
        st.success("✅ Schema Validation Successful! All required columns are present.")
        
        # Metrics Display
        col1, col2, col3 = st.columns(3)
        with col1:
            st.metric(label="Total Row Count", value=f"{len(df):,}")
        with col2:
            st.metric(label="Unique Vendors", value=f"{df['vendor'].nunique():,}")
        with col3:
            st.metric(label="Unique Account Codes", value=f"{df['account_code'].nunique():,}")

        st.divider()
        st.subheader("Ingested Audit Transactions")
        
        # Interactive DataFrame display
        st.dataframe(df, use_container_width=True, height=450)

    except Exception as e:
        st.error(f"An error occurred while parsing the CSV file: {e}")
else:
    st.info("💡 Please upload a \`.csv\` file to perform schema validation and data ingestion.")
`;

export const AUDIT_SAMPLE_DATA_CSV = `date,amount,vendor,account_code,approved_by,department
2026-07-03,463.64,Acme Corp,7020,John Doe,Marketing
2026-07-14,2752.22,Vertex Consulting,6050,Sarah Smith,HR
2026-06-14,1850.00,Cloud Services LLC,6050,Alex Wilson,Operations
2026-06-04,4799.45,DataHub Inc,6020,Rachel Green,Finance
2026-06-10,3225.84,TechSupplies Inc,7010,Michael Brown,Sales
2026-06-01,3619.57,DataHub Inc,6050,Rachel Green,Sales
2026-06-25,1692.94,Vertex Consulting,6100,Alex Wilson,Sales
2026-06-24,4026.60,Acme Corp,6010,Michael Brown,Legal
2026-06-08,1984.31,Acme Corp,6050,Michael Brown,Marketing
2026-05-14,3290.08,DataHub Inc,6010,Alex Wilson,Operations
2026-05-29,139.18,OfficeMax,6100,Michael Brown,Finance
2026-05-22,2602.22,OfficeMax,6020,Emma Davis,Operations
2026-06-01,1312.34,TechSupplies Inc,6100,John Doe,Legal
2026-07-15,1367.27,Acme Corp,7020,Sarah Smith,HR
2026-05-22,1853.55,Apex Media,6050,Emma Davis,Finance
2026-05-14,3607.16,Global Logistics,6050,Michael Brown,Sales
2026-05-05,168.77,OfficeMax,6020,Alex Wilson,Sales
2026-07-14,4669.23,Cloud Services LLC,6010,John Doe,Sales
2026-05-15,3314.25,DataHub Inc,7020,Michael Brown,Legal
2026-06-03,2463.60,Cloud Services LLC,7020,John Doe,IT
2026-07-15,2697.67,Precision Tools,6020,John Doe,IT
2026-07-03,1933.92,Prime Stationers,6020,Michael Brown,Marketing
2026-06-17,3704.11,DataHub Inc,7020,Alex Wilson,IT
2026-06-09,3242.76,Vertex Consulting,6100,Rachel Green,Finance
2026-06-25,33.16,DataHub Inc,7010,Rachel Green,HR
2026-05-15,388.05,Global Logistics,6200,John Doe,Legal
2026-05-13,317.46,Vertex Consulting,7020,John Doe,Marketing
2026-05-11,4132.73,TechSupplies Inc,6200,John Doe,HR
2026-05-07,3171.60,DataHub Inc,7020,John Doe,IT
2026-06-22,943.73,TechSupplies Inc,7010,Emma Davis,Finance
2026-05-15,1441.14,Global Logistics,6100,John Doe,HR
2026-07-10,639.16,Apex Media,7010,Emma Davis,HR
2026-07-13,2805.22,OfficeMax,7020,Emma Davis,Legal
2026-06-01,2818.28,Acme Corp,6200,John Doe,Operations
2026-05-26,3464.98,Apex Media,7010,Rachel Green,Finance
2026-07-08,1622.80,Acme Corp,6010,Michael Brown,Marketing
2026-05-21,3846.78,Apex Media,6200,John Doe,Operations
2026-05-13,378.48,OfficeMax,6200,Michael Brown,Marketing
2026-05-20,941.26,OfficeMax,6010,Alex Wilson,HR
2026-06-09,1784.44,Acme Corp,6050,Sarah Smith,HR
2026-05-11,2688.60,Precision Tools,7020,Michael Brown,Sales
2026-06-24,3386.05,DataHub Inc,7010,Rachel Green,Operations
2026-06-03,3919.39,Prime Stationers,6200,John Doe,Operations
2026-06-22,4723.76,Global Logistics,6020,Sarah Smith,Legal
2026-05-08,1129.64,Acme Corp,7020,Michael Brown,IT
2026-06-30,1098.24,Prime Stationers,6050,Michael Brown,Legal
2026-07-02,3962.31,DataHub Inc,7020,Sarah Smith,Marketing
2026-06-26,4365.64,Prime Stationers,6010,Sarah Smith,Marketing
2026-06-08,2976.35,DataHub Inc,6010,Rachel Green,Legal
2026-05-15,1883.57,Precision Tools,6020,Michael Brown,IT
2026-05-08,1130.16,Acme Corp,7020,Michael Brown,Operations
2026-06-17,25000.00,Acme Corp,7010,John Doe,Finance
2026-06-08,2231.11,TechSupplies Inc,6010,Emma Davis,Sales
2026-05-12,1858.15,Vertex Consulting,7020,Michael Brown,Sales
2026-06-03,804.63,Prime Stationers,6200,Rachel Green,Operations
2026-07-09,319.12,Vertex Consulting,6010,John Doe,Sales
2026-05-15,145.68,Cloud Services LLC,6020,Sarah Smith,Marketing
2026-05-22,1985.95,Prime Stationers,6020,Emma Davis,IT
2026-05-25,942.76,Prime Stationers,6020,Emma Davis,Marketing
2026-06-01,3242.95,Vertex Consulting,7020,Alex Wilson,Legal
2026-06-04,344.36,Precision Tools,7010,Michael Brown,Marketing
2026-06-05,1719.28,DataHub Inc,6100,Rachel Green,Legal
2026-06-22,144.59,Vertex Consulting,7020,Emma Davis,Legal
2026-07-01,2451.25,DataHub Inc,6020,John Doe,Sales
2026-06-03,4714.36,Global Logistics,6200,John Doe,Legal
2026-06-10,1176.66,Apex Media,6020,Rachel Green,HR
2026-07-10,1469.50,TechSupplies Inc,6020,Michael Brown,IT
2026-05-25,3424.56,Acme Corp,7010,Sarah Smith,Legal
2026-06-25,3816.29,Precision Tools,7010,Michael Brown,Operations
2026-06-24,4678.05,DataHub Inc,7020,Rachel Green,HR
2026-06-24,1666.71,Global Logistics,6020,Michael Brown,IT
2026-05-04,2733.01,DataHub Inc,6100,Sarah Smith,Operations
2026-06-24,4357.00,Apex Media,6050,Sarah Smith,Marketing
2026-06-08,4086.05,DataHub Inc,6200,Sarah Smith,Marketing
2026-05-08,1187.21,Precision Tools,6010,John Doe,HR
2026-06-24,2008.57,Acme Corp,7010,Rachel Green,HR
2026-06-30,4593.54,Global Logistics,6050,Alex Wilson,Legal
2026-06-16,809.81,Vertex Consulting,6020,Rachel Green,Finance
2026-06-05,2257.18,TechSupplies Inc,6100,Alex Wilson,IT
2026-05-26,1782.37,TechSupplies Inc,7010,Michael Brown,Sales
2026-06-02,3450.75,TechSupplies Inc,6010,Sarah Smith,IT
2026-06-05,3252.82,OfficeMax,6200,Sarah Smith,HR
2026-05-11,4151.91,TechSupplies Inc,6100,Michael Brown,Operations
2026-06-18,2900.16,Prime Stationers,6200,Michael Brown,Sales
2026-05-27,3487.48,OfficeMax,7010,Rachel Green,Legal
2026-06-17,2835.61,Global Logistics,6100,Sarah Smith,IT
2026-06-11,2382.52,TechSupplies Inc,6050,Michael Brown,Marketing
2026-06-16,3450.75,TechSupplies Inc,6010,Michael Brown,IT
2026-06-22,4200.00,Apex Media,6200,,Marketing
2026-06-01,1807.97,Global Logistics,6100,Alex Wilson,HR
`;

export const INVALID_SAMPLE_DATA_CSV = `transaction_id,tx_date,vendor_name,total_amount,status
TX1001,2026-06-01,Acme Corp,1250.00,Approved
TX1002,2026-06-02,TechSupplies Inc,4500.00,Pending
TX1003,2026-06-03,Global Logistics,820.00,Approved
`;
