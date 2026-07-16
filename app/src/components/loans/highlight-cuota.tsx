"use client";
/**
 * When arriving from a cobro row (`?cuota=<id>`), scroll to that cuota and flash
 * it for a moment so the user finds the "Anular" option — then strip the param
 * so a refresh doesn't re-flash. Renders nothing.
 */
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

export function HighlightCuota({ targetId }: { targetId: string | null }) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!targetId) return;
    const el = document.getElementById(`cuota-${targetId}`);
    if (!el) return;

    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.classList.add("cuota-flash");
    const done = setTimeout(() => {
      el.classList.remove("cuota-flash");
      router.replace(pathname, { scroll: false });
    }, 1600);

    return () => clearTimeout(done);
  }, [targetId, pathname, router]);

  return null;
}
