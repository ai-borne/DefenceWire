
-- ============================================================================
-- Pillar D: Semantic Knowledge Graph & Epistemic Triples (Phase 2)
-- ============================================================================

-- Semantic graph nodes representing platforms, units, facilities, and programs.
CREATE TABLE IF NOT EXISTS graph_nodes (
  id TEXT PRIMARY KEY,               -- normalized slug, e.g. 'node_l-70-guns', 'node_delhi'
  label TEXT NOT NULL,              -- display name e.g. 'L-70 Guns'
  category TEXT NOT NULL,           -- 'platform' | 'threat' | 'facility' | 'location' | 'organization' | 'program'
  mention_count INTEGER NOT NULL DEFAULT 1,
  degree INTEGER NOT NULL DEFAULT 0,-- degree centrality (number of connected edges)
  first_seen_at TEXT NOT NULL,      -- ISO 8601
  last_seen_at TEXT NOT NULL,       -- ISO 8601
  metadata_json TEXT                -- optional JSON string
);

CREATE INDEX IF NOT EXISTS idx_graph_nodes_category ON graph_nodes (category);
CREATE INDEX IF NOT EXISTS idx_graph_nodes_degree ON graph_nodes (degree DESC);
CREATE INDEX IF NOT EXISTS idx_graph_nodes_last_seen ON graph_nodes (last_seen_at DESC);

-- Directed semantic relationships with truth states and observation timestamps.
CREATE TABLE IF NOT EXISTS graph_edges (
  id TEXT PRIMARY KEY,               -- deterministic: 'edge_${source_id}_${predicate}_${target_id}'
  source_id TEXT NOT NULL,           -- references graph_nodes(id)
  target_id TEXT NOT NULL,           -- references graph_nodes(id)
  predicate TEXT NOT NULL,           -- 'DEPLOYED_TO' | 'CONNECTED_TO' | 'PROCURES' | 'TESTED_AT' | 'TARGETS' | 'DEVELOPED_BY' | 'ENGAGED_WITH' | 'SUPPLIES' | 'INTERCEPTED'
  epistemic_state TEXT NOT NULL DEFAULT 'CONFIRMED', -- 'CONFIRMED' | 'CONTESTED' | 'SUPERSEDED' | 'DISPUTED' | 'RETRACTED'
  weight REAL NOT NULL DEFAULT 1.0,
  cluster_id TEXT,                  -- maps to StoryCluster.id
  first_observed_at TEXT NOT NULL,   -- ISO 8601
  last_observed_at TEXT NOT NULL,    -- ISO 8601
  source_url TEXT NOT NULL,
  context_snippet TEXT,
  FOREIGN KEY (source_id) REFERENCES graph_nodes(id) ON DELETE CASCADE,
  FOREIGN KEY (target_id) REFERENCES graph_nodes(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_graph_edges_source_pred ON graph_edges (source_id, predicate);
CREATE INDEX IF NOT EXISTS idx_graph_edges_target_pred ON graph_edges (target_id, predicate);
CREATE INDEX IF NOT EXISTS idx_graph_edges_epistemic ON graph_edges (epistemic_state);
CREATE INDEX IF NOT EXISTS idx_graph_edges_observed ON graph_edges (last_observed_at DESC);
CREATE INDEX IF NOT EXISTS idx_graph_edges_cluster ON graph_edges (cluster_id);

-- ============================================================================
-- Pillar E: Emergent Pattern & Hypothesis Synthesizer (Phase 5)
-- ============================================================================

-- Autonomous emergent pattern candidates detected from dense graph subgraphs
-- and spatiotemporal clustering across independent news tracks.
CREATE TABLE IF NOT EXISTS emergent_patterns (
  id TEXT PRIMARY KEY,               -- deterministic slug, e.g. 'pat_delhi_air_defence'
  title TEXT NOT NULL,              -- situational title, e.g. 'NCR Air Defence & Counter-UAS Convergence'
  synthesis TEXT NOT NULL,          -- 2-sentence situational assessment/hypothesis
  confidence REAL NOT NULL DEFAULT 0.5, -- confidence score 0.0 - 1.0 based on graph density & multi-track corroboration
  node_ids_json TEXT NOT NULL,      -- JSON array of graph_nodes(id)
  cluster_ids_json TEXT NOT NULL,   -- JSON array of StoryCluster(id)
  status TEXT NOT NULL DEFAULT 'draft', -- 'draft' | 'approved' | 'rejected'
  created_at TEXT NOT NULL,         -- ISO 8601
  reviewed_at TEXT,                 -- ISO 8601
  reviewed_by TEXT                  -- curator email
);

CREATE INDEX IF NOT EXISTS idx_emergent_patterns_status ON emergent_patterns (status, confidence DESC);
CREATE INDEX IF NOT EXISTS idx_emergent_patterns_created ON emergent_patterns (created_at DESC);
