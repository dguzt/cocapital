/** The code a partner shares so another partner can join the group. */
export class InviteCode {
  static readonly LENGTH = 8;

  private static readonly ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

  private constructor(readonly value: string) {}

  /**
   * Generates a new invite code.
   *
   * @param randomBytes - Source of randomness; tests pass fixed bytes.
   * @returns A code of 8 characters from the unambiguous alphabet.
   */
  static generate(randomBytes = InviteCode.randomBytes()): InviteCode {
    const chars = Array.from(
      randomBytes.slice(0, InviteCode.LENGTH),
      (byte) => InviteCode.ALPHABET[byte % InviteCode.ALPHABET.length],
    );

    return new InviteCode(chars.join(""));
  }

  /**
   * Reads a code the partner typed or received in a link.
   *
   * @param raw - The code as written, in any case and with stray spaces.
   * @returns The code trimmed and in upper case.
   */
  static from(raw: string): InviteCode {
    return new InviteCode(raw.trim().toUpperCase());
  }

  private static randomBytes(): Uint8Array {
    const bytes = new Uint8Array(InviteCode.LENGTH);

    crypto.getRandomValues(bytes);

    return bytes;
  }
}
