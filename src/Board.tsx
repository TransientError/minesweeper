import {
  Dispatch,
  MouseEvent,
  MutableRefObject,
  useReducer,
  useRef,
} from "react";
import {
  canGroupReveal,
  CellValue,
  displayCell,
  toNumber,
} from "./CellValue";
import {
  Coordinate,
  GameState,
  BoardState,
  ReprActions,
  ReprDispatch,
  reprReducer,
  calculateAdjacent,
  buildGrid,
} from "./Repr";

export default function Board(props: BoardProps) {
  const mines = useRef(generateMines(props));
  const minesContain = useRef(minesContainFactory(mines.current));

  const [state, reprDispatch] = useReducer(reprReducer, {
    grid: buildGrid(props),
    remaining: props.mineAmount,
    covered: props.height * props.width,
    gameState: GameState.Pending,
    flags: [],
  });

  return (
    <div
      style={{ display: "flex", alignItems: "center", height: "100vh" }}
      onDoubleClick={function (e) {
        e.preventDefault();
      }}
    >
      <table
        style={{
          marginLeft: "auto",
          marginRight: "auto",
          width: "70%",
          height: "70%",
          tableLayout: "fixed",
        }}
        onClick={
          state.gameState === GameState.Pending
            ? onClickFactory(
                state,
                minesContain.current,
                mines.current,
                props.width,
                props.height,
                reprDispatch,
              )
            : undefined
        }
        onDoubleClick={
          state.gameState === GameState.Pending
            ? onDblClickFactory(
                state,
                props.width,
                props.height,
                minesContain.current,
                reprDispatch,
              )
            : undefined
        }
      >
        <caption>
          <button
            onClick={newGameFactory(props, mines, minesContain, reprDispatch)}
          >
            <h1>{displayCaption(state.gameState)}</h1>
          </button>
        </caption>
        <tbody>
          {Array.from(Array(props.height), (_, i) => i).map((y) => (
            <tr key={y}>
              {Array.from(Array(props.width), (_, i) => i).map((x) => (
                <td
                  key={x}
                  onContextMenu={
                    state.gameState === GameState.Pending
                      ? onRightClickFactory(
                          state,
                          x,
                          y,
                          reprDispatch
                        )
                      : undefined
                  }
                >
                  {displayCell(state.grid[y][x])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const newGameFactory = (
  props: BoardProps,
  mines: MutableRefObject<Coordinate[]>,
  minesContain: MutableRefObject<MinesContainFn>,
  reprDispatch: Dispatch<ReprDispatch>,
) =>
  function (e: MouseEvent<HTMLElement>) {
    mines.current = generateMines(props);
    minesContain.current = minesContainFactory(mines.current);
    reprDispatch({ type: ReprActions.Reset, args: props });
    e.stopPropagation();
  };

const onRightClickFactory = (
  state: BoardState,
  x: number,
  y: number,
  reprDispatch: Dispatch<ReprDispatch>,
) =>
  function (e: MouseEvent<HTMLElement>) {
    e.preventDefault();
    if (state.grid[y][x] === CellValue.Covered) {
      reprDispatch({ type: ReprActions.Flag, args: { x: x, y: y } });
    } else if (state.grid[y][x] === CellValue.Flag) {
      reprDispatch({ type: ReprActions.Unflag, args: { x: x, y: y } });
    }
  };

const onDblClickFactory = (
  state: BoardState,
  width: number,
  height: number,
  minesContain: MinesContainFn,
  reprDispatch: Dispatch<ReprDispatch>,
) =>
  function (e: MouseEvent<HTMLElement>) {
    const [x, y] = extractCoordsFromEvent(e);
    if (canGroupReveal(state.grid[y][x])) {
      const adjCovered = [];
      const flags = [];
      for (const adjacent of calculateAdjacent(x, y, width, height)) {
        switch (state.grid[adjacent.y][adjacent.x]) {
          case CellValue.Flag:
            flags.push(adjacent);
            break;
          case CellValue.Covered:
            adjCovered.push(adjacent);
            break;
        }
      }

      if (flags.length === toNumber(state.grid[y][x])) {
        reprDispatch({
          type: ReprActions.RevealCell,
          args: {
            width: width,
            height: height,
            minesContain: minesContain,
            stack: adjCovered,
          },
        });
      }
    }
  };

function extractCoordsFromEvent(e: MouseEvent<HTMLElement>): [number, number] {
  const eventTarget = e.target as HTMLTableCellElement;
  const eventParent = eventTarget.parentElement as HTMLTableRowElement;

  const y = eventParent.rowIndex;
  const x = eventTarget.cellIndex;

  return [x, y];
}

function displayCaption(gameState: GameState): string {
  switch (gameState) {
    case GameState.Won:
      return "You Win";
    case GameState.Lost:
      return "You Lose :(";
    default:
      return "New Game?";
  }
}

const onClickFactory = (
  state: BoardState,
  minesContain: MinesContainFn,
  mines: Coordinate[],
  width: number,
  height: number,
  reprDispatch: Dispatch<ReprDispatch>,
) =>
  function (e: MouseEvent<HTMLElement>) {
    const [x, y] = extractCoordsFromEvent(e);

    if (state.grid[y][x] === CellValue.Flag) {
      return;
    }

    if (minesContain(x, y)) {
      reprDispatch({
        type: ReprActions.LoseGame,
        args: { x: x, y: y, mines: mines },
      });
      return;
    }

    reprDispatch({
      type: ReprActions.RevealCell,
      args: {
        width: width,
        height: height,
        minesContain: minesContain,
        stack: [{ x: x, y: y }],
      },
    });
  };

export type MinesContainFn = (x: number, y: number) => boolean;

const minesContainFactory = (mines: Coordinate[]) => (x: number, y: number) =>
  mines.filter((v) => v.x == x && v.y == y).length > 0;

function generateMines(props: BoardProps) {
  const xValues = generateRandomInts(props.width, props.mineAmount);
  const yValues = generateRandomInts(props.height, props.mineAmount);
  return zip(xValues, yValues);
}

function getRandomInt(max: number): number {
  return Math.floor(Math.random() * max);
}

function generateRandomInts(max: number, size: number): number[] {
  const result = [];
  for (let i = 0; i < size; i++) {
    result.push(getRandomInt(max));
  }
  return result;
}

function zip(left: number[], right: number[]): Coordinate[] {
  const result = [];
  for (let i = 0; i < Math.min(left.length, right.length); i++) {
    result.push({ x: left[i], y: right[i] });
  }
  return result;
}

export type BoardProps = { height: number; width: number; mineAmount: number };

