/**
 * CODEZ48 PILOT 100+ POWERPOINT PRESENTATION TEMPLATES CATALOG
 * Exhaustive collection of over 100 distinct presentation templates
 * spanning Higher Education / Colleges, Corporate Strategy, Engineering,
 * Startup Pitch Decks, Medical Research, and Creative Portfolios.
 */

const PPT_TEMPLATES = [
    // =========================================================================
    // FLAGSHIP EXECUTIVE SUITE (TIER 3 PROFIT-ORIENTED - USER EXCLUSIVE)
    // =========================================================================
    {
        id: 'executive_chevron_orange',
        name: 'Executive Chevron Orange & Charcoal Suite (9-Slide Strategic Business Deck)',
        category: 'Corporate Strategy & Governance',
        recommendedTheme: 'EXECUTIVE_CHEVRON_ORANGE',
        planTier: 'TIER_3_PROFIT_ORIENTED',
        collegeBranding: false,
        defaultSlideCount: 9,
        colors: {
            primary: '#F58220',
            dark: '#1E252B',
            secondary: '#303A42',
            bg: '#FFFFFF'
        },
        slideMockups: [
            { slideNum: 1, type: 'chevron_title', title: 'BUSINESS SLIDE', layout: 'chevron_cutout_right' },
            { slideNum: 2, type: 'about_company', title: 'ABOUT COMPANY', layout: 'chevron_divider_3badges' },
            { slideNum: 3, type: 'mission_vision', title: 'OUR MISSION / OUR VISION', layout: 'split_capsules' },
            { slideNum: 4, type: 'services', title: 'OUR COMPANY SERVICES', layout: 'curved_panel_4cards' },
            { slideNum: 5, type: 'team', title: 'OUR CREATIVE TEAM', layout: '4_hexagons_slate' },
            { slideNum: 6, type: 'chart', title: 'BUSINESS CHART', layout: 'stacked_column_chart_4years' },
            { slideNum: 7, type: 'pricing', title: 'OUR PRICE TABLE', layout: '3_pricing_cards' },
            { slideNum: 8, type: 'clients', title: 'OUR TRUSTED CLIENT', layout: 'diagonal_split_testimonials' },
            { slideNum: 9, type: 'contact', title: 'GET IN TOUCH!', layout: 'closing_contact_chevron' }
        ],
        description: 'Flagship executive deck featuring vibrant orange chevron geometry, 4-hexagon creative team cards, dual capsule mission/vision, curved service panels, stacked column charts, and 3-tier pricing tables.'
    },
    // =========================================================================
    // CATEGORY 1: HIGHER EDUCATION, COLLEGES & UNIVERSITIES (Templates 1 - 25)
    // =========================================================================
    {
        id: 'college_naac_accreditation',
        name: 'College Accreditation & Assessment Defense (NAAC / NBA / ABET)',
        category: 'Higher Education & Colleges',
        recommendedTheme: 'EDUCATIONAL',
        collegeBranding: true,
        defaultSlideCount: 20,
        description: 'Comprehensive institutional defense deck covering curricular aspects, teaching-learning, research metrics, student support, and governance.'
    },
    {
        id: 'college_annual_academic_review',
        name: 'University Annual Academic & Financial Review',
        category: 'Higher Education & Colleges',
        recommendedTheme: 'CORPORATE',
        collegeBranding: true,
        defaultSlideCount: 18,
        description: 'Annual progress report on enrollment, academic results, faculty publications, funded research grants, and infrastructure development.'
    },
    {
        id: 'college_placement_brochure',
        name: 'Campus Placement & Corporate Recruitment Pitch',
        category: 'Higher Education & Colleges',
        recommendedTheme: 'PITCH',
        collegeBranding: true,
        defaultSlideCount: 16,
        description: 'Showcase of graduating batch demographics, technical skill matrices, previous recruiters, internship highlights, and placement policies.'
    },
    {
        id: 'college_tech_symposium',
        name: 'Department National Technical Symposium & Hackathon',
        category: 'Higher Education & Colleges',
        recommendedTheme: 'TECHNICAL',
        collegeBranding: true,
        defaultSlideCount: 15,
        description: 'Event overview, keynote speakers, technical tracks, competitive hackathon problem statements, judging rubrics, and sponsor benefits.'
    },
    {
        id: 'college_capstone_defense',
        name: 'Final Year Engineering Capstone Project Defense',
        category: 'Higher Education & Colleges',
        recommendedTheme: 'TECHNICAL',
        collegeBranding: true,
        defaultSlideCount: 18,
        description: 'Formal student project defense: problem statement, literature review, architecture, implementation, test cases, results, and conclusion.'
    },
    {
        id: 'college_phd_viva_defense',
        name: 'Ph.D. Doctoral Dissertation Viva Voce Defense',
        category: 'Higher Education & Colleges',
        recommendedTheme: 'EDUCATIONAL',
        collegeBranding: true,
        defaultSlideCount: 25,
        description: 'Rigorous doctoral thesis defense: research novelty, theoretical framework, methodology, experimental findings, publications, and future scope.'
    },
    {
        id: 'college_freshers_orientation',
        name: 'College Freshers Induction & Campus Orientation',
        category: 'Higher Education & Colleges',
        recommendedTheme: 'CREATIVE',
        collegeBranding: true,
        defaultSlideCount: 16,
        description: 'Welcoming first-year students: college heritage, academic calendar, campus rules, anti-ragging policies, clubs, and student welfare.'
    },
    {
        id: 'college_board_of_studies',
        name: 'Autonomous College Board of Studies (BOS) Curriculum Revision',
        category: 'Higher Education & Colleges',
        recommendedTheme: 'CORPORATE',
        collegeBranding: true,
        defaultSlideCount: 16,
        description: 'Detailed syllabus revision, credit distribution, elective basket offerings, industry feedback integration, and course outcome mappings.'
    },
    {
        id: 'college_faculty_fdp',
        name: 'Faculty Development Program (FDP) & Pedagogy Workshop',
        category: 'Higher Education & Colleges',
        recommendedTheme: 'EDUCATIONAL',
        collegeBranding: true,
        defaultSlideCount: 15,
        description: 'Pedagogical training on Outcome-Based Education (OBE), modern teaching tools, research grant writing, and academic publishing ethics.'
    },
    {
        id: 'college_research_grant_proposal',
        name: 'Government & Industrial Funded Research Grant Proposal',
        category: 'Higher Education & Colleges',
        recommendedTheme: 'TECHNICAL',
        collegeBranding: true,
        defaultSlideCount: 18,
        description: 'Research grant pitch: objective, socio-economic impact, methodology, budget breakdown, milestones, and deliverable timeline.'
    },
    {
        id: 'college_iqac_audit',
        name: 'Internal Quality Assurance Cell (IQAC) Audit Report',
        category: 'Higher Education & Colleges',
        recommendedTheme: 'DATA_DRIVEN',
        collegeBranding: true,
        defaultSlideCount: 16,
        description: 'Academic audit findings, student-teacher ratio, attainment of CO-PO metrics, feedback analysis, and action taken reports.'
    },
    {
        id: 'college_innovation_incubation',
        name: 'Campus Startup Incubation & Entrepreneurship Cell (E-Cell)',
        category: 'Higher Education & Colleges',
        recommendedTheme: 'PITCH',
        collegeBranding: true,
        defaultSlideCount: 15,
        description: 'Incubation facilities, seed fund allocation, student-led startups, patent filings, mentor networks, and prototype showcase.'
    },
    {
        id: 'college_convocation_ceremony',
        name: 'Annual College Convocation & Graduation Address',
        category: 'Higher Education & Colleges',
        recommendedTheme: 'EXECUTIVE_LUXURY',
        collegeBranding: true,
        defaultSlideCount: 12,
        description: 'Ceremonial presentation: presidential address, gold medalists, department rank holders, degree conferral order, and pledge.'
    },
    {
        id: 'college_alumni_global_meet',
        name: 'Global Alumni Association Annual Reunion & Fundraising',
        category: 'Higher Education & Colleges',
        recommendedTheme: 'CREATIVE',
        collegeBranding: true,
        defaultSlideCount: 14,
        description: 'Celebrating alumni achievements, endowment fund status, student mentorship programs, global chapter updates, and networking gala.'
    },
    {
        id: 'college_cultural_sports_fest',
        name: 'Inter-Collegiate Cultural & Sports Extravaganza',
        category: 'Higher Education & Colleges',
        recommendedTheme: 'CREATIVE',
        collegeBranding: true,
        defaultSlideCount: 14,
        description: 'Mega-fest prospectus: competition categories, celebrity performers, schedule, prize pool, rulebook, and sponsorship packages.'
    },
    {
        id: 'college_medical_case_conference',
        name: 'Medical College Clinical Grand Rounds & Case Conference',
        category: 'Higher Education & Colleges',
        recommendedTheme: 'TECHNICAL',
        collegeBranding: true,
        defaultSlideCount: 20,
        description: 'Clinical case presentation: patient history, physical examination, diagnostic investigations, differential diagnosis, and management.'
    },
    {
        id: 'college_pharmacy_drug_seminar',
        name: 'College of Pharmacy Novel Drug Delivery Seminar',
        category: 'Higher Education & Colleges',
        recommendedTheme: 'TECHNICAL',
        collegeBranding: true,
        defaultSlideCount: 18,
        description: 'Pharmacokinetics, molecular formulation, clinical safety trials, bio-availability data, and therapeutic application analysis.'
    },
    {
        id: 'college_law_moot_court',
        name: 'Law School National Moot Court Competition Briefing',
        category: 'Higher Education & Colleges',
        recommendedTheme: 'CORPORATE',
        collegeBranding: true,
        defaultSlideCount: 15,
        description: 'Moot problem proposition, statutory provisions, constitutional law precedents, submission guidelines, and memorial evaluation criteria.'
    },
    {
        id: 'college_mba_case_study',
        name: 'Business School (MBA) Harvard Case Study Analysis',
        category: 'Higher Education & Colleges',
        recommendedTheme: 'CORPORATE',
        collegeBranding: true,
        defaultSlideCount: 18,
        description: 'Business case breakdown: industry macro-environment, SWOT, Porter\'s 5 forces, financial ratios, strategic alternatives, and recommendations.'
    },
    {
        id: 'college_architecture_thesis',
        name: 'Architecture & Design Urban Planning Thesis Review',
        category: 'Higher Education & Colleges',
        recommendedTheme: 'CREATIVE',
        collegeBranding: true,
        defaultSlideCount: 22,
        description: 'Site analysis, zoning laws, conceptual sketches, spatial programming, 3D renderings, material selection, and sustainability metrics.'
    },
    {
        id: 'college_polytechnic_skills',
        name: 'Polytechnic Diploma Technical Skill Showcase',
        category: 'Higher Education & Colleges',
        recommendedTheme: 'TECHNICAL',
        collegeBranding: true,
        defaultSlideCount: 14,
        description: 'Vocational training, CAD/CAM machining, electrical circuit wiring, workshop safety, industry apprenticeship, and live prototypes.'
    },
    {
        id: 'college_agricultural_summit',
        name: 'Agricultural College Sustainable Farming & AgTech Summit',
        category: 'Higher Education & Colleges',
        recommendedTheme: 'EDUCATIONAL',
        collegeBranding: true,
        defaultSlideCount: 16,
        description: 'Precision farming, drip irrigation, organic pest management, drone soil analysis, crop yield economics, and farmer outreach.'
    },
    {
        id: 'college_nep_curriculum',
        name: 'National Education Policy (NEP 2020) Institutional Framework',
        category: 'Higher Education & Colleges',
        recommendedTheme: 'EDUCATIONAL',
        collegeBranding: true,
        defaultSlideCount: 18,
        description: 'Multidisciplinary credit framework, multiple entry-exit pathways, skill enhancement courses, Academic Bank of Credits (ABC) compliance.'
    },
    {
        id: 'college_social_outreach_nss',
        name: 'College NSS & Social Outreach Rural Immersion Camp',
        category: 'Higher Education & Colleges',
        recommendedTheme: 'CREATIVE',
        collegeBranding: true,
        defaultSlideCount: 14,
        description: 'Community service initiatives: village health camps, digital literacy drives, environmental cleanliness, and impact assessment.'
    },
    {
        id: 'college_mou_industry_partnership',
        name: 'Industry-Academia Memorandum of Understanding (MoU) Signing',
        category: 'Higher Education & Colleges',
        recommendedTheme: 'CORPORATE',
        collegeBranding: true,
        defaultSlideCount: 12,
        description: 'Partnership scope: joint R&D projects, student internships, faculty sabbatical training, curriculum co-creation, and center of excellence.'
    },

    // =========================================================================
    // CATEGORY 2: CORPORATE STRATEGY, LEADERSHIP & BOARDROOM (Templates 26 - 45)
    // =========================================================================
    {
        id: 'corp_executive_luxury',
        name: 'Executive Luxury Boardroom Strategy Deck',
        category: 'Corporate Strategy & Boardroom',
        recommendedTheme: 'EXECUTIVE_LUXURY',
        collegeBranding: false,
        defaultSlideCount: 20,
        description: 'Ultra-premium dark obsidian & champagne gold deck for CEO briefings, board meetings, and high-stakes M&A proposals.'
    },
    {
        id: 'corp_quarterly_business_review',
        name: 'Quarterly Business Review (QBR) & Performance Deck',
        category: 'Corporate Strategy & Boardroom',
        recommendedTheme: 'DATA_DRIVEN',
        collegeBranding: false,
        defaultSlideCount: 18,
        description: 'Executive KPI tracking, revenue growth, customer acquisition costs, churn rates, operating margin analysis, and next quarter OKRs.'
    },
    {
        id: 'corp_annual_strategic_roadmap',
        name: '5-Year Enterprise Vision & Strategic Roadmap',
        category: 'Corporate Strategy & Boardroom',
        recommendedTheme: 'CORPORATE',
        collegeBranding: false,
        defaultSlideCount: 22,
        description: 'Long-term corporate goals, market expansion vectors, technological modernization pillars, and organizational talent strategy.'
    },
    {
        id: 'corp_mergers_acquisitions',
        name: 'Mergers & Acquisitions (M&A) Due Diligence & Valuation',
        category: 'Corporate Strategy & Boardroom',
        recommendedTheme: 'EXECUTIVE_LUXURY',
        collegeBranding: false,
        defaultSlideCount: 20,
        description: 'Target company profile, synergy modeling, DCF financial valuation, regulatory clearances, integration risks, and deal terms.'
    },
    {
        id: 'corp_digital_transformation',
        name: 'Enterprise Digital Transformation Blueprint',
        category: 'Corporate Strategy & Boardroom',
        recommendedTheme: 'TECHNICAL',
        collegeBranding: false,
        defaultSlideCount: 18,
        description: 'Legacy system sunsetting, cloud adoption timeline, automated business processes, data lake architecture, and change management.'
    },
    {
        id: 'corp_esg_sustainability',
        name: 'Corporate ESG & Net-Zero Sustainability Report',
        category: 'Corporate Strategy & Boardroom',
        recommendedTheme: 'EDUCATIONAL',
        collegeBranding: false,
        defaultSlideCount: 16,
        description: 'Environmental impact, carbon footprint reduction milestones, diversity & inclusion metrics, corporate governance, and green audits.'
    },
    {
        id: 'corp_crisis_management',
        name: 'Executive Crisis Management & Business Continuity Plan',
        category: 'Corporate Strategy & Boardroom',
        recommendedTheme: 'CORPORATE',
        collegeBranding: false,
        defaultSlideCount: 14,
        description: 'Incident severity matrix, immediate response protocols, stakeholder communications, brand reputation defense, and business continuity.'
    },
    {
        id: 'corp_product_launch',
        name: 'Flagship Enterprise Product Go-To-Market (GTM) Deck',
        category: 'Corporate Strategy & Boardroom',
        recommendedTheme: 'PITCH',
        collegeBranding: false,
        defaultSlideCount: 18,
        description: 'Product positioning, ICP customer personas, competitive pricing tiers, omnichannel marketing blitz, and sales enablement strategy.'
    },
    {
        id: 'corp_sales_enablement',
        name: 'Enterprise B2B Sales Enablement & Playbook',
        category: 'Corporate Strategy & Boardroom',
        recommendedTheme: 'CORPORATE',
        collegeBranding: false,
        defaultSlideCount: 16,
        description: 'Discovery call scripts, objection handling battlecards, enterprise value calculators, case studies, and closing incentives.'
    },
    {
        id: 'corp_operations_optimization',
        name: 'Supply Chain & Operational Efficiency Audit',
        category: 'Corporate Strategy & Boardroom',
        recommendedTheme: 'DATA_DRIVEN',
        collegeBranding: false,
        defaultSlideCount: 16,
        description: 'Inventory turnover ratios, bottleneck diagnosis, vendor SLA performance, logistics cost reduction, and Six Sigma milestones.'
    },
    {
        id: 'corp_hr_talent_retention',
        name: 'Global Talent Acquisition & Employee Retention Strategy',
        category: 'Corporate Strategy & Boardroom',
        recommendedTheme: 'CORPORATE',
        collegeBranding: false,
        defaultSlideCount: 15,
        description: 'Talent pipeline health, competitive compensation benchmarking, leadership development tracks, and employee engagement surveys.'
    },
    {
        id: 'corp_investor_relations',
        name: 'Annual General Meeting (AGM) Investor Relations Deck',
        category: 'Corporate Strategy & Boardroom',
        recommendedTheme: 'EXECUTIVE_LUXURY',
        collegeBranding: false,
        defaultSlideCount: 22,
        description: 'Audited financial statements, EBITDA margin expansion, dividend announcements, share price performance, and board resolutions.'
    },
    {
        id: 'corp_customer_success',
        name: 'Customer Success & Net Promoter Score (NPS) Analysis',
        category: 'Corporate Strategy & Boardroom',
        recommendedTheme: 'DATA_DRIVEN',
        collegeBranding: false,
        defaultSlideCount: 14,
        description: 'Customer health scoring, onboarding time-to-value, net retention rate (NRR), customer feedback sentiment, and expansion playbook.'
    },
    {
        id: 'corp_procurement_vendor',
        name: 'Strategic Procurement & Global Vendor Selection',
        category: 'Corporate Strategy & Boardroom',
        recommendedTheme: 'CORPORATE',
        collegeBranding: false,
        defaultSlideCount: 14,
        description: 'RFP evaluation scorecard, total cost of ownership (TCO), supplier risk mitigation, contract negotiation parameters, and compliance.'
    },
    {
        id: 'corp_brand_repositioning',
        name: 'Global Brand Identity & Market Repositioning Strategy',
        category: 'Corporate Strategy & Boardroom',
        recommendedTheme: 'CREATIVE',
        collegeBranding: false,
        defaultSlideCount: 16,
        description: 'Brand equity assessment, consumer perception gap, updated brand archetype, visual identity revamp, and transition timeline.'
    },
    {
        id: 'corp_compliance_governance',
        name: 'Regulatory Compliance & Corporate Governance Framework',
        category: 'Corporate Strategy & Boardroom',
        recommendedTheme: 'CORPORATE',
        collegeBranding: false,
        defaultSlideCount: 15,
        description: 'Sarbanes-Oxley (SOX), GDPR compliance, whistleblower mechanism, anti-corruption policies, and internal audit findings.'
    },
    {
        id: 'corp_internal_townhall',
        name: 'All-Hands Company Townhall & Milestone Celebration',
        category: 'Corporate Strategy & Boardroom',
        recommendedTheme: 'CREATIVE',
        collegeBranding: false,
        defaultSlideCount: 14,
        description: 'Company-wide updates, team shoutouts, product demo previews, cultural highlights, and interactive live Q&A session.'
    },
    {
        id: 'corp_pricing_strategy',
        name: 'SaaS & Enterprise Value-Based Pricing Strategy',
        category: 'Corporate Strategy & Boardroom',
        recommendedTheme: 'DATA_DRIVEN',
        collegeBranding: false,
        defaultSlideCount: 15,
        description: 'Price elasticity curves, competitor pricing matrices, packaging tiers, feature gating thresholds, and revenue upside modeling.'
    },
    {
        id: 'corp_franchise_expansion',
        name: 'Franchise Partner Expansion & Business Opportunity',
        category: 'Corporate Strategy & Boardroom',
        recommendedTheme: 'PITCH',
        collegeBranding: false,
        defaultSlideCount: 16,
        description: 'Franchise unit economics, initial capex breakdown, marketing support, territory exclusivity, and projected ROI horizons.'
    },
    {
        id: 'corp_venture_capital_fund',
        name: 'Corporate Venture Capital (CVC) Strategic Investment Fund',
        category: 'Corporate Strategy & Boardroom',
        recommendedTheme: 'EXECUTIVE_LUXURY',
        collegeBranding: false,
        defaultSlideCount: 18,
        description: 'Strategic investment thesis, emerging tech deal flow, portfolio synergy with parent company, and follow-on reserve modeling.'
    },

    // =========================================================================
    // CATEGORY 3: TECHNOLOGY, CLOUD & SOFTWARE ENGINEERING (Templates 46 - 65)
    // =========================================================================
    {
        id: 'tech_ai_ml_architecture',
        name: 'Generative AI & LLM Systems Production Architecture',
        category: 'Technology & Software Engineering',
        recommendedTheme: 'TECHNICAL',
        collegeBranding: false,
        defaultSlideCount: 20,
        description: 'Foundation model selection, RAG vector pipeline, fine-tuning infrastructure, latency optimizations, and safety guardrails.'
    },
    {
        id: 'tech_cloud_migration_aws',
        name: 'Multi-Cloud Migration & Hybrid Cloud Architecture',
        category: 'Technology & Software Engineering',
        recommendedTheme: 'TECHNICAL',
        collegeBranding: false,
        defaultSlideCount: 18,
        description: 'Lift-and-shift vs refactor strategy, Kubernetes cluster sizing, database replication, networking VPC peering, and cost forecast.'
    },
    {
        id: 'tech_cybersecurity_incident',
        name: 'Cybersecurity Threat Intelligence & SOC Incident Report',
        category: 'Technology & Software Engineering',
        recommendedTheme: 'CORPORATE',
        collegeBranding: false,
        defaultSlideCount: 16,
        description: 'Zero-trust architecture, threat vector analysis, MITRE ATT&CK mapping, incident response forensics, and patching checklist.'
    },
    {
        id: 'tech_devops_ci_cd',
        name: 'DevSecOps Automation & Continuous Deployment Pipeline',
        category: 'Technology & Software Engineering',
        recommendedTheme: 'TECHNICAL',
        collegeBranding: false,
        defaultSlideCount: 16,
        description: 'GitOps workflow, static code analysis (SAST), automated container vulnerability scans, canary deployments, and MTTR telemetry.'
    },
    {
        id: 'tech_microservices_event_driven',
        name: 'Event-Driven Microservices Architecture (Kafka / RabbitMQ)',
        category: 'Technology & Software Engineering',
        recommendedTheme: 'TECHNICAL',
        collegeBranding: false,
        defaultSlideCount: 18,
        description: 'Domain-Driven Design (DDD), distributed saga transactions, event sourcing, circuit breakers, and distributed tracing with OpenTelemetry.'
    },
    {
        id: 'tech_blockchain_smart_contracts',
        name: 'Enterprise Blockchain & Web3 Smart Contract Protocol',
        category: 'Technology & Software Engineering',
        recommendedTheme: 'TECHNICAL',
        collegeBranding: false,
        defaultSlideCount: 18,
        description: 'Consensus mechanisms, smart contract security audits, gas optimization, decentralized oracle integration, and tokenomics.'
    },
    {
        id: 'tech_data_engineering_lakehouse',
        name: 'Modern Data Stack & Snowflake / Databricks Lakehouse',
        category: 'Technology & Software Engineering',
        recommendedTheme: 'DATA_DRIVEN',
        collegeBranding: false,
        defaultSlideCount: 16,
        description: 'ETL/ELT pipelines, dbt data modeling, medallion architecture (Bronze/Silver/Gold), data governance, and BI reporting.'
    },
    {
        id: 'tech_iot_edge_computing',
        name: 'Industrial IoT (IIoT) & Edge Computing Ecosystem',
        category: 'Technology & Software Engineering',
        recommendedTheme: 'TECHNICAL',
        collegeBranding: false,
        defaultSlideCount: 16,
        description: 'Sensor data ingestion via MQTT, edge inferencing, telemetry monitoring, predictive maintenance algorithms, and hardware specs.'
    },
    {
        id: 'tech_quantum_computing',
        name: 'Quantum Computing Algorithms & Cryptographic Impact',
        category: 'Technology & Software Engineering',
        recommendedTheme: 'TECHNICAL',
        collegeBranding: false,
        defaultSlideCount: 16,
        description: 'Qubits, quantum superposition, Shor\'s algorithm, post-quantum cryptography (PQC), and commercial application horizons.'
    },
    {
        id: 'tech_api_gateway_developer_portal',
        name: 'Enterprise API Gateway & Developer Ecosystem Strategy',
        category: 'Technology & Software Engineering',
        recommendedTheme: 'TECHNICAL',
        collegeBranding: false,
        defaultSlideCount: 15,
        description: 'REST vs GraphQL vs gRPC, rate-limiting policies, OAuth2 security, SDK generation, and developer onboarding experience.'
    },
    {
        id: 'tech_robotics_automation_ros',
        name: 'Autonomous Robotics & ROS2 Control Systems',
        category: 'Technology & Software Engineering',
        recommendedTheme: 'TECHNICAL',
        collegeBranding: false,
        defaultSlideCount: 18,
        description: 'Kinematics, SLAM navigation, LIDAR perception, computer vision obstacle avoidance, and industrial factory automation.'
    },
    {
        id: 'tech_frontend_design_system',
        name: 'Next.js & Design System Component Architecture',
        category: 'Technology & Software Engineering',
        recommendedTheme: 'CREATIVE',
        collegeBranding: false,
        defaultSlideCount: 16,
        description: 'Atomic design hierarchy, accessibility (WCAG AAA), state management patterns, Core Web Vitals optimization, and storybook specs.'
    },
    {
        id: 'tech_database_sharding_nosql',
        name: 'High-Scale Distributed Database Sharding & Partitioning',
        category: 'Technology & Software Engineering',
        recommendedTheme: 'TECHNICAL',
        collegeBranding: false,
        defaultSlideCount: 16,
        description: 'CAP theorem tradeoffs, consistent hashing, multi-region active-active replication, indexing strategies, and failover.'
    },
    {
        id: 'tech_computer_vision_deep_learning',
        name: 'Deep Learning Computer Vision & YOLO Object Detection',
        category: 'Technology & Software Engineering',
        recommendedTheme: 'TECHNICAL',
        collegeBranding: false,
        defaultSlideCount: 18,
        description: 'CNN architectures, synthetic dataset augmentation, mAP benchmark scoring, ONNX runtime deployment, and edge camera FPS.'
    },
    {
        id: 'tech_ar_vr_spatial_computing',
        name: 'Spatial Computing & AR/VR Simulation Systems',
        category: 'Technology & Software Engineering',
        recommendedTheme: 'CREATIVE',
        collegeBranding: false,
        defaultSlideCount: 16,
        description: 'Spatial audio, 6-DoF tracking, Unity/Unreal real-time rendering, haptic feedback integration, and medical/industrial simulation.'
    },
    {
        id: 'tech_nlp_speech_recognition',
        name: 'Speech-to-Text & Voice AI Conversational Intelligence',
        category: 'Technology & Software Engineering',
        recommendedTheme: 'TECHNICAL',
        collegeBranding: false,
        defaultSlideCount: 16,
        description: 'Whisper architecture, real-time audio chunking, phonetic alignment, emotional tone analysis, and multilingual localization.'
    },
    {
        id: 'tech_green_software_engineering',
        name: 'Green Software Engineering & Carbon-Efficient Algorithms',
        category: 'Technology & Software Engineering',
        recommendedTheme: 'EDUCATIONAL',
        collegeBranding: false,
        defaultSlideCount: 14,
        description: 'SCI (Software Carbon Intensity) metrics, carbon-aware cloud scheduling, idle resource pruning, and efficient compilers.'
    },
    {
        id: 'tech_5g_telecom_network_slicing',
        name: '5G Core Network Slicing & Private Cellular Infrastructure',
        category: 'Technology & Software Engineering',
        recommendedTheme: 'TECHNICAL',
        collegeBranding: false,
        defaultSlideCount: 16,
        description: 'Open RAN architecture, ultra-reliable low latency communication (URLLC), network functions virtualization (NFV), and spectrum.'
    },
    {
        id: 'tech_autonomous_vehicles_perception',
        name: 'Autonomous Driving Perception & Sensor Fusion Architecture',
        category: 'Technology & Software Engineering',
        recommendedTheme: 'TECHNICAL',
        collegeBranding: false,
        defaultSlideCount: 20,
        description: 'Camera-Radar-LIDAR fusion, Kalman filters, behavioral path planning, safety redundancy layers, and ISO 26262 compliance.'
    },
    {
        id: 'tech_site_reliability_sre',
        name: 'Site Reliability Engineering (SRE) & Chaos Engineering Deck',
        category: 'Technology & Software Engineering',
        recommendedTheme: 'DATA_DRIVEN',
        collegeBranding: false,
        defaultSlideCount: 16,
        description: 'SLO/SLA error budgets, Chaos Monkey failure injection, automated rollback triggers, alerting thresholds, and post-mortems.'
    },

    // =========================================================================
    // CATEGORY 4: STARTUPS & VENTURE CAPITAL PITCH DECKS (Templates 66 - 80)
    // =========================================================================
    {
        id: 'pitch_seed_round_classic',
        name: 'Seed Round Silicon Valley Investor Pitch Deck',
        category: 'Startups & Venture Capital Pitch',
        recommendedTheme: 'PITCH',
        collegeBranding: false,
        defaultSlideCount: 15,
        description: 'Classic 15-slide venture format: Problem, Solution, Market Size (TAM/SAM/SOM), Product Demo, Traction, Business Model, Team, Ask.'
    },
    {
        id: 'pitch_series_a_growth',
        name: 'Series A Growth & Metric-Heavy Investor Pitch',
        category: 'Startups & Venture Capital Pitch',
        recommendedTheme: 'DATA_DRIVEN',
        collegeBranding: false,
        defaultSlideCount: 18,
        description: 'Proven unit economics, cohort retention curves, viral coefficient (K-factor), capital efficiency, and Series A expansion plan.'
    },
    {
        id: 'pitch_fintech_neobank',
        name: 'FinTech Neobank & Next-Gen Payments Pitch Deck',
        category: 'Startups & Venture Capital Pitch',
        recommendedTheme: 'PITCH',
        collegeBranding: false,
        defaultSlideCount: 16,
        description: 'Interchange revenue, regulatory banking licenses, AI credit underwriting, customer acquisition loops, and cross-border remittance.'
    },
    {
        id: 'pitch_b2b_saas_metrics',
        name: 'B2B Enterprise SaaS Investor Deck with Rule of 40',
        category: 'Startups & Venture Capital Pitch',
        recommendedTheme: 'DATA_DRIVEN',
        collegeBranding: false,
        defaultSlideCount: 17,
        description: 'ARR milestones, Rule of 40 calculation, LTV/CAC ratio, net dollar retention (NDR), sales cycle velocity, and pipeline coverage.'
    },
    {
        id: 'pitch_healthtech_telemedicine',
        name: 'HealthTech & AI Telemedicine Diagnostics Pitch',
        category: 'Startups & Venture Capital Pitch',
        recommendedTheme: 'CORPORATE',
        collegeBranding: false,
        defaultSlideCount: 16,
        description: 'Healthcare provider shortage, HIPAA/FDA compliance, remote patient monitoring devices, reimbursement models, and pilot results.'
    },
    {
        id: 'pitch_edtech_gamified_learning',
        name: 'EdTech Adaptive & Gamified Learning Platform Pitch',
        category: 'Startups & Venture Capital Pitch',
        recommendedTheme: 'CREATIVE',
        collegeBranding: false,
        defaultSlideCount: 16,
        description: 'K-12 & professional reskilling market, interactive gamification mechanics, retention rates, B2C subscription + B2B institutional tiers.'
    },
    {
        id: 'pitch_climate_tech_carbon_removal',
        name: 'ClimateTech & Direct Air Carbon Capture Pitch',
        category: 'Startups & Venture Capital Pitch',
        recommendedTheme: 'EDUCATIONAL',
        collegeBranding: false,
        defaultSlideCount: 16,
        description: 'Gigaton-scale carbon removal technology, cost per ton reduction curve, carbon credit market buyers, and plant capex plans.'
    },
    {
        id: 'pitch_ecommerce_d2c_brand',
        name: 'Direct-to-Consumer (D2C) Consumer Brand Pitch',
        category: 'Startups & Venture Capital Pitch',
        recommendedTheme: 'CREATIVE',
        collegeBranding: false,
        defaultSlideCount: 15,
        description: 'Brand storytelling, proprietary manufacturing, gross margins, influencer marketing ROAS, repeat purchase frequency, and retail rollout.'
    },
    {
        id: 'pitch_proptech_real_estate',
        name: 'PropTech AI Real Estate Valuation & Marketplace',
        category: 'Startups & Venture Capital Pitch',
        recommendedTheme: 'CORPORATE',
        collegeBranding: false,
        defaultSlideCount: 16,
        description: 'Fractional property ownership, automated valuation models (AVM), title tokenization, rental yield security, and transaction fee model.'
    },
    {
        id: 'pitch_cybersecurity_saas',
        name: 'Cybersecurity Zero-Day Threat Prevention Pitch',
        category: 'Startups & Venture Capital Pitch',
        recommendedTheme: 'TECHNICAL',
        collegeBranding: false,
        defaultSlideCount: 16,
        description: 'Ransomware epidemic, agentless cloud security posture management (CSPM), proof-of-concept win rates, and enterprise ACV growth.'
    },
    {
        id: 'pitch_logistics_last_mile',
        name: 'Autonomous Last-Mile Delivery & Micro-Fulfillment Pitch',
        category: 'Startups & Venture Capital Pitch',
        recommendedTheme: 'PITCH',
        collegeBranding: false,
        defaultSlideCount: 15,
        description: 'Delivery cost per parcel, route optimization algorithms, dark store hub networks, carbon emissions reduction, and enterprise partnerships.'
    },
    {
        id: 'pitch_creator_economy_monetization',
        name: 'Creator Economy & Web3 Fan Monetization Platform',
        category: 'Startups & Venture Capital Pitch',
        recommendedTheme: 'CREATIVE',
        collegeBranding: false,
        defaultSlideCount: 15,
        description: 'Community-driven commerce, exclusive subscriber content paywalls, digital merch drops, platform take-rate, and GMV growth.'
    },
    {
        id: 'pitch_gaming_metaverse_studio',
        name: 'AAA Game Studio & Unreal Engine 5 Metaverse Pitch',
        category: 'Startups & Venture Capital Pitch',
        recommendedTheme: 'CREATIVE',
        collegeBranding: false,
        defaultSlideCount: 18,
        description: 'Gameplay mechanics, cinematic world-building, in-game economy, battle pass monetization, live-ops roadmap, and publishing partners.'
    },
    {
        id: 'pitch_agtech_vertical_farming',
        name: 'AgTech Urban Vertical Farming & Controlled Agriculture',
        category: 'Startups & Venture Capital Pitch',
        recommendedTheme: 'EDUCATIONAL',
        collegeBranding: false,
        defaultSlideCount: 16,
        description: 'Hydroponic crop yields, 95% water reduction, LED spectrum optimization, hyper-local grocery distribution, and unit profitability.'
    },
    {
        id: 'pitch_spacetech_satellite_data',
        name: 'SpaceTech Low Earth Orbit (LEO) Geospatial Analytics',
        category: 'Startups & Venture Capital Pitch',
        recommendedTheme: 'TECHNICAL',
        collegeBranding: false,
        defaultSlideCount: 18,
        description: 'Cubesat constellation launch schedule, synthetic aperture radar (SAR), defense and climate monitoring clients, and launch insurance.'
    },

    // =========================================================================
    // CATEGORY 5: SCIENTIFIC RESEARCH & HEALTHCARE (Templates 81 - 90)
    // =========================================================================
    {
        id: 'healthcare_hospital_administration',
        name: 'Multispecialty Hospital & Healthcare Administration Suite',
        category: 'Scientific Research & Healthcare',
        recommendedTheme: 'EXECUTIVE_CHEVRON_ORANGE',
        collegeBranding: false,
        defaultSlideCount: 20,
        colors: {
            primary: '#0EA5E9',
            dark: '#0F172A',
            secondary: '#0D9488',
            bg: '#F8FAFC'
        },
        slideMockups: [
            { slideNum: 1, type: 'chevron_title', title: 'HOSPITAL ADMINISTRATION', layout: 'chevron_cutout_right' },
            { slideNum: 2, type: 'about_company', title: 'ABOUT OUR HOSPITAL', layout: 'chevron_divider_3badges' },
            { slideNum: 3, type: 'mission_vision', title: 'CLINICAL MISSION & VISION', layout: 'split_capsules' },
            { slideNum: 4, type: 'services', title: 'SPECIALTY CLINICAL SERVICES', layout: 'curved_panel_4cards' },
            { slideNum: 5, type: 'team', title: 'SPECIALIST MEDICAL BOARD', layout: '4_hexagons_slate' },
            { slideNum: 6, type: 'chart', title: 'SURGICAL VOLUME & RECOVERY CHART', layout: 'stacked_column_chart_4years' },
            { slideNum: 7, type: 'pricing', title: 'EXECUTIVE HEALTH CHECKUP TIERS', layout: '3_pricing_cards' },
            { slideNum: 8, type: 'clients', title: 'PATIENT RECOVERY TESTIMONIALS', layout: 'diagonal_split_testimonials' },
            { slideNum: 9, type: 'contact', title: 'EMERGENCY APPOINTMENT DESK', layout: 'closing_contact_chevron' }
        ],
        description: 'Comprehensive hospital administration: emergency trauma triage, ICU capacity, robotic surgical wings, JCI/NABH clinical governance, specialist medical board, inpatient recovery metrics, and 24/7 care desk.'
    },
    {
        id: 'sci_clinical_trial_outcomes',
        name: 'Phase III Clinical Trial Outcomes & Efficacy Presentation',
        category: 'Scientific Research & Healthcare',
        recommendedTheme: 'TECHNICAL',
        collegeBranding: true,
        defaultSlideCount: 20,
        description: 'Randomized controlled trial methodology, patient cohorts, primary/secondary endpoints, Kaplan-Meier curves, and safety tolerability.'
    },
    {
        id: 'sci_oncology_immunotherapy',
        name: 'Oncology CAR-T Cell Immunotherapy Research Seminar',
        category: 'Scientific Research & Healthcare',
        recommendedTheme: 'TECHNICAL',
        collegeBranding: true,
        defaultSlideCount: 20,
        description: 'Tumor micro-environment, chimeric antigen receptor engineering, cytokine release syndrome management, and remission durability.'
    },
    {
        id: 'sci_genomics_crispr_editing',
        name: 'Genomic Medicine & CRISPR-Cas9 Gene Editing Symposium',
        category: 'Scientific Research & Healthcare',
        recommendedTheme: 'TECHNICAL',
        collegeBranding: true,
        defaultSlideCount: 18,
        description: 'Targeted base editing, in vivo lipid nanoparticle delivery, off-target cleavage assays, clinical trial patients, and bioethics.'
    },
    {
        id: 'sci_neuroscience_brain_computer',
        name: 'Neuroscience & Brain-Computer Interface (BCI) Systems',
        category: 'Scientific Research & Healthcare',
        recommendedTheme: 'TECHNICAL',
        collegeBranding: true,
        defaultSlideCount: 18,
        description: 'Neural signal spike sorting, micro-electrode arrays, motor cortex decoding algorithms, neuro-prosthetics, and clinical trials.'
    },
    {
        id: 'sci_epidemiology_public_health',
        name: 'Global Public Health & Pandemic Preparedness Framework',
        category: 'Scientific Research & Healthcare',
        recommendedTheme: 'EDUCATIONAL',
        collegeBranding: true,
        defaultSlideCount: 16,
        description: 'Pathogen genomic surveillance, basic reproduction number (R0) modeling, vaccine cold chain logistics, and health equity.'
    },
    {
        id: 'sci_biochemistry_protein_folding',
        name: 'Structural Biochemistry & AlphaFold Protein Dynamics',
        category: 'Scientific Research & Healthcare',
        recommendedTheme: 'TECHNICAL',
        collegeBranding: true,
        defaultSlideCount: 18,
        description: 'Cryo-EM structural validation, conformational state transitions, ligand binding pockets, and de novo computational drug design.'
    },
    {
        id: 'sci_renewable_energy_perovskite',
        name: 'Renewable Materials: Perovskite Solar Cell Efficiency',
        category: 'Scientific Research & Healthcare',
        recommendedTheme: 'EDUCATIONAL',
        collegeBranding: true,
        defaultSlideCount: 16,
        description: 'Photovoltaic tandem efficiency curves, crystal stability degradation assays, roll-to-roll manufacturing, and levelized cost of energy.'
    },
    {
        id: 'sci_marine_biology_ocean_acidification',
        name: 'Marine Biology & Coral Reef Ocean Acidification Study',
        category: 'Scientific Research & Healthcare',
        recommendedTheme: 'EDUCATIONAL',
        collegeBranding: true,
        defaultSlideCount: 16,
        description: 'Aragonite saturation levels, thermal bleaching vulnerability, symbiodiniaceae genomics, marine protected zones, and restoration.'
    },
    {
        id: 'sci_astrophysics_gravitational_waves',
        name: 'Astrophysics & LIGO Gravitational Wave Event Analysis',
        category: 'Scientific Research & Healthcare',
        recommendedTheme: 'TECHNICAL',
        collegeBranding: true,
        defaultSlideCount: 18,
        description: 'Binary neutron star coalescence, strain amplitude spectrograms, kilonova nucleosynthesis, and cosmological Hubble constants.'
    },
    {
        id: 'sci_nanotechnology_materials',
        name: 'Nanotechnology & Graphene Composite Material Defense',
        category: 'Scientific Research & Healthcare',
        recommendedTheme: 'TECHNICAL',
        collegeBranding: true,
        defaultSlideCount: 18,
        description: 'CVD synthesis protocols, tensile strength to weight ratio, electrical conductivity, thermal dissipation, and industrial applications.'
    },

    // =========================================================================
    // CATEGORY 6: CREATIVE, DESIGN, MARKETING & PORTFOLIOS (Templates 91 - 105)
    // =========================================================================
    {
        id: 'creative_brand_guidelines',
        name: 'Comprehensive Brand Identity & Styleguide Showcase',
        category: 'Creative, Design & Portfolios',
        recommendedTheme: 'CREATIVE',
        collegeBranding: false,
        defaultSlideCount: 16,
        description: 'Logo usage clear space, color psychology palettes, typography pairings, imagery tone, icon sets, and brand voice guidelines.'
    },
    {
        id: 'creative_digital_marketing_campaign',
        name: '360° Digital Marketing & Influencer Campaign Strategy',
        category: 'Creative, Design & Portfolios',
        recommendedTheme: 'CREATIVE',
        collegeBranding: false,
        defaultSlideCount: 16,
        description: 'Audience segmentation, creative ad mockups, paid social channel allocation, influencer tiering, UTM tracking, and CPA targets.'
    },
    {
        id: 'creative_ui_ux_case_study',
        name: 'Mobile App UI/UX Redesign & User Testing Case Study',
        category: 'Creative, Design & Portfolios',
        recommendedTheme: 'CREATIVE',
        collegeBranding: false,
        defaultSlideCount: 18,
        description: 'User empathy mapping, wireframe iterations, usability heuristic evaluation, design system tokens, and conversion rate lift.'
    },
    {
        id: 'creative_portfolio_creative_director',
        name: 'Creative Director / Agency Work Portfolio Showcase',
        category: 'Creative, Design & Portfolios',
        recommendedTheme: 'EXECUTIVE_LUXURY',
        collegeBranding: false,
        defaultSlideCount: 16,
        description: 'High-impact case studies, client testimonial quotes, award recognitions (Cannes Lions, D&AD), and creative philosophies.'
    },
    {
        id: 'creative_architectural_monograph',
        name: 'Architectural Monograph & Built Project Showcase',
        category: 'Creative, Design & Portfolios',
        recommendedTheme: 'MINIMAL',
        collegeBranding: false,
        defaultSlideCount: 20,
        description: 'Photographic gallery, spatial blueprints, lighting daylighting studies, material tactility, and client commissioning narrative.'
    },
    {
        id: 'creative_fashion_lookbook',
        name: 'Haute Couture & Seasonal Fashion Collection Lookbook',
        category: 'Creative, Design & Portfolios',
        recommendedTheme: 'MINIMAL',
        collegeBranding: false,
        defaultSlideCount: 16,
        description: 'Textile sourcing origins, collection theme moodboard, runway lookbook photography, retail buyer order sheets, and press release.'
    },
    {
        id: 'creative_film_pitch_deck',
        name: 'Feature Film / Television Series Pitch Deck',
        category: 'Creative, Design & Portfolios',
        recommendedTheme: 'CREATIVE',
        collegeBranding: false,
        defaultSlideCount: 16,
        description: 'Logline, synopsis, character arcs, visual aesthetic lookbook, comparable titles (Comps), production budget, and distribution strategy.'
    },
    {
        id: 'creative_hospitality_boutique_hotel',
        name: 'Luxury Boutique Resort & Hospitality Experience Concept',
        category: 'Creative, Design & Portfolios',
        recommendedTheme: 'EXECUTIVE_LUXURY',
        collegeBranding: false,
        defaultSlideCount: 18,
        description: 'Architectural villas, farm-to-table culinary curation, wellness spa amenities, target guest demographics, and RevPAR projections.'
    },
    {
        id: 'creative_culinary_fine_dining',
        name: 'Michelin Star Fine Dining Restaurant Concept & Menu',
        category: 'Creative, Design & Portfolios',
        recommendedTheme: 'MINIMAL',
        collegeBranding: false,
        defaultSlideCount: 14,
        description: 'Chef\'s tasting menu narrative, wine pairing provenance, interior ambience aesthetics, table turnover metrics, and private dining.'
    },
    {
        id: 'creative_photography_monograph',
        name: 'Fine Art Documentary Photography Exhibition Portfolio',
        category: 'Creative, Design & Portfolios',
        recommendedTheme: 'BW_TEXT',
        collegeBranding: false,
        defaultSlideCount: 20,
        description: 'Curatorial artist statement, high-contrast monochrome prints, archival print specifications, gallery floor plan, and collector catalog.'
    },
    {
        id: 'creative_music_album_rollout',
        name: 'Music Album Release & Global Concert Tour Strategy',
        category: 'Creative, Design & Portfolios',
        recommendedTheme: 'CREATIVE',
        collegeBranding: false,
        defaultSlideCount: 15,
        description: 'Album sonic aesthetic, DSP streaming playlist pitch, music video creative treatment, arena tour dates, and merchandising lines.'
    },
    {
        id: 'creative_publishing_book_proposal',
        name: 'Non-Fiction Trade Book Publishing Proposal & Sample',
        category: 'Creative, Design & Portfolios',
        recommendedTheme: 'CORPORATE',
        collegeBranding: false,
        defaultSlideCount: 15,
        description: 'Target readership demographics, competitive title analysis, author platform reach, chapter-by-chapter outline, and marketing hook.'
    },
    {
        id: 'creative_interior_design_residential',
        name: 'Luxury Residential Interior Design Concept & FF&E',
        category: 'Creative, Design & Portfolios',
        recommendedTheme: 'MINIMAL',
        collegeBranding: false,
        defaultSlideCount: 18,
        description: 'Living, master suite, and culinary layouts, furniture fixtures & equipment (FF&E) schedule, bespoke material palette, and 3D walkthrough.'
    },
    {
        id: 'creative_public_relations_pr_crisis',
        name: 'Strategic Public Relations (PR) & Media Outreach Plan',
        category: 'Creative, Design & Portfolios',
        recommendedTheme: 'CORPORATE',
        collegeBranding: false,
        defaultSlideCount: 15,
        description: 'Tier-1 media targeting (Bloomberg, TechCrunch), executive thought leadership op-eds, press release distribution, and media training.'
    },
    {
        id: 'creative_nonprofit_donor_gala',
        name: 'Nonprofit Philanthropic Gala & Impact Investment Deck',
        category: 'Creative, Design & Portfolios',
        recommendedTheme: 'EDUCATIONAL',
        collegeBranding: false,
        defaultSlideCount: 16,
        description: 'Beneficiary human stories, program efficacy metrics, capital deployment transparency, matching gift challenge, and donor tiers.'
    }
];

class PptTemplateCatalog {
    constructor() {
        this.templates = PPT_TEMPLATES;
    }

    getAllTemplates() {
        return this.templates;
    }

    getCount() {
        return this.templates.length;
    }

    getTemplateById(id) {
        if (!id) return null;
        const clean = id.toLowerCase().trim();
        return this.templates.find(t => t.id === clean || t.id.includes(clean)) || null;
    }

    getCategories() {
        return Array.from(new Set(this.templates.map(t => t.category)));
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
            if (lower.includes('accreditation') || lower.includes('naac') || lower.includes('nba')) {
                return this.getTemplateById('college_naac_accreditation');
            }
            if (lower.includes('placement') || lower.includes('recruit') || lower.includes('job')) {
                return this.getTemplateById('college_placement_brochure');
            }
            if (lower.includes('symposium') || lower.includes('hackathon') || lower.includes('conference')) {
                return this.getTemplateById('college_tech_symposium');
            }
            if (lower.includes('project') || lower.includes('capstone') || lower.includes('final year')) {
                return this.getTemplateById('college_capstone_defense');
            }
            if (lower.includes('phd') || lower.includes('dissertation') || lower.includes('thesis') || lower.includes('viva')) {
                return this.getTemplateById('college_phd_viva_defense');
            }
            if (lower.includes('medical') || lower.includes('clinical') || lower.includes('hospital')) {
                return this.getTemplateById('college_medical_case_conference');
            }
            if (lower.includes('orientation') || lower.includes('freshers') || lower.includes('induction')) {
                return this.getTemplateById('college_freshers_orientation');
            }
            // Default college template
            return this.getTemplateById('college_annual_academic_review');
        }

        // Direct flagship & domain priorities
        if (lower.includes('hospital') || lower.includes('healthcare administration') || lower.includes('patient care') || lower.includes('clinical governance')) {
            return this.getTemplateById('healthcare_hospital_administration') || this.getTemplateById('executive_chevron_orange');
        }
        if (lower.includes('chevron') || lower.includes('slate orange') || lower.includes('executive orange') || lower.includes('business slide')) {
            return this.getTemplateById('executive_chevron_orange');
        }

        // 2. Scored ranking across all 105 templates
        let bestTemplate = null;
        let highestScore = -1;

        for (const t of this.templates) {
            let score = 0;
            const tId = t.id.toLowerCase();
            const tName = t.name.toLowerCase();
            const tCat = t.category.toLowerCase();

            // Direct ID or key phrase match
            if (lower.includes(tId.replace(/_/g, ' ')) || lower.includes(tId)) {
                score += 35;
            }

            // High-affinity domain category scoring
            if ((lower.includes('pitch') || lower.includes('seed') || lower.includes('series a') || lower.includes('investor deck')) && tCat.includes('pitch')) {
                score += 20;
            }
            if ((lower.includes('ai') || lower.includes('ml') || lower.includes('cloud') || lower.includes('software') || lower.includes('devops') || lower.includes('architecture')) && tCat.includes('technology')) {
                score += 20;
            }
            if ((lower.includes('medical') || lower.includes('clinical') || lower.includes('pharma') || lower.includes('healthcare')) && tCat.includes('medical')) {
                score += 20;
            }
            if ((lower.includes('board') || lower.includes('quarterly') || lower.includes('qbr') || lower.includes('investor relations')) && tCat.includes('corporate')) {
                score += 15;
            }
            if ((lower.includes('portfolio') || lower.includes('creative') || lower.includes('branding')) && tCat.includes('creative')) {
                score += 15;
            }

            // Keyword token matches
            const keywords = tName.split(/\s+/).concat(tId.split('_'));
            for (const kw of keywords) {
                if (kw.length > 2 && lower.includes(kw)) {
                    score += 5;
                }
            }

            if (score > highestScore) {
                highestScore = score;
                bestTemplate = t;
            }
        }

        if (bestTemplate && highestScore > 0) {
            return bestTemplate;
        }

        // Dynamic diverse fallback: deterministic distribution across 105 professional templates
        // Ensures distinct presentation topics get distinct layout archetypes and never default to NAAC
        const diversePool = this.templates.filter(t => !t.id.includes('naac') && !t.id.includes('accreditation'));
        if (diversePool.length > 0) {
            let hash = 0;
            for (let i = 0; i < lower.length; i++) {
                hash = ((hash << 5) - hash) + lower.charCodeAt(i);
                hash |= 0;
            }
            const selectedIdx = Math.abs(hash) % diversePool.length;
            return diversePool[selectedIdx];
        }

        return this.templates[0];
    }

    /**
     * AI Template & Keyword Suggestion Engine
     * Analyzes user prompt, resolves best template from 105 catalog,
     * suggests optimal domain keywords, color schemes, and layout alignment.
     */
    suggestTemplateWithKeywords(prompt = '', branding = null) {
        const template = this.findBestTemplate(prompt, branding);
        const lower = (prompt || '').toLowerCase();

        // Extract key domain concepts and AI suggested keywords
        const keywords = [];
        if (lower.includes('ai') || lower.includes('machine learning') || lower.includes('deep learning')) {
            keywords.push('Neural Architecture', 'Model Optimization', 'Inference Telemetry');
        }
        if (lower.includes('college') || lower.includes('education') || lower.includes('academic') || lower.includes('student') || lower.includes('capstone')) {
            keywords.push('Pedagogical Objectives', 'Student Learning Outcomes', 'Outcome-Based Education (OBE)', 'Research Metrics');
        }
        if (lower.includes('cloud') || lower.includes('devops') || lower.includes('server') || lower.includes('kubernetes')) {
            keywords.push('Cloud Architecture', 'Auto-Scaling Infrastructure', 'Continuous Deployment', 'Security Hardening');
        }
        if (lower.includes('business') || lower.includes('pitch') || lower.includes('startup') || lower.includes('investor')) {
            keywords.push('Target Addressable Market (TAM)', 'Competitive Moat', 'Unit Economics & ROI', 'Go-To-Market Execution');
        }
        if (lower.includes('medical') || lower.includes('health') || lower.includes('clinical') || lower.includes('pharma')) {
            keywords.push('Clinical Protocol', 'Double-Blind Efficacy', 'Diagnostic Precision', 'Patient Outcomes');
        }
        if (lower.includes('energy') || lower.includes('green') || lower.includes('solar') || lower.includes('climate')) {
            keywords.push('Decarbonization Roadmap', 'Carbon Abatement', 'Renewable Generation', 'Grid Telemetry');
        }
        if (keywords.length === 0) {
            keywords.push('Strategic Problem Statement', 'Core Value Proposition', 'Multi-Pillar Architecture', 'Execution Milestones');
        }

        // Recommend optimal color palette
        let recommendedColor = 'CORPORATE';
        if (lower.includes('green') || lower.includes('nature') || lower.includes('clean') || lower.includes('eco')) recommendedColor = 'EMERALD_VENTURE';
        else if (lower.includes('blue') || lower.includes('ocean') || lower.includes('cloud') || lower.includes('tech')) recommendedColor = 'COBALT_HORIZON';
        else if (lower.includes('amber') || lower.includes('orange') || lower.includes('warm') || lower.includes('pitch')) recommendedColor = 'SUNSET_AMBER';
        else if (lower.includes('purple') || lower.includes('creative') || lower.includes('amethyst')) recommendedColor = 'ROYAL_AMETHYST';
        else if (lower.includes('red') || lower.includes('crimson') || lower.includes('crisis')) recommendedColor = 'CRIMSON_PULSE';
        else if (lower.includes('minimal') || lower.includes('ivory')) recommendedColor = 'MINIMAL_LIGHT_IVORY';
        else if (lower.includes('luxury') || lower.includes('executive')) recommendedColor = 'EXECUTIVE_LUXURY';
        else if (template.recommendedTheme) recommendedColor = template.recommendedTheme;

        return {
            templateId: template.id,
            templateName: template.name,
            category: template.category,
            recommendedTheme: recommendedColor,
            defaultSlideCount: template.defaultSlideCount || 15,
            suggestedKeywords: keywords,
            description: template.description,
            alignedLayoutArchetypes: [
                'title_slide',
                'three_cards_balanced',
                'kpi_metrics_dashboard',
                'comparison_matrix',
                'roadmap_timeline',
                'summary_takeaways'
            ]
        };
    }
}

module.exports = new PptTemplateCatalog();
