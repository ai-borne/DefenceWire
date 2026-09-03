/**
 * JSON Schema Definitions for LLM Machine-Readable Grounding (llms-full.txt)
 * Hard limit: <= 300 LOC.
 */

export const STORY_CLUSTER_SCHEMA = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  title: 'StoryCluster',
  type: 'object',
  properties: {
    id: { type: 'string', description: 'Unique story cluster identifier (e.g. cluster-8d1a1f96)' },
    category: {
      type: 'string',
      enum: ['army', 'navy', 'airforce', 'tech', 'strategic', 'procurement', 'ssb']
    },
    synthesizedHeadline: { type: 'string', description: 'Fact-grounded headline synthesizing all reports' },
    defenceScore: { type: 'number', description: 'Domain relevance score (0-100+)' },
    isLeadStory: { type: 'boolean', description: 'Lead banner story status' },
    entities: { type: 'array', items: { type: 'string' }, description: 'Tagged military entities & platforms' },
    primarySource: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        url: { type: 'string', format: 'uri' },
        sourceName: { type: 'string' },
        tier: { type: 'string', enum: ['official', 'tier1', 'tier2', 'social'] },
        publishedAt: { type: 'string', format: 'date-time' }
      },
      required: ['title', 'url', 'sourceName', 'tier']
    },
    relatedCoverage: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          url: { type: 'string', format: 'uri' },
          sourceName: { type: 'string' },
          tier: { type: 'string' }
        }
      }
    },
    ssbIntel: {
      type: 'object',
      properties: {
        gist: { type: 'string', description: 'Key strategic takeaway for military interviews' },
        counterView: { type: 'string', description: 'Alternative strategic perspective' },
        gtoDiscussionPoint: { type: 'string', description: 'Structured debate point for GTO rounds' }
      }
    }
  },
  required: ['id', 'category', 'synthesizedHeadline', 'primarySource']
};

export const STRATEGIC_PROGRAM_SCHEMA = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  title: 'StrategicProgram',
  type: 'object',
  properties: {
    id: { type: 'string', description: 'Program identifier slug (e.g. tejas-mk1a)' },
    name: { type: 'string', description: 'Official programmatic designation' },
    shortName: { type: 'string' },
    domain: { type: 'string', enum: ['Aerospace', 'Land Systems', 'Naval Systems', 'Missiles', 'Unmanned & AI'] },
    stage: { type: 'string', enum: ['Concept', 'R&D', 'Testing', 'Production', 'Operational', 'Upgraded'] },
    leadAgency: { type: 'string', description: 'Primary developer / agency (e.g. ADA / DRDO, HAL, MDL)' },
    serviceBranch: { type: 'array', items: { type: 'string', enum: ['Army', 'Navy', 'Air Force', 'Tri-Services'] } },
    sanctionedBudgetCrores: { type: 'number', description: 'Sanctioned capital expenditure in INR Crores' },
    indigenousPercentage: { type: 'number', description: 'Indigenisation percentage by value (0-100)' },
    targetInductionYear: { type: ['number', 'string'] },
    plannedUnits: { type: ['number', 'string'] },
    summary: { type: 'string' },
    canonicalUrl: { type: 'string', format: 'uri' }
  },
  required: ['id', 'name', 'domain', 'stage', 'leadAgency', 'canonicalUrl']
};

export const SUPPLIER_PROFILE_SCHEMA = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  title: 'SupplierProfile',
  type: 'object',
  properties: {
    id: { type: 'string' },
    slug: { type: 'string' },
    name: { type: 'string', description: 'Official corporate name' },
    aliases: { type: 'array', items: { type: 'string' } },
    tier: { type: 'string', enum: ['dpsu', 'private_prime', 'tier2_msme', 'deep_tech_startup'] },
    hqCity: { type: 'string' },
    hqState: { type: 'string' },
    corridor: { type: 'string', enum: ['Tamil Nadu', 'Uttar Pradesh', 'Bengaluru', 'Hyderabad', 'Pune'] },
    website: { type: 'string', format: 'uri' },
    srijanId: { type: 'string' },
    idexWinner: { type: 'boolean' },
    isListed: { type: 'boolean' },
    stockSymbol: { type: 'string' },
    capabilities: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          capabilityDomain: { type: 'string' },
          certifications: { type: 'array', items: { type: 'string' } }
        }
      }
    },
    linkedPrograms: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          programId: { type: 'string' },
          subsystemName: { type: 'string' },
          tier: { type: 'string' },
          indigenisationStatus: { type: 'string' }
        }
      }
    },
    canonicalUrl: { type: 'string', format: 'uri' }
  },
  required: ['id', 'slug', 'name', 'tier', 'hqCity', 'canonicalUrl']
};

export const ORBAT_UNIT_SCHEMA = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  title: 'OrbatUnit',
  type: 'object',
  properties: {
    id: { type: 'string' },
    unitName: { type: 'string', description: 'Squadron, Regiment, or Warship formation name' },
    serviceBranch: { type: 'string', enum: ['iaf', 'indian_navy', 'indian_army'] },
    baseLocation: { type: 'string', description: 'Air Station, Home Port, or Cantonment base' },
    status: { type: 'string', enum: ['operational', 'slated_induction', 'raising'] },
    programId: { type: 'string', description: 'Associated strategic platform ID' },
    modernizationNote: { type: 'string' }
  },
  required: ['id', 'unitName', 'serviceBranch', 'baseLocation', 'status', 'programId']
};
