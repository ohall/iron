import type { SetupStatus } from "../lib/setup";

interface SetupPanelProps {
  bootstrapping: boolean;
  onBootstrap: () => Promise<void>;
  status: SetupStatus | null;
}

export function SetupPanel({ bootstrapping, onBootstrap, status }: SetupPanelProps) {
  return (
    <section className="panel">
      <div className="section-label">Supabase Setup Needed</div>
      <h3>Database tables are missing</h3>
      <p className="muted-copy">
        The app can reach Supabase, but `programs` and `exercise_logs` do not exist yet.
      </p>
      <p className="muted-copy">
        {status?.details ??
          "Apply supabase/schema.sql manually, or provide SUPABASE_DB_URL so the server can bootstrap it for you."}
      </p>
      <div className="detail-actions">
        <button
          className="cta-button cta-button--small"
          disabled={!status?.configuredDbAccess || bootstrapping}
          onClick={() => void onBootstrap()}
          type="button"
        >
          {bootstrapping ? "bootstrapping..." : "bootstrap schema"}
        </button>
      </div>
      <p className="muted-copy">
        Manual path: run the SQL in [supabase/schema.sql](/Users/oakley/Documents/projects/iron/supabase/schema.sql:1).
      </p>
    </section>
  );
}
