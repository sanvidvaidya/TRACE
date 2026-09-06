# 🧭 TRACE

> Turn messy, ambiguous organizational intent into clear, traceable, and executable technology systems.

[![Streamlit App](https://static.streamlit.io/badges/streamlit_badge_black_white.svg)](https://share.streamlit.io)
[![Python](https://img.shields.io/badge/Python-3.10+-blue.svg)](https://www.python.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

---

## 📌 The Problem

Most software projects fail before the first line of code is even written. 

Stakeholders communicate in vague goals, emotional pain points, and shifting deadlines:
> *"We need an AI tool to monitor customer churn in real-time and alert account managers before renewal."*

Handing that sentence directly to engineers causes chaos:
* **Undefined latency:** What does "real-time" mean? Sub-second streaming, hourly batches, or a nightly sync?
* **Direct conflicts:** Does "automatically act" violate standard company policy requiring human approval?
* **Missing data sources:** Which database actually owns customer sentiment? 
* **Zero test criteria:** How will QA know whether the tool is working correctly?

**TRACE** sits between ambiguous business requests and engineering execution. It takes raw text, meeting notes, or requirement spreadsheets and structures them into a clear, traceable, and testable system specification.

---

## ✨ Key Features

* **🕸️ Interactive Traceability Graph:** Click on any goal, requirement, or database to see why it exists (upstream) and what breaks if it fails (downstream).
* **⚠️ Ambiguity & Conflict Detector:** Automatically catches vague buzzwords ("real-time", "seamless", "smart") and highlights conflicting requirements before development begins.
* **💥 Blast Radius Simulator:** Toggle off data sources or assumptions to simulate real-world service outages and see which requirements and tests fail.
* **📊 Implementation Readiness Score:** A transparent 0–100% score that measures whether your project is actually ready for engineering handoff.
* **🛡️ Security & Compliance Heatmap:** Flags PII exposure, data classification levels, and regulatory readiness (GDPR, CCPA, SOC 2).
* **📁 Multi-Format Ingestion:** Paste raw text or upload existing CSV, JSON, or Markdown files to generate a systems map instantly.
* **🚀 Production-Ready Exports:** Download your project as a Markdown PRD, Jira-ready CSV tickets, executable Gherkin .feature test files, or an Executive Decision Memo.

---

## 🚀 Quick Start

### 1. Clone the repository
    git clone https://github.com/sanvidvaidya/TRACE.git
    cd TRACE

### 2. Install dependencies
    pip install -r requirements.txt

### 3. Run the app
    python -m streamlit run app.py

The application will open automatically in your browser at `http://localhost:8501`.

---

## 🛠️ How It Works

1. **Input:** Paste meeting notes, a project brief, or upload a requirements spreadsheet.
2. **Structure:** TRACE breaks the input down into strategic goals, functional requirements, data dependencies, and system components.
3. **Audit:** The engine flags ambiguities, contradictions, and untested requirements.
4. **Simulate & Refine:** Test failure scenarios, resolve ambiguities in one click, and track readiness.
5. **Export:** Generate development tickets and test suites ready for sprint planning.

---

## 🏢 Built-in Demo: Project Phoenix

TRACE includes a built-in enterprise case study: **Project Phoenix (Renewal Intelligence System)**.

It models a real-world scenario where a B2B company wants to stop customer churn, but data is trapped across Salesforce, Snowflake, and Zendesk, while sales and customer success teams argue over automated vs. manual customer outreach.

---

## 🧰 Tech Stack

* **Frontend & Runtime:** [Streamlit](https://streamlit.io)
* **Graph Engine:** [NetworkX](https://networkx.org)
* **Data Visualizations:** [Plotly](https://plotly.com)
* **Data Validation:** [Pydantic](https://docs.pydantic.dev)
* **Data Processing:** [Pandas](https://pandas.pydata.org)

---

## 📄 License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.