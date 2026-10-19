/** UC-201 · Append one validated movement. Creation is append-only (A-4). */
import type { NewMovement } from "@/backend/modules/movements/domain/validate";
import type {
  LedgerMovement,
  MovementRepository,
} from "@/backend/modules/movements/repositories/movement-repository";

export type AddMovementInput = NewMovement & {
  groupId: string;
  userId: string;
};

export class AddMovement {
  static inject = ["movements"] as const;

  constructor(private readonly movements: MovementRepository) {}

  async execute(input: AddMovementInput): Promise<LedgerMovement> {
    const row = await this.movements.insert(input);
    const author = await this.movements.findAuthorName(input.userId);

    return { ...row, authorId: input.userId, authorName: author ?? "?" };
  }
}
