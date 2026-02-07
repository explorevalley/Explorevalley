export type Flow =
  | { kind: "addtour"; step: number; data: any; collectingPhotos?: boolean }
  | { kind: "addhotel"; step: number; data: any; collectingPhotos?: boolean; roomCount?: number; roomIndex?: number }
  | { kind: "addmenu"; step: number; data: any; collectingPhotos?: boolean };

export const userStates = new Map<number, Flow>();
