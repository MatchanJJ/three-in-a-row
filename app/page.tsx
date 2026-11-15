"use client";

import { useReducer, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import { createGame, gameReducer, getResult } from "../lib/game.mjs";
import WinCelebration from "./win-celebration";
import OnlineGame from "./online-game";

function Mark({ value, small = false }: { value: string; small?: boolean }) {
  return (
    <svg
      className={`mark ${value.toLowerCase()} ${small ? "small" : ""}`}
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

function Arrow() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 12h15m-6-6 6 6-6 6" />
    </svg>
  );
}

export default function Home() {
  const [game, dispatch] = useReducer(gameReducer, undefined, () =>
    createGame(),
  );
  const [rulesOpen, setRulesOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [celebrationReplay, setCelebrationReplay] = useState(0);
  const [mode, setMode] = useState<"local" | "online">("local");
  const cells = useRef<(HTMLButtonElement | null)[]>([]);
  const resetButton = useRef<HTMLButtonElement>(null);
  const result = getResult(game.board);
  const finished = Boolean(result.winner || result.draw);
  const moves = game.board.filter(Boolean).length;
  const status = result.winner
    ? `Player ${result.winner} wins!`
    : result.draw
      ? "A perfect stalemate."
      : `Player ${game.turn}, your move.`;

  function navigate(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let target = index;
    if (event.key === "ArrowRight") target = (index + 1) % 9;
    else if (event.key === "ArrowLeft") target = (index + 8) % 9;
    else if (event.key === "ArrowDown") target = (index + 3) % 9;
    else if (event.key === "ArrowUp") target = (index + 6) % 9;
    else if (event.key === "Home") target = 0;
    else if (event.key === "End") target = 8;
    else return;
    event.preventDefault();
    cells.current[target]?.focus();
  }

  function closeReset() {
    setResetOpen(false);
    resetButton.current?.focus();
  }

  return (
    <div className="site-shell">
      <header className="site-header" inert={resetOpen}>
        <a href="/" className="wordmark" aria-label="Three in a Row home">
          <span className="logo-icon">
            <Mark value="X" small />
            <Mark value="O" small />
          </span>{" "}
          little games<span className="logo-dot">✳</span>
        </a>
        <span className="header-note">
          <span /> GOOD COMPANY. GREAT GAMES.
        </span>
        <button
          className="rules-button"
          aria-expanded={rulesOpen}
          aria-controls="rules"
          onClick={() => setRulesOpen(!rulesOpen)}
        >
          <span className="question">?</span> How to play
        </button>
      </header>

      <main inert={resetOpen}>
        <section className="intro" aria-labelledby="title">
          <div className="eyebrow">
            <span className="tiny-star">✳</span> THE ORIGINAL FRIENDLY RIVALRY
          </div>
          <h1 id="title">
            Three in a{" "}
            <span>
              row
              <svg viewBox="0 0 235 18" aria-hidden="true">
                <path d="M4 12Q112-3 230 8" />
              </svg>
            </span>
            <span className="title-period">.</span>
          </h1>
          <p>Two players. Nine squares. A little friendly competition.</p>
        </section>

        <nav className="play-modes" aria-label="Play mode">
          <button
            aria-pressed={mode === "local"}
            onClick={() => setMode("local")}
          >
            One device <span>Local 2P</span>
          </button>
          <button
            aria-pressed={mode === "online"}
            onClick={() => setMode("online")}
          >
            Play a friend <span>Online rooms</span>
          </button>
        </nav>

        {rulesOpen && (
          <section id="rules" className="rules-panel" aria-label="How to play">
            <strong>Small board. Simple rules.</strong>
            <p>
              Take turns with a friend on the same device. Place three of your
              marks in a row, column, or diagonal to win. A full board with no
              winner is a draw. The starting player alternates each round.
            </p>
            <span>
              Keyboard: Tab to a square, arrow keys to explore, Enter or Space
              to play.
            </span>
          </section>
        )}

        <div hidden={mode !== "local"}>
          <div className="game-layout">
            <aside className="match-panel" aria-label="Match scoreboard">
              <div className="panel-heading">
                <span>THE MATCH</span>
                <span className="local-badge">
                  <i /> LOCAL 2P
                </span>
              </div>
              <h2>A seat for two.</h2>
              <p className="panel-description">
                Grab a friend. Make your mark.
              </p>
              <div
                className={`player-card ${!finished && game.turn === "X" ? "active-x" : ""}`}
              >
                <span className="player-icon">
                  <Mark value="X" small />
                </span>
                <div>
                  <h3>Player X</h3>
                  <p>The first impression.</p>
                </div>
                <span className="score" aria-label={`${game.scores.X} wins`}>
                  {game.scores.X}
                </span>
                {!finished && game.turn === "X" && (
                  <span className="turn-label">YOUR TURN</span>
                )}
              </div>
              <div
                className={`player-card ${!finished && game.turn === "O" ? "active-o" : ""}`}
              >
                <span className="player-icon">
                  <Mark value="O" small />
                </span>
                <div>
                  <h3>Player O</h3>
                  <p>The other half.</p>
                </div>
                <span className="score" aria-label={`${game.scores.O} wins`}>
                  {game.scores.O}
                </span>
                {!finished && game.turn === "O" && (
                  <span className="turn-label">YOUR TURN</span>
                )}
              </div>
              <div className="draw-score">
                <span>
                  <span className="draw-icon">=</span> A friendly draw
                </span>
                <strong aria-label={`${game.scores.draws} draws`}>
                  {game.scores.draws}
                </strong>
              </div>
              <div className="match-bottom">
                <p>
                  Wins come and go.
                  <br />
                  <em>The rivalry is forever.</em>
                </p>
                <button
                  ref={resetButton}
                  className="text-button"
                  onClick={() => setResetOpen(true)}
                >
                  ↺ Reset scores
                </button>
              </div>
            </aside>

            <section
              className={`board-panel ${finished ? "is-finished" : ""}`}
              aria-label="Tic-tac-toe game"
            >
              <div className="board-topline">
                <span>ROUND {String(game.round).padStart(2, "0")}</span>
                <span>
                  <span className={`status-dot ${finished ? "done" : ""}`} />
                  {finished ? "ROUND COMPLETE" : "GAME ON"}
                </span>
              </div>
              <div
                className="game-status"
                role="status"
                aria-live="polite"
                aria-atomic="true"
              >
                <div className="status-title">
                  {!finished && <Mark value={game.turn} small />}
                  <h2>{status}</h2>
                </div>
                <p>
                  {result.winner
                    ? "Three in a row. Take a little victory lap."
                    : result.draw
                      ? "Great minds think alike. Go again?"
                      : "Find your spot. Make it count."}
                </p>
              </div>
              <div className="board-stage">
                <div
                  className={`board turn-${game.turn.toLowerCase()}`}
                  role="group"
                  aria-label="Game board, three rows and three columns"
                >
                  {game.board.map((value: string | null, index: number) => (
                    <button
                      key={index}
                      ref={(node) => {
                        cells.current[index] = node;
                      }}
                      className={`square ${result.line.includes(index) ? "winning" : ""} ${value ? "occupied" : ""}`}
                      aria-label={`Row ${Math.floor(index / 3) + 1}, column ${(index % 3) + 1}, ${value || "empty"}`}
                      aria-disabled={Boolean(value || finished)}
                      onClick={() => dispatch({ type: "play", index })}
                      onKeyDown={(event) => navigate(event, index)}
                    >
                      {value ? (
                        <Mark value={value} />
                      ) : (
                        !finished && (
                          <span className="ghost">
                            <Mark value={game.turn} />
                          </span>
                        )
                      )}
                    </button>
                  ))}
                </div>
                {result.winner && (
                  <WinCelebration
                    key={`${game.round}-${celebrationReplay}`}
                    winner={result.winner}
                  />
                )}
              </div>
              <div className="board-footer">
                {result.winner ? (
                  <button
                    className="replay-celebration"
                    onClick={() => setCelebrationReplay((value) => value + 1)}
                  >
                    Replay the glory ↗
                  </button>
                ) : (
                  <span>
                    {finished
                      ? "One more round?"
                      : `${moves} of 9 squares played`}
                  </span>
                )}
                <button
                  className="new-game"
                  onClick={() => {
                    dispatch({ type: "next" });
                    cells.current[0]?.focus();
                  }}
                >
                  New Game <Arrow />
                </button>
              </div>
            </section>

            <aside className="margin-note" aria-hidden="true">
              <span className="doodle">✳</span>
              <span>
                less scrolling,
                <br />
                more playing.
              </span>
              <svg viewBox="0 0 90 95">
                <path d="M65 5Q88 65 15 73m0 0 17-17M15 73l22 8" />
              </svg>
            </aside>
          </div>
        </div>
        <div hidden={mode !== "online"}>
          {mode === "online" && <OnlineGame />}
        </div>
        <div className="under-game">
          <span className="mini-board">▦</span> A classic for a reason. No
          downloads. Just you two.
        </div>
      </main>

      <footer className="site-footer" inert={resetOpen}>
        <span>Made for a little together time.</span>
        <span>
          DESIGNED & BUILT BY <strong>MARK JADE PALMA</strong>
        </span>
        <span className="footer-marks">
          X <i>O</i>
        </span>
      </footer>

      {resetOpen && (
        <div className="modal-backdrop" onClick={closeReset}>
          <section
            className="reset-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="reset-title"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === "Escape") closeReset();
              if (e.key === "Tab") {
                e.preventDefault();
                const buttons = e.currentTarget.querySelectorAll("button");
                const current = Array.from(buttons).indexOf(
                  document.activeElement as HTMLButtonElement,
                );
                buttons[
                  (current + (e.shiftKey ? -1 : 1) + buttons.length) %
                    buttons.length
                ].focus();
              }
            }}
          >
            <span className="eyebrow">A CLEAN SLATE</span>
            <h2 id="reset-title">Start fresh?</h2>
            <p>
              This clears both players’ scores and starts a new match from round
              one.
            </p>
            <div>
              <button autoFocus className="cancel-button" onClick={closeReset}>
                Keep playing
              </button>
              <button
                className="new-game"
                onClick={() => {
                  dispatch({ type: "reset" });
                  closeReset();
                }}
              >
                Reset match <Arrow />
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
