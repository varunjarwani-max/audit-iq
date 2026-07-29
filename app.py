import streamlit as st
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
            st.error(f"❌ Schema Validation Error: The uploaded CSV file is missing required columns:\n\n" + 
                     "\n".join([f"- `{col}`" for col in missing_cols]))
            st.warning(f"Expected schema: `{REQUIRED_COLUMNS}`\n\nFound columns: `{uploaded_cols}`")
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
    st.info("💡 Please upload a `.csv` file to perform schema validation and data ingestion.")
