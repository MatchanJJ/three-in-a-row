import test from "node:test";
import assert from "node:assert/strict";
import {
  WINNING_LINES,
  createGame,
  gameReducer,
  getResult,
} from "../lib/game.mjs";

const play = (state, index) => gameReducer(state, { type: "play", index });
const sequence = (indices) => indices.reduce(play, createGame());

test("alternates turns and does not mutate previous state", () => {
  const initial = createGame();
  const next = play(initial, 0);
  assert.equal(next.board[0], "X");
  assert.equal(next.turn, "O");
  assert.equal(initial.board[0], null);
  assert.equal(play(next, 4).board[4], "O");
});
test("occupied and invalid squares do not consume a turn", () => {
  const state = play(createGame(), 0);
  for (const index of [0, -1, 9, 1.5, "1"])
    assert.equal(play(state, index), state);
});
for (const player of ["X", "O"]) {
  for (const line of WINNING_LINES) {
    test(`${player} wins on ${line}`, () => {
      const board = Array(9).fill(null);
      line.forEach((index) => {
        board[index] = player;
      });
      assert.deepEqual(getResult(board), { winner: player, line, draw: false });
    });
  }
}
test("a win increments exactly once and locks the board", () => {
  const state = sequence([0, 3, 1, 4, 2]);
  assert.equal(state.scores.X, 1);
  assert.equal(state.scores.O, 0);
  for (let i = 0; i < 9; i++) assert.equal(play(state, i), state);
});
test("O can win and gets the point", () => {
  const state = sequence([0, 3, 1, 4, 8, 5]);
  assert.equal(state.scores.O, 1);
  assert.equal(getResult(state.board).winner, "O");
});
test("a draw increments once and locks the board", () => {
  const state = sequence([0, 1, 2, 4, 3, 5, 7, 6, 8]);
  assert.equal(getResult(state.board).draw, true);
  assert.equal(state.scores.draws, 1);
  assert.equal(play(state, 0), state);
});
test("a final-square win takes precedence over draw", () => {
  const state = sequence([0, 1, 2, 3, 4, 5, 7, 6, 8]);
  assert.equal(getResult(state.board).winner, "X");
  assert.equal(state.scores.X, 1);
  assert.equal(state.scores.draws, 0);
});
test("new game keeps scores, clears board and alternates starter", () => {
  const state = sequence([0, 3, 1, 4, 2]);
  const next = gameReducer(state, { type: "next" });
  assert.deepEqual(next.board, Array(9).fill(null));
  assert.equal(next.turn, "O");
  assert.equal(next.round, 2);
  assert.equal(next.scores.X, 1);
  assert.equal(gameReducer(next, { type: "next" }).turn, "X");
});
test("reset clears entire match", () => {
  assert.deepEqual(
    gameReducer(sequence([0, 3, 1, 4, 2]), { type: "reset" }),
    createGame(),
  );
});
test("exhaustive legal play never scores more than once and every terminal position locks", () => {
  let terminals = 0;
  function walk(state) {
    const result = getResult(state.board);
    const total = state.scores.X + state.scores.O + state.scores.draws;
    if (result.winner || result.draw) {
      terminals++;
      assert.equal(total, 1);
      assert.equal(play(state, 0), state);
      return;
    }
    assert.equal(total, 0);
    state.board.forEach((value, index) => {
      if (!value) walk(play(state, index));
    });
  }
  walk(createGame());
  assert.equal(terminals, 255168);
});
