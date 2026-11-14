/**
 * Says how many partners a group has, the way the app shows it.
 *
 * @param count - The number of members.
 * @returns "solo tú" for one, otherwise "N socios".
 */
export function membersLabel(count: number): string {
  return count === 1 ? "solo tú" : `${count} socios`;
}
