export type Flow =
  | { kind: "addtour"; step: number; data: any; collectingPhotos?: boolean; allowNaturalEdits?: boolean; awaitingJson?: boolean }
  | { kind: "addhotel"; step: number; data: any; collectingPhotos?: boolean; roomCount?: number; roomIndex?: number; allowNaturalEdits?: boolean; awaitingJson?: boolean }
  | { kind: "addmenu"; step: number; data: any; collectingPhotos?: boolean; allowNaturalEdits?: boolean; awaitingJson?: boolean }
  | { kind: "agent_chat"; data: { conversationId: string; messages: any[]; role: string } }
  | { kind: "assign_delivery"; step: number; data: any }
  | { kind: "update_order"; step: number; data: any }
  | { kind: "vendor_msg"; step: number; data: any };

export const userStates = new Map<string, Flow>();

