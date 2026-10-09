export function createHeaderEntranceTracker() {
  const visitedHomes = new Set<string>();

  return (pathname: string, homePath: string) => {
    if (pathname !== homePath || visitedHomes.has(homePath)) return false;
    visitedHomes.add(homePath);
    return true;
  };
}
