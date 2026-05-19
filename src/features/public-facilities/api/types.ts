export type TrashType =
  | "일반쓰레기"
  | "재활용쓰레기"
  | "일반쓰레기+재활용 겸용"
  | "기타";

export type TrashBin = {
  id: number;
  name: string;
  roadAddress: string | null;
  latitude: number;
  longitude: number;
  trashType: TrashType;
  distanceMeters: number;
};

export type GetNearbyTrashBinsRequest = {
  latitude: number;
  longitude: number;
};

export type GetNearbyTrashBinsResponse = TrashBin[];
