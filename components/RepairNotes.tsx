"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { MessageSquare, Send } from "lucide-react";
import { formatDate } from "@/lib/utils";

type Note = {
  id: string;
  jobid: string;
  note: string;
  created_at: string;
};

interface RepairNotesProps {
  jobid: string;
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function RepairNotes({ jobid }: RepairNotesProps) {
  const router = useRouter();
  const [notes, setNotes] = useState<Note[]>([]);
  const [newNote, setNewNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Fetch notes on mount
  useEffect(() => {
    fetchNotes();
  }, [jobid]);

  const fetchNotes = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("repair_notes")
        .select("*")
        .eq("jobid", jobid)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("❌ Error fetching notes:", error);
        toast.error("Kon notities niet laden");
        return;
      }

      setNotes(data || []);
      console.log(`✅ Loaded ${data?.length || 0} notes for jobid: ${jobid}`);
    } catch (err: any) {
      console.error("❌ Fetch error:", err);
      toast.error("Fout bij laden notities");
    } finally {
      setLoading(false);
    }
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) {
      toast.error("Notitie kan niet leeg zijn");
      return;
    }

    setSubmitting(true);

    try {
      const { data, error } = await supabase
        .from("repair_notes")
        .insert([
          {
            jobid,
            note: newNote.trim(),
            created_at: new Date().toISOString(),
          },
        ])
        .select();

      if (error) {
        console.error("❌ Insert error:", error);
        toast.error("Kon notitie niet opslaan");
        return;
      }

      console.log("✅ Note added successfully");
      toast.success("Notitie toegevoegd");

      // Add the new note to the local list (at the top, since descending)
      if (data && data.length > 0) {
        setNotes([data[0], ...notes]);
      }

      // Clear textarea
      setNewNote("");

      // Refresh server component data
      router.refresh();
    } catch (err: any) {
      console.error("❌ Error:", err);
      toast.error("Fout bij opslaan notitie");
    } finally {
      setSubmitting(false);
    }
  };


  return (
    <Card className="shadow-lg">
      <CardHeader className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-t-lg">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5" />
          <h2 className="text-xl font-bold">📝 Notities</h2>
        </div>
      </CardHeader>

      <CardContent className="space-y-6 pt-6">
        {/* Add Note Section */}
        <div className="space-y-3 bg-blue-50 p-4 rounded-lg border-l-4 border-blue-500">
          <label className="block text-sm font-semibold text-gray-700">
            Nieuwe notitie toevoegen
          </label>
          <Textarea
            placeholder="Typ hier je notitie..."
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            rows={3}
            className="resize-none"
            disabled={submitting}
          />
          <Button
            onClick={handleAddNote}
            disabled={submitting || !newNote.trim()}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold gap-2"
          >
            <Send className="w-4 h-4" />
            {submitting ? "Bezig..." : "Notitie Toevoegen"}
          </Button>
        </div>

        {/* Notes List Section */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-gray-700">
            {loading ? "Laden..." : `Alle notities (${notes.length})`}
          </h3>

          {loading ? (
            <p className="text-gray-500 text-center py-8">⏳ Notities laden...</p>
          ) : notes.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              Geen notities gevonden. Voeg er een toe!
            </p>
          ) : (
            <div className="space-y-3">
              {notes.map((note, index) => (
                <div key={note.id} className="border-l-4 border-gray-300 pl-4 py-2">
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1">
                      <p className="text-sm text-gray-600 font-medium">
                        {formatDate(note.created_at)}
                      </p>
                      <p className="text-gray-800 mt-1 text-sm leading-relaxed">
                        {note.note}
                      </p>
                    </div>
                  </div>

                  {/* Timeline connector (not on last item) */}
                  {index < notes.length - 1 && (
                    <div className="w-0.5 h-4 bg-gray-300 ml-0 mt-2"></div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
