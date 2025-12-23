/**
 * Scoring Rubrics v1.0
 * 
 * Role-specific and seniority-adjusted evaluation criteria
 * for consistent, calibrated feedback scoring.
 */

import { CompetencyKey, Seniority } from './feedback';

// ============================================
// COMPETENCY WEIGHTS BY ROLE TYPE
// ============================================

export interface RoleCompetencyWeights {
  [key: string]: Partial<Record<CompetencyKey, number>>;
}

export const ROLE_COMPETENCY_WEIGHTS: RoleCompetencyWeights = {
  // Software Engineering roles
  'software_engineer': {
    technical_knowledge: 0.30,
    problem_solving: 0.25,
    communication: 0.15,
    system_design: 0.15,
    behavioral: 0.10,
    cultural_fit: 0.05
  },
  'frontend_engineer': {
    technical_knowledge: 0.30,
    problem_solving: 0.20,
    communication: 0.20,
    system_design: 0.10,
    behavioral: 0.10,
    domain_expertise: 0.10
  },
  'backend_engineer': {
    technical_knowledge: 0.30,
    problem_solving: 0.25,
    system_design: 0.20,
    communication: 0.10,
    behavioral: 0.10,
    cultural_fit: 0.05
  },
  'fullstack_engineer': {
    technical_knowledge: 0.25,
    problem_solving: 0.25,
    system_design: 0.15,
    communication: 0.15,
    behavioral: 0.10,
    domain_expertise: 0.10
  },
  'devops_engineer': {
    technical_knowledge: 0.30,
    problem_solving: 0.25,
    system_design: 0.20,
    communication: 0.10,
    behavioral: 0.10,
    cultural_fit: 0.05
  },
  'data_scientist': {
    technical_knowledge: 0.25,
    problem_solving: 0.30,
    communication: 0.15,
    domain_expertise: 0.20,
    behavioral: 0.05,
    cultural_fit: 0.05
  },
  'product_manager': {
    communication: 0.25,
    problem_solving: 0.20,
    leadership: 0.20,
    behavioral: 0.15,
    domain_expertise: 0.10,
    cultural_fit: 0.10
  },
  'engineering_manager': {
    leadership: 0.30,
    communication: 0.25,
    behavioral: 0.20,
    technical_knowledge: 0.10,
    problem_solving: 0.10,
    cultural_fit: 0.05
  },
  // Default for unknown roles
  'default': {
    technical_knowledge: 0.20,
    problem_solving: 0.20,
    communication: 0.20,
    behavioral: 0.20,
    cultural_fit: 0.10,
    leadership: 0.10
  }
};

// ============================================
// SENIORITY EXPECTATIONS
// ============================================

export interface SeniorityExpectations {
  minScore: number;           // Minimum expected overall score
  depthExpected: 'basic' | 'intermediate' | 'advanced' | 'expert';
  leadershipRequired: boolean;
  systemDesignRequired: boolean;
  communicationStandard: 'acceptable' | 'good' | 'excellent';
  focusAreas: CompetencyKey[];
}

export const SENIORITY_EXPECTATIONS: Record<Seniority, SeniorityExpectations> = {
  'intern': {
    minScore: 40,
    depthExpected: 'basic',
    leadershipRequired: false,
    systemDesignRequired: false,
    communicationStandard: 'acceptable',
    focusAreas: ['technical_knowledge', 'communication', 'cultural_fit']
  },
  'junior': {
    minScore: 50,
    depthExpected: 'basic',
    leadershipRequired: false,
    systemDesignRequired: false,
    communicationStandard: 'acceptable',
    focusAreas: ['technical_knowledge', 'problem_solving', 'communication']
  },
  'mid': {
    minScore: 60,
    depthExpected: 'intermediate',
    leadershipRequired: false,
    systemDesignRequired: true,
    communicationStandard: 'good',
    focusAreas: ['technical_knowledge', 'problem_solving', 'system_design']
  },
  'senior': {
    minScore: 70,
    depthExpected: 'advanced',
    leadershipRequired: true,
    systemDesignRequired: true,
    communicationStandard: 'good',
    focusAreas: ['system_design', 'leadership', 'problem_solving', 'technical_knowledge']
  },
  'staff': {
    minScore: 75,
    depthExpected: 'expert',
    leadershipRequired: true,
    systemDesignRequired: true,
    communicationStandard: 'excellent',
    focusAreas: ['system_design', 'leadership', 'technical_knowledge']
  },
  'principal': {
    minScore: 80,
    depthExpected: 'expert',
    leadershipRequired: true,
    systemDesignRequired: true,
    communicationStandard: 'excellent',
    focusAreas: ['system_design', 'leadership', 'domain_expertise']
  },
  'manager': {
    minScore: 65,
    depthExpected: 'intermediate',
    leadershipRequired: true,
    systemDesignRequired: false,
    communicationStandard: 'excellent',
    focusAreas: ['leadership', 'communication', 'behavioral']
  },
  'director': {
    minScore: 75,
    depthExpected: 'advanced',
    leadershipRequired: true,
    systemDesignRequired: true,
    communicationStandard: 'excellent',
    focusAreas: ['leadership', 'communication', 'domain_expertise']
  },
  'vp': {
    minScore: 80,
    depthExpected: 'expert',
    leadershipRequired: true,
    systemDesignRequired: true,
    communicationStandard: 'excellent',
    focusAreas: ['leadership', 'communication', 'domain_expertise']
  },
  'c-level': {
    minScore: 85,
    depthExpected: 'expert',
    leadershipRequired: true,
    systemDesignRequired: true,
    communicationStandard: 'excellent',
    focusAreas: ['leadership', 'communication', 'domain_expertise']
  }
};

// ============================================
// SCORE ANCHORS (Behavioral Indicators)
// ============================================

export interface ScoreAnchor {
  score: number;
  label: string;
  indicators: string[];
}

export const COMPETENCY_ANCHORS: Record<CompetencyKey, ScoreAnchor[]> = {
  technical_knowledge: [
    {
      score: 1,
      label: 'Insufficient',
      indicators: [
        'Cannot explain basic concepts',
        'Makes fundamental errors',
        'No understanding of core technologies'
      ]
    },
    {
      score: 2,
      label: 'Basic',
      indicators: [
        'Knows syntax but not best practices',
        'Struggles with intermediate concepts',
        'Limited tool knowledge'
      ]
    },
    {
      score: 3,
      label: 'Competent',
      indicators: [
        'Solid understanding of fundamentals',
        'Can apply concepts correctly',
        'Aware of trade-offs'
      ]
    },
    {
      score: 4,
      label: 'Strong',
      indicators: [
        'Deep knowledge of core technologies',
        'Understands internals and edge cases',
        'Can optimize and improve solutions'
      ]
    },
    {
      score: 5,
      label: 'Expert',
      indicators: [
        'Industry-leading knowledge',
        'Can teach and mentor others',
        'Innovates beyond standard practices'
      ]
    }
  ],
  problem_solving: [
    {
      score: 1,
      label: 'Insufficient',
      indicators: [
        'Cannot break down problems',
        'No structured approach',
        'Gets stuck without guidance'
      ]
    },
    {
      score: 2,
      label: 'Basic',
      indicators: [
        'Can solve simple problems',
        'Needs hints for complexity',
        'Limited creative thinking'
      ]
    },
    {
      score: 3,
      label: 'Competent',
      indicators: [
        'Systematic approach to problems',
        'Considers multiple solutions',
        'Can handle moderate complexity'
      ]
    },
    {
      score: 4,
      label: 'Strong',
      indicators: [
        'Excellent analytical thinking',
        'Finds optimal solutions',
        'Anticipates edge cases'
      ]
    },
    {
      score: 5,
      label: 'Expert',
      indicators: [
        'Solves novel problems creatively',
        'Simplifies complex systems',
        'Mentors others in problem-solving'
      ]
    }
  ],
  communication: [
    {
      score: 1,
      label: 'Insufficient',
      indicators: [
        'Unclear explanations',
        'Does not listen actively',
        'Frequent misunderstandings'
      ]
    },
    {
      score: 2,
      label: 'Basic',
      indicators: [
        'Can explain simple concepts',
        'Sometimes rambles or is unclear',
        'Limited audience awareness'
      ]
    },
    {
      score: 3,
      label: 'Competent',
      indicators: [
        'Clear and structured communication',
        'Good listening skills',
        'Adapts to audience level'
      ]
    },
    {
      score: 4,
      label: 'Strong',
      indicators: [
        'Excellent storytelling ability',
        'Persuasive and concise',
        'Great at technical explanations'
      ]
    },
    {
      score: 5,
      label: 'Expert',
      indicators: [
        'Executive-level communication',
        'Can simplify any concept',
        'Inspires and influences others'
      ]
    }
  ],
  system_design: [
    {
      score: 1,
      label: 'Insufficient',
      indicators: [
        'No understanding of architecture',
        'Cannot design basic systems',
        'Ignores scalability concerns'
      ]
    },
    {
      score: 2,
      label: 'Basic',
      indicators: [
        'Knows common patterns',
        'Struggles with trade-offs',
        'Limited distributed systems knowledge'
      ]
    },
    {
      score: 3,
      label: 'Competent',
      indicators: [
        'Can design medium-scale systems',
        'Understands key trade-offs',
        'Considers reliability and scale'
      ]
    },
    {
      score: 4,
      label: 'Strong',
      indicators: [
        'Designs complex distributed systems',
        'Deep understanding of CAP theorem',
        'Excellent at capacity planning'
      ]
    },
    {
      score: 5,
      label: 'Expert',
      indicators: [
        'Architects planet-scale systems',
        'Creates novel solutions',
        'Industry-recognized expertise'
      ]
    }
  ],
  behavioral: [
    {
      score: 1,
      label: 'Concerning',
      indicators: [
        'Red flags in past experiences',
        'Poor self-awareness',
        'Blames others consistently'
      ]
    },
    {
      score: 2,
      label: 'Basic',
      indicators: [
        'Limited examples of growth',
        'Struggles with conflict resolution',
        'Reactive rather than proactive'
      ]
    },
    {
      score: 3,
      label: 'Competent',
      indicators: [
        'Good self-awareness',
        'Learns from mistakes',
        'Works well in teams'
      ]
    },
    {
      score: 4,
      label: 'Strong',
      indicators: [
        'Excellent emotional intelligence',
        'Handles conflict maturely',
        'Strong growth mindset'
      ]
    },
    {
      score: 5,
      label: 'Exceptional',
      indicators: [
        'Inspires others with attitude',
        'Navigates complex situations gracefully',
        'Role model for culture'
      ]
    }
  ],
  leadership: [
    {
      score: 1,
      label: 'Insufficient',
      indicators: [
        'No leadership examples',
        'Avoids responsibility',
        'Cannot influence others'
      ]
    },
    {
      score: 2,
      label: 'Basic',
      indicators: [
        'Some leadership experience',
        'Struggles with delegation',
        'Limited strategic thinking'
      ]
    },
    {
      score: 3,
      label: 'Competent',
      indicators: [
        'Can lead small teams',
        'Good at mentoring',
        'Makes sound decisions'
      ]
    },
    {
      score: 4,
      label: 'Strong',
      indicators: [
        'Leads through influence',
        'Develops team members',
        'Strategic vision'
      ]
    },
    {
      score: 5,
      label: 'Exceptional',
      indicators: [
        'Transforms organizations',
        'Builds high-performing teams',
        'Industry thought leader'
      ]
    }
  ],
  cultural_fit: [
    {
      score: 1,
      label: 'Poor Fit',
      indicators: [
        'Values misalignment',
        'Work style incompatible',
        'Red flags in references'
      ]
    },
    {
      score: 2,
      label: 'Uncertain',
      indicators: [
        'Some alignment concerns',
        'May struggle with team dynamics',
        'Limited culture awareness'
      ]
    },
    {
      score: 3,
      label: 'Good Fit',
      indicators: [
        'Values align with company',
        'Collaborative mindset',
        'Adaptable work style'
      ]
    },
    {
      score: 4,
      label: 'Strong Fit',
      indicators: [
        'Enhances team culture',
        'Brings valuable perspective',
        'Excellent team player'
      ]
    },
    {
      score: 5,
      label: 'Culture Champion',
      indicators: [
        'Embodies company values',
        'Will strengthen culture',
        'Natural culture ambassador'
      ]
    }
  ],
  domain_expertise: [
    {
      score: 1,
      label: 'No Experience',
      indicators: [
        'No domain knowledge',
        'Unfamiliar with industry',
        'Would need extensive training'
      ]
    },
    {
      score: 2,
      label: 'Limited',
      indicators: [
        'Basic domain awareness',
        'Limited practical experience',
        'Needs mentorship'
      ]
    },
    {
      score: 3,
      label: 'Competent',
      indicators: [
        'Solid domain knowledge',
        'Understands key challenges',
        'Can contribute immediately'
      ]
    },
    {
      score: 4,
      label: 'Expert',
      indicators: [
        'Deep domain expertise',
        'Recognized in the field',
        'Can drive domain strategy'
      ]
    },
    {
      score: 5,
      label: 'Industry Leader',
      indicators: [
        'Pioneered domain practices',
        'Speaks at conferences',
        'Shapes industry direction'
      ]
    }
  ]
};

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Get competency weights for a role, with fallback to default
 */
export function getCompetencyWeights(roleTitle: string): Partial<Record<CompetencyKey, number>> {
  const normalized = roleTitle.toLowerCase().replace(/\s+/g, '_');
  return ROLE_COMPETENCY_WEIGHTS[normalized] || ROLE_COMPETENCY_WEIGHTS['default'];
}

/**
 * Get seniority expectations with fallback to mid-level
 */
export function getSeniorityExpectations(seniority: Seniority): SeniorityExpectations {
  return SENIORITY_EXPECTATIONS[seniority] || SENIORITY_EXPECTATIONS['mid'];
}

/**
 * Get anchor description for a competency score
 */
export function getScoreAnchor(competency: CompetencyKey, score: number): ScoreAnchor | undefined {
  const anchors = COMPETENCY_ANCHORS[competency];
  return anchors?.find(a => a.score === Math.round(score));
}

/**
 * Calculate weighted overall score from competency scores
 */
export function calculateWeightedScore(
  competencyScores: Record<CompetencyKey, number>,
  roleTitle: string
): number {
  const weights = getCompetencyWeights(roleTitle);
  let totalWeight = 0;
  let weightedSum = 0;
  
  for (const [key, weight] of Object.entries(weights)) {
    const score = competencyScores[key as CompetencyKey];
    if (score !== undefined && weight !== undefined) {
      weightedSum += score * weight * 20; // Convert 0-5 to 0-100
      totalWeight += weight;
    }
  }
  
  return totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0;
}
