import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getDictionary } from "@/i18n/get-dictionary";

export default async function NotFound() {
  const t = (await getDictionary()).notFound;

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md space-y-4 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">{t.title}</h1>
        <p className="text-muted-foreground text-sm">{t.body}</p>
        <Button asChild variant="secondary">
          <Link href="/">{t.back}</Link>
        </Button>
      </div>
    </main>
  );
}
