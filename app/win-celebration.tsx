import type { CSSProperties } from "react";

/** CSS runs once per mount. No timers, remote GIFs, or animation dependencies. */
export default function WinCelebration({
  winner,
  lost = false,
}: {
  winner: "X" | "O";
  lost?: boolean;
}) {
  return (
    <div
      className={`win-celebration winner-${winner.toLowerCase()} ${lost ? "meme-loss" : ""}`}
      aria-hidden="true"
    >
      <div className="confetti-shower">
        {Array.from({ length: 30 }, (_, index) => (
          <i
            key={index}
            style={
              {
                "--left": `${(index * 37) % 100}%`,
                "--delay": `${(index % 7) * 0.09}s`,
                "--drift": `${((index % 5) - 2) * 25}px`,
                "--spin": `${index % 2 ? "" : "-"}${360 + (index % 3) * 180}deg`,
                "--color": [
                  "#436c54",
                  "#df744c",
                  "#e9bd54",
                  "#b1c39f",
                  "#fffefa",
                ][index % 5],
              } as CSSProperties
            }
          >
            {lost ? "F" : null}
          </i>
        ))}
      </div>
      <div className="meme-card">
        <span className="meme-sticker">
          {lost ? "THE COMEBACK ARC STARTS NOW" : "CERTIFIED BIG BRAIN MOMENT"}
        </span>
        <span className="meme-face">
          {lost ? "😭" : winner === "X" ? "😎" : "🧑‍🍳"}
        </span>
        <strong>
          {lost
            ? "EMOTIONAL DAMAGE."
            : winner === "X"
              ? "ABSOLUTE CINEMA."
              : "LET THEM COOK."}
        </strong>
        <span className="meme-caption">
          {lost
            ? "It was the warm-up round. Obviously."
            : `Player ${winner} understood the assignment.`}
        </span>
        <span className="meme-rating">
          {lost
            ? "−1 ROUND · +100 CHARACTER DEVELOPMENT"
            : "+1000 AURA · GG WELL PLAYED"}
        </span>
      </div>
    </div>
  );
}
