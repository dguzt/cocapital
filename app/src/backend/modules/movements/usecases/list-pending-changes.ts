import type { PendingChangeItem } from "@/backend/modules/movements/domain/pending-change-item";
import type { ChangeRepository } from "@/backend/modules/movements/ports/change-repository";

export type ListPendingChangesInput = {
  groupId: string;
};

/** Reads the changes of a group that still wait for a partner's OK. */
export class ListPendingChanges {
  static inject = ["changes"] as const;

  constructor(private readonly changes: ChangeRepository) {}

  /**
   * Lists the pending changes.
   *
   * @param input - The group.
   * @returns The undecided changes, newest first.
   */
  async execute(input: ListPendingChangesInput): Promise<PendingChangeItem[]> {
    return this.changes.listPending(input.groupId);
  }
}
