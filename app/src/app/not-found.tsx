import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md space-y-4 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          No encontramos esta página
        </h1>
        <p className="text-muted-foreground text-sm">
          Puede que el enlace esté mal o que no seas socio de este grupo.
        </p>
        <Button asChild variant="secondary">
          <Link href="/">Ir a mis grupos</Link>
        </Button>
      </div>
    </main>
  );
}
