"use client";

import { Loader2 } from "lucide-react";
import { useState, useTransition } from "react";
import { loadMoreActivityAction } from "@/backend/application/activity-actions";
import type { ActivityPage } from "@/backend/application/activity-page";
import { useGroup } from "@/components/groups/group-context";
import { Button } from "@/components/ui/button";
import { useDictionary } from "@/i18n/i18n-provider";
import type { ISODate } from "@/lib/dates";
import { ActivityFeed } from "./activity-feed";
import { ActivityTable } from "./activity-table";

/**
 * The activity, one page at a time: the first page comes from the server and
 * "Ver más" appends the older ones.
 *
 * @param first - The first page.
 * @param today - Today's date in Lima.
 * @param pendingIds - Movements waiting for an OK.
 */
export function ActivityList({
  first,
  today,
  pendingIds,
}: {
  first: ActivityPage;
  today: ISODate;
  pendingIds: string[];
}) {
  const { groupId } = useGroup();
  const t = useDictionary().activity;
  const [pending, startTransition] = useTransition();
  const [loaded, setLoaded] = useState({ first, more: [] as ActivityPage[] });

  if (loaded.first !== first) {
    setLoaded({ first, more: [] });
  }

  const pages = [first, ...loaded.more];
  const movements = pages.flatMap((page) => page.movements);
  const planChanges = pages.flatMap((page) => page.planChanges);
  const next = pages.at(-1)?.next ?? null;

  const loadMore = () => {
    if (!next) {
      return;
    }

    startTransition(async () => {
      const page = await loadMoreActivityAction(groupId, next);

      setLoaded((current) =>
        current.first === first
          ? { first, more: [...current.more, page] }
          : current,
      );
    });
  };

  return (
    <>
      <div className="hidden overflow-x-auto md:block">
        <ActivityTable
          movements={movements}
          planChanges={planChanges}
          today={today}
          pendingIds={pendingIds}
        />
      </div>
      <div className="md:hidden">
        <ActivityFeed
          movements={movements}
          planChanges={planChanges}
          today={today}
          pendingIds={pendingIds}
        />
      </div>
      {next && (
        <div className="mt-4 flex justify-center">
          <Button variant="outline" onClick={loadMore} disabled={pending}>
            {pending && <Loader2 className="size-4 animate-spin" />}
            {t.loadMore}
          </Button>
        </div>
      )}
    </>
  );
}
