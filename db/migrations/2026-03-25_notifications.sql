-- Notification System: templates + log
-- Run in Supabase SQL Editor

-- Notification Templates per company
CREATE TABLE IF NOT EXISTS notification_templates (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  trigger_status text NOT NULL,
  email_enabled boolean DEFAULT true,
  whatsapp_enabled boolean DEFAULT true,
  email_subject text NOT NULL,
  email_body text NOT NULL,
  whatsapp_body text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(company_id, trigger_status)
);

-- Notification Log
CREATE TABLE IF NOT EXISTS notification_log (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  repair_id uuid,
  channel text NOT NULL, -- 'email' or 'whatsapp'
  recipient text NOT NULL,
  trigger_status text NOT NULL,
  subject text,
  body text NOT NULL,
  status text NOT NULL DEFAULT 'sent', -- 'sent', 'failed', 'delivered'
  error_message text,
  external_id text, -- message id from provider
  created_at timestamptz DEFAULT now()
);

-- Company notification settings
CREATE TABLE IF NOT EXISTS notification_settings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE UNIQUE,
  email_enabled boolean DEFAULT true,
  whatsapp_enabled boolean DEFAULT true,
  sender_name text DEFAULT 'Reparatie Service',
  sender_email text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_notification_log_company ON notification_log(company_id);
CREATE INDEX IF NOT EXISTS idx_notification_log_repair ON notification_log(repair_id);
CREATE INDEX IF NOT EXISTS idx_notification_templates_company ON notification_templates(company_id);

-- RLS
ALTER TABLE notification_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_settings ENABLE ROW LEVEL SECURITY;

-- Templates policies
CREATE POLICY "notification_templates_select" ON notification_templates FOR SELECT
  USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "notification_templates_insert" ON notification_templates FOR INSERT
  WITH CHECK (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "notification_templates_update" ON notification_templates FOR UPDATE
  USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "notification_templates_delete" ON notification_templates FOR DELETE
  USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

-- Log policies
CREATE POLICY "notification_log_select" ON notification_log FOR SELECT
  USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "notification_log_insert" ON notification_log FOR INSERT
  WITH CHECK (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

-- Settings policies
CREATE POLICY "notification_settings_select" ON notification_settings FOR SELECT
  USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "notification_settings_insert" ON notification_settings FOR INSERT
  WITH CHECK (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "notification_settings_update" ON notification_settings FOR UPDATE
  USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

-- Insert default templates for existing companies
-- (Will be auto-created for new companies via API)
INSERT INTO notification_templates (company_id, trigger_status, email_subject, email_body, whatsapp_body)
SELECT c.id, t.trigger_status, t.email_subject, t.email_body, t.whatsapp_body
FROM companies c
CROSS JOIN (VALUES
  ('Nieuw',
   'Reparatie ontvangen - {apparaat}',
   'Beste {klant_naam},

Wij hebben uw {apparaat} in goede orde ontvangen.

Referentienummer: {job_id}
Apparaat: {apparaat}
Probleem: {probleem}

Wij gaan zo snel mogelijk aan de slag. U ontvangt een bericht zodra de reparatie klaar is.

Met vriendelijke groet,
{bedrijf_naam}',
   'Hallo {klant_naam}! 👋

Uw {apparaat} is ontvangen.
📋 Ref: {job_id}
🔧 Probleem: {probleem}

We houden u op de hoogte!

{bedrijf_naam}'),

  ('Besteld',
   'Onderdeel besteld voor uw {apparaat}',
   'Beste {klant_naam},

Voor de reparatie van uw {apparaat} hebben wij een onderdeel besteld.

Referentienummer: {job_id}
Onderdeel: {onderdeel}

Zodra het onderdeel binnen is, gaan we direct verder met de reparatie.

Met vriendelijke groet,
{bedrijf_naam}',
   'Hallo {klant_naam}! 📦

We hebben een onderdeel besteld voor uw {apparaat}.
📋 Ref: {job_id}

Zodra het binnen is gaan we verder!

{bedrijf_naam}'),

  ('Reparatie klaar',
   'Uw {apparaat} is gerepareerd!',
   'Beste {klant_naam},

Goed nieuws! Uw {apparaat} is gerepareerd en klaar om opgehaald te worden.

Referentienummer: {job_id}
Kosten: {kosten}

U kunt uw apparaat ophalen tijdens openingstijden.

Met vriendelijke groet,
{bedrijf_naam}',
   'Hallo {klant_naam}! ✅

Goed nieuws! Uw {apparaat} is klaar!
📋 Ref: {job_id}
💰 Kosten: {kosten}

U kunt het ophalen tijdens openingstijden.

{bedrijf_naam}'),

  ('Geannuleerd',
   'Reparatie geannuleerd - {apparaat}',
   'Beste {klant_naam},

Helaas moeten wij de reparatie van uw {apparaat} annuleren.

Referentienummer: {job_id}

Neem contact met ons op voor meer informatie.

Met vriendelijke groet,
{bedrijf_naam}',
   'Hallo {klant_naam},

De reparatie van uw {apparaat} is helaas geannuleerd.
📋 Ref: {job_id}

Neem contact op voor meer info.

{bedrijf_naam}')
) AS t(trigger_status, email_subject, email_body, whatsapp_body)
ON CONFLICT (company_id, trigger_status) DO NOTHING;
