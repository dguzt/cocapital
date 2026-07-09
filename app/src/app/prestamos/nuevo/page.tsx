import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { requireUser } from "@/backend/modules/accounts/current-user";
import { findGroupOf } from "@/backend/modules/groups/data";
import { listBorrowers } from "@/backend/modules/loans/data";
import { LoanWizard } from "@/components/loans/loan-wizard";
import { Button } from "@/components/ui/button";

export default async function NewLoanPage() {
  const user = await requireUser();
  const group = await findGroupOf(user.id);
  if (!group) return null;
  const borrowers = await listBorrowers(group.id);

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-5 p-4 pt-8 md:p-8">
      <header className="flex items-center gap-3">
        <Button asChild variant="ghost" size="icon">
          <Link href="/prestamos" aria-label="Volver a préstamos">
            <ArrowLeft className="size-5" />
          </Link>
        </Button>
        <div>
          <h1 className="font-semibold text-xl leading-tight">
            Nuevo préstamo
          </h1>
          <p className="text-[13px] text-muted-foreground">
            El cronograma se calcula solo — tú solo confirmas.
          </p>
        </div>
      </header>
      <LoanWizard borrowers={borrowers} />
    </div>
  );
}
