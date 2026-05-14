export interface SetupStatus {
  configuredDbAccess: boolean;
  tablesReady: boolean;
  details: string;
}

export async function fetchSetupStatus() {
  const response = await fetch("/api/setup/status");

  if (!response.ok) {
    throw new Error("Failed to check setup status.");
  }

  return (await response.json()) as SetupStatus;
}

export async function bootstrapSchema() {
  const response = await fetch("/api/setup/bootstrap", {
    method: "POST",
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as
      | { error?: string }
      | null;
    throw new Error(payload?.error ?? "Failed to bootstrap schema.");
  }

  return (await response.json()) as SetupStatus;
}
