import {
  MouseEvent,
  useReducer,
  useRef,
} from "react";
import { useImmerReducer } from "use-immer";
import { canGroupReveal, CellValue, displayCell, toNumber } from "./CellValue";
import {
  Coordinate,
  GameState,
  ReprActions,
  reprReducer,
  calculateAdjacent,
  reset,
} from "./Repr";

export default function Board({ height, width, mineAmount }: BoardProps) {
  const mines = useRef(generateMines(height, width, mineAmount));
  const minesContain = useRef(minesContainFactory(mines.current));

  const [state, reprDispatch] = useImmerReducer(
    reprReducer,
    reset({ height, width, mineAmount }),
  );

  function handleClickNewGame(e: MouseEvent<HTMLElement>) {
    mines.current = generateMines(height, width, mineAmount);
    minesContain.current = minesContainFactory(mines.current);
    reprDispatch({
      type: ReprActions.Reset,
      args: { height, width, mineAmount },
    });
    e.stopPropagation();
  }

  const handleRightClick =
    (x: number, y: number) => (e: MouseEvent<HTMLElement>) => {
      e.preventDefault();
      if (state.grid[y][x] === CellValue.Covered) {
        reprDispatch({ type: ReprActions.Flag, args: { x: x, y: y } });
      } else if (state.grid[y][x] === CellValue.Flag) {
        reprDispatch({ type: ReprActions.Unflag, args: { x: x, y: y } });
      }
    };

  function handleDoubleClick(e: MouseEvent<HTMLElement>) {
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
            minesContain: minesContain.current,
            stack: adjCovered,
          },
        });
      }
    }
  }

  function handleClick(e: MouseEvent<HTMLElement>) {
    const [x, y] = extractCoordsFromEvent(e);

    if (state.grid[y][x] === CellValue.Flag) {
      return;
    }

    if (minesContain.current(x, y)) {
      reprDispatch({
        type: ReprActions.LoseGame,
        args: { x: x, y: y, mines: mines.current },
      });
      return;
    }

    reprDispatch({
      type: ReprActions.RevealCell,
      args: {
        width: width,
        height: height,
        minesContain: minesContain.current,
        stack: [{ x: x, y: y }],
      },
    });
  }

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
          state.gameState === GameState.Pending ? handleClick : undefined
        }
        onDoubleClick={
          state.gameState === GameState.Pending ? handleDoubleClick : undefined
        }
      >
        <caption>
          <button onClick={handleClickNewGame}>
            <h1>{displayCaption(state.gameState)}</h1>
          </button>
        </caption>
        <tbody>
          {Array.from(Array(height), (_, i) => i).map((y) => (
            <tr key={y}>
              {Array.from(Array(width), (_, i) => i).map((x) => (
                <td
                  key={x}
                  onContextMenu={
                    state.gameState === GameState.Pending
                      ? handleRightClick(x, y)
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

export type MinesContainFn = (x: number, y: number) => boolean;

const minesContainFactory = (mines: Coordinate[]) => (x: number, y: number) =>
  mines.filter((v) => v.x == x && v.y == y).length > 0;

function generateMines(height: number, width: number, mineAmount: number) {
  const xValues = generateRandomInts(width, mineAmount);
  const yValues = generateRandomInts(height, mineAmount);
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
