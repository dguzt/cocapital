/** Every undecided change of the group — the approvals banner reads this. */
import type {
  ChangeRepository,
  PendingChangeItem,
} from "../repositories/change-repository";

export type { PendingChangeItem };

export type ListPendingChangesInput = {
  groupId: string;
};

export class ListPendingChanges {
  static inject = ["changes"] as const;

  constructor(private readonly changes: ChangeRepository) {}

  async execute(input: ListPendingChangesInput): Promise<PendingChangeItem[]> {
    return this.changes.listPending(input.groupId);
  }
}
