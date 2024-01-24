import { BoardProps, MinesContainFn } from "./Board";
import { CellValue, fromNumber } from "./CellValue";

export type Grid = CellValue[][];

export function reprReducer(
  state: BoardState,
  action: ReprDispatch,
): BoardState {
  switch (action.type) {
    case ReprActions.LoseGame: {
      return loseGame(state, action.args as LoseGameArgs);
    }
    case ReprActions.RevealCell: {
      return iterativeReveal(state, action.args as RevealCellArgs);
    }
    case ReprActions.Reset: {
      return reset(action.args as ResetArgs);
    }
    case ReprActions.Flag: {
      return flag(state, action.args as FlagArgs);
    }
    case ReprActions.Unflag: {
      return unflag(state, action.args as FlagArgs);
    }
  }
}

function iterativeReveal(state: BoardState, args: RevealCellArgs): BoardState {
  const { width, height, minesContain, ...vars } = args;
  var stack = [...vars.stack];
  var next = copy(state);
  while (stack.length > 0) {
    const p = stack.pop()!;
    const [count, adjacent, nextState] = calculateCount(
      p.x,
      p.y,
      width,
      height,
      minesContain,
      next,
    );

    if (count === 0) {
      stack = stack.concat(adjacent);
    }
    next = nextState;
  }
  if (next.covered === next.remaining) {
    next.gameState = GameState.Won;
  }
  return next;
}

const copy = (state: BoardState): BoardState => {
  return { ...state, grid: state.grid.map(a => [...a]) };
};

function calculateCount(
  x: number,
  y: number,
  xLen: number,
  yLen: number,
  minesContain: MinesContainFn,
  state: BoardState,
): [number, Coordinate[], BoardState] {
  const next = { ...state };
  const adjacent = calculateAdjacent(x, y, xLen, yLen).filter(
    (p) =>
      state.grid[p.y][p.x] === CellValue.Covered ||
      state.grid[p.y][p.x] === CellValue.Flag,
  );
  const count = adjacent.filter((p) => minesContain(p.x, p.y)).length;
  if (state.grid[y][x] === CellValue.Covered) {
    next.covered = state.covered - 1;
  }
  next.grid[y][x] = fromNumber(count);
  return [count, adjacent, next];
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

function loseGame(state: BoardState, args: LoseGameArgs) {
  const { x, y, mines } = args;
  const next = copy(state);
  next.grid[y][x] = CellValue.Exploded;
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
      next.grid[flag.y][flag.x] = CellValue.WrongFlag;
    }
  }
  next.gameState = GameState.Lost;
  return next;
}

function reset(args: ResetArgs): BoardState {
  return {
    grid: buildGrid(args),
    flags: [],
    covered: args.height * args.width,
    gameState: GameState.Pending,
    remaining: args.mineAmount,
  };
}

export const buildGrid = (props: BoardProps): Grid =>
  Array(props.height)
    .fill(null)
    .map(() => Array(props.width).fill(CellValue.Covered));

function flag(state: BoardState, args: FlagArgs): BoardState {
  const next = copy(state);
  const { x, y } = args;
  next.flags = state.flags.concat([{ x: x, y: y }]);
  next.covered = state.covered - 1;
  next.grid[y][x] = CellValue.Flag;
  next.remaining = state.remaining - 1;

  if (next.covered === next.remaining) {
    next.gameState = GameState.Won;
  }

  return next;
}

function unflag(state: BoardState, args: FlagArgs): BoardState {
  const next = copy(state);
  const { x, y } = args;
  next.flags.splice(
    state.flags.findIndex((f) => f.y == y && f.x == x),
    1,
  );
  next.flags = state.flags;
  next.remaining = state.remaining + 1;
  next.grid[y][x] = CellValue.Covered;
  next.covered = state.covered + 1;

  if (next.covered === next.remaining) {
    next.gameState = GameState.Won;
  }

  return next;
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
