/**
 * CODEZ48 PILOT 100+ WORD (.DOCX) DOCUMENT TEMPLATES CATALOG
 * Comprehensive catalog of over 100 professional Word document templates
 * across Higher Education / Colleges, Corporate Governance, Technical Specifications,
 * Legal & HR Contracts, Clinical & Scientific Research, and Academic Whitepapers.
 */

const WORD_TEMPLATES = [
    // =========================================================================
    // CATEGORY 1: HIGHER EDUCATION, COLLEGES & UNIVERSITIES (Templates 1 - 25)
    // =========================================================================
    {
        id: 'college_naac_ssr_report',
        name: 'NAAC Self-Study Report (SSR) Institutional Portfolio',
        category: 'Higher Education & Colleges',
        collegeBranding: true,
        defaultSectionCount: 8,
        description: 'Comprehensive institutional assessment document detailing 7 criteria of NAAC accreditation, quantitative metrics, qualitative matrices, and executive summary.',
        structure: ['Executive Summary & Institutional Profile', 'Criterion I: Curricular Aspects', 'Criterion II: Teaching-Learning & Evaluation', 'Criterion III: Research, Innovations & Extension', 'Criterion IV: Infrastructure & Learning Resources', 'Criterion V: Student Support & Progression', 'Criterion VI: Governance, Leadership & Management', 'Criterion VII: Institutional Values & Best Practices']
    },
    {
        id: 'college_curriculum_syllabus',
        name: 'Autonomous Curriculum Framework & Course Syllabus Document',
        category: 'Higher Education & Colleges',
        collegeBranding: true,
        defaultSectionCount: 7,
        description: 'Complete academic course curriculum including Course Objectives, Course Outcomes (COs), Program Outcomes (POs) mapping matrix, unit-wise syllabus, textbooks, and assessment rubrics.',
        structure: ['Program Educational Objectives (PEOs) & POs', 'Course Overview & Credit Structure', 'Course Outcomes & Bloom Taxonomy Levels', 'Unit-by-Unit Detailed Syllabus', 'Laboratory Exercises & Practical Work', 'Textbooks, References & Online Resources', 'Evaluation Scheme & Assessment Rubrics']
    },
    {
        id: 'college_capstone_project_report',
        name: 'Final Year Engineering Capstone Project Report & Dissertation',
        category: 'Higher Education & Colleges',
        collegeBranding: true,
        defaultSectionCount: 9,
        description: 'Standard academic thesis layout with Certificate, Declaration, Abstract, Literature Survey, System Design, Implementation, Results, and Future Work.',
        structure: ['Certificate of Authenticity & Declaration', 'Executive Abstract & Acknowledgments', 'Chapter 1: Introduction & Problem Formulation', 'Chapter 2: Literature Review & Gap Analysis', 'Chapter 3: System Architecture & Methodology', 'Chapter 4: Implementation Details & Code Highlights', 'Chapter 5: Experimental Results, Graphs & Discussion', 'Chapter 6: Conclusion & Future Enhancements', 'References (IEEE / APA Format)']
    },
    {
        id: 'college_phd_research_proposal',
        name: 'Ph.D. Doctoral Research Proposal & Synopsis',
        category: 'Higher Education & Colleges',
        collegeBranding: true,
        defaultSectionCount: 8,
        description: 'Rigorous doctoral research synopsis detailing proposed novel investigation, state-of-the-art gap, theoretical formulation, research questions, and experimental methodology.',
        structure: ['Title of Proposed Research & Candidate Details', 'Research Background & Motivation', 'Review of State-of-the-Art Literature', 'Identified Gaps & Problem Definition', 'Research Objectives & Hypotheses', 'Proposed Research Methodology & Design', 'Expected Research Outcomes & Publications', 'Work Timeline (Gantt Chart) & Milestone Matrix']
    },
    {
        id: 'college_lab_manual',
        name: 'Comprehensive Laboratory Manual & Practical Experiments Guide',
        category: 'Higher Education & Colleges',
        collegeBranding: true,
        defaultSectionCount: 6,
        description: 'Departmental lab instruction manual containing lab guidelines, list of cycle experiments, aim, algorithm, circuit/code, tabular column, and viva questions.',
        structure: ['General Laboratory Safety Rules & Guidelines', 'Cycle of Experiments & Course Outcomes Mapping', 'Experiment Protocol: Aim, Apparatus & Theory', 'Algorithms, Schematics & Source Code', 'Observation Tables, Calculation Formulas & Model Graphs', 'Review & Viva Voce Questions with Answers']
    },
    {
        id: 'college_fdp_workshop_brochure',
        name: 'Faculty Development Programme (FDP) Brochure & Schedule',
        category: 'Higher Education & Colleges',
        collegeBranding: true,
        defaultSectionCount: 6,
        description: 'Official proposal and circular for AICTE/UGC sponsored FDP including theme, resource person credentials, target audience, schedule, and registration details.',
        structure: ['Preamble & Objective of the Programme', 'Institutional & Departmental Profile', 'Detailed Session Schedule & Resource Persons', 'Eligibility, Target Participants & Prerequisites', 'Registration Guidelines & Fee Details', 'Organizing Committee & Contact Information']
    },
    {
        id: 'college_bos_minutes',
        name: 'Board of Studies (BoS) Official Meeting Minutes',
        category: 'Higher Education & Colleges',
        collegeBranding: true,
        defaultSectionCount: 6,
        description: 'Formal record of academic decisions, curriculum revisions, introduction of new electives, expert member recommendations, and resolutions passed.',
        structure: ['Meeting Overview, Date, Venue & Attendance Record', 'Opening Remarks by Chairman / Head of Department', 'Review & Approval of Previous Minutes', 'Discussion & Approval of Revised Syllabi', 'Introduction of New Electives & Interdisciplinary Courses', 'Action Taken Report & Formal Resolutions']
    },
    {
        id: 'college_annual_report',
        name: 'College Annual Administrative & Academic Report',
        category: 'Higher Education & Colleges',
        collegeBranding: true,
        defaultSectionCount: 8,
        description: 'Comprehensive yearly publication summarizing admissions, university examination results, faculty achievements, research grants, MoUs, and campus placements.',
        structure: ['Principal Message & Institutional Vision', 'Academic Milestones & Examination Performance', 'Faculty Research Publications, Patents & Grants', 'Student Co-Curricular & Sports Achievements', 'Corporate Placements & Industry Collaboration', 'Infrastructure Upgrades & Library Additions', 'Social Extension Activities (NSS / YRC)', 'Financial Statement & Institutional Plans']
    },
    {
        id: 'college_mou_agreement',
        name: 'Memorandum of Understanding (MoU) with Industry Partner',
        category: 'Higher Education & Colleges',
        collegeBranding: true,
        defaultSectionCount: 7,
        description: 'Formal bilateral agreement between college and industrial enterprise for student internships, guest lectures, curriculum advisory, and joint R&D.',
        structure: ['Preamble & Contracting Parties', 'Purpose & Scope of Collaboration', 'Responsibilities of the Academic Institution', 'Responsibilities of the Industry Partner', 'Intellectual Property Rights & Non-Disclosure', 'Financial Considerations & Term of Validity', 'Execution & Authorized Signatories']
    },
    {
        id: 'college_bonafide_lor',
        name: 'Bonafide Certificate & Academic Letter of Recommendation (LOR)',
        category: 'Higher Education & Colleges',
        collegeBranding: true,
        defaultSectionCount: 5,
        description: 'Official credential document affirming student enrollment, academic standing, character endorsement, and recommendation for higher studies or employment.',
        structure: ['Institutional Header & Official Ref Number', 'Student Identification & Enrollment Particulars', 'Academic Standing, CGPA & Performance Endorsement', 'Character Assessment & Personal Recommendation', 'Authorized Institutional Signatures & Official Seal']
    },
    {
        id: 'college_placement_policy',
        name: 'Institutional Campus Placement Policy & Student Guidelines',
        category: 'Higher Education & Colleges',
        collegeBranding: true,
        defaultSectionCount: 6,
        description: 'Official training and placement cell rules detailing eligibility criteria, dream offer policies, code of conduct during interviews, and penalty clauses.',
        structure: ['Preamble & Training & Placement Cell Objectives', 'Student Eligibility & Registration Criteria', 'Recruitment Process Guidelines & Code of Conduct', 'Dream Company & Multiple Offer Regulations', 'Disciplinary Action & De-registration Clauses', 'Frequently Asked Questions & Contact Directory']
    },
    {
        id: 'college_exam_guidelines',
        name: 'Office of the Controller of Examinations: Guidelines & Circular',
        category: 'Higher Education & Colleges',
        collegeBranding: true,
        defaultSectionCount: 6,
        description: 'Comprehensive guidelines for end-semester examinations covering hall ticket rules, malpractice penalties, valuation standards, and re-evaluation procedures.',
        structure: ['Examination Schedule & Hall Allocation Rules', 'Student Instructions & Prohibited Items', 'Malpractice Definitions & Prescribed Penalties', 'Question Paper Scrutiny & Evaluation Standards', 'Revaluation & Paper Viewing Protocol', 'Helpline Directory & Grievance Redressal']
    },
    {
        id: 'college_student_handbook',
        name: 'Undergraduate / Postgraduate Student Handbook & Code of Conduct',
        category: 'Higher Education & Colleges',
        collegeBranding: true,
        defaultSectionCount: 8,
        description: 'Orientation handbook covering campus code of conduct, grading system, attendance mandates, library regulations, anti-ragging policies, and support services.',
        structure: ['Vision, Mission & Core Values of Institution', 'Academic Regulations & Choice Based Credit System (CBCS)', 'Attendance Rules, Condonation & Leave Policy', 'Campus Ethics, Dress Code & Code of Conduct', 'Anti-Ragging Regulations & Statutory Committees', 'Library, Laboratories & IT Infrastructure Policies', 'Hostel Regulations & Campus Dining', 'Student Welfare, Counseling & Grievance Cell']
    },
    {
        id: 'college_grant_proposal',
        name: 'R&D Research Project Grant Proposal (DST / SERB / AICTE)',
        category: 'Higher Education & Colleges',
        collegeBranding: true,
        defaultSectionCount: 8,
        description: 'Detailed competitive grant proposal with project summary, technical state-of-the-art, work plan, itemized budget, institutional facilities, and bio-data.',
        structure: ['Project Title, Principal Investigator & Co-PI Details', 'Executive Summary & National Importance', 'Origin of the Proposal & State-of-the-Art Review', 'Detailed Research Plan, Methodology & Milestones', 'Year-Wise Itemized Budget & Justification', 'Available Institutional Infrastructure & Facilities', 'Expected Deliverables, Patents & Publications', 'Curriculum Vitae of Investigators']
    },
    {
        id: 'college_conference_proceedings',
        name: 'International Conference Proceedings & Call for Papers (CFP)',
        category: 'Higher Education & Colleges',
        collegeBranding: true,
        defaultSectionCount: 6,
        description: 'Conference publication package including CFP announcement, conference tracks, submission guidelines, keynote speaker profiles, and advisory committee.',
        structure: ['Conference Theme & Keynote Preamble', 'Technical Tracks & Sub-Themes for Submission', 'Author Guidelines, Paper Formatting & IEEE Compliance', 'Important Dates & Review Process', 'Keynote Speakers & Distinguished Guests', 'Advisory Board, Program Committee & Registration Fees']
    },
    {
        id: 'college_internship_report',
        name: 'Student Industrial Training & Internship Comprehensive Report',
        category: 'Higher Education & Colleges',
        collegeBranding: true,
        defaultSectionCount: 7,
        description: 'Academic evaluation report covering industry company profile, assigned department, tools used, key project modules, learnings, and mentor feedback.',
        structure: ['Certificate of Completion from Organization', 'Company Profile & Organizational Structure', 'Project Assigned & Objectives', 'Technical Workflow & Architecture', 'Tools, Frameworks & Key Deliverables', 'Skills Acquired, Industrial Exposure & Learnings', 'Weekly Progress Log & Supervisor Feedback']
    },
    {
        id: 'college_iqac_audit_report',
        name: 'Internal Quality Assurance Cell (IQAC) Academic Audit Report',
        category: 'Higher Education & Colleges',
        collegeBranding: true,
        defaultSectionCount: 7,
        description: 'Departmental quality assurance review document evaluating teaching-learning methods, course files, mentor-mentee records, and remedial action plans.',
        structure: ['Audit Objectives & Composition of Audit Team', 'Department Overview & Faculty Workload Analysis', 'Course File & Teaching Diary Audit Findings', 'Student Feedback & Continuous Internal Evaluation (CIE)', 'Research, Patents & Faculty Development Status', 'Identified Strengths & Areas for Improvement', 'Time-Bound Recommendations & Action Plan']
    },
    {
        id: 'college_guest_lecture_proposal',
        name: 'Industry Expert Guest Lecture & Workshop Proposal',
        category: 'Higher Education & Colleges',
        collegeBranding: true,
        defaultSectionCount: 5,
        description: 'Formal departmental request for arranging an expert lecture: speaker profile, topic relevance, target student batch, budget estimate, and expected outcomes.',
        structure: ['Lecture Title & Brief Conceptual Background', 'Distinguished Speaker Profile & Credentials', 'Relevance to Curriculum & Target Student Batch', 'Schedule, Platform / Venue & Logistics', 'Honorarium & Itemized Budget Estimate']
    },
    {
        id: 'college_industrial_visit',
        name: 'Departmental Industrial Visit (IV) Permission & Outcome Report',
        category: 'Higher Education & Colleges',
        collegeBranding: true,
        defaultSectionCount: 6,
        description: 'Complete documentation for student factory/company visit including company authorization, itinerary, safety measures, student roll list, and outcome analysis.',
        structure: ['Target Company Profile & Technical Relevance', 'Industrial Visit Schedule & Travel Itinerary', 'Faculty In-Charge & Student Undertaking Declarations', 'Safety Protocols, Travel Permissions & Medical Clearance', 'Observation Summary & Technical Processes Witnessed', 'Student Feedback & Course Outcome Attainment']
    },
    {
        id: 'college_alumni_meet_report',
        name: 'Annual Grand Alumni Association Reunion & Contribution Report',
        category: 'Higher Education & Colleges',
        collegeBranding: true,
        defaultSectionCount: 6,
        description: 'Summary of annual alumni gathering, distinguished alumni awards, mentorship initiatives, endowment fund contributions, and future chapters.',
        structure: ['Alumni Meet Theme & Inaugural Proceedings', 'Distinguished Alumni Awards & Felicitations', 'Alumni Mentorship & Student Guidance Sessions', 'Financial Contributions, Endowments & Scholarships', 'Establishment of Regional & Overseas Chapters', 'Photo Gallery, Feedback & Resolutions']
    },
    {
        id: 'college_faculty_handbook',
        name: 'Faculty Service Rules, Code of Ethics & Workload Norms',
        category: 'Higher Education & Colleges',
        collegeBranding: true,
        defaultSectionCount: 7,
        description: 'Official institutional HR and service guidelines for teaching and research faculty covering duties, leave rules, appraisal metrics, and conduct.',
        structure: ['Institutional Governance & Organizational Hierarchy', 'Faculty Duties, Contact Hours & Workload Norms', 'Performance Based Appraisal System (PBAS)', 'Leave Rules, Sabbaticals & Professional Development Privileges', 'Research Incentives, Seed Money & Publication Policy', 'Professional Ethics, Conflict of Interest & Code of Conduct', 'Grievance Redressal & Disciplinary Procedures']
    },
    {
        id: 'college_sports_annual_meet',
        name: 'Annual Athletic Meet & Inter-Collegiate Sports Tournament Report',
        category: 'Higher Education & Colleges',
        collegeBranding: true,
        defaultSectionCount: 6,
        description: 'Sports department annual documentation: tournament brackets, medal tallies, championship trophies, distinguished guest remarks, and budget.',
        structure: ['Sports Day Theme & Opening Torch Ceremony', 'Inter-Departmental Athletics & Track Events Summary', 'Inter-Collegiate Tournament Results & Medal Tally', 'Individual Champions & Overall Rolling Trophy', 'Special Guest Address & Prize Distribution', 'Physical Education Budget & Sports Facility Upgrades']
    },
    {
        id: 'college_nss_social_extension',
        name: 'National Service Scheme (NSS) Community Outreach & Camp Report',
        category: 'Higher Education & Colleges',
        collegeBranding: true,
        defaultSectionCount: 6,
        description: 'Comprehensive report on social service activities: blood donation camps, village adoption, tree plantation drives, and health awareness campaigns.',
        structure: ['NSS Unit Profile, Volunteers & Officer In-Charge', 'Special Village Adoption Camp: Objectives & Location', 'Daily Activity Log: Medical Camps, Literacy & Sanitation', 'Environmental Conservation & Tree Plantation Drives', 'Community Impact Assessment & Villager Testimonials', 'Media Coverage, Certificates & Acknowledgments']
    },
    {
        id: 'college_placement_drive_report',
        name: 'On-Campus Mega Placement Drive & Recruitment Summary',
        category: 'Higher Education & Colleges',
        collegeBranding: true,
        defaultSectionCount: 6,
        description: 'Detailed operational report on visiting tier-1 recruiters, package distributions, branch-wise selection statistics, and placement feedback.',
        structure: ['Placement Season Executive Summary', 'Visiting Corporate Recruiters & Industry Sectors', 'Salary Package Analysis: Highest, Average & Median CTC', 'Branch-Wise Selection Percentage & Gender Demographics', 'Recruiter Feedback on Student Competency', 'Continuous Training & Skill Enhancement Recommendations']
    },
    {
        id: 'college_convocation_protocol',
        name: 'Annual University Convocation & Graduation Day Order of Proceedings',
        category: 'Higher Education & Colleges',
        collegeBranding: true,
        defaultSectionCount: 6,
        description: 'Master ceremonial document detailing academic procession, invocation, conferment of degrees, pledge administration, and chancellor address.',
        structure: ['Ceremonial Preamble & Dignitaries in Attendance', 'Academic Procession Order & Seating Matrix', 'Chancellor Welcome Address & Annual Highlights', 'Conferment of Honorary Doctorates & Gold Medals', 'Administration of Graduation Pledge to Candidates', 'Dissolution of Convocation & National Anthem Protocol']
    },

    // =========================================================================
    // CATEGORY 2: CORPORATE GOVERNANCE, BUSINESS & PROPOSALS (Templates 26 - 50)
    // =========================================================================
    {
        id: 'corp_enterprise_rfp_proposal',
        name: 'Enterprise Request for Proposal (RFP) Response & Solution Bid',
        category: 'Corporate Governance & Business',
        collegeBranding: false,
        defaultSectionCount: 8,
        description: 'Comprehensive commercial proposal responding to enterprise client tenders with architecture, implementation roadmap, SLA, and pricing models.',
        structure: ['Executive Summary & Value Proposition', 'Client Requirements Understanding & Scope Alignment', 'Proposed Technical Architecture & Delivery Methodology', 'Project Timeline, Milestones & Deliverables', 'Resource Allocation & Core Team Expertise', 'Pricing Breakdown, Licensing & Commercial Terms', 'Service Level Agreement (SLA) & Ongoing Support', 'Company Credentials, Client Case Studies & References']
    },
    {
        id: 'corp_business_plan',
        name: 'Comprehensive Business Plan & Financial Model',
        category: 'Corporate Governance & Business',
        collegeBranding: false,
        defaultSectionCount: 9,
        description: 'Investor-ready 5-year business plan covering industry analysis, product-market fit, go-to-market strategy, operational model, and financial projections.',
        structure: ['Executive Summary', 'Company Description & Vision', 'Market & Industry Analysis', 'Products, Services & Competitive Advantage', 'Marketing & Sales Strategy', 'Operations & Technology Infrastructure', 'Management Team & Advisory Board', 'Financial Plan: P&L, Cash Flow & Balance Sheet', 'Funding Request & Exit Strategy']
    },
    {
        id: 'corp_annual_financial_report',
        name: 'Annual Corporate Financial Review & Shareholder Statement',
        category: 'Corporate Governance & Business',
        collegeBranding: false,
        defaultSectionCount: 7,
        description: 'Formal corporate annual report featuring CEO letter, financial performance summary, audited balance sheets, cash flow, and risk factors.',
        structure: ['Letter to Shareholders from CEO & Chairman', 'Corporate Highlights & Strategic Milestones', 'Management Discussion and Analysis (MD&A)', 'Audited Financial Statements: Revenue, EBITDA & Net Profit', 'Balance Sheet, Cash Flow & Equity Notes', 'Risk Management & Corporate Governance Report', 'Independent Auditor Opinion & Outlook']
    },
    {
        id: 'corp_board_meeting_minutes',
        name: 'Board of Directors Meeting Minutes & Resolutions Record',
        category: 'Corporate Governance & Business',
        collegeBranding: false,
        defaultSectionCount: 6,
        description: 'Official corporate secretarial record of board proceedings, quorum confirmation, committee reports, discussions, and formal resolutions adopted.',
        structure: ['Meeting Date, Location, Quorum & Attendees', 'Approval of Previous Board Minutes', 'CEO Executive Briefing & Performance Review', 'Financial & Audit Committee Report', 'Discussion of Strategic Mergers, Acquisitions & Investments', 'Formal Resolutions Passed & Action Items']
    },
    {
        id: 'corp_company_handbook',
        name: 'Employee Handbook & Corporate Workplace Policies',
        category: 'Corporate Governance & Business',
        collegeBranding: false,
        defaultSectionCount: 8,
        description: 'Comprehensive employee onboarding guide detailing company culture, working hours, remote work policy, benefits, and workplace standards.',
        structure: ['Welcome Message & Company Culture', 'Employment Classifications & Working Hours', 'Remote & Hybrid Work Guidelines', 'Compensation, Benefits, Insurance & Perks', 'Paid Time Off (PTO), Sick Leave & Parental Leave', 'Information Security, Device Use & Confidentiality', 'Diversity, Equity, Anti-Harassment & Non-Discrimination', 'Disciplinary Procedures & Resignation Guidelines']
    },
    {
        id: 'corp_sales_proposal',
        name: 'B2B Client Sales Pitch & Commercial Agreement',
        category: 'Corporate Governance & Business',
        collegeBranding: false,
        defaultSectionCount: 6,
        description: 'Targeted sales pitch outlining client pain points, proposed tailored software/service solution, ROI calculation, and tiered pricing options.',
        structure: ['Understanding Your Business Challenge', 'Proposed Solution & Core Capabilities', 'Implementation Roadmap & Onboarding Timeline', 'Measurable ROI & Projected Business Outcomes', 'Tiered Pricing Packages & Inclusions', 'Agreement Terms, Sign-Off & Next Steps']
    },
    {
        id: 'corp_investor_update',
        name: 'Quarterly Investor Update & Shareholder Memo',
        category: 'Corporate Governance & Business',
        collegeBranding: false,
        defaultSectionCount: 6,
        description: 'Standard investor update communicating ARR growth, burn rate, runway, key hires, product launches, lowlights, and current asks.',
        structure: ['Quarterly Highlights & Executive Summary', 'Key Financial Metrics: ARR, MRR, Burn & Runway', 'Product Roadmap Execution & Major Launches', 'Sales, Marketing & Customer Acquisition Funnel', 'Challenges, Lowlights & Mitigation Tactics', 'Team Growth & Specific Asks from Investors']
    },
    {
        id: 'corp_marketing_strategy',
        name: 'Annual Omnichannel Marketing Strategy & Campaign Plan',
        category: 'Corporate Governance & Business',
        collegeBranding: false,
        defaultSectionCount: 7,
        description: 'Data-driven marketing masterplan encompassing target buyer personas, content marketing, paid acquisition channels, budget allocation, and KPIs.',
        structure: ['Executive Summary & Annual Growth Targets', 'Target Audience, Ideal Customer Profiles (ICPs) & Personas', 'Brand Positioning & Core Value Messaging', 'Channel Strategy: SEO, Paid Search, Social & Events', 'Content Marketing & Lead Generation Funnel', 'Marketing Budget Allocation & Spend Forecast', 'Campaign KPIs, Attribution Model & Analytics Dashboard']
    },
    {
        id: 'corp_standard_operating_procedure',
        name: 'Standard Operating Procedure (SOP) Master Document',
        category: 'Corporate Governance & Business',
        collegeBranding: false,
        defaultSectionCount: 6,
        description: 'Standardized workflow instructions ensuring compliance, operational consistency, step-by-step procedure execution, and exception handling.',
        structure: ['Purpose, Objective & Scope of Procedure', 'Responsible Roles & Prerequisite Authorizations', 'Step-by-Step Execution Workflow', 'Quality Control Checkpoints & Validation Criteria', 'Exception Handling & Escalation Matrix', 'Document Revision History & Review Sign-Off']
    },
    {
        id: 'corp_incident_postmortem',
        name: 'Major Incident Postmortem & Root Cause Analysis (RCA)',
        category: 'Corporate Governance & Business',
        collegeBranding: false,
        defaultSectionCount: 6,
        description: 'Blameless engineering and operational postmortem detailing severity 1 outages, timeline of events, root cause, and preventative action items.',
        structure: ['Incident Summary, Severity Level & Business Impact', 'Chronological Timeline of Outage & Response', 'Technical Root Cause Analysis (Five Whys)', 'Resolution & Recovery Actions Taken', 'Preventative Corrective Action Items (JIRA Assigned)', 'Lessons Learned & Architectural Improvements']
    },
    {
        id: 'corp_project_charter',
        name: 'Enterprise Project Charter & Governance Framework',
        category: 'Corporate Governance & Business',
        collegeBranding: false,
        defaultSectionCount: 7,
        description: 'Foundational PMO document establishing project objectives, business case, project sponsor, milestones, constraints, and stakeholder roles.',
        structure: ['Project Title, Sponsor & Business Justification', 'Project Objectives & Success Criteria', 'Scope Definition: In-Scope vs. Out-of-Scope', 'Key Milestones, Phases & High-Level Schedule', 'Estimated Budget & Resource Requirements', 'Identified Risks, Constraints & Assumptions', 'Project Governance Team & Stakeholder Matrix']
    },
    {
        id: 'corp_statement_of_work',
        name: 'Statement of Work (SOW) & Service Agreement',
        category: 'Corporate Governance & Business',
        collegeBranding: false,
        defaultSectionCount: 7,
        description: 'Legally binding specification of services to be performed, work deliverables, milestone acceptance criteria, and fee schedule.',
        structure: ['Project Background & Parties Involved', 'Detailed Scope of Work & Deliverables List', 'Work Location, Facilities & Resource Provisions', 'Timeline, Milestones & Period of Performance', 'Acceptance Testing Criteria & Sign-Off Process', 'Pricing, Payment Schedule & Invoicing Terms', 'Change Order Management & Signatures']
    },
    {
        id: 'corp_vendor_evaluation',
        name: 'Vendor Evaluation & Procurement Due Diligence Report',
        category: 'Corporate Governance & Business',
        collegeBranding: false,
        defaultSectionCount: 6,
        description: 'Comparative supplier assessment evaluating functional fit, pricing competitiveness, compliance, security, and reference checks.',
        structure: ['Procurement Objective & Vendor Shortlist', 'Scoring Rubric & Evaluation Criteria Weighting', 'Vendor Comparative Matrix: Features & Support', 'Pricing & Total Cost of Ownership (TCO) Analysis', 'Security, Data Privacy & Regulatory Compliance', 'Procurement Committee Final Recommendation']
    },
    {
        id: 'corp_strategic_partnership',
        name: 'Strategic Alliance & Joint Venture Proposal',
        category: 'Corporate Governance & Business',
        collegeBranding: false,
        defaultSectionCount: 6,
        description: 'Partnership blueprint outlining synergy between organizations, shared resources, joint product offerings, revenue sharing, and governance.',
        structure: ['Strategic Context & Partnership Thesis', 'Synergies & Mutual Competitive Advantage', 'Joint Solution Architecture & Go-to-Market', 'Revenue Sharing Model & Financial Terms', 'Governance Committee & Dispute Resolution', 'Confidentiality, Exclusivity & Term']
    },
    {
        id: 'corp_customer_case_study',
        name: 'Enterprise Customer Success Case Study & ROI Whitepaper',
        category: 'Corporate Governance & Business',
        collegeBranding: false,
        defaultSectionCount: 5,
        description: 'Compelling marketing case study structured around client challenge, implemented solution, quantifiable ROI metrics, and executive quote.',
        structure: ['Client Overview & Industry Context', 'The Core Business Challenge & Pain Points', 'Why They Chose Our Solution', 'Implementation Process & Time-to-Value', 'Quantifiable Results, Metric Increases & Client Testimonial']
    },
    {
        id: 'corp_crisis_management_plan',
        name: 'Corporate Crisis Management & Communications Plan',
        category: 'Corporate Governance & Business',
        collegeBranding: false,
        defaultSectionCount: 7,
        description: 'Comprehensive contingency protocol for operational, PR, or disaster crises with response hierarchy, media guidelines, and holding statements.',
        structure: ['Crisis Management Team (CMT) Roles & Contacts', 'Crisis Severity Levels & Activation Criteria', 'Internal & External Communication Protocol', 'Approved Holding Statements for Media & Public', 'Operational Continuity & Emergency Backup Plans', 'Stakeholder & Investor Notification Cadence', 'Post-Crisis Debrief & Review Procedures']
    },
    {
        id: 'corp_diversity_inclusion_report',
        name: 'Corporate Diversity, Equity & Inclusion (DEI) Annual Report',
        category: 'Corporate Governance & Business',
        collegeBranding: false,
        defaultSectionCount: 6,
        description: 'Transparent evaluation of workforce demographics, pay parity, inclusive leadership initiatives, employee resource groups, and annual goals.',
        structure: ['Executive Commitment to Diversity & Equity', 'Workforce Demographic Representation & Trends', 'Pay Parity Analysis & Equitable Promotion Rates', 'Employee Resource Groups (ERGs) & Mentorship', 'Inclusive Hiring Strategies & Community Programs', 'Annual Progress Towards Multi-Year Goals']
    },
    {
        id: 'corp_esg_sustainability_report',
        name: 'Environmental, Social & Governance (ESG) Sustainability Report',
        category: 'Corporate Governance & Business',
        collegeBranding: false,
        defaultSectionCount: 7,
        description: 'Framework-aligned report (GRI / SASB) on carbon footprint reduction, renewable energy, supply chain ethics, and governance.',
        structure: ['CEO Statement on Sustainability', 'ESG Framework & Materiality Assessment', 'Environmental Stewardship: Carbon Footprint & Waste', 'Social Impact: Employee Well-Being & Community', 'Responsible Supply Chain & Human Rights Due Diligence', 'Corporate Governance, Ethics & Transparency', 'Sustainability Targets, Metrics & Audit Index']
    },
    {
        id: 'corp_product_requirements_document',
        name: 'Product Requirements Document (PRD) & Feature Specification',
        category: 'Corporate Governance & Business',
        collegeBranding: false,
        defaultSectionCount: 7,
        description: 'Product management specification detailing user problem, user stories, acceptance criteria, technical dependencies, and telemetry.',
        structure: ['Problem Statement, Target User & Strategic Goal', 'Success Metrics & Key Performance Indicators', 'User Personas & High-Level User Journeys', 'Detailed Functional Requirements & User Stories', 'UX/UI Wireframes & Interaction Flow', 'Technical Dependencies, Non-Functional Requirements & Security', 'Launch Plan, GTM Phasing & Telemetry Tracking']
    },
    {
        id: 'corp_merger_acquisition_memo',
        name: 'Mergers & Acquisitions (M&A) Investment Committee Memorandum',
        category: 'Corporate Governance & Business',
        collegeBranding: false,
        defaultSectionCount: 7,
        description: 'Confidential investment memo analyzing acquisition target company, strategic valuation, synergies, diligence findings, and deal structuring.',
        structure: ['Transaction Summary & Executive Recommendation', 'Target Company Overview & Competitive Moat', 'Strategic Rationale & Synergy Analysis', 'Financial Performance & DCF Valuation Model', 'Comprehensive Due Diligence Findings (Legal/Tax/IP)', 'Integration Blueprint & Retention Strategy', 'Proposed Deal Terms, Financing & Approvals Required']
    },
    {
        id: 'corp_change_management_plan',
        name: 'Enterprise Organizational Change Management Plan',
        category: 'Corporate Governance & Business',
        collegeBranding: false,
        defaultSectionCount: 6,
        description: 'Change adoption strategy (ADKAR model) facilitating digital transformation, process restructuring, employee training, and barrier mitigation.',
        structure: ['Change Vision & Strategic Business Need', 'Stakeholder Impact Assessment & Change Readiness', 'Communication Plan & Leadership Alignment', 'Training & Skill Transition Curriculum', 'Resistance Mitigation & Feedback Channels', 'Adoption Measurement, Metrics & Long-Term Reinforcement']
    },
    {
        id: 'corp_brand_guidelines_doc',
        name: 'Corporate Brand Identity Standards & Style Guide',
        category: 'Corporate Governance & Business',
        collegeBranding: false,
        defaultSectionCount: 6,
        description: 'Design and communication standard specifying logo usage rules, color palette hex codes, typography hierarchy, and editorial voice.',
        structure: ['Brand Story, Mission & Tone of Voice', 'Logo Clearspace, Minimum Sizes & Misuse Rules', 'Color Palette: Primary, Secondary & Accent Swatches', 'Typography Hierarchy: Headings, Body & Web Safe Fonts', 'Imagery, Photography Style & Iconography', 'Stationery, Digital Templates & Merchandising Rules']
    },
    {
        id: 'corp_customer_onboarding_guide',
        name: 'Client Onboarding & Implementation Success Guide',
        category: 'Corporate Governance & Business',
        collegeBranding: false,
        defaultSectionCount: 6,
        description: 'Structured manual guiding enterprise clients through software setup, data migration, user provisioning, integrations, and training.',
        structure: ['Welcome to the Platform & Support Team Introduction', 'Implementation Roadmap & Estimated Timeline', 'Technical Prerequisites & Integration Checklist', 'User Account Setup, Permissions & Security Roles', 'Data Migration Guide & Validation Best Practices', 'Training Resources, Knowledge Base & Ongoing Support']
    },
    {
        id: 'corp_executive_summary_brief',
        name: 'C-Suite Executive Decision Brief & 1-Page Summary Memo',
        category: 'Corporate Governance & Business',
        collegeBranding: false,
        defaultSectionCount: 5,
        description: 'Concise executive briefing document synthesized for rapid decision-making with context, strategic alternatives, risk assessment, and recommendation.',
        structure: ['Issue Summary & Decision Required', 'Strategic Context & Current Status', 'Options Evaluated & Trade-off Analysis', 'Financial & Operational Risk Assessment', 'Final Recommendation & Next Steps']
    },
    {
        id: 'corp_service_level_agreement',
        name: 'Master Service Level Agreement (SLA) & Support Standards',
        category: 'Corporate Governance & Business',
        collegeBranding: false,
        defaultSectionCount: 6,
        description: 'Technical contract specifying platform uptime guarantees (99.9%), incident response timeframes, maintenance windows, and financial credits.',
        structure: ['Service Scope & Infrastructure Inclusions', 'System Availability & Uptime Guarantees (99.9%)', 'Incident Priority Levels & Response Time Matrix', 'Scheduled Maintenance Windows & Notification Cadence', 'Service Credits & Penalty Remedies for Outages', 'Monitoring, Reporting & Annual SLA Review']
    },

    // =========================================================================
    // CATEGORY 3: ENGINEERING, TECHNICAL & SOFTWARE ARCHITECTURE (Templates 51 - 70)
    // =========================================================================
    {
        id: 'tech_software_architecture_doc',
        name: 'Software Architecture Document (SAD) & System Design Specification',
        category: 'Technical & Engineering',
        collegeBranding: false,
        defaultSectionCount: 8,
        description: 'Industry-standard C4 model architecture document covering system context, containers, microservices, data flow, security, and scalability.',
        structure: ['Architecture Overview & Design Principles', 'C4 Model: System Context & High-Level Architecture', 'Microservices & Container Breakdown', 'Database Schema, Caching & Data Consistency Strategy', 'API Gateway, Routing & Authentication Protocols', 'Scalability, Load Balancing & High Availability', 'Security Architecture, Encryption & Compliance', 'Deployment Pipeline (CI/CD) & Observability']
    },
    {
        id: 'tech_api_reference_spec',
        name: 'RESTful / GraphQL API Design Specification & Developer Reference',
        category: 'Technical & Engineering',
        collegeBranding: false,
        defaultSectionCount: 7,
        description: 'Exhaustive API documentation detailing endpoint paths, request headers, payload schemas, response codes, rate limits, and error handling.',
        structure: ['API Overview, Base URLs & Versioning Policy', 'Authentication, OAuth2 Bearer Tokens & Permissions', 'Rate Limiting, Quotas & Header Standards', 'Complete Endpoints Reference (CRUD Operations)', 'Request & Response JSON Payloads with Field Types', 'Standard HTTP Error Codes & Exception Messages', 'SDK Code Snippets (Node.js, Python, cURL)']
    },
    {
        id: 'tech_software_requirements_spec',
        name: 'Software Requirements Specification (SRS) - IEEE 830 Standard',
        category: 'Technical & Engineering',
        collegeBranding: false,
        defaultSectionCount: 7,
        description: 'Formal IEEE-compliant requirements document detailing product perspective, functional requirements, external interfaces, and performance.',
        structure: ['Introduction & Purpose (IEEE 830 Standard)', 'Overall Description & User Characteristics', 'External Interface Requirements (UI, Hardware, Software)', 'Detailed Functional Requirements & Use Cases', 'Non-Functional Requirements: Reliability, Security, Speed', 'Design Constraints & Regulatory Standards', 'Verification Matrix & Acceptance Criteria']
    },
    {
        id: 'tech_database_design_doc',
        name: 'Relational & NoSQL Database Design Document & Data Dictionary',
        category: 'Technical & Engineering',
        collegeBranding: false,
        defaultSectionCount: 6,
        description: 'Complete data tier specification including Entity-Relationship Diagrams (ERD), schema definitions, index strategies, and partitioning rules.',
        structure: ['Database Architecture & Engine Selection (Postgres/Mongo)', 'Entity-Relationship Diagrams (ERD) & Conceptual Model', 'Normalized Schema Definitions & Data Types', 'Indexing Strategy, Foreign Keys & Performance Tuning', 'Data Sharding, Partitioning & Replication Setup', 'Backup, Disaster Recovery & Retention Policy']
    },
    {
        id: 'tech_devops_runbook',
        name: 'DevOps Infrastructure Runbook & Operational Playbook',
        category: 'Technical & Engineering',
        collegeBranding: false,
        defaultSectionCount: 7,
        description: 'Production infrastructure operational manual detailing cluster deployment, rollbacks, monitoring alerts, backup restoration, and scaling.',
        structure: ['Cloud Infrastructure Topology (AWS / Azure / GCP)', 'Kubernetes Cluster Configuration & Pod Specifications', 'CI/CD Deployment Pipelines & Automated Tests', 'Zero-Downtime Rollout & Instant Rollback Commands', 'Monitoring Dashboards (Prometheus/Grafana) & Alert Triggers', 'Disaster Recovery Failover & Snapshot Restoration', 'Routine Maintenance & OS Patching Procedures']
    },
    {
        id: 'tech_cybersecurity_response_plan',
        name: 'Cybersecurity Incident Response Plan & Threat Mitigation Guide',
        category: 'Technical & Engineering',
        collegeBranding: false,
        defaultSectionCount: 7,
        description: 'Security operations playbook establishing detection, containment, eradication, and forensic recovery from ransomware, breaches, and DDoS attacks.',
        structure: ['CSIRT Team Hierarchy & Emergency Contact Numbers', 'Threat Classification Matrix (Ransomware, Data Breach, DDoS)', 'Phase 1: Detection, Identification & Triage', 'Phase 2: Isolation, Containment & Forensic Preservation', 'Phase 3: Threat Eradication & Root Cause Mitigation', 'Phase 4: System Restoration, Validation & Post-Breach Auditing', 'Regulatory Breach Notification Protocol (GDPR / CERT-In)']
    },
    {
        id: 'tech_penetration_test_report',
        name: 'Application Penetration Testing & Vulnerability Assessment Report',
        category: 'Technical & Engineering',
        collegeBranding: false,
        defaultSectionCount: 6,
        description: 'Comprehensive security audit reporting OWASP Top 10 vulnerabilities, CVSS 3.1 scores, proof-of-concept exploits, and remediation advice.',
        structure: ['Executive Summary & Risk Assessment Matrix', 'Methodology, Scope & Testing Boundaries (OWASP Top 10)', 'Vulnerability Summary Table Ranked by CVSS Score', 'Detailed Findings: Evidence, Proof-of-Concept & Impact', 'Actionable Technical Remediation Guidelines', 'Re-testing Verification & Final Security Clearance']
    },
    {
        id: 'tech_cloud_migration_blueprint',
        name: 'Enterprise Cloud Migration Strategy & Architecture Blueprint',
        category: 'Technical & Engineering',
        collegeBranding: false,
        defaultSectionCount: 7,
        description: 'Systematic legacy-to-cloud transition document detailing 7Rs strategy (Rehost, Refactor, Rearchitect), phased wave plan, and cost optimization.',
        structure: ['Current On-Premise Workload Assessment & Inventory', 'Target Cloud Architecture & Landing Zone Blueprint', 'Migration Strategy Categorization (7Rs Framework)', 'Data Migration & Database Replication Strategy', 'Cutover Plan, Testing & Fallback Scenarios', 'Cloud Cost Optimization (FinOps) & Governance', 'Post-Migration Operations & Security Baseline']
    },
    {
        id: 'tech_ai_model_card',
        name: 'AI Model Card, System Evaluation & Responsible AI Assessment',
        category: 'Technical & Engineering',
        collegeBranding: false,
        defaultSectionCount: 7,
        description: 'Formal model card describing training dataset, model architecture, benchmark metrics (F1, BLEU, latency), bias audits, and intended use cases.',
        structure: ['Model Overview, Version & Intended Use Cases', 'Training Dataset Composition & Preprocessing', 'Model Architecture, Hyperparameters & Infrastructure', 'Quantitative Performance Benchmarks & Metrics', 'Fairness, Bias & Toxicity Evaluation', 'Ethical Considerations & Known Limitations', 'Inference Optimization, Deployment & Monitoring']
    },
    {
        id: 'tech_iot_embedded_system_spec',
        name: 'IoT Hardware Embedded System Specification & Firmware Architecture',
        category: 'Technical & Engineering',
        collegeBranding: false,
        defaultSectionCount: 6,
        description: 'Engineering specification covering microcontroller selection, peripheral interfaces, power consumption, firmware OTA, and MQTT telemetry.',
        structure: ['Hardware Overview: MCU, Sensors & Power Management', 'Pinout Diagrams, Bus Protocols (I2C/SPI/UART) & Schematics', 'Firmware State Machine & RTOS Task Prioritization', 'Wireless Connectivity (BLE / Wi-Fi / LoRaWAN) & MQTT Protocol', 'Secure Boot, Cryptographic Keys & Over-the-Air (OTA) Updates', 'Environmental Testing, Battery Life & Certifications']
    },
    {
        id: 'tech_code_review_guidelines',
        name: 'Engineering Code Review Standards & Quality Checklist',
        category: 'Technical & Engineering',
        collegeBranding: false,
        defaultSectionCount: 6,
        description: 'Team coding standard specifying pull request conventions, review turnaround, code smell checklists, test coverage rules, and merge criteria.',
        structure: ['Philosophy & Objectives of Code Reviews', 'Pull Request (PR) Sizing, Descriptions & Commit Standards', 'Technical Checklist: Architecture, Performance, Security & Style', 'Unit & Integration Test Coverage Requirements', 'Code Review Etiquette, Constructive Feedback & Turnaround SLAs', 'CI/CD Automated Gatekeepers & Approval Rules']
    },
    {
        id: 'tech_qa_test_plan',
        name: 'Comprehensive Quality Assurance (QA) Master Test Plan',
        category: 'Technical & Engineering',
        collegeBranding: false,
        defaultSectionCount: 7,
        description: 'Master test plan outlining test scope, automated regression suites, manual exploratory testing, defect lifecycle, and sign-off criteria.',
        structure: ['Test Objectives, Scope & Testing Boundaries', 'Test Strategies: Functional, Regression, Performance & Security', 'Test Environment Configuration & Test Data Management', 'Automated Testing Framework (Playwright/Jest/Selenium)', 'Defect Lifecycle, Bug Triage & Severity Classifications', 'Pass/Fail Criteria, Entry/Exit Gates & Sign-Off Matrix', 'Roles, Responsibilities & Schedule']
    },
    {
        id: 'tech_network_topology_doc',
        name: 'Enterprise Network Topology & Firewall Configuration Guide',
        category: 'Technical & Engineering',
        collegeBranding: false,
        defaultSectionCount: 6,
        description: 'Network engineering document specifying LAN/WAN topology, VLAN segmentation, VPN tunnels, firewall ACLs, and bandwidth allocation.',
        structure: ['Network Architecture Overview & Physical Topology Diagram', 'IP Subnetting Scheme & VLAN Segmentation Table', 'Edge Routers, Core Switches & Redundant Links', 'Firewall Access Control Lists (ACLs) & Port Rules', 'Site-to-Site VPN Tunnels & Remote Access Protocol', 'Network Monitoring, Syslog & Failover Contingencies']
    },
    {
        id: 'tech_microservices_decomposition',
        name: 'Monolith to Microservices Decomposition Strategy & Roadmap',
        category: 'Technical & Engineering',
        collegeBranding: false,
        defaultSectionCount: 6,
        description: 'Domain-Driven Design (DDD) migration guide identifying bounded contexts, strangler fig patterns, event sourcing, and distributed transactions.',
        structure: ['Current Monolithic Architecture & Pain Points', 'Domain-Driven Design (DDD) Bounded Contexts Identification', 'Strangler Fig Pattern Migration Phases', 'Event-Driven Communication & Message Queues (Kafka/RabbitMQ)', 'Distributed Transactions, Saga Pattern & Data Consistency', 'Observability: Distributed Tracing & Service Mesh']
    },
    {
        id: 'tech_data_engineering_pipeline',
        name: 'Big Data Pipeline Architecture & Lakehouse Specification',
        category: 'Technical & Engineering',
        collegeBranding: false,
        defaultSectionCount: 7,
        description: 'Data engineering specification detailing ETL/ELT pipelines, Medallion Architecture (Bronze/Silver/Gold), Apache Spark, and data governance.',
        structure: ['Data Architecture Overview: Modern Data Lakehouse', 'Batch & Real-Time Streaming Ingestion Sources', 'Medallion Architecture: Bronze, Silver & Gold Layers', 'Transformation Workflows (dbt, Apache Spark, Airflow)', 'Data Catalog, Lineage & Quality Rules (Great Expectations)', 'Access Control, Data Masking & Governance', 'Storage Optimization, Partitioning & Query Benchmarks']
    },
    {
        id: 'tech_blockchain_smart_contract_audit',
        name: 'Blockchain Smart Contract Security Audit & Specification',
        category: 'Technical & Engineering',
        collegeBranding: false,
        defaultSectionCount: 6,
        description: 'Solidity contract review document auditing reentrancy attacks, gas optimization, access control, and formal verification findings.',
        structure: ['Smart Contract System Overview & Tokenomics', 'Auditing Methodology & Automated Static Analysis Tools', 'Reentrancy, Front-Running & Integer Overflow Checks', 'Access Control, Proxy Patterns & Upgradability Security', 'Gas Optimization Analysis & Function Efficiency', 'Remediated Code Review & Final Security Rating']
    },
    {
        id: 'tech_ui_ux_design_system',
        name: 'UI/UX Design System Specification & Component Library',
        category: 'Technical & Engineering',
        collegeBranding: false,
        defaultSectionCount: 6,
        description: 'Design system manual covering design tokens, spacing scales, accessible color contrast (WCAG AAA), and reusable component behaviors.',
        structure: ['Design Philosophy & Accessibility Principles (WCAG 2.1)', 'Design Tokens: Color Palette, Spacing Scale & Shadows', 'Typography Hierarchy & Responsive Breakpoints', 'Interactive Core Components: Buttons, Inputs, Modals & Cards', 'Data Visualization Patterns & Dark Mode Guidelines', 'Developer Hand-off & Component Storybook Integration']
    },
    {
        id: 'tech_disaster_recovery_plan',
        name: 'IT Disaster Recovery (DR) Plan & Business Continuity Blueprint',
        category: 'Technical & Engineering',
        collegeBranding: false,
        defaultSectionCount: 7,
        description: 'Disaster recovery document defining Recovery Time Objective (RTO), Recovery Point Objective (RPO), failover triggers, and drills.',
        structure: ['DR Governance, Command Team & Communication Roster', 'Business Impact Analysis: Critical Systems Tiering', 'RTO & RPO Targets for Infrastructure Services', 'Automated Multi-Region Cloud Failover Procedures', 'Data Backup Restoration & Integrity Verification', 'Annual DR Testing Drills & Simulation Scenarios', 'Audit Findings & Continuous Plan Maintenance']
    },
    {
        id: 'tech_mlops_pipeline_spec',
        name: 'Machine Learning Operations (MLOps) Automated Pipeline Guide',
        category: 'Technical & Engineering',
        collegeBranding: false,
        defaultSectionCount: 6,
        description: 'End-to-end MLOps architecture detailing model tracking, feature stores, automated retraining triggers, drift detection, and serving.',
        structure: ['MLOps Architecture & Toolchain Overview (MLflow, Kubeflow)', 'Centralized Feature Store & Data Versioning (DVC)', 'Automated Continuous Training (CT) Triggers', 'Model Evaluation Gates & Canary Deployment', 'Production Model Serving, Caching & Auto-Scaling', 'Data Drift & Concept Drift Monitoring Alerts']
    },
    {
        id: 'tech_feasibility_study',
        name: 'Technical Feasibility Study & Technology Evaluation Report',
        category: 'Technical & Engineering',
        collegeBranding: false,
        defaultSectionCount: 6,
        description: 'Rigorous engineering evaluation assessing technological viability, proof-of-concept benchmarks, technical risks, and cost-benefit trade-offs.',
        structure: ['Executive Summary & Evaluated Technology Thesis', 'Technical Requirements & Evaluation Criteria Matrix', 'Proof-of-Concept (PoC) Prototype & Benchmark Results', 'Risk Analysis: Security, Scalability & Vendor Lock-in', 'Cost-Benefit Analysis & Financial Projections', 'Final Engineering Verdict & Phased Recommendation']
    },

    // =========================================================================
    // CATEGORY 4: LEGAL, HR, COMPLIANCE & CONTRACTS (Templates 71 - 85)
    // =========================================================================
    {
        id: 'legal_non_disclosure_agreement',
        name: 'Mutual Non-Disclosure & Confidentiality Agreement (NDA)',
        category: 'Legal, HR & Contracts',
        collegeBranding: false,
        defaultSectionCount: 7,
        description: 'Comprehensive bilateral confidentiality contract defining confidential information, non-use covenants, term, exclusions, and jurisdiction.',
        structure: ['Definitions of Confidential Information & Parties', 'Non-Disclosure & Restricted Use Obligations', 'Standard Exclusions from Confidential Treatment', 'Standard of Care & Security Protocols', 'Return or Destruction of Confidential Materials', 'Term, Survival Clauses & Remedies for Breach', 'Governing Law, Dispute Jurisdiction & Signatures']
    },
    {
        id: 'legal_employment_agreement',
        name: 'Executive Employment Agreement & Offer Contract',
        category: 'Legal, HR & Contracts',
        collegeBranding: false,
        defaultSectionCount: 8,
        description: 'Formal employment agreement detailing role, compensation, stock options, non-compete clauses, intellectual property assignment, and termination.',
        structure: ['Appointment, Title, Reporting Structure & Duties', 'Compensation: Base Salary, Performance Bonus & Equity', 'Employee Benefits, Paid Leave & Expense Reimbursement', 'Confidentiality & Non-Disclosure Obligations', 'Invention Assignment & Intellectual Property Ownership', 'Non-Solicitation & Non-Competition Covenants', 'Termination Notice Periods & Severance Terms', 'Governing Law, Entire Agreement & Signatures']
    },
    {
        id: 'legal_master_services_agreement',
        name: 'Master Services Agreement (MSA) for Enterprise Clients',
        category: 'Legal, HR & Contracts',
        collegeBranding: false,
        defaultSectionCount: 8,
        description: 'Foundational commercial contract governing ongoing client services, Statements of Work (SOW), warranties, indemnification, and liability caps.',
        structure: ['Scope of Agreement & SOW Incorporation', 'Service Delivery Standards, Invoicing & Payment Terms', 'Intellectual Property Rights & Client Data Ownership', 'Warranties, Disclaimers & Standard of Performance', 'Indemnification & Defense Obligations', 'Limitation of Liability & Consequential Damages Waiver', 'Term, Suspension & Termination Provisions', 'General Legal Provisions & Dispute Resolution']
    },
    {
        id: 'legal_independent_contractor',
        name: 'Independent Contractor / Freelancer Consulting Agreement',
        category: 'Legal, HR & Contracts',
        collegeBranding: false,
        defaultSectionCount: 7,
        description: 'Contractor agreement explicitly establishing independent status, deliverables, fee structure, tax responsibility, and work-for-hire IP assignment.',
        structure: ['Services to be Rendered & Independent Status', 'Compensation, Invoicing & Tax Responsibility', 'Work Made for Hire & Complete Assignment of IP', 'Confidentiality & Non-Disclosure Covenants', 'Representations, Warranties & Non-Infringement', 'Term of Engagement & Right of Termination', 'Governing Law, Arbitration & Signatures']
    },
    {
        id: 'legal_privacy_policy_gdpr',
        name: 'Corporate Privacy Policy & GDPR / CCPA Compliance Notice',
        category: 'Legal, HR & Contracts',
        collegeBranding: false,
        defaultSectionCount: 8,
        description: 'Compliant legal notice covering data collection, processing lawful basis, cookies, third-party sharing, cross-border transfers, and user rights.',
        structure: ['Introduction, Scope & Identity of Data Controller', 'Categories of Personal Data Collected & Sources', 'Purposes & Legal Bases for Processing Data', 'Cookies, Tracking Pixels & Analytics Technologies', 'Data Sharing with Processors & International Transfers', 'Data Retention Policies & Security Safeguards', 'Individual Privacy Rights (GDPR / CCPA / DPDPA)', 'Data Protection Officer (DPO) Contact Information']
    },
    {
        id: 'legal_terms_of_service',
        name: 'Software-as-a-Service (SaaS) Terms of Service (ToS)',
        category: 'Legal, HR & Contracts',
        collegeBranding: false,
        defaultSectionCount: 8,
        description: 'Binding user terms governing SaaS access, subscription fees, prohibited uses, uptime disclaimer, intellectual property, and arbitration.',
        structure: ['Acceptance of Terms & Eligibility Requirements', 'User Accounts, Security & Password Obligations', 'Subscription Billing, Auto-Renewal & Cancellation', 'Acceptable Use Policy & Restricted Conduct', 'Platform Intellectual Property & Limited License', 'Disclaimers of Warranties & Limitation of Liability', 'Indemnification by User', 'Class Action Waiver, Binding Arbitration & Termination']
    },
    {
        id: 'legal_employee_performance_review',
        name: 'Employee Annual Performance Appraisal & Goal Review Form',
        category: 'Legal, HR & Contracts',
        collegeBranding: false,
        defaultSectionCount: 6,
        description: 'Comprehensive HR review form detailing competency scoring, accomplishment of OKRs/KPIs, areas for development, and career progression.',
        structure: ['Employee Information, Review Period & Job Title', 'Evaluation of Core Competencies & Values', 'Review of Previous Objectives & Goal Attainment (OKRs)', 'Manager Qualitative Assessment & Growth Areas', 'Employee Self-Assessment & Career Aspirations', 'Future Year Goals, Training Plan & Sign-Offs']
    },
    {
        id: 'legal_code_of_ethics',
        name: 'Corporate Code of Ethics & Business Conduct Policy',
        category: 'Legal, HR & Contracts',
        collegeBranding: false,
        defaultSectionCount: 7,
        description: 'Institutional compliance standard defining anti-bribery, insider trading prohibition, conflict of interest disclosures, and whistleblower protections.',
        structure: ['Foundational Principles & Scope of Policy', 'Conflicts of Interest & Outside Business Activities', 'Anti-Bribery, Anti-Corruption & Gifts Acceptance', 'Protection of Company Assets, Data & Insider Trading', 'Fair Competition & Antitrust Compliance', 'Whistleblower Hotline & Retaliation Prohibition', 'Compliance Certifications & Disciplinary Sanctions']
    },
    {
        id: 'legal_termination_severance',
        name: 'Employment Separation, Release & Severance Agreement',
        category: 'Legal, HR & Contracts',
        collegeBranding: false,
        defaultSectionCount: 7,
        description: 'Legal separation agreement covering severance payments, benefits continuation, general release of claims, non-disparagement, and company property return.',
        structure: ['Separation Date & Final Pay Accruals', 'Severance Consideration & Health Benefit Continuation', 'General Release & Waiver of Employment Claims', 'Non-Disparagement & Affirmation of Confidentiality', 'Return of All Corporate Property & Intellectual Data', 'Cooperation Clause & Post-Separation Inquiries', 'Revocation Period, Governing Law & Signatures']
    },
    {
        id: 'legal_ip_assignment',
        name: 'Proprietary Information & Inventions Assignment Agreement (PIIA)',
        category: 'Legal, HR & Contracts',
        collegeBranding: false,
        defaultSectionCount: 6,
        description: 'Crucial IP protection contract assigning all inventions, copyrights, and patents created during employment exclusively to the corporation.',
        structure: ['Recognition of Company Proprietary Information', 'Duty to Disclose Inventions & Creations', 'Complete Assignment of Inventions & Moral Rights Waiver', 'Prior Inventions Carve-Out List & Exclusions', 'Power of Attorney for Patent Filings', 'Enforcement Remedies, Binding Successors & Sign-off']
    },
    {
        id: 'legal_data_processing_addendum',
        name: 'Data Processing Addendum (DPA) & Standard Contractual Clauses',
        category: 'Legal, HR & Contracts',
        collegeBranding: false,
        defaultSectionCount: 7,
        description: 'GDPR Article 28 compliant agreement between Data Controller and Data Processor covering sub-processors, technical security, and audits.',
        structure: ['Scope, Applicability & Order of Precedence', 'Processing of Customer Personal Data & Instructions', 'Security Measures & Technical Safeguards', 'Sub-Processor Authorization & Due Diligence', 'Data Subject Requests & Breach Notification (72 Hours)', 'Data Return, Erasure & Audit Rights', 'Standard Contractual Clauses (SCCs) Annexures']
    },
    {
        id: 'legal_software_license_agreement',
        name: 'End User License Agreement (EULA) & Software Licensing Contract',
        category: 'Legal, HR & Contracts',
        collegeBranding: false,
        defaultSectionCount: 6,
        description: 'Proprietary software license defining per-seat licenses, prohibition of reverse engineering, audit verification, and warranty disclaimer.',
        structure: ['Grant of Limited, Non-Exclusive License', 'License Restrictions: No Reverse Engineering or Sublicensing', 'Audit Rights & Usage Compliance Verification', 'Intellectual Property Ownership Retention', 'Warranty Disclaimers & Limitation of Liability', 'Termination for Breach & Effect of Termination']
    },
    {
        id: 'legal_board_resolution',
        name: 'Corporate Board Resolution & Banking Authorization Document',
        category: 'Legal, HR & Contracts',
        collegeBranding: false,
        defaultSectionCount: 5,
        description: 'Formal corporate resolution authorizing company bank accounts, appointing signers, approving contracts, or issuing share capital.',
        structure: ['Corporate Header & Meeting Authorization Context', 'Text of Formal Resolutions Passed by Directors', 'Authorized Signatories & Financial Execution Limits', 'Certification by Corporate Secretary & Chairman', 'Corporate Seal & Date of Enactment']
    },
    {
        id: 'legal_hr_remote_work_policy',
        name: 'Corporate Remote & Hybrid Work Agreement and Policy',
        category: 'Legal, HR & Contracts',
        collegeBranding: false,
        defaultSectionCount: 6,
        description: 'Modern workplace agreement outlining remote eligibility, core working hours, home office cybersecurity, equipment stipend, and ergonomics.',
        structure: ['Eligibility for Remote / Hybrid Work Arrangements', 'Core Working Hours, Availability & Communication Cadence', 'Home Office Cybersecurity & Data Protection Protocols', 'Company Equipment Provision, Internet Stipend & Maintenance', 'Ergonomic Workspace Standards & Workers Comp Compliance', 'Performance Standards & Right to Revoke Remote Status']
    },
    {
        id: 'legal_internship_offer_letter',
        name: 'Student Industrial Internship Offer Letter & Learning Agreement',
        category: 'Legal, HR & Contracts',
        collegeBranding: false,
        defaultSectionCount: 6,
        description: 'Official corporate internship appointment letter specifying stipend, duration, mentoring manager, NDA covenants, and evaluation criteria.',
        structure: ['Internship Title, Department & Mentor Assignment', 'Term Duration, Expected Weekly Hours & Work Schedule', 'Monthly Stipend, Travel Reimbursement & Perks', 'Confidentiality & Project Deliverables Assignment', 'Intern Performance Evaluation & Certificate Criteria', 'Formal Acceptance Signature & Commencement Date']
    },

    // =========================================================================
    // CATEGORY 5: MEDICAL, CLINICAL & SCIENTIFIC RESEARCH (Templates 86 - 97)
    // =========================================================================
    {
        id: 'sci_clinical_trial_protocol',
        name: 'Good Clinical Practice (GCP) Clinical Trial Research Protocol',
        category: 'Medical & Scientific Research',
        collegeBranding: false,
        defaultSectionCount: 8,
        description: 'Comprehensive GCP/ICH-compliant protocol detailing Phase II/III investigational drug study, patient eligibility, endpoints, and safety monitoring.',
        structure: ['Protocol Summary & Investigational Drug Overview', 'Background, Rationale & Preclinical Evidence', 'Study Objectives: Primary & Secondary Endpoints', 'Study Design, Randomization & Blinding Methodology', 'Patient Eligibility: Inclusion & Exclusion Criteria', 'Treatment Schedule, Dosage & Administration Protocol', 'Adverse Event Reporting & Safety Monitoring Board (DSMB)', 'Statistical Analysis Plan, Ethics & Informed Consent']
    },
    {
        id: 'sci_patient_case_report',
        name: 'Clinical Medicine Patient Case Report & Diagnostic Analysis',
        category: 'Medical & Scientific Research',
        collegeBranding: false,
        defaultSectionCount: 6,
        description: 'Formal CARE-guideline compliant medical case report detailing patient presentation, differential diagnosis, clinical intervention, and outcome.',
        structure: ['Abstract & Clinical Case Significance', 'Patient Demographic Information & Chief Complaint', 'Clinical History, Physical Examination & Lab Findings', 'Diagnostic Assessment, Imaging & Differential Diagnoses', 'Therapeutic Interventions & Clinical Outcomes', 'Discussion, Literature Comparison & Clinical Takeaways']
    },
    {
        id: 'sci_medical_grand_rounds',
        name: 'Hospital Medical Grand Rounds & Morbidity/Mortality (M&M) Review',
        category: 'Medical & Scientific Research',
        collegeBranding: false,
        defaultSectionCount: 6,
        description: 'Systematic clinical audit examining critical clinical cases, diagnostic pathways, pharmacological responses, and quality improvement changes.',
        structure: ['Case Overview, Timeline of Hospital Admission & Triage', 'Diagnostic Investigations, Pathology & Radiology Review', 'Clinical Decision-Making Pathway & Interventions', 'Outcome Analysis & Complication Root Cause', 'Review of Contemporary Evidence-Based Guidelines', 'Hospital Process Improvement & Clinical Practice Changes']
    },
    {
        id: 'sci_laboratory_safety_manual',
        name: 'Biosafety Level 2/3 (BSL-2/3) Laboratory Safety Master Manual',
        category: 'Medical & Scientific Research',
        collegeBranding: false,
        defaultSectionCount: 7,
        description: 'Institutional laboratory safety protocol covering hazardous chemical handling, biohazard containment, autoclaving, PPE, and spill procedures.',
        structure: ['Biosafety Principles & Risk Group Classifications', 'Personal Protective Equipment (PPE) & Hygiene Norms', 'Standard Microbiological & Chemical Handling Practices', 'Biohazard Containment, Autoclaving & Waste Disposal', 'Emergency Protocol: Chemical Spills & Pathogen Exposure', 'Medical Surveillance & Incident Reporting Protocol', 'Annual Safety Certifications & Personnel Training']
    },
    {
        id: 'sci_systematic_review_protocol',
        name: 'Systematic Review & Meta-Analysis Protocol (PRISMA-P Guideline)',
        category: 'Medical & Scientific Research',
        collegeBranding: false,
        defaultSectionCount: 7,
        description: 'Rigorous systematic review protocol registered with PROSPERO specifying PICO question, database search strings, risk of bias, and meta-analysis.',
        structure: ['Title, Registration (PROSPERO) & Rationale', 'Review Question & Eligibility Criteria (PICO Framework)', 'Information Sources & Exhaustive Search Strategies', 'Study Selection & Independent Screening Process', 'Data Extraction & Quality Assessment (Risk of Bias Tool)', 'Data Synthesis Strategy & Heterogeneity Assessment', 'Assessment of Meta-Biases & Evidence Grading (GRADE)']
    },
    {
        id: 'sci_drug_monograph',
        name: 'Hospital Formulary Drug Monograph & Pharmacological Review',
        category: 'Medical & Scientific Research',
        collegeBranding: false,
        defaultSectionCount: 7,
        description: 'Pharmacy and therapeutics committee monograph evaluating new pharmaceutical agent, mechanism of action, efficacy trials, pharmacoeconomics, and dosage.',
        structure: ['Drug Identification, Class & FDA / EMA Approved Indications', 'Mechanism of Action & Clinical Pharmacokinetics', 'Efficacy Review from Pivotal Phase III Trials', 'Adverse Drug Reactions, Black Box Warnings & Interactions', 'Comparative Efficacy Against Current Formulary Standards', 'Pharmacoeconomic & Budget Impact Analysis', 'Formulary Recommendation & Prescribing Restrictions']
    },
    {
        id: 'sci_medical_device_risk_assessment',
        name: 'Medical Device ISO 14971 Risk Management & Clinical Evaluation',
        category: 'Medical & Scientific Research',
        collegeBranding: false,
        defaultSectionCount: 7,
        description: 'Medical device regulatory dossier fulfilling ISO 14971 standards with failure modes (FMEA), biological evaluation, risk reduction, and post-market surveillance.',
        structure: ['Device Description, Intended Use & Essential Principles', 'Risk Management Plan & Acceptability Criteria', 'Hazard Identification & Failure Modes Analysis (FMEA)', 'Risk Evaluation & Risk Reduction Measures Implemented', 'Benefit-Risk Determination & Residual Risk Analysis', 'Clinical Evaluation Report (CER) & Literature Summary', 'Post-Market Surveillance (PMS) Plan & Vigilance']
    },
    {
        id: 'sci_irb_human_subjects_protocol',
        name: 'Institutional Review Board (IRB) Human Subjects Research Protocol',
        category: 'Medical & Scientific Research',
        collegeBranding: true,
        defaultSectionCount: 7,
        description: 'Full ethics committee application ensuring Belmont Report compliance, vulnerable population safeguards, informed consent, and data anonymity.',
        structure: ['Project Title, Investigators & Research Site', 'Study Purpose, Scientific Merit & Background', 'Subject Recruitment, Sample Size & Vulnerable Populations', 'Informed Consent Process & Assent Documentation', 'Potential Risks, Discomforts & Mitigation Safeguards', 'Potential Benefits to Participants & Society', 'Data Privacy, Secure Storage & De-Identification']
    },
    {
        id: 'sci_epidemiological_study_report',
        name: 'Epidemiological Field Investigation & Public Health Outbreak Report',
        category: 'Medical & Scientific Research',
        collegeBranding: false,
        defaultSectionCount: 6,
        description: 'Public health field report investigating infectious disease outbreak, epidemic curves, contact tracing, attack rates, and containment measures.',
        structure: ['Executive Summary & Outbreak Context', 'Case Definition & Epidemiological Case Finding', 'Descriptive Epidemiology: Time (Epi Curve), Place & Person', 'Analytical Epidemiology: Risk Factors & Odds Ratios', 'Laboratory Diagnostics & Environmental Testing', 'Public Health Interventions, Containment & Policy Directives']
    },
    {
        id: 'sci_biomedical_grant_nih',
        name: 'Biomedical Research Grant Application (NIH R01 Standard Format)',
        category: 'Medical & Scientific Research',
        collegeBranding: true,
        defaultSectionCount: 7,
        description: 'Competitive biomedical grant application structured around Specific Aims, Significance, Innovation, and rigorous Approach.',
        structure: ['Project Summary / Abstract & Narrative', 'Specific Aims: Working Hypotheses & Key Goals', 'Research Strategy: Significance & Scientific Premise', 'Research Strategy: Innovation & Conceptual Novelty', 'Research Strategy: Approach, Preliminary Data & Methods', 'Human Subjects / Vertebrate Animals Protections', 'Budget Justification, Key Personnel & Institutional Resources']
    },
    {
        id: 'sci_pharmacovigilance_psur',
        name: 'Periodic Safety Update Report (PSUR) & Pharmacovigilance Audit',
        category: 'Medical & Scientific Research',
        collegeBranding: false,
        defaultSectionCount: 6,
        description: 'Regulatory safety document evaluating worldwide safety experience, adverse drug reaction signals, benefit-risk balance, and risk minimization.',
        structure: ['Worldwide Marketing Authorization Status', 'Estimated Cumulative Patient Exposure to Drug', 'Tabulation & Evaluation of Serious Adverse Events (SAEs)', 'Signal Detection & Ongoing Safety Inquiries', 'Comprehensive Benefit-Risk Balance Evaluation', 'Conclusions & Proposed Actions (Labeling Updates)']
    },
    {
        id: 'sci_animal_care_iacuc_protocol',
        name: 'Institutional Animal Care and Use Committee (IACUC) Protocol',
        category: 'Medical & Scientific Research',
        collegeBranding: true,
        defaultSectionCount: 6,
        description: 'Ethics protocol for animal research demonstrating adherence to the 3Rs (Replacement, Reduction, Refinement), anesthesia, and humane endpoints.',
        structure: ['Protocol Title, Species, Strain & Total Animals Requested', 'Scientific Rationale & Justification of Species Selection', 'Consideration of 3Rs Alternatives (Replacement, Reduction, Refinement)', 'Experimental Procedures, Surgical Protocol & Anesthesia', 'Pain Category, Analgesia Plan & Monitoring Criteria', 'Humane Endpoints, Euthanasia Method & Carcass Disposal']
    },

    // =========================================================================
    // CATEGORY 6: ACADEMIC PUBLISHING, WHITEPAPERS & CASE STUDIES (Templates 98 - 107)
    // =========================================================================
    {
        id: 'pub_ieee_journal_manuscript',
        name: 'IEEE Transactions Double-Column Journal Paper Manuscript',
        category: 'Academic Publications & Case Studies',
        collegeBranding: false,
        defaultSectionCount: 8,
        description: 'Formal scholarly manuscript structured for engineering and computer science journals with IEEE styling, equations, and citations.',
        structure: ['Abstract (Structured) & Index Terms (Keywords)', 'Section I: Introduction & Theoretical Motivation', 'Section II: Related Work & Literature Review', 'Section III: Proposed System Architecture & Mathematical Model', 'Section IV: Experimental Setup, Datasets & Benchmarks', 'Section V: Empirical Results & Comparative Analysis', 'Section VI: Discussion & Practical Implications', 'Section VII: Conclusion, Future Scope & References']
    },
    {
        id: 'pub_harvard_business_case_study',
        name: 'Harvard Business School (HBS) Executive Case Study',
        category: 'Academic Publications & Case Studies',
        collegeBranding: false,
        defaultSectionCount: 6,
        description: 'Engaging real-world business case presenting an executive protagonist confronting a pivotal dilemma, accompanied by financial exhibits and questions.',
        structure: ['The Executive Dilemma & Opening Hook', 'Company History, Industry Context & Competitive Moats', 'The Strategic Inflection Point & Critical Choices', 'Financial & Operational Exhibits (Tables 1-4)', 'Alternative Courses of Action Under Consideration', 'Discussion Questions for MBA Classroom Analysis']
    },
    {
        id: 'pub_technical_whitepaper',
        name: 'Industry Thought Leadership Technical Whitepaper',
        category: 'Academic Publications & Case Studies',
        collegeBranding: false,
        defaultSectionCount: 6,
        description: 'Authoritative deep-dive document educating enterprise decision-makers on emerging technology solutions, market shifts, and architectural blueprints.',
        structure: ['Executive Summary: The Modern Macro Environment', 'Industry Pain Points & Current Technological Limitations', 'A New Paradigm: Conceptual Framework & Principles', 'Deep Technical Architecture & Working Mechanics', 'Real-World Performance Benchmarks & Business Benefits', 'Strategic Implementation Roadmap & Getting Started']
    },
    {
        id: 'pub_thesis_literature_review',
        name: 'Comprehensive Thesis Literature Review & Meta-Synthesis',
        category: 'Academic Publications & Case Studies',
        collegeBranding: true,
        defaultSectionCount: 6,
        description: 'In-depth academic synthesis surveying historical origins, dominant theoretical models, methodological debates, and unaddressed research gaps.',
        structure: ['Introduction & Scope of the Literature Review', 'Theoretical Foundations & Historical Development', 'Thematic Analysis of Contemporary Research Streams', 'Methodological Approaches, Tools & Data Sources Evaluated', 'Critical Synthesis: Contradictions, Debates & Blind Spots', 'Formulation of Research Gaps & Groundwork for Hypothesis']
    },
    {
        id: 'pub_academic_book_chapter',
        name: 'Edited Academic Book Chapter & Theoretical Treatise',
        category: 'Academic Publications & Case Studies',
        collegeBranding: false,
        defaultSectionCount: 7,
        description: 'Peer-reviewed scholarly book contribution providing state-of-the-art overview, conceptual taxonomy, case examples, and future directions.',
        structure: ['Chapter Abstract & Learning Objectives', 'Historical Foundations & Conceptual Taxonomy', 'Theoretical Framework & Core Mechanisms', 'Empirical Applications & Cross-Domain Case Studies', 'Pedagogical Exercises & Critical Discussion Points', 'Emerging Trends, Frontiers & Unresolved Questions', 'Extensive Scholarly References']
    },
    {
        id: 'pub_policy_brief',
        name: 'Government & Public Policy Brief and Recommendation Memo',
        category: 'Academic Publications & Case Studies',
        collegeBranding: false,
        defaultSectionCount: 5,
        description: 'High-impact policy paper informing legislators and civic leaders on social/economic issues, policy options, cost analysis, and actionable recommendations.',
        structure: ['Executive Summary & Immediate Call to Action', 'Background & Context of the Socio-Economic Problem', 'Analysis of Current Policy Failures & Shortcomings', 'Evaluation of Proposed Policy Interventions & Fiscal Impact', 'Actionable Policy Recommendations & Implementation Steps']
    },
    {
        id: 'pub_technical_survey_paper',
        name: 'Comprehensive Survey & Taxonomy Research Paper (ACM / IEEE)',
        category: 'Academic Publications & Case Studies',
        collegeBranding: false,
        defaultSectionCount: 7,
        description: 'Exhaustive survey paper cataloging 100+ related works, proposing unified taxonomy, comparing performance trade-offs, and charting open problems.',
        structure: ['Introduction & Motivation for Comprehensive Survey', 'Proposed Unified Taxonomy & Classification Scheme', 'Comprehensive Review of Existing Approaches (Category A)', 'Comprehensive Review of Existing Approaches (Category B)', 'Comparative Analysis: Feature Matrix & Benchmark Results', 'Open Challenges, Vulnerabilities & Future Research Directions', 'Comprehensive Bibliography']
    },
    {
        id: 'pub_university_working_paper',
        name: 'Departmental Working Paper & Economics Discussion Series',
        category: 'Academic Publications & Case Studies',
        collegeBranding: true,
        defaultSectionCount: 6,
        description: 'Pre-publication working paper presenting ongoing academic research, econometric modeling, empirical datasets, and preliminary findings for peer feedback.',
        structure: ['Abstract, JEL Classification Codes & Keywords', 'Introduction & Economic Policy Significance', 'Theoretical Model & Econometric Formulation', 'Data Sources, Variable Selection & Descriptive Statistics', 'Empirical Estimation Results & Robustness Checks', 'Concluding Remarks, Policy Insights & Working Notes']
    },
    {
        id: 'pub_benchmarking_report',
        name: 'Industry Benchmark & Competitive Landscape Analysis Report',
        category: 'Academic Publications & Case Studies',
        collegeBranding: false,
        defaultSectionCount: 6,
        description: 'Analytical market report comparing top enterprise solutions across functional feature sets, latency, pricing, market share, and customer sentiment.',
        structure: ['Market Overview & Competitive Landscape Dynamics', 'Benchmarking Methodology, Testing Criteria & Weightings', 'Comparative Evaluation: Performance, Speed & Latency', 'Feature Matrix & Enterprise Integration Capabilities', 'Pricing, Total Cost of Ownership & Support Analysis', 'Leaders vs. Challengers Quadrant & Final Verdict']
    },
    {
        id: 'pub_research_survey_questionnaire',
        name: 'Empirical Research Survey Questionnaire & Methodology Guide',
        category: 'Academic Publications & Case Studies',
        collegeBranding: true,
        defaultSectionCount: 5,
        description: 'Validated psychometric instrument for academic research including participant consent, demographic scales, Likert items, and statistical validity checks.',
        structure: ['Research Overview & Participant Informed Consent', 'Demographic & Organizational Background Variables', 'Validated Likert-Scale Survey Construct Items', 'Open-Ended Qualitative Exploration Questions', 'Statistical Reliability Testing (Cronbach Alpha) & Scoring Rules']
    }
];

class WordTemplateCatalog {
    constructor() {
        this.templates = WORD_TEMPLATES;
    }

    getAllTemplates() {
        return this.templates;
    }

    getTemplateById(id) {
        if (!id) return this.templates[0];
        return this.templates.find(t => t.id === id) || null;
    }

    getTemplatesByCategory(category) {
        if (!category) return this.templates;
        const clean = category.toLowerCase().trim();
        return this.templates.filter(t => t.category.toLowerCase().includes(clean));
    }

    /**
     * Find best matching template from prompt and branding context
     */
    findBestTemplate(prompt = '', branding = null) {
        if (!prompt && !branding) return this.templates[0];

        const lower = (prompt || '').toLowerCase();

        // 1. If institutional / college context detected
        if (branding && branding.isInstitutional) {
            if (lower.includes('naac') || lower.includes('ssr') || lower.includes('accreditation') || lower.includes('nba')) {
                return this.getTemplateById('college_naac_ssr_report');
            }
            if (lower.includes('syllabus') || lower.includes('curriculum') || lower.includes('course')) {
                return this.getTemplateById('college_curriculum_syllabus');
            }
            if (lower.includes('project') || lower.includes('capstone') || lower.includes('dissertation')) {
                return this.getTemplateById('college_capstone_project_report');
            }
            if (lower.includes('phd') || lower.includes('proposal') || lower.includes('synopsis')) {
                return this.getTemplateById('college_phd_research_proposal');
            }
            if (lower.includes('lab') || lower.includes('manual') || lower.includes('experiment')) {
                return this.getTemplateById('college_lab_manual');
            }
            if (lower.includes('fdp') || lower.includes('workshop') || lower.includes('brochure')) {
                return this.getTemplateById('college_fdp_workshop_brochure');
            }
            if (lower.includes('bos') || lower.includes('board of studies') || lower.includes('minutes')) {
                return this.getTemplateById('college_bos_minutes');
            }
            if (lower.includes('mou') || lower.includes('agreement') || lower.includes('memorandum')) {
                return this.getTemplateById('college_mou_agreement');
            }
            if (lower.includes('bonafide') || lower.includes('lor') || lower.includes('recommendation')) {
                return this.getTemplateById('college_bonafide_lor');
            }
            if (lower.includes('handbook') || lower.includes('conduct') || lower.includes('rules')) {
                return this.getTemplateById('college_student_handbook');
            }
            if (lower.includes('internship') || lower.includes('industrial training')) {
                return this.getTemplateById('college_internship_report');
            }
            // Default college report
            return this.getTemplateById('college_annual_report');
        }

        // 2. Exact or near keyword matching across all templates
        for (const t of this.templates) {
            const tWords = t.name.toLowerCase().split(/\s+/).concat(t.id.split('_'));
            let matchCount = 0;
            for (const w of tWords) {
                if (w.length > 3 && lower.includes(w)) matchCount++;
            }
            if (matchCount >= 2) return t;
        }

        // 3. Category matching
        if (lower.includes('rfp') || lower.includes('bid') || lower.includes('proposal')) {
            return this.getTemplateById('corp_enterprise_rfp_proposal');
        }
        if (lower.includes('business plan') || lower.includes('financial model')) {
            return this.getTemplateById('corp_business_plan');
        }
        if (lower.includes('nda') || lower.includes('non disclosure') || lower.includes('confidentiality')) {
            return this.getTemplateById('legal_non_disclosure_agreement');
        }
        if (lower.includes('employment') || lower.includes('offer letter') || lower.includes('contract')) {
            return this.getTemplateById('legal_employment_agreement');
        }
        if (lower.includes('architecture') || lower.includes('system design') || lower.includes('sad')) {
            return this.getTemplateById('tech_software_architecture_doc');
        }
        if (lower.includes('api') || lower.includes('endpoints') || lower.includes('rest')) {
            return this.getTemplateById('tech_api_reference_spec');
        }
        if (lower.includes('clinical') || lower.includes('trial') || lower.includes('patient') || lower.includes('medical')) {
            return this.getTemplateById('sci_clinical_trial_protocol');
        }
        if (lower.includes('ieee') || lower.includes('journal') || lower.includes('paper') || lower.includes('manuscript')) {
            return this.getTemplateById('pub_ieee_journal_manuscript');
        }
        if (lower.includes('whitepaper') || lower.includes('white paper')) {
            return this.getTemplateById('pub_technical_whitepaper');
        }

        return this.templates[0]; // Default
    }

    /**
     * AI Word Document Template & Keyword Suggestion Engine
     */
    suggestTemplateWithKeywords(prompt = '', branding = null) {
        const template = this.findBestTemplate(prompt, branding);
        const lower = (prompt || '').toLowerCase();

        const keywords = [];
        if (lower.includes('legal') || lower.includes('agreement') || lower.includes('contract') || lower.includes('nda')) {
            keywords.push('Governing Law', 'Severability', 'Indemnification & Liability', 'Confidential Information');
        }
        if (lower.includes('tech') || lower.includes('srs') || lower.includes('architecture') || lower.includes('api')) {
            keywords.push('Functional Requirements', 'System Architecture Diagram', 'Data Schema Specification', 'Security Threat Modeling');
        }
        if (lower.includes('college') || lower.includes('academic') || lower.includes('education') || lower.includes('syllabus') || lower.includes('curriculum')) {
            keywords.push('Course Prerequisites', 'Weekly Pedagogical Plan', 'Evaluation Scheme & Grading', 'Reference Textbooks');
        }
        if (keywords.length === 0) {
            keywords.push('Executive Summary', 'Operational Scope', 'Standard Operating Procedures', 'Compliance & Review Schedule');
        }

        return {
            templateId: template.id,
            templateName: template.name,
            category: template.category,
            suggestedKeywords: keywords,
            description: template.description,
            alignedSections: [
                '1. Executive Summary & Objective',
                '2. Core Definitions & Scope',
                '3. Technical Specifications / Operational Terms',
                '4. Risk Mitigation & Compliance Framework',
                '5. Conclusion & Formal Approvals'
            ]
        };
    }
}

module.exports = new WordTemplateCatalog();
