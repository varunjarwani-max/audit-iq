import streamlit as st
import pandas as pd
import requests
from datetime import datetime, timezone
import io
import re

# --- PAGE CONFIGURATION ---
st.set_page_config(page_title="AuditIQ — Autonomous Statutory Auditor", layout="wide")

st.title("🛡️ AuditIQ — Autonomous Statutory AI Auditor")
st.markdown("Asymmetric 3-Stage Cognitive Architecture • 7-Day Rolling Forensic Engine • Grounded 5C Workpapers")

# --- 1. SESSION STATE & CREDENTIAL MANAGEMENT ---
if "audit_findings" not in st.session_state:
    st.session_state.audit_findings = {}
if "sentry_interceptions" not in st.session_state:
    st.session_state.sentry_interceptions = 0

GROQ_API_KEY = st.secrets.get("GROQ_API_KEY", "")
if not GROQ_API_KEY:
    GROQ_API_KEY = st.sidebar.text_input("Enter Groq API Key (gsk_...):", type="password")

KB_VERSION = "AuditIQ-KB v2.1 (ICAI SA 240/315/500 | Companies Act 2013)"

# --- 2. DETERMINISTIC STATUTORY KNOWLEDGE BASE & ROUTED REMEDIATIONS ---
STATUTORY_KNOWLEDGE_BASE = {
    "structuring": {
        "criteria": (
            "Internal Financial Controls (IFC) under Section 143(3)(i) of the Companies Act, 2013 "
            "and ICAI Standard on Auditing (SA) 240 ('The Auditor's Responsibilities Relating to Fraud "
            "in an Audit of Financial Statements' - Fraud Risk Factors / Threshold Evasion)."
        ),
        "remediation": (
            "Implement an automated vendor-level rolling-window aggregation rule in the ERP (e.g., "
            "mandating dual manual sign-off for any vendor crossing ₹50,000 cumulatively in any 7-day window)."
        )
    },
    "dofp_override": {
        "criteria": (
            "Delegation of Financial Powers (DoFP) Framework, ICAI Standard on Auditing (SA) 315 "
            "('Identifying and Assessing the Risks of Material Misstatement'), and Section 143(3)(i) "
            "of the Companies Act, 2013 regarding operating effectiveness of internal controls."
        ),
        "remediation": (
            "Reconfigure the ERP authorization matrix to enforce mandatory dual-level manual sign-off "
            "(Department Head + Finance Controller) for all disbursements exceeding ₹1,00,000."
        )
    },
    "round_number": {
        "criteria": (
            "ICAI Standard on Auditing (SA) 500 ('Audit Evidence') and SA 520 ('Analytical Procedures'), "
            "mandating substantive testing and corroborative underlying documentation for non-routine disbursements."
        ),
        "remediation": (
            "Perform substantive testing by retrieving and physically verifying the primary tax invoice, "
            "purchase requisition, and milestone delivery receipt for this round-sum entry."
        )
    },
    "manual_near_threshold": {
        "criteria": (
            "Internal Control Policy on Procurement and ICAI Standard on Auditing (SA) 500 ('Audit Evidence')."
        ),
        "remediation": (
            "Perform sample documentation review to confirm that the manual sign-off was supported by "
            "an approved purchase order and independent quotation comparison."
        )
    },
    "fallback": {
        "criteria": (
            "ICAI Standard on Auditing (SA) 200 ('Overall Objectives of the Independent Auditor') "
            "and Section 143(3)(i) of the Companies Act, 2013."
        ),
        "remediation": (
            "Conduct routine substantive testing and verify underlying ledger documentation."
        )
    }
}

# --- 3. SAMPLE LEDGER GENERATOR (EXERCISES ALL FORENSIC SCENARIOS) ---
def get_sample_ledger_df():
    sample_data = {
        "date": [
            "2026-08-01", "2026-08-03", "2026-08-05", 
            "2026-08-08", "2026-08-10", "2026-08-12"
        ],
        "vendor": [
            "Swift Freight", "Swift Freight", "Swift Freight", 
            "Apex Infotech", "CloudScale Networks", "Sigma Supplies"
        ],
        "amount": [
            24000.00, 24000.00, 24000.00, 
            145000.00, 60000.00, 49800.00
        ],
        "account_code": [
            "AC-7021", "AC-7021", "AC-7021", 
            "AC-5011", "AC-5011", "AC-1002"
        ],
        "approved_by": [
            "Auto-Approved", "Auto-Approved", "Auto-Approved", 
            "Auto-Approved", "Manual", "Manual"
        ],
        "department": [
            "Logistics", "Logistics", "Logistics", 
            "IT Operations", "Engineering", "Procurement"
        ]
    }
    return pd.DataFrame(sample_data)

# --- 4. DATA INGESTION BENCH ---
st.subheader("1. Ingest Transaction Ledger")

col_upload, col_demo = st.columns([2, 1])
with col_upload:
    uploaded_file = st.file_uploader("Upload Transaction Ledger (CSV or XLSX)", type=["csv", "xlsx"])

with col_demo:
    st.write("**Instant Evaluator Test Bench:**")
    load_sample = st.button("🚀 Load Pre-built Demo Ledger", use_container_width=True)
    
    sample_excel_buffer = io.BytesIO()
    get_sample_ledger_df().to_excel(sample_excel_buffer, index=False, engine="openpyxl")
    st.download_button(
        "📥 Download Sample Template (.XLSX)",
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
        st.error(f"❌ Failed to parse uploaded file: {e}")
elif load_sample or ("loaded_demo" in st.session_state and st.session_state.loaded_demo):
    st.session_state.loaded_demo = True
    df = get_sample_ledger_df()

REQUIRED_COLUMNS = ['date', 'amount', 'vendor', 'account_code', 'approved_by', 'department']

if df is not None:
    missing = [c for c in REQUIRED_COLUMNS if c not in df.columns]
    if missing:
        st.error(f"❌ Missing mandatory audit columns: {missing}")
    else:
        st.success("✅ Ledger Ingested & Schema Verified.")
        df['date'] = pd.to_datetime(df['date'])

        # --- 5. STAGE 1: DECOMPOSED EVIDENCE ENGINE (PYTHON MATH & GATING) ---
        auditable_entities = []

        for vendor, v_df in df.groupby("vendor"):
            v_df = v_df.sort_values("date")
            txns_count = len(v_df)
            total_amt = float(v_df['amount'].sum())
            
            # Scope Limitation check
            if v_df['amount'].isna().any() or v_df['vendor'].isna().any():
                continue

            # Approver-type isolation
            has_auto = any(str(a).strip().lower() == "auto-approved" for a in v_df['approved_by'])
            has_manual = any(str(a).strip().lower() == "manual" for a in v_df['approved_by'])
            all_manual = has_manual and not has_auto
            
            # 7-Day Rolling Window Calculation for Auto-Approved Sub-Thresholds
            is_structuring = False
            structuring_peak = 0.0
            if txns_count > 1 and has_auto:
                v_indexed = v_df.set_index('date')
                auto_sub_50k = v_indexed[
                    (v_indexed['approved_by'].str.lower() == 'auto-approved') & 
                    (v_indexed['amount'] < 50000)
                ]['amount']
                
                if not auto_sub_50k.empty:
                    rolling_7d = auto_sub_50k.rolling('7D').sum()
                    if (rolling_7d >= 50000).any():
                        is_structuring = True
                        structuring_peak = float(rolling_7d.max())

            # Anomaly Classification & Score Assignment
            anomalies = []
            category = "fallback"
            risk_score = 0

            if is_structuring:
                category = "structuring"
                risk_score = 9
                anomalies.append(
                    f"STRUCTURING PATTERN: {txns_count} sub-threshold auto-approved payments totaling "
                    f"₹{structuring_peak:,.2f} within a 7-day rolling window evading the ₹50,000 manual limit."
                )
            elif total_amt > 100000 and has_auto:
                category = "dofp_override"
                risk_score = 8
                anomalies.append("DoFP Override: High-Value outlay exceeding ₹1,00,000 processed without manual authorization.")
            elif any(amt >= 50000 and amt % 10000 == 0 for amt in v_df['amount']):
                category = "round_number"
                risk_score = 3 if all_manual else 5
                anomalies.append("Substantive Verification: Large round-number transaction requiring primary invoice audit.")
            elif any(45000 <= amt < 50000 for amt in v_df['amount']):
                if all_manual:
                    category = "manual_near_threshold"
                    risk_score = 1
                    anomalies.append("Routine Verification: Payment near ₹50,000 threshold (Manually verified; low control risk).")
                else:
                    category = "structuring"
                    risk_score = 4
                    anomalies.append("Threshold Proximity: Payment near ₹50,000 limit with automated approval.")

            if risk_score > 0:
                auditable_entities.append({
                    "vendor": vendor,
                    "txns_count": txns_count,
                    "total_amt": total_amt,
                    "risk_score": risk_score,
                    "category": category,
                    "anomalies": anomalies,
                    "all_manual": all_manual,
                    "df": v_df
                })

        # Overview Metrics
        m1, m2, m3 = st.columns(3)
        m1.metric("Total Transactions Ingested", len(df))
        m2.metric("Unique Vendors Processed", df['vendor'].nunique())
        m3.metric("Entities Requiring 5C Workpapers", len(auditable_entities))

        st.dataframe(
            df[['date', 'vendor', 'amount', 'department', 'approved_by', 'account_code']].assign(
                date=lambda x: x['date'].dt.strftime('%Y-%m-%d')
            ),
            use_container_width=True
        )

        # --- 6. STAGES 2 & 3: MONOLITHIC DRAFTER & SWARM SENTRY ---
        st.divider()
        st.subheader("🤖 Autonomous Big 4 5C Workpaper Findings")

        for entity in auditable_entities:
            vendor = entity["vendor"]
            vendor_key = f"vendor_{vendor}_{entity['total_amt']}"
            is_already_audited = vendor_key in st.session_state.audit_findings

            expander_title = (
                f"{'✅ [AUDITED]' if is_already_audited else '🚩 [PENDING]'} {vendor} — "
                f"Total: ₹{entity['total_amt']:,.2f} across {entity['txns_count']} txn(s) "
                f"(Risk Score: {entity['risk_score']}/10)"
            )

            with st.expander(expander_title, expanded=is_already_audited):
                txn_details_str = ""
                st.write(f"**Entity Exposure:** ₹{entity['total_amt']:,.2f} | **Transactions:** {entity['txns_count']}")
                for _, r in entity["df"].iterrows():
                    d_str = r['date'].strftime('%Y-%m-%d')
                    st.write(f"- `{d_str}` | ₹{r['amount']:,.2f} | Dept: {r['department']} | Approver: {r['approved_by']}")
                    txn_details_str += f"- Date: {d_str}, Amount: INR {r['amount']:,.2f}, Dept: {r['department']}, Approver: {r['approved_by']}\n"

                st.markdown("---")
                for a in entity["anomalies"]:
                    if "STRUCTURING" in a or "DoFP" in a:
                        st.error(f"🚨 {a}")
                    else:
                        st.warning(f"⚠️ {a}")

                btn_label = "Re-generate Finding" if is_already_audited else "Generate Formal 5C Finding"

                if st.button(btn_label, key=f"btn_{vendor}"):
                    if not GROQ_API_KEY:
                        st.error("Please configure your Groq API Key.")
                    else:
                        kb_entry = STATUTORY_KNOWLEDGE_BASE.get(entity["category"], STATUTORY_KNOWLEDGE_BASE["fallback"])

                        # STAGE 2: Monolithic Synthesis Prompt
                        prompt = f"""You are a Big 4 Senior Statutory Auditor and Forensic Accounting Specialist.
Draft a precise, professional 5C statutory audit finding based strictly on the factual evidence provided below.

EVIDENCE GRAPH:
- Entity/Vendor: {vendor}
- Total Aggregated Outlay: INR {entity['total_amt']:,.2f}
- Transaction Count: {entity['txns_count']}
- All Transactions Manually Approved: {entity['all_manual']}
- Individual Records:
{txn_details_str}

IDENTIFIED EXCEPTION FLAGS:
- {chr(10).join('- ' + a for a in entity['anomalies'])}

MANDATORY STATUTORY GROUNDING & REMEDIATION:
- Criteria Standard to Cite: {kb_entry['criteria']}
- Required Remediation Focus: {kb_entry['remediation']}

CRITICAL GOVERNANCE & INTEGRITY RULES:
1. FACTUAL CONSISTENCY: If all transactions are marked 'Manual', DO NOT state or imply that manual authorization was bypassed. Treat it as a substantive documentation review.
2. CITATION DISCIPLINE: Cite ONLY the exact statutory standard provided above. Do not cite Section 138, Section 40A, Section 37(5), or SAS 700.
3. ESCALATION LIMITS: Escalate internal control observations strictly to Internal Audit, CFO, or the Audit Committee. Do not reference external regulatory bodies.
4. REMEDIATION: Incorporate the exact Required Remediation Focus above into the Recommendation section.

OUTPUT FORMAT (Use these exact plain text headings followed by a colon):
Condition: [Factual statement of the specific ledger entries and pattern]
Criteria: [The exact statutory standard provided above]
Cause: [Probable control breakdown consistent with the approver facts]
Consequence: [Calibrated financial and internal financial control exposure]
Recommendation: [Actionable remediation incorporating the mandatory focus]

Tone: Rigorous, measured, professional Big 4 working paper standard."""

                        with st.spinner("Executing Monolithic Drafter via Groq LPU engine..."):
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
                                    draft_text = response.json()["choices"][0]["message"]["content"]

                                    # --- STAGE 3: SWARM CODE SENTRY VERIFICATION ---
                                    sentry_notes = []
                                    sanitized_text = draft_text

                                    # Sentry Gate A: Banned / Hallucinated Citation Filter
                                    banned_terms = {
                                        "section 138": "Section 143(3)(i) of the Companies Act, 2013",
                                        "section 40a": "Section 143(3)(i) of the Companies Act, 2013",
                                        "section 37(5)": "Statutory Reporting Standards",
                                        "sas 700": "ICAI SA 500 / SA 240",
                                        "regulatory bodies": "the Audit Committee"
                                    }
                                    for term, replacement in banned_terms.items():
                                        if term in sanitized_text.lower():
                                            sanitized_text = re.sub(re.escape(term), replacement, sanitized_text, flags=re.IGNORECASE)
                                            sentry_notes.append(f"Intercepted ungrounded reference '{term}' -> Normalized to '{replacement}'.")

                                    # Sentry Gate B: Approver Contradiction Check
                                    if entity["all_manual"] and "without manual" in sanitized_text.lower():
                                        sanitized_text = sanitized_text.replace("without manual authorization", "with manual authorization requiring substantive documentation review")
                                        sentry_notes.append("Corrected narrative: Transaction was manually authorized; removed false auto-approval breach claim.")

                                    sentry_triggered = len(sentry_notes) > 0
                                    if sentry_triggered:
                                        st.session_state.sentry_interceptions += len(sentry_notes)

                                    st.session_state.audit_findings[vendor_key] = {
                                        "vendor": vendor,
                                        "amount": entity['total_amt'],
                                        "risk_score": entity['risk_score'],
                                        "finding": sanitized_text,
                                        "timestamp": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC"),
                                        "sentry_triggered": sentry_triggered,
                                        "sentry_notes": sentry_notes
                                    }
                                    st.rerun()
                                else:
                                    st.error(f"API Error {response.status_code}: {response.text}")
                            except Exception as e:
                                st.error(f"Execution failed: {e}")

                if is_already_audited:
                    finding_data = st.session_state.audit_findings[vendor_key]
                    st.markdown("---")
                    st.markdown("### 📄 Recorded Statutory Finding")
                    if finding_data.get("sentry_triggered"):
                        st.info("🛡️ **AuditIQ Sentry Check:** Verification gate intercepted and resolved narrative discrepancies.")
                        for note in finding_data.get("sentry_notes", []):
                            st.caption(f"- *{note}*")
                    st.markdown(finding_data["finding"])
                    st.caption(f"Audit Trail: Generated {finding_data['timestamp']} | Engine: Llama-3.3-70b (Temp 0.1) | {KB_VERSION}")

        # --- 7. AUDIT MEMORANDUM EXPORT ---
        if st.session_state.audit_findings:
            st.divider()
            st.subheader("📑 Final Engagement Workpaper Export")

            export_time = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
            report_content = f"# AUDIT ENGAGEMENT MEMORANDUM & WORKING PAPERS\n"
            report_content += f"Generated: {export_time}\n"
            report_content += f"Framework: {KB_VERSION}\n"
            report_content += f"Total Entities Documented: {len(st.session_state.audit_findings)}\n"
            report_content += f"Sentry Interceptions: {st.session_state.sentry_interceptions}\n"
            report_content += "="*70 + "\n\n"
            report_content += "> **MANDATORY STATUTORY DISCLAIMER (SA 230 / ICAI Guidelines):**\n"
            report_content += "> This document is an autonomous draft audit finding generated by AuditIQ for preliminary analytical triage under SA 500/520. "
            report_content += "It does not constitute a certified statutory audit opinion. All findings must be corroborated against primary physical source records and formally signed off by a certified Chartered Accountant prior to statutory reliance.\n\n"
            report_content += "="*70 + "\n\n"

            for k, v in st.session_state.audit_findings.items():
                report_content += f"## EXCEPTION: {v['vendor']} | Aggregate Outlay: ₹{v['amount']:,.2f} | Risk Score: {v['risk_score']}/10\n"
                report_content += f"*Recorded: {v['timestamp']}*\n\n{v['finding']}\n\n" + "-"*70 + "\n\n"

            st.download_button(
                "📥 Download Statutory Audit Workpaper Package (Markdown)",
                data=report_content,
                file_name=f"AuditIQ_Engagement_{datetime.now().strftime('%Y%m%d')}.md",
                mime="text/markdown"
            )
