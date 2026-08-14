import streamlit as st
import pandas as pd
import requests

st.set_page_config(page_title="AuditIQ — Anomaly & 5C Generator", layout="wide")

st.title("🛡️ AuditIQ — Transaction Auditor & 5C AI Generator")

# 1. Active Kaggle Backend Ngrok Endpoint
DEFAULT_URL = "https://reflux-jogger-unmatched.ngrok-free.dev"

backend_url = st.text_input(
    "Active Kaggle Backend Ngrok Endpoint:",
    value=DEFAULT_URL
)

# 2. File Ingestion
st.subheader("1. Ingest Transaction Ledger")
uploaded_file = st.file_uploader("Upload CSV file", type=["csv"])

REQUIRED_COLUMNS = ['date', 'amount', 'vendor', 'account_code', 'approved_by', 'department']

if uploaded_file:
    df = pd.read_csv(uploaded_file)
    
    # Schema check
    missing_cols = [c for c in REQUIRED_COLUMNS if c not in df.columns]
    if missing_cols:
        st.error(f"❌ Schema Validation Error: Missing columns: {missing_cols}")
    else:
        st.success("✅ Schema Validation Successful! Running Anomaly Detection...")
        
        # Rule-based Anomaly Engine
        def check_anomalies(row):
            reasons = []
            score = 0
            
            # Rule 1: High value without manual approval (+3 pts)
            if row["amount"] > 100000 and str(row["approved_by"]).strip().lower() != "manual":
                reasons.append("High-Value Transaction lacking explicit manual approval (+3 pts)")
                score += 3
                
            # Rule 2: Split invoice near statutory threshold (+3 pts)
            if 45000 <= row["amount"] < 50000:
                reasons.append("Amount just below ₹50,000 threshold (Potential split invoice) (+3 pts)")
                score += 3
                
            # Rule 3: Round sum payment (+2 pts)
            if row["amount"] >= 50000 and row["amount"] % 10000 == 0:
                reasons.append("Large Round-Number Transaction (+2 pts)")
                score += 2
                
            return pd.Series([reasons, min(score, 10)])

        df[["Anomalies", "Risk_Score"]] = df.apply(check_anomalies, axis=1)
        df["Anomaly_Count"] = df["Anomalies"].apply(len)
        
        # Summary Metrics
        col1, col2, col3 = st.columns(3)
        col1.metric("Total Transactions", len(df))
        col2.metric("Flagged Anomalies", len(df[df["Risk_Score"] > 0]))
        col3.metric("Clean Transactions", len(df[df["Risk_Score"] == 0]))
        
        st.dataframe(df[['date', 'vendor', 'amount', 'department', 'approved_by', 'Risk_Score']], use_container_width=True)
        
        # 3. AI 5C Finding Generation Section
        flagged_df = df[df["Risk_Score"] > 0]
        
        if not flagged_df.empty:
            st.subheader("🤖 AI 5C Audit Finding Generator")
            for idx, row in flagged_df.iterrows():
                with st.expander(f"🤖 Generate AI 5C Finding — Vendor: {row['vendor']} (₹{row['amount']:,.2f})"):
                    st.write(f"**Department:** {row['department']} | **Date:** {row['date']} | **Approved By:** {row['approved_by']}")
                    st.write(f"**Risk Score:** {row['Risk_Score']}/10")
                    st.write("**Triggered Anomaly Flags:**")
                    for a in row["Anomalies"]:
                        st.warning(a)
                        
                    if st.button("Run AI Senior Audit", key=f"btn_{idx}"):
                        if not backend_url:
                            st.error("Please provide the Ngrok endpoint URL.")
                        else:
                            # Standardize target endpoint URL & add ngrok bypass header
                            target_endpoint = backend_url.rstrip("/") + "/generate_finding"
                            headers = {
                                "ngrok-skip-browser-warning": "true",
                                "Content-Type": "application/json"
                            }
                            payload = {
                                "vendor": str(row["vendor"]),
                                "amount": float(row["amount"]),
                                "department": str(row["department"]),
                                "flagged_reasons": row["Anomalies"]
                            }
                            
                            with st.spinner("Analyzing ledger finding with Big 4 Senior Auditor AI on Kaggle..."):
                                try:
                                    res = requests.post(target_endpoint, json=payload, headers=headers, timeout=120)
                                    if res.status_code == 200:
                                        data = res.json()
                                        finding_text = data.get("finding") or data.get("response") or data.get("audit_finding")
                                        st.success("✅ Audit Finding Generated Live:")
                                        st.markdown(finding_text)
                                    else:
                                        st.error(f"Server returned HTTP {res.status_code}: {res.text}")
                                except Exception as e:
                                    st.error(f"Failed to connect to backend at {target_endpoint}: {e}")