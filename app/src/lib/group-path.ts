/**
 * Builds the URL of a page inside one group.
 *
 * @param groupId - The group.
 * @param path - The page within the group, starting with "/", or nothing for
 *   its panel.
 * @returns The absolute path, such as "/g/abc/prestamos".
 */
export function groupPath(groupId: string, path = ""): string {
  return `/g/${groupId}${path}`;
}
