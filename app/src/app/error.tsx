"use client";
/**
 * Security L3: a controlled error boundary. Renders a generic message and
 * logs the error client-side only — never surfaces stack traces, DB errors,
 * or the identifier-bearing `message` fields from the domain layer.
 */
import { Button } from "@/components/ui/button";

export default function ErrorBoundary({
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md space-y-4 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          Algo salió mal
        </h1>
        <p className="text-muted-foreground text-sm">
          No pudimos completar la acción. Vuelve a intentarlo en un momento.
        </p>
        <Button onClick={reset}>Reintentar</Button>
      </div>
    </main>
  );
}
