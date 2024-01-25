import { MouseEvent, useRef } from "react";
import { useImmerReducer } from "use-immer";
import { canGroupReveal, CellValue, toNumber } from "./CellValue";
import {
  Coordinate,
  GameState,
  ReprActions,
  reprReducer,
  calculateAdjacent,
  reset,
} from "./Repr";
import "./Board.css";

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

  function handleClick(e: MouseEvent<HTMLElement>) {
    const coords = extractCoordsFromEvent(e);
    if (coords == null) {
      return;
    }
    const [x, y] = coords;

    if (state.grid[y][x] === CellValue.Flag) {
      return;
    }

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
            mines: mines.current,
            stack: adjCovered,
          },
        });
      }
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
        mines: mines.current,
        stack: [{ x: x, y: y }],
      },
    });
  }

  return (
    <div
      className="h-screen align-middle place-content-center table-fixed flex items-center bg-slate-800"
      onDoubleClick={function (e) {
        e.preventDefault();
      }}
    >
      <table
        className="h-3/5 aspect-square table-fixed"
        onClick={
          state.gameState === GameState.Pending ? handleClick : undefined
        }
      >
        <caption className="board--caption">
          <button
            className="align-middle w-60 h-12 bg-green-500 hover:bg-green-400 rounded-md"
            onClick={handleClickNewGame}
          >
            <h1 className="text-neutral-700 text-3xl">
              {displayCaption(state.gameState)}
            </h1>
          </button>
        </caption>
        <tbody>
          {Array.from(Array(height), (_, i) => i).map((y) => (
            <tr key={y} className="h-8">
              {Array.from(Array(width), (_, i) => i).map((x) => (
                <td
                  className={calculcateTdClass(
                    state.grid[y][x],
                    state.gameState,
                  )}
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

function calculcateTdClass(cellValue: CellValue, gameState: GameState) {
  var common = "w-8 ";
  switch (cellValue) {
    case CellValue.Covered:
      common += "text-neutral-700 bg-sky-400";
      if (gameState === GameState.Pending) {
        common += " hover:bg-sky-300";
      }
      break;
    case CellValue.WrongFlag:
    case CellValue.Flag:
      common += "text-center text-neutral-700 bg-sky-400";
      if (gameState === GameState.Pending) {
        common += " hover:bg-sky-300";
      }
      break;
    case CellValue.Exploded:
      common += "text-center text-neutral-700 bg-red-400";
      break;
    default:
      common += "text-center text-neutral-200";
  }

  return common;
}

function displayCell(cell: CellValue): string {
  switch (cell) {
    case CellValue.One:
      return "1";
    case CellValue.Two:
      return "2";
    case CellValue.Three:
      return "3";
    case CellValue.Four:
      return "4";
    case CellValue.Five:
      return "5";
    case CellValue.Six:
      return "6";
    case CellValue.Seven:
      return "7";
    case CellValue.Eight:
      return "8";
    case CellValue.Exploded:
      return "💥";
    case CellValue.Flag:
      return "🚩";
    case CellValue.WrongFlag:
      return "❌";
    case CellValue.Mine:
      return "💣";
    default:
      return " ";
  }
}

function extractCoordsFromEvent(
  e: MouseEvent<HTMLElement>,
): [number, number] | null {
  const eventTarget = e.target as HTMLTableCellElement;
  const eventParent = eventTarget?.parentElement as HTMLTableRowElement;

  const y = eventParent?.rowIndex;
  const x = eventTarget?.cellIndex;

  return x != null && y != null ? [x, y] : null;
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

function generateMines(
  height: number,
  width: number,
  mineAmount: number,
): Coordinate[] {
  const mines = new Set<string>();
  while (mines.size !== mineAmount) {
    const x = getRandomInt(width);
    const y = getRandomInt(height);
    const key = x.toString() + y.toString();
    mines.add(key);
  }
  return Array.from(mines).map((k) => ({
    x: parseInt(k[0]),
    y: parseInt(k[1]),
  }));
}

function getRandomInt(max: number): number {
  return Math.floor(Math.random() * max);
}

export type BoardProps = { height: number; width: number; mineAmount: number };
