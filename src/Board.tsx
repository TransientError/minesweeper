import { MouseEvent, MutableRefObject, useRef, useState } from "react";
import {
  canGroupReveal,
  CellValue,
  displayCell,
  fromNumber,
  toNumber,
} from "./CellValue";

export default function Board(props: BoardProps) {
  const mines = useRef(generateMines(props));
  console.log(mines);
  var [repr, setRepr] = useState(buildRepr(props));
  const flags: MutableRefObject<Coordinate[]> = useRef([]);
  const covered = useRef(props.height * props.width);
  const [gameState, setGameState] = useState(GameState.Pending);
  const minesContain = useRef(minesContainFactory(mines.current));
  const remaining = useRef(props.mineAmount);
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
          gameState === GameState.Pending
            ? onClickFactory(
                repr,
                minesContain.current,
                setRepr,
                flags.current,
                mines.current,
                covered,
                setGameState,
                props.width,
                props.height,
                remaining
              )
            : undefined
        }
        onDoubleClick={
          gameState === GameState.Pending
            ? onDblClickFactory(
                repr,
                setRepr,
                props.width,
                props.height,
                minesContain.current,
                covered,
                setGameState,
                remaining
              )
            : undefined
        }
      >
        <caption>
          <button
            onClick={newGameFactory(
              props,
              mines,
              minesContain,
              setRepr,
              setGameState,
              flags,
              covered,
              remaining
            )}
          >
            <h1>{displayCaption(gameState)}</h1>
          </button>
        </caption>
        <tbody>
          {Array.from(Array(props.height), (_, i) => i).map((y) => (
            <tr key={y}>
              {Array.from(Array(props.width), (_, i) => i).map((x) => (
                <td
                  key={x}
                  onContextMenu={
                    gameState === GameState.Pending
                      ? function (e) {
                          e.preventDefault();
                          if (repr[y][x] === CellValue.Covered) {
                            flags.current.push({ x: x, y: y });
                            covered.current -= 1;
                            repr[y][x] = CellValue.Flag;
                            remaining.current -= 1;
                          } else if (repr[y][x] === CellValue.Flag) {
                            repr[y][x] = CellValue.Covered;
                            covered.current += 1;
                            flags.current.splice(
                              flags.current.findIndex(
                                (f) => f.y == y && f.x == x,
                              ),
                              1,
                            );
                            remaining.current += 1;
                          }
                          setRepr({ ...repr });

                          if (covered.current === remaining.current) {
                            setGameState(GameState.Won);
                          }
                        }
                      : undefined
                  }
                >
                  {displayCell(repr[y][x])}
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
  setRepr: (g: Grid) => void,
  setGameState: (s: GameState) => void,
  flags: MutableRefObject<Coordinate[]>,
  covered: MutableRefObject<number>,
  remaining: MutableRefObject<number>,
) =>
  function (e: MouseEvent<HTMLElement>) {
    const repr = buildRepr(props);
    mines.current = generateMines(props);
    minesContain.current = minesContainFactory(mines.current);
    flags.current = [];
    covered.current = props.height * props.width;
    setRepr(repr);
    setGameState(GameState.Pending);
    remaining.current = props.mineAmount;
    e.stopPropagation();
  };

const buildRepr = (props: BoardProps): Grid =>
  Array(props.height)
    .fill(null)
    .map(() => Array(props.width).fill(CellValue.Covered));

const onDblClickFactory = (
  repr: Grid,
  setRepr: (g: Grid) => void,
  width: number,
  height: number,
  minesContain: MinesContainFn,
  covered: MutableRefObject<number>,
  setGameState: (s: GameState) => void,
  remaining: MutableRefObject<number>
) =>
  function (e: MouseEvent<HTMLElement>) {
    const [x, y] = extractCoordsFromEvent(e);
    if (canGroupReveal(repr[y][x])) {
      const adjCovered = [];
      const flags = [];
      for (const adjacent of calculateAdjacent(x, y, width, height)) {
        switch (repr[adjacent.y][adjacent.x]) {
          case CellValue.Flag:
            flags.push(adjacent);
            break;
          case CellValue.Covered:
            adjCovered.push(adjacent);
            break;
        }
      }

      if (flags.length === toNumber(repr[y][x])) {
        iterativeReveal(
          adjCovered,
          width,
          height,
          minesContain,
          repr,
          covered,
          setGameState,
          remaining
        );

        setRepr({ ...repr });
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
  repr: Grid,
  minesContain: MinesContainFn,
  setRepr: (repr: Grid) => void,
  flags: Coordinate[],
  mines: Coordinate[],
  covered: MutableRefObject<number>,
  setGameState: (s: GameState) => void,
  width: number,
  height: number,
  remaining: MutableRefObject<number>
) =>
  function (e: MouseEvent<HTMLElement>) {
    const [x, y] = extractCoordsFromEvent(e);

    if (repr[y][x] === CellValue.Flag) {
      return;
    }

    if (minesContain(x, y)) {
      loseGame(x, y, repr, flags, mines, setRepr, setGameState);
      return;
    }

    iterativeReveal(
      [{ x: x, y: y }],
      width,
      height,
      minesContain,
      repr,
      covered,
      setGameState,
      remaining
    );

    setRepr({ ...repr });
  };

function iterativeReveal(
  stack: Coordinate[],
  width: number,
  height: number,
  minesContain: MinesContainFn,
  repr: Grid,
  covered: MutableRefObject<number>,
  setGameState: (s: GameState) => void,
  remaining: MutableRefObject<number>,
) {
  while (stack.length > 0) {
    const p = stack.pop()!;
    const [count, adjacent] = calculateCount(
      p.x,
      p.y,
      width,
      height,
      minesContain,
      repr,
      covered,
    );

    if (count === 0) {
      stack = stack.concat(adjacent);
    }

    if (covered.current === remaining.current) {
      setGameState(GameState.Won);
    }
  }
}

function loseGame(
  x: number,
  y: number,
  repr: Grid,
  flags: Coordinate[],
  mines: Coordinate[],
  setRepr: (grid: Grid) => void,
  setGameState: (s: GameState) => void,
) {
  repr[y][x] = CellValue.Exploded;
  for (const mine of mines) {
    if (
      (mine.x !== x || mine.y !== y) &&
      !flags.some((f) => mine.x == f.x && mine.y == f.y) &&
      repr[mine.y][mine.x] !== CellValue.Flag
    ) {
      repr[mine.y][mine.x] = CellValue.Mine;
    }
  }
  for (const flag of flags) {
    if (!mines.some((m) => m.x == flag.x && m.y == flag.y)) {
      repr[flag.y][flag.x] = CellValue.WrongFlag;
    }
  }
  setRepr({ ...repr });
  setGameState(GameState.Lost);
}

function calculateCount(
  x: number,
  y: number,
  xLen: number,
  yLen: number,
  minesContain: MinesContainFn,
  repr: Grid,
  covered: MutableRefObject<number>,
): [number, Coordinate[]] {
  const adjacent = calculateAdjacent(x, y, xLen, yLen).filter(
    (p) =>
      repr[p.y][p.x] === CellValue.Covered || repr[p.y][p.x] === CellValue.Flag,
  );
  const count = adjacent.filter((p) => minesContain(p.x, p.y)).length;
  if (repr[y][x] === CellValue.Covered) {
    covered.current -= 1;
  }
  repr[y][x] = fromNumber(count);
  return [count, adjacent];
}

function calculateAdjacent(
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

type MinesContainFn = (x: number, y: number) => boolean;

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

type Coordinate = { x: number; y: number };

type BoardProps = { height: number; width: number; mineAmount: number };

type Grid = CellValue[][];

enum GameState {
  Won,
  Lost,
  Pending,
}
