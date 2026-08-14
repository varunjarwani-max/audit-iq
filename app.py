import streamlit as st
import pandas as pd
import requests

# Set Page Config
st.set_page_config(
    page_title="AuditIQ — Anomaly & 5C Generator",
    page_icon="🛡️",
    layout="wide"
)

st.title("🛡️ AuditIQ — Transaction Auditor & 5C AI Generator")

# Initialize session state for persisting generated findings across re-runs
if "audit_findings" not in st.session_state:
    st.session_state.audit_findings = {}

# 1. Sidebar & Backend Configuration
with st.sidebar:
    st.header("⚙️ Backend Engine")
    backend_mode = st.radio(
        "Choose AI Engine:",
        ["Kaggle / Ngrok Tunnel", "Direct Groq API"]
    )

    if backend_mode == "Kaggle / Ngrok Tunnel":
        DEFAULT_URL = "https://reflux-jogger-unmatched.ngrok-free.dev"
        backend_url = st.text_input("Active Kaggle Ngrok Endpoint:", value=DEFAULT_URL)
    else:
        groq_api_key = st.secrets.get("GROQ_API_KEY", "")
        if not groq_api_key:
            groq_api_key = st.text_input("Groq API Key:", type="password")

    if st.button("🧹 Clear Generated Findings", use_container_width=True):
        st.session_state.audit_findings = {}
        st.rerun()

# 2. File Ingestion
st.subheader("1. Ingest Transaction Ledger")
uploaded_file = st.file_uploader("Upload CSV file", type=["csv"])

REQUIRED_COLUMNS = ['date', 'amount', 'vendor', 'account_code', 'approved_by', 'department']

if uploaded_file:
    df = pd.read_csv(uploaded_file)

    # Schema Validation
    missing_cols = [c for c in REQUIRED_COLUMNS if c not in df.columns]
    if missing_cols:
        st.error(f"❌ Schema Validation Error: Missing required columns: {missing_cols}")
    else:
        st.success("✅ Schema Validation Successful! Running Anomaly Detection...")

        # Sanitize numeric data
        df["amount"] = pd.to_numeric(df["amount"], errors="coerce").fillna(0.0)

        # Rule-based Anomaly Detection Engine
        def check_anomalies(row):
            reasons = []
            score = 0

            # Rule 1: High value without explicit manual approval (+3 pts)
            if row["amount"] > 100000 and str(row["approved_by"]).strip().lower() != "manual":
                reasons.append("High-Value Transaction lacking explicit manual approval (+3 pts)")
                score += 3

            # Rule 2: Split invoice near statutory threshold (+3 pts)
            if 45000 <= row["amount"] < 50000:
                reasons.append("Amount just below ₹50,000 threshold (Potential split invoice) (+3 pts)")
                score += 3

            # Rule 3: Large round sum payment (+2 pts)
            if row["amount"] >= 50000 and (row["amount"] % 10000 == 0):
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

        # Display Summary Table
        st.dataframe(
            df[['date', 'vendor', 'amount', 'department', 'approved_by', 'Risk_Score', 'Anomaly_Count']],
            use_container_width=True
        )

        # 3. AI 5C Finding Generation Section
        flagged_df = df[df["Risk_Score"] > 0]

        if not flagged_df.empty:
            st.subheader("🤖 AI 5C Audit Finding Generator")

            for idx, row in flagged_df.iterrows():
                finding_key = f"finding_{idx}"
                btn_key = f"btn_{idx}"

                with st.expander(f"🤖 Audit Finding: {row['vendor']} — ₹{row['amount']:,.2f} (Risk Score: {row['Risk_Score']}/10)"):
                    st.write(f"**Department:** {row['department']} | **Date:** {row['date']} | **Approved By:** {row['approved_by']}")
                    st.write("**Triggered Flags:**")
                    for a in row["Anomalies"]:
                        st.warning(f"• {a}")

                    if st.button("Run AI Senior Audit", key=btn_key):
                        if backend_mode == "Kaggle / Ngrok Tunnel":
                            if not backend_url:
                                st.error("Please enter a valid Ngrok backend endpoint.")
                            else:
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

                                with st.spinner("Analyzing ledger finding via Kaggle backend..."):
                                    try:
                                        res = requests.post(target_endpoint, json=payload, headers=headers, timeout=90)
                                        if res.status_code == 200:
                                            data = res.json()
                                            finding_text = data.get("finding") or data.get("response") or data.get("audit_finding")
                                            st.session_state.audit_findings[finding_key] = finding_text
                                        else:
                                            st.error(f"Backend returned HTTP {res.status_code}: {res.text}")
                                    except Exception as e:
                                        st.error(f"Connection to {target_endpoint} failed: {e}")

                        else:
                            # Direct Groq API Mode
                            if not groq_api_key:
                                st.error("Please provide a Groq API Key in the sidebar or under Streamlit Secrets.")
                            else:
                                from groq import Groq
                                with st.spinner("Drafting 5C Finding using Groq..."):
                                    try:
                                        client = Groq(api_key=groq_api_key)
                                        prompt_5c = f"""
                                        You are a Big 4 Statutory Senior Auditor. Produce a strict 5C framework audit finding for the following ledger exception:
                                        - Vendor: {row['vendor']}
                                        - Transaction Amount: ₹{row['amount']:,.2f}
                                        - Department: {row['department']}
                                        - Approval Type: {row['approved_by']}
                                        - Triggered Anomalies: {', '.join(row['Anomalies'])}

                                        Format clearly with standard audit sections:
                                        1. Condition (Factual description of what was identified)
                                        2. Criteria (Statutory requirement, standard, or internal control policy violated)
                                        3. Cause (Underlying process failure or operational lapse)
                                        4. Consequence (Financial impact, compliance penalty, or exposure risk)
                                        5. Corrective Action (Direct, actionable remediation steps)
                                        """

                                        chat_resp = client.chat.completions.create(
                                            model="openai/gpt-oss-120b",
                                            messages=[{"role": "user", "content": prompt_5c}]
                                        )
                                        st.session_state.audit_findings[finding_key] = chat_resp.choices[0].message.content
                                    except Exception as e:
                                        st.error(f"Groq generation failed: {e}")

                    # Render cached finding if generated
                    if finding_key in st.session_state.audit_findings:
                        st.success("✅ Audit Finding Generated:")
                        st.markdown(st.session_state.audit_findings[finding_key])
