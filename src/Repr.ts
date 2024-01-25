import { BoardProps, MinesContainFn } from "./Board";
import { CellValue, fromNumber } from "./CellValue";

export type Grid = CellValue[][];

export function reprReducer(
  state: BoardState,
  action: ReprDispatch,
): undefined | BoardState {
  switch (action.type) {
    case ReprActions.LoseGame: {
      return void loseGame(state, action.args as LoseGameArgs);
    }
    case ReprActions.RevealCell: {
      return void iterativeReveal(state, action.args as RevealCellArgs);
    }
    case ReprActions.Reset: {
      return reset(action.args as ResetArgs);
    }
    case ReprActions.Flag: {
      return void flag(state, action.args as FlagArgs);
    }
    case ReprActions.Unflag: {
      return void unflag(state, action.args as FlagArgs);
    }
  }
}

function iterativeReveal(
  state: BoardState,
  { width, height, minesContain, ...vars }: RevealCellArgs,
): void {
  var stack = [...vars.stack];
  while (stack.length > 0) {
    const p = stack.pop()!;
    const [count, adjacent] = calculateCount(
      p.x,
      p.y,
      width,
      height,
      minesContain,
      state
    );

    if (count === 0) {
      stack = stack.concat(adjacent);
    }
  }
  if (state.covered === state.remaining) {
    state.gameState = GameState.Won;
  }
}

function calculateCount(
  x: number,
  y: number,
  xLen: number,
  yLen: number,
  minesContain: MinesContainFn,
  state: BoardState,
): [number, Coordinate[]] {
  const adjacent = calculateAdjacent(x, y, xLen, yLen).filter(
    (p) =>
      state.grid[p.y][p.x] === CellValue.Covered ||
      state.grid[p.y][p.x] === CellValue.Flag,
  );
  const count = adjacent.filter((p) => minesContain(p.x, p.y)).length;
  if (state.grid[y][x] === CellValue.Covered) {
    state.covered -= 1;
  }
  state.grid[y][x] = fromNumber(count);
  console.log(state.grid[y][x])
  return [count, adjacent];
}

export function calculateAdjacent(
  x: number,
  y: number,
  xLen: number,
  yLen: number,
): Coordinate[] {
  const result = [];

  if (x > 0 && y > 0) {
    result.push({ x: x - 1, y: y - 1 });
  }

  if (y > 0) {
    result.push({ x: x, y: y - 1 });
    if (x < xLen - 1) {
      result.push({ x: x + 1, y: y - 1 });
    }
  }

  if (x > 0) {
    result.push({ x: x - 1, y: y });
  }

  if (x < xLen - 1) {
    result.push({ x: x + 1, y: y });
  }

  if (y < yLen - 1) {
    result.push({ x: x, y: y + 1 });
    if (x > 0) {
      result.push({ x: x - 1, y: y + 1 });
    }
    if (x < xLen - 1) {
      result.push({ x: x + 1, y: y + 1 });
    }
  }

  return result;
}

function loseGame(state: BoardState, { x, y, mines }: LoseGameArgs): void {
  state.grid[y][x] = CellValue.Exploded;
  for (const mine of mines) {
    if (
      (mine.x !== x || mine.y !== y) &&
      !state.flags.some((f) => mine.x == f.x && mine.y == f.y) &&
      state.grid[mine.y][mine.x] !== CellValue.Flag
    ) {
      state.grid[mine.y][mine.x] = CellValue.Mine;
    }
  }
  for (const flag of state.flags) {
    if (!mines.some((m) => m.x == flag.x && m.y == flag.y)) {
      state.grid[flag.y][flag.x] = CellValue.WrongFlag;
    }
  }
  state.gameState = GameState.Lost;
}

export function reset({ height, width, mineAmount }: ResetArgs): BoardState {
  return {
    grid: buildGrid(height, width),
    flags: [],
    covered: height * width,
    gameState: GameState.Pending,
    remaining: mineAmount,
  };
}

export const buildGrid = (height: number, width: number): Grid =>
  Array(height)
    .fill(null)
    .map(() => Array(width).fill(CellValue.Covered));

function flag(state: BoardState, {x, y}: FlagArgs): void {
  state.flags.push({ x: x, y: y });
  state.covered = state.covered - 1;
  state.grid[y][x] = CellValue.Flag;
  state.remaining = state.remaining - 1;

  if (state.covered === state.remaining) {
    state.gameState = GameState.Won;
  }
}

function unflag(state: BoardState, {x, y}: FlagArgs): void {
  state.flags.splice(
    state.flags.findIndex((f) => f.y == y && f.x == x),
    1,
  );
  state.remaining = state.remaining + 1;
  state.grid[y][x] = CellValue.Covered;
  state.covered = state.covered + 1;

  if (state.covered === state.remaining) {
    state.gameState = GameState.Won;
  }
}

export type BoardState = {
  grid: Grid;
  remaining: number;
  covered: number;
  gameState: GameState;
  flags: Coordinate[];
};

export enum GameState {
  Won,
  Lost,
  Pending,
}

export type ReprDispatch = {
  type: ReprActions;
  args: LoseGameArgs | RevealCellArgs | ResetArgs | FlagArgs;
};

export enum ReprActions {
  LoseGame,
  RevealCell,
  Reset,
  Flag,
  Unflag,
}

export type LoseGameArgs = {
  x: number;
  y: number;
  mines: Coordinate[];
};

export type RevealCellArgs = {
  width: number;
  height: number;
  minesContain: MinesContainFn;
  stack: Coordinate[];
};

export type ResetArgs = BoardProps;

export type FlagArgs = {
  x: number;
  y: number;
};

export type Coordinate = { x: number; y: number };
