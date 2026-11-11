/**
 * CODEZ48 PILOT INSTITUTIONAL & CORPORATE BRANDING MANAGER
 * Manages institutional identity (Colleges, Universities, Corporate Brands)
 * and incorporates them seamlessly into PowerPoint presentations and Word documents.
 */

const fs = require('fs');
const path = require('path');
const logger = require('../../core/logger');

class BrandingManager {
    constructor() {
        this.activeBranding = null;
    }

    /**
     * Parse institutional / college branding details from user prompt or explicit object
     */
    extractBrandingFromPrompt(prompt = '', userProfile = null) {
        if (!prompt && !userProfile) return null;

        const lower = (prompt || '').toLowerCase();
        const branding = {
            isInstitutional: false,
            institutionName: '',
            department: '',
            collegeLogo: '',
            accreditation: '',
            motto: '',
            academicYear: '2025 - 2026',
            courseCode: '',
            principalOrDean: '',
            themeColor: '#0F2C59', // Deep Academic Navy
            secondaryColor: '#D32F2F', // Crimson / Maroon
            accentColor: '#FFC107'  // Academic Gold
        };

        // 1. Detect college / university / academic institution patterns
        const collegePatterns = [
            /(?:for|at|in|about)\s+([a-zA-Z0-9_\-\s&]+?\s+(?:college|university|institute|academy|polytechnic)(?:\s+of\s+[a-zA-Z0-9_\-\s&]+)?)(?:,|\.|\n|with|department|dept|\s+deck|\s+presentation|\s+document|\s+ppt|$)/i,
            /([a-zA-Z0-9_\-\s&]+?\s+(?:college|university|institute|academy|polytechnic)(?:\s+of\s+[a-zA-Z0-9_\-\s&]+)?)/i,
            /(?:college|university|institute|school|academy|polytechnic)\s+(?:of\s+)?([a-zA-Z0-9_\-\s&]+?)(?:,|\.|\n|for|with|in|\s+deck|\s+presentation|\s+document|\s+ppt|$)/i
        ];

        for (const pat of collegePatterns) {
            const m = prompt.match(pat);
            if (m && m[1]) {
                const name = m[1].trim();
                if (name.length > 3 && !['the', 'this', 'a', 'our', 'my'].includes(name.toLowerCase())) {
                    branding.institutionName = name.replace(/^(?:the|for|our|at)\s+/i, '').trim();
                    branding.isInstitutional = true;
                    break;
                }
            }
        }

        // 2. Department detection
        const deptMatch = prompt.match(/(?:department\s+of|dept(?:\.|\s+of)?)\s+([a-zA-Z0-9_\-\s&]+?)(?:,|\.|\n|\s+(?:at|in|with|for)\s+|$)/i);
        if (deptMatch && deptMatch[1]) {
            branding.department = `Department of ${deptMatch[1].trim()}`;
            branding.isInstitutional = true;
        }

        // 3. Accreditation detection (NAAC, NBA, ABET, NIRF, ISO)
        const accreditMatch = prompt.match(/\b(NAAC\s*(?:[A-Z\+]+)?|NBA|ABET|NIRF\s*(?:Top\s*\d+)?|AICTE|UGC|Autonomous)\b/i);
        if (accreditMatch) {
            branding.accreditation = accreditMatch[0].toUpperCase();
        } else if (branding.isInstitutional) {
            branding.accreditation = "NAAC 'A++' Accredited | Autonomous Institution";
        }

        // 4. Academic year detection
        const yearMatch = prompt.match(/\b(20\d\d\s*[-–]\s*20?\d\d)\b/);
        if (yearMatch) {
            branding.academicYear = yearMatch[1];
        }

        // 5. Course / Subject code detection
        const courseMatch = prompt.match(/\b([A-Z]{2,4}\s*\d{3,4})\b/);
        if (courseMatch) {
            branding.courseCode = courseMatch[1];
        }

        // 6. User profile fallback if available
        if (userProfile) {
            if (!branding.institutionName && userProfile.businessName) {
                branding.institutionName = userProfile.businessName;
            }
            if (userProfile.logo) {
                branding.collegeLogo = userProfile.logo;
            }
        }

        if (branding.isInstitutional || branding.institutionName) {
            this.activeBranding = branding;
            logger.status(`\x1b[35m[BRANDING IDENTIFIED] Institution: "${branding.institutionName}" | Dept: "${branding.department || 'General'}" | Accreditation: "${branding.accreditation}"\x1b[0m`);
            return branding;
        }

        return null;
    }

    /**
     * Interactively prompt user for College / Branding details if not in prompt
     */
    async promptForCollegeBranding(rl, defaultName = 'National Institute of Technology') {
        if (!rl) return this.getDefaultCollegeBranding(defaultName);

        logger.status(`\n\x1b[36m╔═══════════════════════════════════════════════════════════════════════════════╗`);
        logger.status(`║                 INSTITUTIONAL / COLLEGE BRANDING WIZARD                       ║`);
        logger.status(`╚═══════════════════════════════════════════════════════════════════════════════╝\x1b[0m`);

        try {
            const collegeName = await rl.question(`\nEnter College / Institution Name (Default: ${defaultName}): `) || defaultName;
            const dept = await rl.question(`Enter Department (e.g. Dept of Computer Science & Engineering): `) || 'Department of Computer Science & Engineering';
            const accredit = await rl.question(`Enter Accreditations (e.g. NAAC 'A++' | NBA | NIRF): `) || "NAAC 'A++' Accredited | Autonomous";
            const year = await rl.question(`Enter Academic Year (Default: 2025 - 2026): `) || '2025 - 2026';

            const branding = {
                isInstitutional: true,
                institutionName: collegeName.trim(),
                department: dept.trim(),
                collegeLogo: '',
                accreditation: accredit.trim(),
                motto: 'Excellence in Education, Research & Innovation',
                academicYear: year.trim(),
                themeColor: '#0F2C59',
                secondaryColor: '#B71C1C',
                accentColor: '#F59E0B'
            };

            this.activeBranding = branding;
            return branding;
        } catch (_) {
            return this.getDefaultCollegeBranding(defaultName);
        }
    }

    getDefaultCollegeBranding(name = 'Apex Institute of Technology & Science') {
        return {
            isInstitutional: true,
            institutionName: name,
            department: 'Department of Computer Science & Engineering',
            collegeLogo: '',
            accreditation: "NAAC 'A++' Accredited | Autonomous Institution | NIRF Ranked",
            motto: 'Knowledge • Integrity • Innovation',
            academicYear: '2025 - 2026',
            themeColor: '#0F2C59',
            secondaryColor: '#881337',
            accentColor: '#D97706'
        };
    }

    getActiveBranding() {
        return this.activeBranding;
    }
}

module.exports = new BrandingManager();
