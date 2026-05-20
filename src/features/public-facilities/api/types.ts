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
  lat: number;
  lng: number;
};

export type GetNearbyTrashBinsResponse = TrashBin[];

export type ToiletType = "공중화장실" | "개방화장실";

// "" (빈 값) 또는 알 수 없는 값이 내려올 수 있어 string으로 받고 색상 매핑 단계에서 폴백 처리한다.
export type OpenTimeType = "상시" | "정시" | "불규칙" | (string & {});

export type Toilet = {
  id: number;
  name: string;
  roadAddress: string | null;
  latitude: number;
  longitude: number;
  toiletType: ToiletType;
  openTimeType: OpenTimeType;
  distanceMeters: number;
};

export type GetNearbyToiletsRequest = {
  lat: number;
  lng: number;
};

export type GetNearbyToiletsResponse = Toilet[];
