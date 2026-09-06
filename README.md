```markdown

\# TRACE: From Ambiguous Intent to Executable Systems



A systems engineering studio that turns messy organizational requests into inspectable requirements, dependency graphs, and testable specifications.



\---



\## Why This Exists



Software projects rarely fail at the compiler level. They fail at the translation layer.



Stakeholders communicate in frustrations, deadlines, and business pressures:

> \*"We need an AI churn tool that monitors customer behavior in real time and automatically alerts account managers before renewal."\*



Handing that sentence directly to an engineering team causes predictable chaos:

\- \*\*Undefined operational latency:\*\* Does "real-time" mean sub-second streaming, an hourly micro-batch, or a 24-hour nightly warehouse sync?

\- \*\*Direct architectural conflict:\*\* "Automatically alerts and acts" contradicts standard enterprise risk policies requiring human sign-off on commercial outreach.

\- \*\*Unverified dependencies:\*\* Which database owns customer sentiment? What are the access protocols and schema constraints?

\- \*\*Zero verification criteria:\*\* How will QA verify whether a churn risk score is accurate?



When software teams start writing code against unvetted intent, they build the wrong thing fast. 



\*\*TRACE\*\* sits between ambiguous human requests and actual engineering implementation. It takes unstructured text, briefs, or spreadsheets and turns them into a verifiable systems specification with full bidirectional traceability.



\---



\## What TRACE Is (And What It Refuses To Be)



Most AI requirements tools are document summarizers: \*paste text \&rarr; generate bullet points\*. 



TRACE is built on an entirely different premise: \*\*The structured systems graph is the product. AI is only an optional ingestion assistant.\*\*





```



RAW ORGANIZATIONAL INPUT

(Emails, meeting transcripts, briefs, CSV tickets)

│

▼

\[ EPISTEMIC SEPARATION GATE ]

Fact vs. Interpretation vs. Inference vs. Recommendation

│

▼

\[ GRAPH TOPOLOGY ENGINE ]

Outcome ──► Problem ──► Requirement ──► Component ──► Test

│

▼

\[ DETERMINISTIC AUDIT RUNTIME ]

• Lexical ambiguity \& unquantified SLA scanner

• Mutually exclusive requirement contradiction matrix

• 8-factor mathematical readiness engine (0–100%)

│

▼

\[ ENGINEERING HANDOFF ]

Gherkin .feature suites | Jira issue CSVs | Architecture memos



```



\### The Epistemic Hierarchy



Real systems fail when assumptions masquerade as facts. TRACE tags every single node with an epistemic status:



\- \*\*Source Fact:\*\* A verbatim statement taken directly from stakeholder documentation.

\- \*\*Interpretation:\*\* A normalized functional or non-functional requirement mapped to concrete operational boundaries.

\- \*\*Inference:\*\* An inferred technical component, data dependency, or operational risk.

\- \*\*Recommendation:\*\* An architectural pattern or trade-off proposed to resolve a problem.

\- \*\*Unknown / Needs Validation:\*\* An explicit information vacuum—unassigned ownership, unconfirmed SLAs, or unresolved ambiguities.



\---



\## Who This Is For



\- \*\*Solutions \& Enterprise Architects:\*\* Model system components, evaluate Architectural Decision Records (ADRs) with trade-off radars, inspect data protocols, and run what-if failure simulations.

\- \*\*Product Managers \& Business Analysts:\*\* Convert client meeting notes and fragmented stakeholder desires into structured requirements with Given-When-Then acceptance criteria.

\- \*\*Technology Strategy Consultants:\*\* Audit whether a client is actually ready to build before committing engineering teams to multi-month discovery sprints.

\- \*\*Security \& Governance Leads (GRC):\*\* Track PII exposure paths, verify encryption at rest, and audit regulatory compliance against GDPR and SOC 2 Type II controls.

\- \*\*QA \& Test Leads:\*\* Generate executable Gherkin feature suites directly linked to functional requirements.



\---



\## Core Systems \& Features



\### 1. Bidirectional Traceability Graph Engine

Built on an in-memory NetworkX multigraph:

\- \*\*Upstream Rationale (\*"Why does this exist?"\*):\*\* Walks backward through parent nodes to find the originating business outcome and goal.

\- \*\*Downstream Consequence (\*"What breaks if this fails?"\*):\*\* Traverses forward through dependent components, workflows, and test cases to evaluate blast radius.

\- \*\*Orphan Detection:\*\* Flags ungrounded requirements (scope creep) and unlinked system components (gold plating).



\### 2. Deterministic Ambiguity \& Contradiction Detection

\- \*\*Pattern Matching:\*\* Flags vague buzzwords (`"real-time"`, `"seamless"`, `"huge scale"`, `"smart"`, `"users"`) and prompts for explicit boundaries.

\- \*\*Contradiction Matrices:\*\* Detects mutually exclusive design stances (e.g., \*Full Autonomous Execution\* vs. \*Mandatory Human Review Gate\*) and presents trade-off decision options.

\- \*\*One-Click Resolvers:\*\* Lets analysts pick an operational stance directly in the UI to rewrite requirements and clear readiness blockers in real time.



\### 3. What-If Blast Radius Simulator

Simulate service outages and unverified assumptions:

\- Toggle off a data source (e.g., Salesforce CRM or Snowflake) or invalidate an assumption.

\- Instantly observe cascading failures across compromised requirements, broken test cases, and degraded readiness scores.



\### 4. 8-Factor Implementation Readiness Engine

TRACE calculates project readiness deterministically (0–100%) using an explicit weighted scoring rubric:



$$\\text{Readiness Score} = \\sum\_{i=1}^{8} w\_i \\cdot D\_i$$



1\. \*\*Problem Clarity (15%):\*\* Quantified business impact and metric targets.

2\. \*\*Stakeholder Alignment (10%):\*\* Verified ownership and departmental accountability.

3\. \*\*Requirement Precision (20%):\*\* Unambiguous functional requirements with Given-When-Then criteria.

4\. \*\*Data Readiness (15%):\*\* Confirmed systems of record, update frequencies, and access mechanisms.

5\. \*\*Workflow Precision (10%):\*\* Operational steps with mapped actor and system boundaries.

6\. \*\*Architecture Bounds (10%):\*\* System components bounded by layer and lifecycle state.

7\. \*\*Testability Coverage (10%):\*\* Percentage of requirements validated by at least one automated test case.

8\. \*\*Governance \& Security (10%):\*\* Data classification, encryption status, and PII declarations.



\### 5. Multi-Format Data Hub \& Persona Lenses

\- \*\*Multi-Format Ingestion:\*\* Ingest raw text briefs, CSV requirements registers, or full project JSON bundles.

\- \*\*Persona Lenses:\*\* Filter the UI for \*Executive Sponsors\*, \*Solutions Architects\*, \*QA Leads\*, or \*GRC Officers\*.

\- \*\*Native Mermaid.js Flow:\*\* Renders dark-themed sequence diagrams showing actor-to-system message flows.

\- \*\*Production Handoff Bundles:\*\* Export Markdown PRDs, Jira-compatible CSV sheets, executable Gherkin `.feature` files, and print-ready 1-page Executive Steering Memos.

\- \*\*Version Snapshots \& Diffing:\*\* Save named model checkpoints and perform structural delta diffs between revisions.



\---



\## The Reference Case: Project Phoenix



TRACE ships with a preloaded enterprise scenario: \*\*Project Phoenix — Renewal Intelligence System\*\*.



\- \*\*Scenario:\*\* A B2B SaaS company experiencing net revenue retention drop from 108% to 91%.

\- \*\*Data Fragmentation:\*\* Contract data in Salesforce, seat telemetry in Snowflake, ticket logs in Zendesk, and account nuances in private email threads.

\- \*\*Embedded Conflicts:\*\* Sales leadership demands \*autonomous real-time intervention\*, while Customer Success leadership mandates \*human-in-the-loop review\*.

\- \*\*Data Reality:\*\* Product telemetry only refreshes once every 24 hours, making sub-minute real-time alerts an architectural anti-pattern without pipeline refactoring.



\---



\## Tech Stack



\- \*\*Language:\*\* Python 3.10+

\- \*\*Frontend / App Layer:\*\* Streamlit

\- \*\*Domain Modeling:\*\* Pydantic v2

\- \*\*Graph Topology:\*\* NetworkX

\- \*\*Data Visualizations:\*\* Plotly Graph Objects

\- \*\*Sequence Diagrams:\*\* Mermaid.js

\- \*\*Tabular Data:\*\* Pandas



\---



\## Local Setup



\### 1. Clone the repository

```bash

git clone \[https://github.com/sanvidvaidya/TRACE.git](https://github.com/sanvidvaidya/TRACE.git)

cd TRACE



```



\### 2. Install dependencies



```bash

pip install -r requirements.txt



```



\### 3. Run the application



```bash

python -m streamlit run app.py



```



Open `http://localhost:8501` in your browser.



\---



\## Deploying to Streamlit Cloud



1\. Fork or push this repository to GitHub.

2\. Go to \[share.streamlit.io](https://share.streamlit.io/) and log in with GitHub.

3\. Select your repository, set the branch to `main`, and enter `app.py` as the main file path.

4\. Click \*\*Deploy\*\*.



\---



\## System Boundaries (What TRACE Deliberately Does Not Do)



\* \*\*Does not write production application code:\*\* It models the architecture so engineering teams build the right system the first time.

\* \*\*Does not trust generative AI output blindly:\*\* LLMs propose candidates; deterministic rule engines enforce constraints, and human analysts confirm decisions.

\* \*\*Does not hide trade-offs:\*\* When an automation requirement contradicts an audit policy, TRACE flags it as an explicit conflict rather than picking a silent default.



\---



\## License



MIT License — see \[LICENSE](https://www.google.com/search?q=LICENSE) for details.



```



```

