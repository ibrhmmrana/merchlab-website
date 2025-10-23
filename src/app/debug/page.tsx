"use client";
import { useEffect, useState } from "react";

export default function DebugPage() {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/debug/supabase")
      .then(r => r.json())
      .then(setData)
      .catch(e => setErr(String(e)));
  }, []);

  return (
    <pre className="max-w-4xl mx-auto p-4 text-sm overflow-auto">
      {err ? err : JSON.stringify(data, null, 2)}
    </pre>
  );
}
