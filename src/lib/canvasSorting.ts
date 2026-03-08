export type SortMode = "street_groups" | "default";

export const SORT_MODE_LABELS: Record<SortMode, string> = {
  default: "Database Order",
  street_groups: "Street Groups (Odd/Even)",
};

interface ParsedAddress {
  houseNumber: number | null;
  streetName: string;
  original: string;
}

function parseAddress(address: string): ParsedAddress {
  const match = address.match(/^(\d+)\s+(.+)$/);
  if (match) {
    return {
      houseNumber: parseInt(match[1], 10),
      streetName: match[2].trim().toLowerCase(),
      original: address,
    };
  }
  return { houseNumber: null, streetName: address.trim().toLowerCase(), original: address };
}

function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

function sortChunkOddEven<T>(chunk: T[], getNum: (item: T) => number): T[] {
  const odds = chunk.filter((item) => getNum(item) % 2 !== 0).sort((a, b) => getNum(a) - getNum(b));
  const evens = chunk.filter((item) => getNum(item) % 2 === 0).sort((a, b) => getNum(a) - getNum(b));
  return [...odds, ...evens];
}

export interface StreetGroupInfo {
  streetName: string;
  chunkIndex: number;
  totalChunks: number;
}

/**
 * Sorts locations by street name groups with odd/even ordering within chunks of 10.
 * Returns the sorted array and a parallel array of group info for each location.
 */
export function sortLocationsByStreetGroups<T extends { address: string }>(
  locations: T[]
): { sorted: T[]; groupInfo: StreetGroupInfo[] } {
  const parsed = locations.map((loc) => ({ loc, parsed: parseAddress(loc.address) }));

  // Separate into numbered and unnumbered
  const numbered = parsed.filter((p) => p.parsed.houseNumber !== null);
  const unnumbered = parsed.filter((p) => p.parsed.houseNumber === null);

  // Group numbered by street name
  const streetMap = new Map<string, typeof numbered>();
  for (const entry of numbered) {
    const key = entry.parsed.streetName;
    if (!streetMap.has(key)) streetMap.set(key, []);
    streetMap.get(key)!.push(entry);
  }

  const sortedStreets = [...streetMap.keys()].sort();

  const result: T[] = [];
  const groupInfo: StreetGroupInfo[] = [];

  for (const street of sortedStreets) {
    const entries = streetMap.get(street)!;
    // Sort by house number ascending first
    entries.sort((a, b) => a.parsed.houseNumber! - b.parsed.houseNumber!);

    const chunks = chunkArray(entries, 10);
    // Find display name from first entry's original parsed street
    const displayName = entries[0].parsed.original.replace(/^\d+\s+/, "");

    for (let ci = 0; ci < chunks.length; ci++) {
      const sorted = sortChunkOddEven(chunks[ci], (e) => e.parsed.houseNumber!);
      for (const entry of sorted) {
        result.push(entry.loc);
        groupInfo.push({
          streetName: displayName,
          chunkIndex: ci + 1,
          totalChunks: chunks.length,
        });
      }
    }
  }

  // Append unnumbered at the end
  for (const entry of unnumbered) {
    result.push(entry.loc);
    groupInfo.push({ streetName: "Other", chunkIndex: 1, totalChunks: 1 });
  }

  return { sorted: result, groupInfo };
}
