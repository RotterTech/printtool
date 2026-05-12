-- Print Queue System: agents + jobs
-- Run in Supabase SQL Editor

-- Print Agents: one per PC with a Brother printer
CREATE TABLE IF NOT EXISTS print_agents (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT 'Mijn Printer',
  api_key text NOT NULL UNIQUE,
  printer_name text,
  last_seen_at timestamptz,
  is_online boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Print Jobs: queue of labels to print
CREATE TABLE IF NOT EXISTS print_jobs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  agent_id uuid REFERENCES print_agents(id) ON DELETE SET NULL,
  job_type text NOT NULL DEFAULT 'repair_label',
  reference_id text,
  label_data jsonb NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  error_message text,
  created_at timestamptz DEFAULT now(),
  printed_at timestamptz
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_print_jobs_status ON print_jobs(status);
CREATE INDEX IF NOT EXISTS idx_print_jobs_company ON print_jobs(company_id);
CREATE INDEX IF NOT EXISTS idx_print_jobs_agent ON print_jobs(agent_id);
CREATE INDEX IF NOT EXISTS idx_print_agents_company ON print_agents(company_id);
CREATE INDEX IF NOT EXISTS idx_print_agents_api_key ON print_agents(api_key);

-- RLS policies
ALTER TABLE print_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE print_jobs ENABLE ROW LEVEL SECURITY;

-- Agents: company members can manage their own agents
CREATE POLICY "print_agents_select" ON print_agents FOR SELECT
  USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "print_agents_insert" ON print_agents FOR INSERT
  WITH CHECK (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "print_agents_update" ON print_agents FOR UPDATE
  USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "print_agents_delete" ON print_agents FOR DELETE
  USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

-- Jobs: company members can manage their own jobs
CREATE POLICY "print_jobs_select" ON print_jobs FOR SELECT
  USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "print_jobs_insert" ON print_jobs FOR INSERT
  WITH CHECK (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "print_jobs_update" ON print_jobs FOR UPDATE
  USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "print_jobs_delete" ON print_jobs FOR DELETE
  USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));
