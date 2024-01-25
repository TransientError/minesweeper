export enum CellValue {
  Zero,
  One,
  Two,
  Three,
  Four,
  Five,
  Six,
  Seven,
  Eight,
  Flag,
  Exploded,
  Mine,
  WrongFlag,
  Covered,
}

export function fromNumber(n: number): CellValue {
  switch (n) {
    case 0:
      return CellValue.Zero;
    case 1:
      return CellValue.One;
    case 2:
      return CellValue.Two;
    case 3:
      return CellValue.Three;
    case 4:
      return CellValue.Four;
    case 5:
      return CellValue.Five;
    case 6:
      return CellValue.Six;
    case 7:
      return CellValue.Seven;
    case 8:
      return CellValue.Eight;
    default:
      throw new Error(`unknown number ${n}`);
  }
}

export const canGroupReveal = (c: CellValue): boolean =>
  [
    CellValue.One,
    CellValue.Two,
    CellValue.Three,
    CellValue.Four,
    CellValue.Five,
    CellValue.Six,
    CellValue.Seven,
    CellValue.Eight,
  ].includes(c);

export function toNumber(c: CellValue): number | null {
  switch (c) {
    case CellValue.One:
      return 1;
    case CellValue.Two:
      return 2;
    case CellValue.Three:
      return 3;
    case CellValue.Four:
      return 4;
    case CellValue.Five:
      return 5;
    case CellValue.Six:
      return 6;
    case CellValue.Seven:
      return 7;
    case CellValue.Eight:
      return 8;
    default:
      return null;
  }
}
