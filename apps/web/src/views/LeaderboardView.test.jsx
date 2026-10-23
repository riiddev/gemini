import { act, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  api: vi.fn(),
  playClick: vi.fn(),
  userId: "leaderboard-race-user-a",
}));

vi.mock("../context/AppContext", () => ({
  useApp: () => ({ user: { id: mocks.userId } }),
}));
vi.mock("../lib/api", () => ({ api: mocks.api }));
vi.mock("../utils/audioFeedback", () => ({
  sound: { playClick: mocks.playClick },
}));

import { LeaderboardView } from "./LeaderboardView";

function deferred() {
  let resolve;
  const promise = new Promise((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

beforeEach(() => {
  mocks.api.mockReset();
  mocks.playClick.mockReset();
  mocks.userId = "leaderboard-race-user-a";
});

it("ignores a previous account's leaderboard response after the current user changes", async () => {
  const oldRequest = deferred();
  const currentRequest = deferred();
  mocks.api
    .mockReturnValueOnce(oldRequest.promise)
    .mockReturnValueOnce(currentRequest.promise);

  const { rerender } = render(<LeaderboardView />);
  await waitFor(() => expect(mocks.api).toHaveBeenCalledTimes(1));

  mocks.userId = "leaderboard-race-user-b";
  rerender(<LeaderboardView />);
  await waitFor(() => expect(mocks.api).toHaveBeenCalledTimes(2));

  await act(async () => {
    currentRequest.resolve({
      entries: [],
      meta: { periodStart: "current-account-result", periodEnd: "current-end" },
    });
  });
  expect(await screen.findByText(/current-account-result/)).toBeTruthy();

  await act(async () => {
    oldRequest.resolve({
      entries: [],
      meta: { periodStart: "stale-account-result", periodEnd: "stale-end" },
    });
  });

  expect(screen.getByText(/current-account-result/)).toBeTruthy();
  expect(screen.queryByText(/stale-account-result/)).toBeNull();
});
