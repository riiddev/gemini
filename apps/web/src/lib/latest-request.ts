/**
 * Prevents async results from older requests (or an unmounted view) from
 * overwriting data belonging to the current request.
 */
export function createLatestRequestGate() {
  let latest = 0;

  return {
    begin() {
      latest += 1;
      return latest;
    },
    isCurrent(requestId: number) {
      return requestId === latest;
    },
    invalidate() {
      latest += 1;
    },
  };
}
