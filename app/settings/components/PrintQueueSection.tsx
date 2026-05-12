"use client";

import { useState, useEffect, useCallback } from "react";
import { Printer, Plus, Trash2, Copy, CheckCircle, XCircle, Loader2, Monitor, RefreshCw, Download } from "lucide-react";
import { toast } from "sonner";

interface PrintAgent {
  id: string;
  name: string;
  api_key: string;
  printer_name: string | null;
  last_seen_at: string | null;
  is_online: boolean;
  created_at: string;
}

interface PrintJob {
  id: string;
  job_type: string;
  reference_id: string | null;
  status: string;
  error_message: string | null;
  created_at: string;
  printed_at: string | null;
}

export default function PrintQueueSection() {
  const [agents, setAgents] = useState<PrintAgent[]>([]);
  const [recentJobs, setRecentJobs] = useState<PrintJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newAgentName, setNewAgentName] = useState("");
  const [showApiKey, setShowApiKey] = useState<string | null>(null);
  const [jobTypeFilter, setJobTypeFilter] = useState<string>("all");

  const fetchAgents = useCallback(async () => {
    try {
      const res = await fetch("/api/print-queue/agents");
      if (res.ok) {
        const data = await res.json();
        setAgents(data.agents || []);
      }
    } catch {}
  }, []);

  const fetchJobs = useCallback(async () => {
    try {
      const res = await fetch("/api/print-queue");
      if (res.ok) {
        const data = await res.json();
        setRecentJobs(data.jobs || []);
      }
    } catch {}
  }, []);

  useEffect(() => {
    Promise.all([fetchAgents(), fetchJobs()]).finally(() => setLoading(false));
  }, [fetchAgents, fetchJobs]);

  const handleCreateAgent = async () => {
    if (!newAgentName.trim()) {
      toast.error("Geef de agent een naam");
      return;
    }
    setCreating(true);
    try {
      const res = await fetch("/api/print-queue/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newAgentName.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Print Agent aangemaakt!");
        setNewAgentName("");
        setShowApiKey(data.agent.id);
        fetchAgents();
      } else {
        toast.error(data.error || "Aanmaken mislukt");
      }
    } catch {
      toast.error("Serverfout");
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteAgent = async (id: string) => {
    if (!confirm("Weet je zeker dat je deze agent wilt verwijderen?")) return;
    try {
      const res = await fetch("/api/print-queue/agents", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        toast.success("Agent verwijderd");
        fetchAgents();
      }
    } catch {
      toast.error("Verwijderen mislukt");
    }
  };

  const copyApiKey = async (key: string) => {
    await navigator.clipboard.writeText(key);
    toast.success("API key gekopieerd!");
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded text-xs font-medium">Wachtend</span>;
      case "printing":
        return <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium">Bezig...</span>;
      case "printed":
        return <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs font-medium">Geprint</span>;
      case "failed":
        return <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs font-medium">Mislukt</span>;
      default:
        return <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs font-medium">{status}</span>;
    }
  };

  const timeAgo = (dateStr: string | null) => {
    if (!dateStr) return "Nooit";
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Zojuist";
    if (mins < 60) return `${mins}m geleden`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}u geleden`;
    return `${Math.floor(hours / 24)}d geleden`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Printer className="w-5 h-5 text-blue-600" />
          Print Queue
        </h3>
        <p className="text-sm text-gray-600 mt-1">
          Print labels via USB-printer vanuit elke locatie
        </p>
      </div>

      {/* How it works */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-medium text-blue-900 mb-2">Hoe werkt het?</h4>
        <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
          <li>Maak hieronder een Print Agent aan</li>
          <li>Download de Print Agent app op je PC met de USB-printer</li>
          <li>Vul de API key in bij de app</li>
          <li>Print vanuit je telefoon — de label komt uit de printer op je PC!</li>
        </ol>
      </div>

      {/* Create Agent */}
      <div className="border border-gray-200 rounded-lg p-4">
        <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Nieuwe Print Agent
        </h4>
        <div className="flex gap-2">
          <input
            type="text"
            value={newAgentName}
            onChange={(e) => setNewAgentName(e.target.value)}
            placeholder="Naam (bijv. Winkel Printer, Thuiskantoor)"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            onKeyDown={(e) => e.key === "Enter" && handleCreateAgent()}
          />
          <button
            onClick={handleCreateAgent}
            disabled={creating}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:bg-gray-300 flex items-center gap-2"
          >
            {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Aanmaken
          </button>
        </div>
      </div>

      {/* Agents List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="font-medium text-gray-900">Geregistreerde Printers ({agents.length})</h4>
          <button onClick={fetchAgents} className="text-gray-400 hover:text-gray-600">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {agents.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Monitor className="w-10 h-10 mx-auto mb-2 text-gray-300" />
            <p className="font-medium">Geen print agents</p>
            <p className="text-sm">Maak er een aan om te starten</p>
          </div>
        ) : (
          agents.map((agent) => (
            <div key={agent.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${agent.is_online ? "bg-green-500" : "bg-gray-300"}`} />
                  <div>
                    <p className="font-medium text-gray-900">{agent.name}</p>
                    <p className="text-xs text-gray-500">
                      {agent.is_online ? "Online" : "Offline"} · Laatst gezien: {timeAgo(agent.last_seen_at)}
                      {agent.printer_name && ` · ${agent.printer_name}`}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleDeleteAgent(agent.id)}
                  className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                  title="Verwijderen"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* API Key */}
              <div className="mt-3 bg-gray-50 rounded-lg p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-gray-600">API Key</span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setShowApiKey(showApiKey === agent.id ? null : agent.id)}
                      className="text-xs text-blue-600 hover:underline"
                    >
                      {showApiKey === agent.id ? "Verbergen" : "Tonen"}
                    </button>
                    <button
                      onClick={() => copyApiKey(agent.api_key)}
                      className="p-1 text-gray-400 hover:text-blue-600"
                      title="Kopiëren"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <code className="text-xs text-gray-700 break-all">
                  {showApiKey === agent.id ? agent.api_key : "pa_" + "•".repeat(40)}
                </code>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Download Agent */}
      {agents.length > 0 && (
        <div className="border border-dashed border-gray-300 rounded-lg p-4 bg-gray-50">
          <h4 className="font-medium text-gray-900 flex items-center gap-2 mb-2">
            <Download className="w-4 h-4" />
            Print Agent Downloaden
          </h4>
          <p className="text-sm text-gray-600 mb-3">
            Download en installeer de Print Agent op de PC waar je Brother labelprinter aan hangt.
          </p>
          <a
            href="/print-agent/ddk-print-agent.zip"
            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800"
          >
            <Download className="w-4 h-4" />
            Download voor Windows
          </a>
        </div>
      )}

      {/* Recent Print Jobs */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="font-medium text-gray-900">Recente Printjobs</h4>
          <div className="flex items-center gap-2">
            <select
              value={jobTypeFilter}
              onChange={(e) => setJobTypeFilter(e.target.value)}
              className="text-xs border border-gray-200 rounded-md px-2 py-1 bg-white text-gray-700"
            >
              <option value="all">Alle types</option>
              <option value="repair_label">Reparatie</option>
              <option value="part_label">Onderdeel</option>
              <option value="refurbished_label">Refurbished</option>
              <option value="apk_label">APK</option>
              <option value="accessory_label">Accessoire</option>
            </select>
            <button onClick={fetchJobs} className="text-gray-400 hover:text-gray-600">
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {recentJobs.length === 0 ? (
          <p className="text-sm text-gray-500 py-4 text-center">Nog geen printjobs</p>
        ) : (
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="divide-y divide-gray-100">
              {recentJobs.filter(j => jobTypeFilter === "all" || j.job_type === jobTypeFilter).slice(0, 20).map((job) => {
                const typeMap: Record<string, { label: string; color: string }> = {
                  repair_label: { label: "Reparatie", color: "bg-blue-100 text-blue-800" },
                  part_label: { label: "Onderdeel", color: "bg-purple-100 text-purple-800" },
                  refurbished_label: { label: "Refurbished", color: "bg-cyan-100 text-cyan-800" },
                  apk_label: { label: "APK", color: "bg-amber-100 text-amber-800" },
                  accessory_label: { label: "Accessoire", color: "bg-pink-100 text-pink-800" },
                };
                const typeInfo = typeMap[job.job_type] || { label: job.job_type, color: "bg-gray-100 text-gray-700" };
                return (
                <div key={job.id} className="px-4 py-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {job.status === "printed" ? (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    ) : job.status === "failed" ? (
                      <XCircle className="w-4 h-4 text-red-500" />
                    ) : (
                      <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
                    )}
                    <div>
                      <p className="text-sm text-gray-900 flex items-center gap-2">
                        <span className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full ${typeInfo.color}`}>
                          {typeInfo.label}
                        </span>
                        {job.reference_id && <span className="text-gray-400">#{job.reference_id}</span>}
                      </p>
                      {job.error_message && (
                        <p className="text-xs text-red-500">{job.error_message}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {getStatusBadge(job.status)}
                    <span className="text-xs text-gray-400">{timeAgo(job.created_at)}</span>
                  </div>
                </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
