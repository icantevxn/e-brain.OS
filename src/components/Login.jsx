import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { OfflineError } from "@/lib/remote";

/** The gate in front of the archive. One password, one user. */
export default function Login({ onSubmit }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!password || busy) return;

    setBusy(true);
    setError(null);
    try {
      await onSubmit(password);
    } catch (err) {
      setError(
        err instanceof OfflineError
          ? "Can't reach the server"
          : "That isn't the password"
      );
      setPassword("");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex h-full flex-col items-center justify-center gap-8 px-6">
      <div className="text-center">
        <h1 className="font-display text-5xl leading-none tracking-tight sm:text-6xl">
          e-brain<span className="text-muted-foreground">.OS</span>
        </h1>
        <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          Personal taste archive
        </p>
      </div>

      <form onSubmit={submit} className="w-full max-w-xs space-y-3">
        <Label
          htmlFor="password"
          className="font-mono text-[10px] uppercase tracking-[0.18em]"
        >
          Password
        </Label>
        <Input
          id="password"
          type="password"
          value={password}
          autoFocus
          autoComplete="current-password"
          onChange={(e) => setPassword(e.target.value)}
        />

        {error && (
          <p role="alert" className="font-mono text-[10px] uppercase tracking-[0.15em] text-destructive">
            {error}
          </p>
        )}

        <Button
          type="submit"
          disabled={!password || busy}
          className="w-full font-mono text-[10px] uppercase tracking-[0.15em]"
        >
          {busy ? "Checking…" : "Enter"}
        </Button>
      </form>
    </div>
  );
}
