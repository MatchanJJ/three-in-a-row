"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { FormEvent, KeyboardEvent } from "react";
import type { RoomView } from "../lib/rooms";
import { getResult } from "../lib/game.mjs";
import { authClient } from "../lib/auth/client";
import WinCelebration from "./win-celebration";

type Profile = {
  player: { name: string; kind: "guest" | "account" } | null;
  stats?: { wins: number; losses: number; draws: number } | null;
  configured: boolean;
  accounts: boolean;
};
class RequestError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}
async function api<T>(
  url: string,
  body?: object,
  method = "POST",
  signal?: AbortSignal,
): Promise<T> {
  const response = await fetch(url, {
    method: body ? method : "GET",
    cache: "no-store",
    signal,
    headers: body ? { "Content-Type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await response.json();
  if (!response.ok)
    throw new RequestError(
      data.error || "Something went wrong. Try again.",
      response.status,
    );
  return data;
}
function message(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Connection interrupted. Please try again.";
}
function OnlineMark({ value }: { value: string }) {
  return (
    <svg
      className={`mark ${value.toLowerCase()}`}
      viewBox="0 0 64 64"
      fill="none"
      aria-hidden="true"
    >
      {value === "X" ? (
        <path d="M17 17 47 47M47 17 17 47" />
      ) : (
        <circle cx="32" cy="32" r="21" />
      )}
    </svg>
  );
}

function PlayerAccess({
  profile,
  refresh,
}: {
  profile: Profile;
  refresh: () => Promise<void>;
}) {
  const [view, setView] = useState<"guest" | "signin" | "signup">("guest");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fields = new FormData(event.currentTarget);
    setBusy(true);
    setError("");
    try {
      const name = String(fields.get("name") || "").trim();
      const email = String(fields.get("email") || "").trim();
      const password = String(fields.get("password") || "");
      if (view === "guest") await api("/api/player", { name });
      else {
        const result =
          view === "signin"
            ? await authClient.signIn.email({ email, password })
            : await authClient.signUp.email({ email, password, name });
        if (result.error)
          throw new Error(
            result.error.message || "Couldn't sign in. Check your details.",
          );
      }
      await refresh();
      setView("guest");
    } catch (error) {
      setError(message(error));
    } finally {
      setBusy(false);
    }
  }
  async function signOut() {
    setBusy(true);
    setError("");
    try {
      const { error } = await authClient.signOut();
      if (error) throw new Error(error.message || "Couldn't sign out.");
      await refresh();
      setView("guest");
    } catch (error) {
      setError(message(error));
    } finally {
      setBusy(false);
    }
  }
  if (profile.player?.kind === "account")
    return (
      <div className="account-summary">
        <span className="eyebrow">YOUR PLAYER CARD</span>
        <h2>Hey, {profile.player.name}.</h2>
        <p>Your online record follows your account.</p>
        <div className="account-stats">
          <span>
            <strong>{profile.stats?.wins || 0}</strong> wins
          </span>
          <span>
            <strong>{profile.stats?.losses || 0}</strong> losses
          </span>
          <span>
            <strong>{profile.stats?.draws || 0}</strong> draws
          </span>
        </div>
        <button className="text-button" disabled={busy} onClick={signOut}>
          {busy ? "Signing out…" : "Sign out"}
        </button>
        {error && (
          <p className="online-error" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  return (
    <div className="player-access">
      <span className="eyebrow">
        {profile.player
          ? `PLAYING AS ${profile.player.name}`
          : "FIRST, PICK YOUR PLAYER"}
      </span>
      <h2>
        {view === "signin"
          ? "Welcome back."
          : view === "signup"
            ? "Make it official."
            : profile.player
              ? "Guest mode. Full rivalry."
              : "A name for the scoreboard."}
      </h2>
      <p>
        {view === "guest"
          ? "No account needed. Sign up anytime to keep an online win/loss record."
          : "Your account keeps your online wins, losses, and draws."}
      </p>
      <div className="access-tabs" role="group" aria-label="Player access">
        <button
          type="button"
          aria-pressed={view === "guest"}
          onClick={() => {
            setView("guest");
            setError("");
          }}
        >
          Guest
        </button>
        {profile.accounts && (
          <>
            <button
              type="button"
              aria-pressed={view === "signin"}
              onClick={() => {
                setView("signin");
                setError("");
              }}
            >
              Sign in
            </button>
            <button
              type="button"
              aria-pressed={view === "signup"}
              onClick={() => {
                setView("signup");
                setError("");
              }}
            >
              Create account
            </button>
          </>
        )}
      </div>
      {(view !== "guest" || !profile.player) && (
        <form onSubmit={submit} className="access-form" key={view}>
          {view !== "signin" && (
            <label>
              Display name
              <input
                name="name"
                minLength={2}
                maxLength={24}
                autoComplete="nickname"
                placeholder="e.g. Jade"
                required
              />
            </label>
          )}
          {view !== "guest" && (
            <>
              <label>
                Email
                <input
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                />
              </label>
              <label>
                Password
                <input
                  name="password"
                  type="password"
                  minLength={8}
                  maxLength={128}
                  autoComplete={
                    view === "signup" ? "new-password" : "current-password"
                  }
                  required
                />
              </label>
            </>
          )}
          <button className="new-game" disabled={busy}>
            {busy
              ? "Taking your seat…"
              : view === "guest"
                ? "Continue as guest →"
                : view === "signin"
                  ? "Sign in →"
                  : "Create account →"}
          </button>
        </form>
      )}
      {error && (
        <p className="online-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export default function OnlineGame() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [room, setRoom] = useState<RoomView | null>(null);
  const [error, setError] = useState("");
  const [connection, setConnection] = useState("Connecting…");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [replay, setReplay] = useState(0);
  const cells = useRef<(HTMLButtonElement | null)[]>([]);

  const refreshProfile = useCallback(async () => {
    setProfile(await api<Profile>("/api/player"));
  }, []);
  const accept = useCallback((next: RoomView) => {
    setRoom((previous) =>
      previous?.code === next.code && previous.revision > next.revision
        ? previous
        : next,
    );
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    api<Profile>("/api/player", undefined, "GET", controller.signal)
      .then(setProfile)
      .catch((error) => {
        if (!controller.signal.aborted) setError(message(error));
      });
    return () => controller.abort();
  }, []);
  useEffect(() => {
    if (!profile?.player || room) return;
    const saved = sessionStorage.getItem("little-games-room");
    if (!saved) return;
    const controller = new AbortController();
    api<RoomView>(`/api/rooms/${saved}`, undefined, "GET", controller.signal)
      .then((next) => {
        accept(next);
      })
      .catch((error) => {
        if (!controller.signal.aborted) {
          sessionStorage.removeItem("little-games-room");
          setError(message(error));
        }
      });
    return () => controller.abort();
  }, [profile?.player, room, accept]);

  const code = room?.code;
  useEffect(() => {
    if (!code) return;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    async function poll() {
      try {
        if (!document.hidden) {
          const next = await api<RoomView>(
            `/api/rooms/${code}`,
            undefined,
            "GET",
            controller.signal,
          );
          accept(next);
          setConnection("Connected · live updates");
          if (next.closed) {
            setConnection("Room closed");
            return;
          }
        }
      } catch (error) {
        if (controller.signal.aborted) return;
        setConnection("Connection interrupted · retrying…");
        if (
          error instanceof RequestError &&
          [401, 403, 404].includes(error.status)
        ) {
          setError(message(error));
          setRoom((previous) =>
            previous ? { ...previous, closed: true } : previous,
          );
          return;
        }
      }
      if (!controller.signal.aborted)
        timer = setTimeout(poll, document.hidden ? 5000 : 1500);
    }
    void poll();
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [code, accept]);

  async function enter(action: "create" | "join", joinCode?: string) {
    setBusy(true);
    setError("");
    setCopied(false);
    try {
      const next = await api<RoomView>("/api/rooms", {
        action,
        code: joinCode,
      });
      accept(next);
      sessionStorage.setItem("little-games-room", next.code);
    } catch (error) {
      setError(message(error));
    } finally {
      setBusy(false);
    }
  }
  async function act(action: "play" | "rematch" | "leave", index?: number) {
    if (!room || busy) return;
    setBusy(true);
    setError("");
    try {
      const next = await api<RoomView>(
        `/api/rooms/${room.code}`,
        { action, index, revision: room.revision },
        "PATCH",
      );
      accept(next);
      if (action === "leave") backToLobby();
      if (getResult(next.game.board).winner || getResult(next.game.board).draw)
        await refreshProfile();
    } catch (error) {
      setError(message(error));
      if (error instanceof RequestError && error.status === 409) {
        try {
          accept(await api<RoomView>(`/api/rooms/${room.code}`));
        } catch {
          /* Polling will reconnect. */
        }
      }
    } finally {
      setBusy(false);
    }
  }
  function backToLobby() {
    sessionStorage.removeItem("little-games-room");
    setRoom(null);
    setConfirmLeave(false);
    setError("");
    void refreshProfile().catch((error) => setError(message(error)));
  }
  function navigate(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const offsets: Record<string, number> = {
      ArrowRight: 1,
      ArrowLeft: 8,
      ArrowDown: 3,
      ArrowUp: 6,
    };
    if (!(event.key in offsets)) return;
    event.preventDefault();
    cells.current[(index + offsets[event.key]) % 9]?.focus();
  }
  async function copyCode() {
    if (!room) return;
    try {
      await navigator.clipboard.writeText(room.code);
      setCopied(true);
    } catch {
      setError("Copy the room code shown above and send it to your friend.");
    }
  }

  if (!profile)
    return (
      <div className="online-loading" role="status">
        {error || "Getting the lounge ready…"}
        {error && (
          <button
            className="text-button"
            onClick={() => {
              setError("");
              void refreshProfile().catch((error) => setError(message(error)));
            }}
          >
            Retry connection
          </button>
        )}
      </div>
    );
  if (!profile.configured)
    return (
      <div className="online-loading">
        Online play needs its database connection. You can play locally right
        now.
      </div>
    );

  if (!room)
    return (
      <section className="online-lobby" aria-label="Online lounge">
        <PlayerAccess profile={profile} refresh={refreshProfile} />
        <div className="room-entry">
          <span className="eyebrow">LONG DISTANCE. SAME RIVALRY.</span>
          <h2>Send a code. Settle the score.</h2>
          <p>
            Create a private room, share its code, and play from two different
            devices.
          </p>
          <button
            className="new-game"
            disabled={!profile.player || busy}
            onClick={() => enter("create")}
          >
            {busy ? "One moment…" : "Create a room →"}
          </button>
          <div className="or-divider">OR JOIN A FRIEND</div>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              const code = String(
                new FormData(event.currentTarget).get("code") || "",
              )
                .trim()
                .toUpperCase();
              void enter("join", code);
            }}
          >
            <label htmlFor="room-code">Room code</label>
            <div className="join-row">
              <input
                id="room-code"
                name="code"
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                minLength={8}
                maxLength={8}
                placeholder="ABCD2345"
                required
              />
              <button className="new-game" disabled={!profile.player || busy}>
                Join →
              </button>
            </div>
          </form>
          {!profile.player && (
            <p className="entry-hint">
              Choose a guest name or sign in to take a seat.
            </p>
          )}
          <p className="entry-hint">
            Two players per room · Codes expire after 24 hours
          </p>
          {error && (
            <p className="online-error" role="alert">
              {error}
            </p>
          )}
        </div>
      </section>
    );

  const result = getResult(room.game.board);
  const finished = Boolean(result.winner || result.draw);
  const yourTurn =
    room.joined && !room.closed && !finished && room.game.turn === room.seat;
  const title = room.closed
    ? "The room is closed."
    : !room.joined
      ? "Waiting for your friend…"
      : result.winner
        ? result.winner === room.seat
          ? "You win! Main character energy."
          : "You lost. Rematch arc?"
        : result.draw
          ? "A draw. Equally iconic."
          : yourTurn
            ? "Your move. Make it count."
            : `${room.players[room.game.turn]}, your move.`;
  return (
    <section className="online-match" aria-label="Online match">
      <div className="room-mobile-code">
        <span>
          ROOM <strong>{room.code}</strong>
        </span>
        <button className="text-button" onClick={copyCode}>
          {copied ? "Copied ✓" : "Copy code ↗"}
        </button>
      </div>
      <aside className="room-sidebar">
        <span className="eyebrow">YOUR PRIVATE ROOM</span>
        <h2>Party of two.</h2>
        <label>Share this room code</label>
        <button
          className="room-code-button"
          onClick={copyCode}
          title="Copy room code"
        >
          <strong>{room.code}</strong>
          <span>{copied ? "Copied ✓" : "Copy code ↗"}</span>
        </button>
        <p className="connection-status" role="status">
          {connection}
        </p>
        <div className="online-players">
          {(["X", "O"] as const).map((seat) => (
            <div
              key={seat}
              className={`online-player ${room.game.turn === seat && !finished ? "current" : ""}`}
            >
              <OnlineMark value={seat} />
              <span>
                <strong>{room.players[seat] || "Your friend goes here"}</strong>
                <small>
                  {seat === room.seat
                    ? `You · ${profile.player?.kind || "player"}`
                    : room.players[seat]
                      ? "Your worthy opponent"
                      : "Waiting to join…"}
                </small>
              </span>
              <b>{room.game.scores[seat]}</b>
            </div>
          ))}
        </div>
        <p className="online-draws">
          Friendly draws <strong>{room.game.scores.draws}</strong>
        </p>
        <p className="entry-hint">
          Refresh safely. Your seat stays yours in this browser. Both players
          must agree to a rematch.
        </p>
        {room.closed ? (
          <button className="text-button" onClick={backToLobby}>
            Back to lounge →
          </button>
        ) : confirmLeave ? (
          <div className="leave-confirm">
            <p>Leaving closes the room for both players.</p>
            <button
              disabled={busy}
              className="text-button"
              onClick={() => act("leave")}
            >
              Yes, leave room
            </button>
            <button
              className="text-button"
              onClick={() => setConfirmLeave(false)}
            >
              Stay
            </button>
          </div>
        ) : (
          <button className="text-button" onClick={() => setConfirmLeave(true)}>
            Leave room
          </button>
        )}
      </aside>
      <div className="board-panel online-board">
        <div className="board-topline">
          <span>ROUND {String(room.game.round).padStart(2, "0")}</span>
          <span>YOU ARE {room.seat}</span>
        </div>
        <div
          className="game-status"
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          <h2>{title}</h2>
          <p>
            {!room.joined
              ? "Share the code to get the rivalry started."
              : room.closed
                ? "A fresh room is one click away."
                : finished
                  ? "Good game. Great company."
                  : yourTurn
                    ? "Three in a row. You know the drill."
                    : "Plotting your comeback is encouraged."}
          </p>
        </div>
        <div className="board-stage">
          <div
            className={`board turn-${room.game.turn.toLowerCase()}`}
            role="group"
            aria-label="Online game board"
          >
            {room.game.board.map((value, index) => (
              <button
                key={index}
                ref={(node) => {
                  cells.current[index] = node;
                }}
                className={`square ${value ? "occupied" : ""} ${result.line.includes(index) ? "winning" : ""}`}
                aria-label={`Row ${Math.floor(index / 3) + 1}, column ${(index % 3) + 1}, ${value || "empty"}`}
                aria-disabled={Boolean(value || !yourTurn || busy)}
                onClick={() => {
                  if (!value && yourTurn && !busy) void act("play", index);
                }}
                onKeyDown={(event) => navigate(event, index)}
              >
                {value ? (
                  <OnlineMark value={value} />
                ) : (
                  yourTurn && (
                    <span className="ghost">
                      <OnlineMark value={room.seat} />
                    </span>
                  )
                )}
              </button>
            ))}
          </div>
          {result.winner && !room.closed && (
            <WinCelebration
              key={`${room.game.round}-${replay}`}
              winner={result.winner}
              lost={result.winner !== room.seat}
            />
          )}
        </div>
        <div className="board-footer">
          <span>
            {result.winner ? (
              <button
                className="replay-celebration"
                onClick={() => setReplay((value) => value + 1)}
              >
                Replay the drama ↗
              </button>
            ) : (
              `${room.game.board.filter(Boolean).length} of 9 squares played`
            )}
          </span>
          {finished && !room.closed && (
            <button
              className="new-game"
              disabled={busy || room.youReady}
              onClick={() => act("rematch")}
            >
              {room.youReady
                ? "Waiting for rematch…"
                : room.opponentReady
                  ? "Accept rematch →"
                  : "Rematch →"}
            </button>
          )}
        </div>
        {error && (
          <p className="online-error" role="alert">
            {error}
          </p>
        )}
      </div>
    </section>
  );
}
