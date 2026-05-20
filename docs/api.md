경로추천 /api/v1/routes GET request (url에 붙여서 보내면 됨)
{
"lat": 35.175911,
"lon": 126.912254,
"time": 30,
"mode": "PLOGGING"
}
url 예시: (전대 후문임)
http://13.125.28.197:8080/api/v1/routes?lat=35.175911&lon=126.912254&time=30&mode=PLOGGING
response
{
"distanceMeter": 1995.5138337709054,
"timeMillis": 1436772,
"encodedPath": "mhuuEqpreWDf@{Gt@]Hc@NOc@MIKCM?ODYJqIvD}An@}FhCo@\\\\SDO?]WSv@q@bDIAMr@kCK|@DBw@vAHNy@J@TLZgBTy@d@}AdAaC|@eA|@s@`Dy@nBE`DO~OmAB@BB@L"
}
req query : 현재 사용자 위치,플로깅 진행 시간
res.body
{
[
좌표값:[
위도:
경도:
],
[
좌표값:[
위도:
경도:
]
]
}
 쓰레기 사진 보내기 /api/plogging/analyze POST 프론트 → 백엔드 ↔ AI 서버
Request
Content-Type multipart/form-data
필드 타입 필수 설명
file File ✅ 분석할 이미지 파일 (JPEG, PNG 등)
latitude float ❌ 사진 촬영 위치의 위도
longitude float ❌ 사진 촬영 위치의 경도
Request → JavaScript 예시
const formData = new FormData();
formData.append("file", imageFile); // File 객체 (input[type=file] 등)
formData.append("latitude", 35.1595); // 선택
formData.append("longitude", 126.8526); // 선택

const res = await fetch("http://<AI 서버 IP>:8000/predict", {
method: "POST",
body: formData,
// Content-Type 헤더 직접 설정 금지 — fetch가 자동으로 처리
});
const data = await res.json();

Response
비동기처리라 그냥 이미지 제대로 받으면 200 OK만 쏨
   쓰발(쓰레기 발생률) (히트맵쓰기위함) http://54.180.111.192:3000/predicted_hotspots/{z}/{x}/{y}
Martin이라는 도커 이미지 사용해서 구현했습니다.
✅ 타일 URL: http://54.180.111.192:3000/predicted_hotspots/{z}/{x}/{y} ✅ sourceLayerID: "predicted_hotspots" ✅ 사용 가능한 속성: trash_score (0.0~1.0), nightlife_count_30m, cafe_count_30m 등 ✅ CORS: 전체 허용 (추가 설정 불필요) ✅ 형식: MVT (벡터 타일), MapLibre 네이티브 지원
프론트쪽 라이브러리는
npm install @maplibre/maplibre-react-native 이거 사용하면 된다고 합니다.
클로드의 프론트엔드 연동 가이드!
프론트 연동 가이드 (React Native)

1. 라이브러리 설치
   bash
   npminstall@maplibre/maplibre-react-native
2. 타일 서버 정보
   URL: <http://EC2-B-IP:3000/predicted_hotspots/{z}/{x}/{y}>
   source-layer: predicted_hotspots
3. 핵심 코드
   importMapLibreGLfrom'@maplibre/maplibre-react-native';

constTILESERV_URL='<http://EC2-B-IP:3000>';

constHotspotMap=()=> (
<MapLibreGL.MapViewstyle={{ flex:1}}>
<MapLibreGL.Camera
defaultSettings={{ centerCoordinate: [126.9,35.16], zoomLevel:14}}
/>

{/_ Martin 벡터 타일 소스 _/}
<MapLibreGL.VectorSource
id="hotspots"
tileUrlTemplates={[
`${TILESERV_URL}/predicted_hotspots/{z}/{x}/{y}`
]}

> {/_ 히트맵 레이어 _/}
> <MapLibreGL.FillLayer
> id="hotspot-fill"
> sourceLayerID="predicted_hotspots"
> style={{

          fillColor: [

'interpolate', ['linear'], ['get','trash_score'],
0.0,'rgba(34, 197, 94, 0.05)',
0.3,'rgba(234, 179, 8, 0.3)',
0.6,'rgba(249, 115, 22, 0.5)',
0.8,'rgba(239, 68, 68, 0.7)',
1.0,'rgba(185, 28, 28, 0.9)',
],
fillOpacity:0.7,
}}
/>
</MapLibreGL.VectorSource>
</MapLibreGL.MapView>
); 4. 프론트한테 전달할 요약
✅ 타일 URL: <http://EC2-B-IP:3000/predicted_hotspots/{z}/{x}/{y}>
✅ sourceLayerID: "predicted_hotspots"
✅ 사용 가능한 속성: trash_score (0.0~1.0), nightlife_count_30m, cafe_count_30m 등
✅ CORS: 전체 허용 (추가 설정 불필요)
✅ 형식: MVT (벡터 타일), MapLibre 네이티브 지원
