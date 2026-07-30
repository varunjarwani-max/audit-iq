export const REQUIREMENTS_TXT = `streamlit>=1.30.0
pandas>=2.0.0
scikit-learn>=1.3.0
numpy>=1.24.0
requests>=2.28.0
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
import numpy as np
import requests
from sklearn.ensemble import IsolationForest

# 1. Page Configuration: Wide Layout & Page Title
st.set_page_config(
    page_title="AuditIQ - Step 5 (AI Auditor Connected)",
    layout="wide",
    page_icon="🔍"
)

# Sidebar controls
st.sidebar.title("AuditIQ Controls")
st.sidebar.markdown("---")
st.sidebar.header("⚙️ View Controls & Filters")
view_option = st.sidebar.radio(
    "Select View Mode:",
    ["Flagged Anomalies Only", "All Transactions", "Anomaly Summary & Metrics"],
    index=0
)

contamination = st.sidebar.slider(
    "Isolation Forest Contamination",
    min_value=0.01, max_value=0.20, value=0.05, step=0.01,
    help="Baseline percentage threshold for ML outlier detection."
)

st.sidebar.markdown("---")
st.sidebar.header("🤖 AI Auditor Settings")
colab_url = st.sidebar.text_input(
    "Colab Ngrok API URL",
    value="https://reflux-jogger-unmatched.ngrok-free.dev"
)
st.sidebar.caption("Enter the public Ngrok endpoint generated by your Google Colab backend server.")

st.sidebar.markdown("---")
st.sidebar.info("📌 **Audit Rules & Risk Weights:**\\n"
                "- Statistical Outlier: **+4 pts**\\n"
                "- Missing Approval: **+3 pts**\\n"
                "- Duplicate Vendor Payment (< 30 Days): **+3 pts**\\n"
                "- Weekend Transaction: **+2 pts**\\n"
                "- Large Round Number (> $10k): **+2 pts**\\n\\n"
                "*(Max score strictly capped at 10)*")

# Title and header description
st.title("AuditIQ - POC Step 5")
st.subheader("Data Ingestion, Anomaly Detection, Risk Scoring & Colab LLM Integration")
st.markdown("Upload transactional CSV files for automated schema verification, ML outlier detection, rule-based audit checks, weighted risk scoring (1-10), and real-time AI 5C Finding generation via Google Colab.")

# 2. Required Schema Definition
REQUIRED_COLUMNS = ['date', 'amount', 'vendor', 'account_code', 'approved_by', 'department']

def calculate_risk_score(reasons_list: list) -> int:
    """
    Calculates weighted risk score from 1 to 10 based on triggered audit checks.
    Weights:
    - Statistical Outlier (Isolation Forest): +4
    - Missing Approval: +3
    - Duplicate Vendor Payment (< 30 Days): +3
    - Weekend Transaction: +2
    - Large Round Number (> $10,000): +2
    """
    if not reasons_list:
        return 0
    
    unique_r = set(reasons_list)
    score = 0
    if "Statistical Outlier (Isolation Forest)" in unique_r:
        score += 4
    if "Missing Approval" in unique_r:
        score += 3
    if "Duplicate Vendor Payment (< 30 Days)" in unique_r:
        score += 3
    if "Weekend Transaction" in unique_r:
        score += 2
    if "Large Round Number (> $10,000)" in unique_r:
        score += 2

    return min(10, max(1, score))

def run_anomaly_detection_pipeline(df_in: pd.DataFrame, contamination_rate: float = 0.05) -> pd.DataFrame:
    """
    Evaluates input DataFrame and adds 'is_anomalous' (bool), 'risk_score' (1-10 int), and 'anomaly_reasons' (str) columns.
    Uses IsolationForest ML outlier detection + 4 Rule-Based Audit Checks + Weighted Risk Scoring.
    """
    df = df_in.copy()
    
    # Initialize array of reason lists for each row
    reasons = [[] for _ in range(len(df))]
    
    # Create helper numeric and datetime columns
    df['parsed_date'] = pd.to_datetime(df['date'], errors='coerce')
    df['numeric_amount'] = pd.to_numeric(df['amount'], errors='coerce').fillna(0.0)
    
    # A. Machine Learning Outlier Detection (IsolationForest)
    if len(df) > 0:
        try:
            amounts_2d = df[['numeric_amount']].values
            iso_forest = IsolationForest(contamination=contamination_rate, random_state=42)
            preds = iso_forest.fit_predict(amounts_2d)
            
            for idx, pred in enumerate(preds):
                if pred == -1:
                    reasons[idx].append("Statistical Outlier (Isolation Forest)")
        except Exception as e:
            st.warning(f"Note: IsolationForest execution notice: {e}")

    # B. Rule-Based Audit Checks
    
    # Check 1: Duplicate Payments (same vendor & amount within 30 days)
    for idx, row in df.iterrows():
        v = row['vendor']
        amt = row['numeric_amount']
        dt = row['parsed_date']
        
        if pd.notnull(v) and pd.notnull(dt) and amt > 0:
            # Matches same vendor and same amount (excluding current row)
            matches = df[
                (df.index != idx) & 
                (df['vendor'] == v) & 
                (np.isclose(df['numeric_amount'], amt)) & 
                (df['parsed_date'].notnull())
            ]
            for _, match in matches.iterrows():
                diff_days = abs((dt - match['parsed_date']).days)
                if diff_days <= 30:
                    reasons[idx].append("Duplicate Vendor Payment (< 30 Days)")
                    break

    # Check 2: Large Round Numbers (amount >= 10,000 AND round number)
    for idx, row in df.iterrows():
        amt = row['numeric_amount']
        if amt >= 10000:
            raw_amt_str = str(row['amount']).strip()
            is_round = (amt % 100 == 0) or (amt % 1000 == 0) or raw_amt_str.endswith('.00') or raw_amt_str.endswith('.0')
            if is_round:
                reasons[idx].append("Large Round Number (> $10,000)")

    # Check 3: Weekend Transactions (Saturday or Sunday)
    for idx, row in df.iterrows():
        dt = row['parsed_date']
        if pd.notnull(dt):
            if dt.weekday() in [5, 6]:  # 5 = Saturday, 6 = Sunday
                reasons[idx].append("Weekend Transaction")

    # Check 4: Missing Approver (null, blank, NaN, or whitespace)
    for idx, row in df.iterrows():
        approver = row.get('approved_by')
        if pd.isna(approver) or approver is None or str(approver).strip() == '' or str(approver).lower() in ['nan', 'null', 'none']:
            reasons[idx].append("Missing Approval")

    # Format output columns & compute Step 3 risk score
    is_anomalous = [len(r) > 0 for r in reasons]
    risk_scores = [calculate_risk_score(r) for r in reasons]
    formatted_reasons = [", ".join(sorted(set(r))) if len(r) > 0 else "Normal" for r in reasons]
    
    df['is_anomalous'] = is_anomalous
    df['risk_score'] = risk_scores
    df['anomaly_reasons'] = formatted_reasons
    
    # Clean up temporary helper columns
    df = df.drop(columns=['parsed_date', 'numeric_amount'])
    
    return df

def apply_risk_score_styling(df_to_style: pd.DataFrame):
    """
    Applies Pandas background styling to the 'risk_score' column:
    - Red for scores 8-10 (High Risk)
    - Yellow/Orange for scores 5-7 (Medium Risk)
    - Green for scores below 5 (Low Risk)
    """
    def style_risk(val):
        if not isinstance(val, (int, float, np.number)):
            return ''
        if val >= 8:
            return 'background-color: #f8d7da; color: #721c24; font-weight: bold;'
        elif val >= 5:
            return 'background-color: #fff3cd; color: #856404; font-weight: bold;'
        elif val > 0:
            return 'background-color: #d4edda; color: #155724; font-weight: bold;'
        return ''

    styler = df_to_style.style
    if hasattr(styler, 'map'):
        return styler.map(style_risk, subset=['risk_score'])
    else:
        return styler.applymap(style_risk, subset=['risk_score'])

# 3. File Uploader Widget (Accepts CSV files only)
uploaded_file = st.file_uploader("Upload CSV file", type=["csv"], help="Upload an audit sample CSV file to validate schema and run anomaly pipeline.")

if uploaded_file is not None:
    try:
        # Read CSV into Pandas DataFrame
        df_raw = pd.read_csv(uploaded_file)
        
        # 4. Validate Schema
        uploaded_cols = list(df_raw.columns)
        missing_cols = [col for col in REQUIRED_COLUMNS if col not in uploaded_cols]
        
        # If any columns are missing, halt execution and display strict st.error
        if missing_cols:
            st.error(f"❌ Schema Validation Error: The uploaded CSV file is missing required columns:\\n\\n" + 
                     "\\n".join([f"- \`{col}\`" for col in missing_cols]))
            st.warning(f"Expected schema: \`{REQUIRED_COLUMNS}\`\\n\\nFound columns: \`{uploaded_cols}\`")
            st.stop()
            
        # 5. Validation Success Response & Anomaly Pipeline
        st.success("✅ Schema Validation Successful! Running Step 5 Anomaly Detection, Risk Scoring & Colab AI Pipeline...")
        
        # Execute Anomaly Pipeline
        df_analyzed = run_anomaly_detection_pipeline(df_raw, contamination_rate=contamination)
        
        # Filter down to anomalous transactions
        flagged_df = df_analyzed[df_analyzed['is_anomalous'] == True]
        total_count = len(df_analyzed)
        anomaly_count = len(flagged_df)
        anomaly_pct = (anomaly_count / total_count * 100) if total_count > 0 else 0.0

        # Summary Metrics Row
        m1, m2, m3, m4 = st.columns(4)
        with m1:
            st.metric(label="Total Transactions", value=f"{total_count:,}")
        with m2:
            st.metric(label="Anomalies Flagged", value=f"{anomaly_count:,}", delta=f"{anomaly_pct:.1f}% Flagged", delta_color="inverse")
        with m3:
            st.metric(label="Clean Transactions", value=f"{total_count - anomaly_count:,}")
        with m4:
            st.metric(label="Unique Vendors", value=f"{df_analyzed['vendor'].nunique():,}")

        st.divider()

        # Display Based on View Option
        if view_option == "Flagged Anomalies Only":
            st.subheader("🚩 Flagged Anomaly Report (Sorted by Risk Score)")
            st.markdown(f"Displaying **{anomaly_count}** flagged transactions requiring auditor review, sorted by highest risk score first.")
            
            if anomaly_count > 0:
                # Sort flagged anomalies by risk_score descending (highest score 10 at top)
                flagged_sorted = flagged_df.sort_values(by='risk_score', ascending=False)
                
                # Apply Pandas background color-coding for risk_score
                styled_flagged = apply_risk_score_styling(flagged_sorted)
                
                # Render color-coded, sorted dataframe
                st.dataframe(styled_flagged, use_container_width=True, height=350)
                
                # Download flagged report
                csv_data = flagged_sorted.to_csv(index=False).encode('utf-8')
                st.download_button(
                    label="📥 Download Flagged Anomaly Report (CSV)",
                    data=csv_data,
                    file_name="flagged_audit_anomalies_risk_scored.csv",
                    mime="text/csv",
                )

                # Interactive AI Finding Generation Section
                st.markdown("---")
                st.subheader("🤖 AI 5C Audit Finding Generator")
                st.markdown("Select any flagged transaction below to trigger the Big 4 Senior Auditor LLM backend hosted on Google Colab.")

                for index, row in flagged_sorted.iterrows():
                    vendor_name = str(row["vendor"])
                    try:
                        amt_val = float(row["amount"])
                        amt_str = f"\${amt_val:,.2f}"
                    except Exception:
                        amt_val = 0.0
                        amt_str = f"\${row['amount']}"
                    
                    risk_val = row.get("risk_score", 0)
                    expander_title = f"🤖 Generate AI 5C Finding — Vendor: {vendor_name} ({amt_str})"
                    
                    with st.expander(expander_title):
                        c1, c2 = st.columns([3, 1])
                        with c1:
                            st.write(f"**Department:** {row.get('department', 'N/A')} | **Date:** {row.get('date', 'N/A')} | **Approved By:** {row.get('approved_by', 'N/A')}")
                            st.write(f"**Triggered Anomaly Flags:** \`{row.get('anomaly_reasons', 'N/A')}\` ")
                        with c2:
                            st.metric(label="Risk Score", value=f"{risk_val}/10")
                        
                        btn_key = f"btn_{index}"
                        if st.button("Run AI Senior Audit", key=btn_key):
                            endpoint = f"{colab_url.rstrip('/')}/generate_finding"
                            payload = {
                                "amount": float(row["amount"]),
                                "vendor": str(row["vendor"]),
                                "department": str(row["department"]),
                                "anomaly_reasons": str(row["anomaly_reasons"])
                            }
                            
                            with st.spinner("Querying Big 4 Senior Auditor LLM..."):
                                try:
                                    response = requests.post(endpoint, json=payload, timeout=25)
                                    if response.status_code == 200:
                                        res_json = response.json()
                                        finding_content = (
                                            res_json.get("finding") or 
                                            res_json.get("result") or 
                                            res_json.get("5c_finding") or 
                                            str(res_json)
                                        )
                                        st.success("✅ 5C Audit Finding Generated Successfully!")
                                        st.markdown("### 📋 Big 4 Senior Auditor 5C Finding Report")
                                        st.info(finding_content)
                                    else:
                                        st.error("Failed to connect to Colab LLM Server. Please check if your Google Colab notebook cell is running and the Ngrok URL is correct.")
                                except Exception:
                                    st.error("Failed to connect to Colab LLM Server. Please check if your Google Colab notebook cell is running and the Ngrok URL is correct.")

            else:
                st.info("🎉 No anomalies detected in this dataset based on current rules.")

        elif view_option == "All Transactions":
            st.subheader("📋 Ingested Audit Transactions (All Rows)")
            st.markdown("All rows with appended \`is_anomalous\`, \`risk_score\`, and \`anomaly_reasons\` columns.")
            
            # Sort all transactions by risk_score descending
            df_analyzed_sorted = df_analyzed.sort_values(by='risk_score', ascending=False)
            styled_all = apply_risk_score_styling(df_analyzed_sorted)
            
            st.dataframe(styled_all, use_container_width=True, height=450)

        else: # Anomaly Summary & Metrics
            st.subheader("📊 Anomaly Breakdown & Audit Rules Analysis")
            
            # Count occurrences of each reason
            all_reasons = []
            for r in flagged_df['anomaly_reasons']:
                if r != "Normal":
                    all_reasons.extend([item.strip() for item in r.split(",")])
            
            if all_reasons:
                reason_counts = pd.Series(all_reasons).value_counts().reset_index()
                reason_counts.columns = ["Audit Check / Anomaly Rule", "Flag Count"]
                
                c1, c2 = st.columns([1, 1])
                with c1:
                    st.write("**Flags by Rule Type:**")
                    st.dataframe(reason_counts, use_container_width=True)
                with c2:
                    st.write("**Top Flagged Vendors:**")
                    top_vendors = flagged_df['vendor'].value_counts().reset_index()
                    top_vendors.columns = ["Vendor", "Anomalous Transaction Count"]
                    st.dataframe(top_vendors, use_container_width=True)
            else:
                st.info("No audit rules were triggered.")

    except Exception as e:
        st.error(f"An error occurred while parsing or processing the CSV file: {e}")
else:
    st.info("💡 Please upload a \`.csv\` file to perform schema validation and run Step 5 anomaly detection & AI risk scoring.")
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
