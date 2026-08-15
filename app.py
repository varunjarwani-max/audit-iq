import streamlit as st
import pandas as pd
import requests
from datetime import datetime, timezone
import io

# --- PAGE CONFIGURATION ---
st.set_page_config(page_title="AuditIQ — Autonomous Statutory Auditor", layout="wide")

st.title("🛡️ AuditIQ — Autonomous Statutory AI Auditor")
st.markdown("Automated Ledger Ingestion • Entity-Level Forensic Aggregation • 24/7 Cloud LLM 5C Workpapers")

# --- 1. PERSISTENT STATE & CLOUD KEY ---
if "audit_findings" not in st.session_state:
    st.session_state.audit_findings = {}
if "sentry_interceptions" not in st.session_state:
    st.session_state.sentry_interceptions = 0

GROQ_API_KEY = st.secrets.get("GROQ_API_KEY", "")
if not GROQ_API_KEY:
    GROQ_API_KEY = st.sidebar.text_input("Enter Groq API Key (gsk_...):", type="password")

KB_VERSION = "AuditIQ-KB v1.3 (Entity Aggregation / ICAI SA 240 / Companies Act 2013)"

# --- 2. DETERMINISTIC STATUTORY KNOWLEDGE BASE ---
STATUTORY_KNOWLEDGE_BASE = {
    "split_invoice": (
        "Internal Financial Controls (IFC) under Section 143(3)(i) of the Companies Act, 2013 "
        "and ICAI Standard on Auditing (SA) 240 ('The Auditor's Responsibilities Relating to Fraud "
        "in an Audit of Financial Statements' - Fraud Risk Factors / Threshold Evasion)."
    ),
    "high_value_auto_approval": (
        "Delegation of Financial Powers (DoFP) Framework, ICAI Standard on Auditing (SA) 315 "
        "('Identifying and Assessing the Risks of Material Misstatement'), "
        "and Section 143(3)(i) of the Companies Act, 2013 regarding operating effectiveness of internal controls."
    ),
    "round_number": (
        "ICAI Standard on Auditing (SA) 500 ('Audit Evidence') and SA 520 ('Analytical Procedures'), "
        "mandating substantive testing and corroborative underlying documentation for non-routine disbursements."
    ),
    "fallback": (
        "ICAI Standard on Auditing (SA) 200 ('Overall Objectives of the Independent Auditor') "
        "and Section 143(3)(i) of the Companies Act, 2013."
    )
}

# --- 3. SYNTHETIC SAMPLE LEDGER GENERATOR (UPDATED FOR STRUCTURING PATTERN) ---
def get_sample_ledger_df():
    sample_data = {
        "date": ["2026-08-01", "2026-08-02", "2026-08-05", "2026-08-10", "2026-08-11", "2026-08-12", "2026-08-14"],
        "vendor": ["Nexus Logistics", "CloudScale Networks", "OfficeDepot Corp", "Swift Freight", "Swift Freight", "Tata Power", "Swift Freight"],
        "amount": [48900.00, 350000.00, 12450.00, 49500.00, 49000.00, 60000.00, 49890.00],
        "account_code": ["AC-7021", "AC-5011", "AC-1002", "AC-7021", "AC-7021", "AC-3004", "AC-7021"],
        "approved_by": ["Auto-Approved", "Auto-Approved", "Manual", "Auto-Approved", "Auto-Approved", "Manual", "Auto-Approved"],
        "department": ["Operations", "IT", "Administration", "Logistics", "Logistics", "Facilities", "Logistics"]
    }
    return pd.DataFrame(sample_data)

# --- 4. DATA INGESTION BENCH ---
st.subheader("1. Ingest Transaction Ledger")

col_upload, col_demo = st.columns([2, 1])

with col_upload:
    uploaded_file = st.file_uploader("Upload Transaction Ledger", type=["csv", "xlsx"])

with col_demo:
    st.write("**Instant Evaluator Test Bench:**")
    load_sample = st.button("🚀 Load Pre-built Demo Ledger", use_container_width=True)
    
    sample_excel_buffer = io.BytesIO()
    get_sample_ledger_df().to_excel(sample_excel_buffer, index=False, engine="openpyxl")
    st.download_button(
        label="📥 Download Sample Template (.XLSX)",
        data=sample_excel_buffer.getvalue(),
        file_name="AuditIQ_Sample_Ledger.xlsx",
        mime="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        use_container_width=True
    )

df = None
if uploaded_file is not None:
    file_extension = uploaded_file.name.split(".")[-1].lower()
    try:
        if file_extension == "csv":
            df = pd.read_csv(uploaded_file)
        elif file_extension == "xlsx":
            df = pd.read_excel(uploaded_file, engine="openpyxl")
    except Exception as e:
        st.error(f"❌ Failed to read file. Error: {e}")

elif load_sample or ("loaded_demo" in st.session_state and st.session_state.loaded_demo):
    st.session_state.loaded_demo = True
    df = get_sample_ledger_df()

REQUIRED_COLUMNS = ['date', 'amount', 'vendor', 'account_code', 'approved_by', 'department']

if df is not None:
    missing = [c for c in REQUIRED_COLUMNS if c not in df.columns]
    if missing:
        st.error(f"❌ Missing standard audit columns: {missing}")
    else:
        st.success("✅ Ledger Ingested & Schema Verified.")
        
        # --- 5. ALGORITHMIC ANOMALY DETECTION ENGINE ---
        def score_and_triage(row):
            reasons = []
            score = 0
            status = "READY"
            message = ""
            
            if pd.isna(row.get("amount")) or pd.isna(row.get("vendor")):
                return pd.Series([[], 0, "INSUFFICIENT_DATA", "SCOPE LIMITATION (SA 500): Missing core party or amount data."])
                
            if row["amount"] > 100000 and str(row["approved_by"]).strip().lower() != "manual":
                reasons.append("High-Value outlay without manual authorization (+3 pts)")
                score += 3
                
            if 45000 <= row["amount"] < 50000:
                reasons.append("Amount structured just below ₹50,000 threshold (+3 pts)")
                score += 3
                
            if row["amount"] >= 50000 and row["amount"] % 10000 == 0:
                reasons.append("Large Round-Number Transaction (+2 pts)")
                score += 2
                
            if score == 0:
                status = "CLEAN"
                message = "Conforms to baseline testing parameters."
                
            return pd.Series([reasons, min(score, 10), status, message])

        df[["Anomalies", "Risk_Score", "Audit_Status", "Status_Message"]] = df.apply(score_and_triage, axis=1)
        
        m1, m2, m3, m4 = st.columns(4)
        m1.metric("Total Transactions", len(df))
        m2.metric("Flagged Exceptions", len(df[df["Risk_Score"] > 0]))
        m3.metric("Clean Transactions", len(df[df["Audit_Status"] == "CLEAN"]))
        m4.metric("Documented Workpapers", len(st.session_state.audit_findings))
        
        st.dataframe(df[['date', 'vendor', 'amount', 'department', 'approved_by', 'Risk_Score', 'Audit_Status']], use_container_width=True)
        
        # --- 6. ENTITY-LEVEL 5C WORKPAPER SYNTHESIS ENGINE ---
        flagged_df = df[(df["Risk_Score"] > 0) | (df["Audit_Status"] == "INSUFFICIENT_DATA")]
        
        if not flagged_df.empty:
            st.divider()
            st.subheader("🤖 Autonomous Big 4 5C Workpaper Findings (Vendor-Aggregated)")
            
            # Relational Grouping: Group by Vendor instead of Row
            for vendor, vendor_data in flagged_df.groupby("vendor"):
                
                # Check for scope limitation within the vendor group
                if "INSUFFICIENT_DATA" in vendor_data["Audit_Status"].values:
                    with st.expander(f"⚠️ [SCOPE LIMITATION] Vendor: {vendor}", expanded=False):
                        st.warning("One or more transactions for this entity are missing core data. Unable to perform aggregate testing.")
                    continue
                
                # Aggregate Entity Metrics
                txns_count = len(vendor_data)
                total_amt = vendor_data['amount'].sum()
                base_max_risk = vendor_data['Risk_Score'].max()
                
                # THE FORENSIC PATTERN DETECTOR
                is_structuring = txns_count > 1 and total_amt >= 50000 and vendor_data['amount'].max() < 50000
                final_risk_score = 8 if is_structuring else base_max_risk
                
                # Consolidate all anomalies
                all_anomalies = set([a for sublist in vendor_data['Anomalies'] for a in sublist])
                if is_structuring:
                    all_anomalies.add(f"STRUCTURING PATTERN: {txns_count} sub-threshold payments totaling ₹{total_amt:,.2f} identified to evade the ₹50,000 manual approval limit.")
                
                vendor_key = f"vendor_{vendor}_{total_amt}"
                is_already_audited = vendor_key in st.session_state.audit_findings
                
                expander_title = (
                    f"✅ [AUDITED] {vendor} — Total: ₹{total_amt:,.2f} across {txns_count} txn(s) (Risk: {final_risk_score}/10)"
                    if is_already_audited else
                    f"🚩 [PENDING] {vendor} — Total: ₹{total_amt:,.2f} across {txns_count} txn(s) (Risk: {final_risk_score}/10)"
                )
                
                with st.expander(expander_title, expanded=is_already_audited):
                    # Show individual transactions inside the aggregated view
                    st.write(f"**Entity Exposure:** ₹{total_amt:,.2f} | **Transactions:** {txns_count}")
                    txn_details_str = ""
                    for _, r in vendor_data.iterrows():
                        st.write(f"- {r['date']} | ₹{r['amount']:,.2f} | Dept: {r['department']} | Approver: {r['approved_by']}")
                        txn_details_str += f"- {r['date']} | ₹{r['amount']:,.2f} | Dept: {r['department']} | Approver: {r['approved_by']}\n"
                    
                    st.markdown("---")
                    for a in all_anomalies:
                        if "STRUCTURING" in a:
                            st.error(f"🚨 {a}")
                        else:
                            st.warning(a)
                        
                    btn_label = "Re-generate Finding" if is_already_audited else "Generate Formal 5C Finding"
                    
                    if st.button(btn_label, key=f"btn_{vendor}"):
                        if not GROQ_API_KEY:
                            st.error("Please configure your Groq API Key.")
                        else:
                            applied_criteria = []
                            anomaly_str = str(all_anomalies)
                            if "STRUCTURING PATTERN" in anomaly_str or "₹50,000 threshold" in anomaly_str:
                                applied_criteria.append(STATUTORY_KNOWLEDGE_BASE["split_invoice"])
                            if "High-Value" in anomaly_str:
                                applied_criteria.append(STATUTORY_KNOWLEDGE_BASE["high_value_auto_approval"])
                            if "Round-Number" in anomaly_str:
                                applied_criteria.append(STATUTORY_KNOWLEDGE_BASE["round_number"])
                                
                            criteria_str = "\n- ".join(applied_criteria) if applied_criteria else STATUTORY_KNOWLEDGE_BASE["fallback"]

                            prompt = f"""You are a Big 4 Senior Statutory Auditor and Forensic Accounting Specialist.
Analyze the following flagged vendor aggregation and draft a precise, highly professional 5C statutory audit finding.

VENDOR ENTITY AGGREGATION:
- Vendor: {vendor}
- Total Aggregated Amount: ₹{total_amt:,.2f}
- Transaction Count: {txns_count}

INDIVIDUAL LEDGER ENTRIES:
{txn_details_str}

DETECTED ANOMALIES & PATTERNS:
- {chr(10)+'- '.join(all_anomalies)}

MANDATORY STATUTORY GROUNDING:
For the 'Criteria' section, you MUST use ONLY the following verified regulatory standards:
- {criteria_str}

CRITICAL RULES:
1. FACTUAL HONESTY: Do not invent, hallucinate, or cite any other section numbers, tax acts, or auditing standards not explicitly provided above.
2. RECOMMENDATION: Give specific, actionable remediation targeted to this anomaly. If a structuring/split-invoice pattern is detected, you MUST recommend implementing a vendor-level rolling-window aggregation rule in the ERP (e.g., flagging any vendor crossing ₹50k cumulatively in a 7-day window). Do not use generic templates.
3. ESCALATION: Do not escalate internal control lapses to external "regulatory bodies". Escalate only to Internal Audit, CFO, or the Audit Committee.

OUTPUT FORMAT (Plain text headings with colons):
Condition: [Factual statement of the specific vendor aggregation and pattern]
Criteria: [Use the exact standards provided above]
Cause: [Probable control breakdown, hedged appropriately]
Consequence: [Calibrated financial and internal control exposure]
Recommendation: [Specific remediation steps including ERP configurations]

Tone: Rigorous, measured, professional Big 4 working paper standard."""

                            with st.spinner("Drafting aggregated entity workpaper via Groq LPU engine..."):
                                try:
                                    headers = {
                                        "Authorization": f"Bearer {GROQ_API_KEY}",
                                        "Content-Type": "application/json"
                                    }
                                    payload = {
                                        "model": "llama-3.3-70b-versatile",
                                        "messages": [{"role": "user", "content": prompt}],
                                        "temperature": 0.1
                                    }
                                    
                                    response = requests.post(
                                        "https://api.groq.com/openai/v1/chat/completions",
                                        headers=headers,
                                        json=payload,
                                        timeout=30
                                    )
                                    
                                    if response.status_code == 200:
                                        finding_text = response.json()["choices"][0]["message"]["content"]
                                        
                                        banned_terms = ["section 138", "section 40a", "sas 700", "regulatory bodies", "section 37(5)"]
                                        sentry_flag = False
                                        for term in banned_terms:
                                            if term in finding_text.lower():
                                                sentry_flag = True
                                                finding_text = finding_text.replace(term, "[Standard Internal Control Framework]")
                                        
                                        if sentry_flag:
                                            st.session_state.sentry_interceptions += 1

                                        timestamp_now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
                                        
                                        st.session_state.audit_findings[vendor_key] = {
                                            "vendor": vendor,
                                            "amount": total_amt,
                                            "risk_score": final_risk_score,
                                            "finding": finding_text,
                                            "timestamp": timestamp_now,
                                            "sentry_intercepted": sentry_flag
                                        }
                                        st.rerun()
                                    else:
                                        st.error(f"API Error {response.status_code}: {response.text}")
                                except Exception as e:
                                    st.error(f"Connection failed: {e}")
                    
                    if is_already_audited:
                        finding_data = st.session_state.audit_findings[vendor_key]
                        st.markdown("---")
                        st.markdown("### 📄 Recorded Statutory Finding")
                        
                        if finding_data.get("sentry_intercepted"):
                            st.info("🛡️ **AuditIQ Sentry:** Ungrounded citation automatically intercepted and normalized.")
                            
                        st.markdown(finding_data["finding"])
                        st.caption(f"Audit Trail: Generated {finding_data['timestamp']} | Engine: Llama-3.3-70b (Temp 0.1) | {KB_VERSION}")

            # --- 7. EXPORT ENGAGEMENT WORKPAPER PACKAGE ---
            if st.session_state.audit_findings:
                st.divider()
                st.subheader("📑 Final Engagement Workpaper Export")
                
                export_time = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
                
                report_content = f"# AUDIT ENGAGEMENT MEMORANDUM & WORKING PAPERS\n"
                report_content += f"Generated on: {export_time}\n"
                report_content += f"Standards Framework: {KB_VERSION}\n"
                report_content += f"Total Entities Documented: {len(st.session_state.audit_findings)}\n"
                report_content += f"Sentry Interceptions: {st.session_state.sentry_interceptions}\n"
                report_content += "="*70 + "\n\n"
                report_content += "> **MANDATORY STATUTORY DISCLAIMER (SA 230 / ICAI Guidelines):**\n"
                report_content += "> This document is an autonomous draft audit finding generated by AuditIQ for preliminary analytical triage. "
                report_content += "It does not constitute a certified statutory audit opinion. All findings must be corroborated against primary physical source records and formally signed off by a certified Chartered Accountant prior to report issuance.\n\n"
                report_content += "="*70 + "\n\n"
                
                for k, v in st.session_state.audit_findings.items():
                    report_content += f"## EXCEPTION: {v['vendor']} | Aggregate Amount: ₹{v['amount']:,.2f} | Risk Score: {v['risk_score']}/10\n"
                    report_content += f"*Recorded: {v['timestamp']}*\n\n"
                    report_content += v["finding"] + "\n\n"
                    report_content += "-"*70 + "\n\n"
                    
                st.download_button(
                    label="📥 Download Statutory Audit Workpaper Package (Markdown)",
                    data=report_content,
                    file_name=f"AuditIQ_Engagement_Workpaper_{datetime.now().strftime('%Y%m%d')}.md",
                    mime="text/markdown"
                )
