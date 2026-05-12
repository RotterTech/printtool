"use client";

import { useState, useEffect } from "react";
import { Mail, MessageCircle, Send, Check, X, Loader2, ChevronDown, ChevronUp, Save, TestTube, Bell, History } from "lucide-react";
import { toast } from "sonner";

interface Template {
  id: string;
  trigger_status: string;
  email_enabled: boolean;
  whatsapp_enabled: boolean;
  email_subject: string;
  email_body: string;
  whatsapp_body: string;
}

interface NotifLog {
  id: string;
  channel: string;
  recipient: string;
  trigger_status: string;
  subject: string | null;
  body: string;
  status: string;
  error_message: string | null;
  created_at: string;
}

interface Settings {
  email_enabled: boolean;
  whatsapp_enabled: boolean;
  sender_name: string;
  sender_email: string | null;
}

const STATUS_LABELS: Record<string, string> = {
  "Nieuw": "📥 Reparatie ontvangen",
  "Besteld": "📦 Onderdeel besteld",
  "In reparatie": "🔧 In reparatie",
  "Reparatie klaar": "✅ Reparatie klaar",
  "Afgehaald": "🏠 Afgehaald",
  "Geannuleerd": "❌ Geannuleerd",
};

const VARIABLE_HELP = [
  { var: "{klant_naam}", desc: "Naam van de klant" },
  { var: "{apparaat}", desc: "Merk + model" },
  { var: "{job_id}", desc: "Referentienummer" },
  { var: "{probleem}", desc: "Probleem omschrijving" },
  { var: "{onderdeel}", desc: "Besteld onderdeel" },
  { var: "{kosten}", desc: "Kosten (€)" },
  { var: "{bedrijf_naam}", desc: "Jouw bedrijfsnaam" },
  { var: "{status}", desc: "Huidige status" },
  { var: "{status_link}", desc: "Link naar statuspagina (email = knop)" },
];

export default function NotificationSection() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [settings, setSettings] = useState<Settings>({
    email_enabled: true,
    whatsapp_enabled: true,
    sender_name: "Reparatie Service",
    sender_email: null,
  });
  const [logs, setLogs] = useState<NotifLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedTemplate, setExpandedTemplate] = useState<string | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [saving, setSaving] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [testingEmail, setTestingEmail] = useState(false);
  const [testingWhatsapp, setTestingWhatsapp] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const [testPhone, setTestPhone] = useState("");
  const [showLogs, setShowLogs] = useState(false);
  const [showVars, setShowVars] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [templatesRes, settingsRes] = await Promise.all([
        fetch("/api/notifications/templates"),
        fetch("/api/notifications/settings"),
      ]);
      const templatesData = await templatesRes.json();
      const settingsData = await settingsRes.json();
      setTemplates(templatesData.templates || []);
      if (settingsData.settings) setSettings(settingsData.settings);
      setLogs(settingsData.logs || []);
    } catch {
      toast.error("Kon notificatie-instellingen niet laden");
    }
    setLoading(false);
  }

  async function saveSettings() {
    setSavingSettings(true);
    try {
      const res = await fetch("/api/notifications/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Instellingen opgeslagen");
      } else {
        toast.error(data.error || "Opslaan mislukt");
      }
    } catch {
      toast.error("Fout bij opslaan");
    }
    setSavingSettings(false);
  }

  async function saveTemplate() {
    if (!editingTemplate) return;
    setSaving(true);
    try {
      const res = await fetch("/api/notifications/templates", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingTemplate),
      });
      const data = await res.json();
      if (data.success) {
        setTemplates((prev) =>
          prev.map((t) => (t.id === editingTemplate.id ? data.template : t))
        );
        setEditingTemplate(null);
        toast.success("Template opgeslagen");
      } else {
        toast.error(data.error || "Opslaan mislukt");
      }
    } catch {
      toast.error("Fout bij opslaan");
    }
    setSaving(false);
  }

  async function sendTest(channel: "email" | "whatsapp") {
    const recipient = channel === "email" ? testEmail : testPhone;
    if (!recipient) {
      toast.error(`Vul een ${channel === "email" ? "email" : "telefoonnummer"} in`);
      return;
    }

    if (channel === "email") setTestingEmail(true);
    else setTestingWhatsapp(true);

    try {
      const res = await fetch("/api/notifications/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel, recipient }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Test ${channel === "email" ? "email" : "WhatsApp"} verzonden!`);
      } else {
        toast.error(data.error || "Verzenden mislukt");
      }
    } catch {
      toast.error("Fout bij verzenden");
    }

    if (channel === "email") setTestingEmail(false);
    else setTestingWhatsapp(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-bold text-gray-900">Klant Notificaties</h2>
        <p className="text-sm text-gray-500">
          Stuur automatisch email en WhatsApp berichten naar klanten bij statuswijzigingen.
        </p>
      </div>

      {/* Global Settings */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-4">
        <h3 className="text-sm font-semibold text-gray-700">Algemene instellingen</h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Email toggle */}
          <label className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50">
            <input
              type="checkbox"
              checked={settings.email_enabled}
              onChange={(e) => setSettings({ ...settings, email_enabled: e.target.checked })}
              className="w-4 h-4 rounded text-blue-600"
            />
            <Mail className="w-4 h-4 text-blue-500" />
            <span className="text-sm font-medium">Email notificaties</span>
          </label>

          {/* WhatsApp toggle */}
          <label className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50">
            <input
              type="checkbox"
              checked={settings.whatsapp_enabled}
              onChange={(e) => setSettings({ ...settings, whatsapp_enabled: e.target.checked })}
              className="w-4 h-4 rounded text-green-600"
            />
            <MessageCircle className="w-4 h-4 text-green-500" />
            <span className="text-sm font-medium">WhatsApp notificaties</span>
          </label>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Afzendernaam</label>
            <input
              type="text"
              value={settings.sender_name}
              onChange={(e) => setSettings({ ...settings, sender_name: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg"
              placeholder="Reparatie Service"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Afzender email (optioneel)</label>
            <input
              type="email"
              value={settings.sender_email || ""}
              onChange={(e) => setSettings({ ...settings, sender_email: e.target.value || null })}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg"
              placeholder="info@jouwbedrijf.nl"
            />
          </div>
        </div>

        <button
          onClick={saveSettings}
          disabled={savingSettings}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {savingSettings ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Opslaan
        </button>
      </div>

      {/* Test Notifications */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-4">
        <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
          <TestTube className="w-4 h-4 text-purple-500" />
          Test verzenden
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Test Email */}
          <div className="space-y-2">
            <div className="flex gap-2">
              <input
                type="email"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg"
                placeholder="test@email.com"
              />
              <button
                onClick={() => sendTest("email")}
                disabled={testingEmail}
                className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 disabled:opacity-50"
              >
                {testingEmail ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                Email
              </button>
            </div>
          </div>

          {/* Test WhatsApp */}
          <div className="space-y-2">
            <div className="flex gap-2">
              <input
                type="tel"
                value={testPhone}
                onChange={(e) => setTestPhone(e.target.value)}
                className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg"
                placeholder="+31612345678"
              />
              <button
                onClick={() => sendTest("whatsapp")}
                disabled={testingWhatsapp}
                className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium bg-green-50 text-green-700 rounded-lg hover:bg-green-100 disabled:opacity-50"
              >
                {testingWhatsapp ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                WhatsApp
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Template Variables Help */}
      <div className="bg-white rounded-xl border border-gray-200">
        <button
          onClick={() => setShowVars(!showVars)}
          className="flex items-center justify-between w-full p-4 text-left"
        >
          <span className="text-sm font-semibold text-gray-700">📝 Beschikbare variabelen</span>
          {showVars ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </button>
        {showVars && (
          <div className="px-4 pb-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {VARIABLE_HELP.map((v) => (
                <div key={v.var} className="p-2 bg-gray-50 rounded-lg">
                  <code className="text-xs font-mono text-blue-600">{v.var}</code>
                  <p className="text-xs text-gray-500 mt-0.5">{v.desc}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Templates */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
          <Bell className="w-4 h-4 text-orange-500" />
          Bericht templates ({templates.length})
        </h3>

        {templates.length === 0 ? (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-center">
            <p className="text-sm text-yellow-700">
              Geen templates gevonden. Draai de database migratie om standaard templates aan te maken.
            </p>
          </div>
        ) : (
          templates.map((template) => {
            const isExpanded = expandedTemplate === template.id;
            const isEditing = editingTemplate?.id === template.id;

            return (
              <div key={template.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                {/* Template header */}
                <button
                  onClick={() => {
                    setExpandedTemplate(isExpanded ? null : template.id);
                    setEditingTemplate(null);
                  }}
                  className="flex items-center justify-between w-full p-4 text-left hover:bg-gray-50"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-base">{STATUS_LABELS[template.trigger_status] || template.trigger_status}</span>
                    <div className="flex items-center gap-1.5">
                      {template.email_enabled && (
                        <span className="flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs">
                          <Mail className="w-3 h-3" /> Email
                        </span>
                      )}
                      {template.whatsapp_enabled && (
                        <span className="flex items-center gap-1 px-2 py-0.5 bg-green-50 text-green-700 rounded text-xs">
                          <MessageCircle className="w-3 h-3" /> WhatsApp
                        </span>
                      )}
                    </div>
                  </div>
                  {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                </button>

                {/* Template content */}
                {isExpanded && (
                  <div className="border-t border-gray-100 p-4 space-y-4">
                    {/* Channel toggles */}
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isEditing ? editingTemplate!.email_enabled : template.email_enabled}
                          onChange={(e) => {
                            if (!isEditing) setEditingTemplate({ ...template, email_enabled: e.target.checked });
                            else setEditingTemplate({ ...editingTemplate!, email_enabled: e.target.checked });
                          }}
                          className="w-4 h-4 rounded text-blue-600"
                        />
                        <span className="text-sm">Email aan</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isEditing ? editingTemplate!.whatsapp_enabled : template.whatsapp_enabled}
                          onChange={(e) => {
                            if (!isEditing) setEditingTemplate({ ...template, whatsapp_enabled: e.target.checked });
                            else setEditingTemplate({ ...editingTemplate!, whatsapp_enabled: e.target.checked });
                          }}
                          className="w-4 h-4 rounded text-green-600"
                        />
                        <span className="text-sm">WhatsApp aan</span>
                      </label>
                    </div>

                    {/* Email template */}
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        <Mail className="w-3 h-3 inline mr-1" />
                        Email onderwerp
                      </label>
                      <input
                        type="text"
                        value={isEditing ? editingTemplate!.email_subject : template.email_subject}
                        onChange={(e) => {
                          if (!isEditing) setEditingTemplate({ ...template, email_subject: e.target.value });
                          else setEditingTemplate({ ...editingTemplate!, email_subject: e.target.value });
                        }}
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Email bericht</label>
                      <textarea
                        value={isEditing ? editingTemplate!.email_body : template.email_body}
                        onChange={(e) => {
                          if (!isEditing) setEditingTemplate({ ...template, email_body: e.target.value });
                          else setEditingTemplate({ ...editingTemplate!, email_body: e.target.value });
                        }}
                        rows={6}
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg font-mono"
                      />
                    </div>

                    {/* WhatsApp template */}
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        <MessageCircle className="w-3 h-3 inline mr-1" />
                        WhatsApp bericht
                      </label>
                      <textarea
                        value={isEditing ? editingTemplate!.whatsapp_body : template.whatsapp_body}
                        onChange={(e) => {
                          if (!isEditing) setEditingTemplate({ ...template, whatsapp_body: e.target.value });
                          else setEditingTemplate({ ...editingTemplate!, whatsapp_body: e.target.value });
                        }}
                        rows={5}
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg font-mono"
                      />
                    </div>

                    {/* Save button */}
                    {isEditing && (
                      <div className="flex gap-2">
                        <button
                          onClick={saveTemplate}
                          disabled={saving}
                          className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                        >
                          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                          Opslaan
                        </button>
                        <button
                          onClick={() => setEditingTemplate(null)}
                          className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200"
                        >
                          Annuleren
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Notification Log */}
      <div className="bg-white rounded-xl border border-gray-200">
        <button
          onClick={() => setShowLogs(!showLogs)}
          className="flex items-center justify-between w-full p-4 text-left"
        >
          <span className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <History className="w-4 h-4 text-gray-500" />
            Verzonden berichten ({logs.length})
          </span>
          {showLogs ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </button>
        {showLogs && (
          <div className="border-t border-gray-100 divide-y divide-gray-100 max-h-80 overflow-y-auto">
            {logs.length === 0 ? (
              <p className="p-4 text-sm text-gray-500 text-center">Nog geen berichten verzonden</p>
            ) : (
              logs.map((log) => (
                <div key={log.id} className="px-4 py-3 flex items-start gap-3">
                  {log.channel === "email" ? (
                    <Mail className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                  ) : (
                    <MessageCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-700 truncate">{log.recipient}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded ${
                        log.status === "sent"
                          ? "bg-green-50 text-green-700"
                          : "bg-red-50 text-red-700"
                      }`}>
                        {log.status === "sent" ? "Verzonden" : "Mislukt"}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {log.trigger_status} — {new Date(log.created_at).toLocaleString("nl-NL")}
                    </p>
                    {log.error_message && (
                      <p className="text-xs text-red-500 mt-0.5">{log.error_message}</p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
