import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import type { DimensionRow, RunRow } from "../types";
import ProcessingView from "../components/ProcessingView";
import CompletedReport from "../components/CompletedReport";
import ErrorView from "../components/ErrorView";

export default function RunPage() {
  const { id } = useParams<{ id: string }>();
  const [run, setRun] = useState<RunRow | null>(null);
  const [dimensions, setDimensions] = useState<DimensionRow[]>([]);
  const [notFound, setNotFound] = useState(false);

  // Initial fetch — handles "close browser, come back later" (PRD §19):
  // reopening the URL always shows the current state, not a blank page.
  useEffect(() => {
    if (!id) return;
    supabase
      .from("runs")
      .select("*")
      .eq("id", id)
      .single()
      .then(({ data, error }) => {
        if (error || !data) setNotFound(true);
        else setRun(data as RunRow);
      });
  }, [id]);

  // Live updates while processing — no polling needed.
  useEffect(() => {
    if (!id) return;
    const channel = supabase
      .channel(`run-${id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "runs", filter: `id=eq.${id}` },
        (payload) => setRun(payload.new as RunRow),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [id]);

  // Once completed, fetch the 12 dimension rows.
  useEffect(() => {
    if (!id || run?.status !== "completed") return;
    supabase
      .from("evaluation_dimensions")
      .select("*")
      .eq("run_id", id)
      .then(({ data }) => setDimensions((data as DimensionRow[]) ?? []));
  }, [id, run?.status]);

  if (notFound) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-16">
        <p className="text-ink">No evaluation found at this URL.</p>
      </div>
    );
  }
  if (!run) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-16">
        <p className="text-muted">Loading…</p>
      </div>
    );
  }
  if (run.status === "failed") {
    return <ErrorView run={run} />;
  }
  if (run.status === "completed") {
    return <CompletedReport run={run} dimensions={dimensions} />;
  }
  return <ProcessingView run={run} />;
}
