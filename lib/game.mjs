/** Pure game rules, shared by the UI and tests. */
/**
 * @typedef {'X' | 'O'} Player
 * @typedef {(Player | null)[]} Board
 * @typedef {{board: Board, turn: Player, starter: Player, scores: {X: number, O: number, draws: number}, round: number}} Game
 * @typedef {{type: 'play', index: number} | {type: 'next'} | {type: 'reset'}} Action
 */
export const WINNING_LINES = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

/** @param {Board} board
 * @returns {{winner: Player | null, line: number[], draw: boolean}}
 */
export function getResult(board) {
  for (const line of WINNING_LINES) {
    const [a, b, c] = line;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { winner: board[a], line, draw: false };
    }
  }
  return { winner: null, line: [], draw: board.every(Boolean) };
}

/** @param {Player} [starter]
 * @returns {Game}
 */
export function createGame(starter = "X") {
  return {
    board: Array(9).fill(null),
    turn: starter,
    starter,
    scores: { X: 0, O: 0, draws: 0 },
    round: 1,
  };
}

/** Reducer guards invalid moves and updates the score once, atomically.
 * @param {Game} state
 * @param {Action} action
 * @returns {Game}
 */
export function gameReducer(state, action) {
  if (action.type === "reset") return createGame();
  if (action.type === "next") {
    const starter = state.starter === "X" ? "O" : "X";
    return {
      ...state,
      board: Array(9).fill(null),
      turn: starter,
      starter,
      round: state.round + 1,
    };
  }
  if (action.type !== "play") return state;
  const i = action.index;
  const current = getResult(state.board);
  if (
    !Number.isInteger(i) ||
    i < 0 ||
    i > 8 ||
    state.board[i] ||
    current.winner ||
    current.draw
  )
    return state;
  const board = [...state.board];
  board[i] = state.turn;
  const result = getResult(board);
  const scores = { ...state.scores };
  if (result.winner) scores[result.winner] += 1;
  else if (result.draw) scores.draws += 1;
  return { ...state, board, scores, turn: state.turn === "X" ? "O" : "X" };
}
