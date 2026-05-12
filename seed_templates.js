const { createClient } = require('@supabase/supabase-js');
const s = createClient(
  'https://sipfppicanrlpmcxjytp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNpcGZwcGljYW5ybHBtY3hqeXRwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTU4NDQwNSwiZXhwIjoyMDc3MTYwNDA1fQ.MeXkMjBZdkCluIWCyfhWYJqFieAdf-YE4g2CKQiKLK4'
);

async function run() {
  const { data: companies } = await s.from('companies').select('id, name').limit(10);
  console.log('Found companies:', companies.map(c => c.name).join(', '));

  for (const company of companies) {
    const templates = [
      {
        company_id: company.id,
        trigger_status: 'Nieuw',
        email_subject: 'Reparatie ontvangen - {apparaat}',
        email_body: 'Beste {klant_naam},\n\nWij hebben uw {apparaat} in goede orde ontvangen.\n\nReferentienummer: {job_id}\nApparaat: {apparaat}\nProbleem: {probleem}\n\nWij gaan zo snel mogelijk aan de slag. U ontvangt een bericht zodra de reparatie klaar is.\n\nMet vriendelijke groet,\n{bedrijf_naam}',
        whatsapp_body: 'Hallo {klant_naam}! Uw {apparaat} is ontvangen. Ref: {job_id}. Probleem: {probleem}. We houden u op de hoogte! - {bedrijf_naam}',
        email_enabled: true,
        whatsapp_enabled: true,
      },
      {
        company_id: company.id,
        trigger_status: 'Besteld',
        email_subject: 'Onderdeel besteld voor uw {apparaat}',
        email_body: 'Beste {klant_naam},\n\nVoor de reparatie van uw {apparaat} hebben wij een onderdeel besteld.\n\nReferentienummer: {job_id}\nOnderdeel: {onderdeel}\n\nZodra het onderdeel binnen is, gaan we direct verder.\n\nMet vriendelijke groet,\n{bedrijf_naam}',
        whatsapp_body: 'Hallo {klant_naam}! We hebben een onderdeel besteld voor uw {apparaat}. Ref: {job_id}. Zodra het binnen is gaan we verder! - {bedrijf_naam}',
        email_enabled: true,
        whatsapp_enabled: true,
      },
      {
        company_id: company.id,
        trigger_status: 'Reparatie klaar',
        email_subject: 'Uw {apparaat} is gerepareerd!',
        email_body: 'Beste {klant_naam},\n\nGoed nieuws! Uw {apparaat} is gerepareerd en klaar om opgehaald te worden.\n\nReferentienummer: {job_id}\nKosten: {kosten}\n\nU kunt uw apparaat ophalen tijdens openingstijden.\n\nMet vriendelijke groet,\n{bedrijf_naam}',
        whatsapp_body: 'Goed nieuws {klant_naam}! Uw {apparaat} is klaar! Ref: {job_id}. Kosten: {kosten}. U kunt het ophalen tijdens openingstijden. - {bedrijf_naam}',
        email_enabled: true,
        whatsapp_enabled: true,
      },
      {
        company_id: company.id,
        trigger_status: 'Geannuleerd',
        email_subject: 'Reparatie geannuleerd - {apparaat}',
        email_body: 'Beste {klant_naam},\n\nHelaas moeten wij de reparatie van uw {apparaat} annuleren.\n\nReferentienummer: {job_id}\n\nNeem contact met ons op voor meer informatie.\n\nMet vriendelijke groet,\n{bedrijf_naam}',
        whatsapp_body: 'Beste {klant_naam}, de reparatie van uw {apparaat} is helaas geannuleerd. Ref: {job_id}. Neem contact op voor meer info. - {bedrijf_naam}',
        email_enabled: true,
        whatsapp_enabled: true,
      },
    ];

    const { data, error } = await s.from('notification_templates').upsert(templates, { onConflict: 'company_id,trigger_status' }).select();
    if (error) console.log('Error for', company.name, ':', error.message);
    else console.log('Inserted', data.length, 'templates for', company.name);
  }
}
run();
