# **🚀 [Front-End 공유] 공간 H3-LOD 타일서버 & 다중 라우팅 API 연동 가이드**

안녕하세요! 플로깅 서비스의 핵심인 **공간 H3 벡터 타일셋(Martin)** 고도화 및 **왕복 경로 추천 API**의 규격 변경이 완료되어 관련 연동 명세를 공유해 드립니다.

본 아키텍처는 141만 개의 무거운 원천 격자 데이터를 모바일/웹 브라우저가 뻗지 않고 초고속으로 부드럽게 렌더링할 수 있도록 **3단계 LOD(Level of Detail) 헥사곤 하이브리드 타일셋**으로 설계되었습니다.

---

## **1. 🗺️ 공간 H3-LOD 벡터 타일셋 연동 가이드**

우리의 타일 서버는 단 하나의 통합된 엔드포인트에서 줌 레벨에 따라 해상도가 자동으로 전환되는 **3개의 소스 레이어**를 MVT(Vector Tile) 규격으로 실시간 스트리밍합니다.

- **벡터 타일 소스 URL**: `http://54.180.111.192:3000/hotspots/{z}/{x}/{y}`
- **지원 줌 레벨 범위**: Zoom `8.0` ~ `18.0`

### **줌 레벨에 따른 3단계 레이어 명세 & 크로스페이드(Cross-fade) 권장 디자인**

브라우저에서 줌 인/아웃 시 격자가 끊기지 않고 부드럽게 페이드 아웃/인(Cross-fade)되도록 MapLibre GL JS 스타일에 아래 스펙을 바인딩해 주세요.

### **🟢 [1단계] Coarse Hexagon 레이어 (줌 레벨 4.0 ~ 12.8)**

거시적으로 전체 도시의 오염 분포를 한눈에 조망하는 대형 육각 격자입니다.

- **`source-layer` 이름**: `hotspots_res7`
- **추천 투명도 (`fill-opacity`)**:
  - Zoom 12.0일 때 `0.45` ➔ Zoom 12.8일 때 `0.0` (점차 사라짐)

### **🔵 [2단계] Fine Hexagon 레이어 (줌 레벨 12.0 ~ 17.2)**

동네 단위의 상세한 핫스팟 분포를 관측하는 중형 육각 격자입니다.

- **`source-layer` 이름**: `hotspots_res9`
- **추천 투명도 (`fill-opacity`)**:
  - Zoom 12.0일 때 `0.0` ➔ Zoom 12.8일 때 `0.60` (부드럽게 나타남) ➔ Zoom 16.5일 때 `0.60` ➔ Zoom 17.2일 때 `0.0` (점차 사라짐)

### **🔴 [3단계] Ultra-Fine H3 Res 11 레이어 (줌 레벨 16.5 ~ 18.0+)**

**인도 밀착형 초정밀 거리 뷰 모드**입니다. 은은하고 자연스러운 네온 불빛 형태의 오염 히트맵 효과를 내기 위해 **무테두리 아우라 스타일**을 권장합니다.

- **`source-layer` 이름**: `hotspots_res11`
- **추천 투명도 (`fill-opacity`)**:
  - Zoom 16.5일 때 `0.0` ➔ Zoom 17.2일 때 `0.55` (자연스럽게 활성화)
- **테두리 스타일 (`line-opacity` / `line-width`)**:
  - 반드시 **`0.0`\*으로 적용하여, 딱딱한 벌집 테두리선 없이 부드럽게 퍼지는 **프리미엄 네온 오염 아우라 효과\*\*를 완성해 주세요!
- 예시 html 파일
  ```html
  <!DOCTYPE html>
  <html lang="ko">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Plover Spatial GeoAI Vector Tile Viewer</title>
      <!-- MapLibre GL JS CSS & JS -->
      <link
        href="https://unpkg.com/maplibre-gl@3.6.2/dist/maplibre-gl.css"
        rel="stylesheet"
      />
      <script src="https://unpkg.com/maplibre-gl@3.6.2/dist/maplibre-gl.js"></script>
      <link
        href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600&family=Noto+Sans+KR:wght@300;400;700&display=swap"
        rel="stylesheet"
      />
      <style>
        body {
          margin: 0;
          padding: 0;
          font-family: "Outfit", "Noto Sans KR", sans-serif;
          background-color: #0c0f1d;
          color: #f1f3f9;
          overflow: hidden;
        }
        #map {
          position: absolute;
          top: 0;
          bottom: 0;
          width: 100%;
          z-index: 1;
        }
        /* Glassmorphism Control Panel */
        .control-panel {
          position: absolute;
          top: 20px;
          left: 20px;
          z-index: 10;
          background: rgba(12, 15, 29, 0.75);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 16px;
          padding: 24px;
          width: 320px;
          box-shadow: 0 12px 40px rgba(0, 0, 0, 0.5);
          transition: all 0.3s ease;
        }
        .control-panel h1 {
          font-size: 20px;
          font-weight: 600;
          margin: 0 0 8px 0;
          background: linear-gradient(135deg, #ff7b00, #ff0055);
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          letter-spacing: -0.5px;
        }
        .control-panel p {
          font-size: 13px;
          color: #9ea4b0;
          line-height: 1.5;
          margin: 0 0 20px 0;
        }
        .divider {
          height: 1px;
          background: rgba(255, 255, 255, 0.08);
          margin: 16px 0;
        }
        .legend-item {
          display: flex;
          align-items: center;
          margin-bottom: 10px;
          font-size: 12px;
        }
        .legend-color {
          width: 18px;
          height: 18px;
          border-radius: 4px;
          margin-right: 12px;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
        .connection-status {
          display: inline-flex;
          align-items: center;
          font-size: 11px;
          padding: 4px 10px;
          border-radius: 20px;
          font-weight: 600;
          margin-bottom: 8px;
        }
        .status-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          margin-right: 8px;
        }
        .status-online {
          background: rgba(0, 255, 136, 0.1);
          color: #00ff88;
          border: 1px solid rgba(0, 255, 136, 0.2);
        }
        .status-online .status-dot {
          background: #00ff88;
          box-shadow: 0 0 8px #00ff88;
        }
        /* Dynamic HUD Specs */
        .hud-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
          font-size: 12px;
        }
        .hud-label {
          color: #8c94a6;
        }
        .hud-value {
          font-weight: 600;
          color: #f1f3f9;
        }
        .lod-badge {
          font-size: 10px;
          font-weight: 700;
          padding: 2px 6px;
          border-radius: 4px;
          text-transform: uppercase;
        }
        .lod-coarse {
          background: rgba(255, 153, 0, 0.15);
          color: #ff9900;
          border: 1px solid rgba(255, 153, 0, 0.3);
        }
        .lod-mid {
          background: rgba(51, 204, 255, 0.15);
          color: #33ccff;
          border: 1px solid rgba(51, 204, 255, 0.3);
        }
        .lod-fine {
          background: rgba(255, 51, 102, 0.15);
          color: #ff3366;
          border: 1px solid rgba(255, 51, 102, 0.3);
        }
        /* Custom Popup Styling */
        .maplibregl-popup-content {
          background: rgba(12, 15, 29, 0.9) !important;
          backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px !important;
          padding: 16px !important;
          color: #f1f3f9 !important;
          box-shadow: 0 8px 30px rgba(0, 0, 0, 0.4) !important;
        }
        .maplibregl-popup-anchor-top .maplibregl-popup-tip {
          border-bottom-color: rgba(12, 15, 29, 0.9) !important;
        }
        .maplibregl-popup-anchor-bottom .maplibregl-popup-tip {
          border-top-color: rgba(12, 15, 29, 0.9) !important;
        }
        .popup-title {
          font-size: 11px;
          color: #8c94a6;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 4px;
        }
        .popup-score {
          font-size: 24px;
          font-weight: 600;
          color: #ff3366;
          margin-bottom: 4px;
        }
      </style>
    </head>
    <body>
      <div class="control-panel">
        <h1>GeoAI Hotspots</h1>
        <p>
          141만 개 Gwangju 핫스팟 데이터를 H3 대형/중형 육각형 격자와 12m
          무테두리 초정밀 H3 Res 11 격자의 다단계 해상도(LOD)로 관측하는
          프리미엄 대시보드입니다.
        </p>

        <div
          style="display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 16px;"
        >
          <div class="connection-status status-online">
            <span class="status-dot"></span>Martin Online
          </div>
        </div>

        <!-- Dynamic Level of Detail HUD -->
        <div
          style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.05); padding: 12px 16px; border-radius: 10px; margin-bottom: 20px;"
        >
          <div class="hud-row">
            <span class="hud-label">실시간 줌 레벨 (Zoom)</span>
            <span class="hud-value" id="hud-zoom">11.5</span>
          </div>
          <div class="hud-row">
            <span class="hud-label">공간 LOD 레벨</span>
            <span class="lod-badge lod-coarse" id="hud-lod"
              >Coarse Hexagon Mode</span
            >
          </div>
        </div>

        <div class="divider"></div>

        <div
          style="font-size: 13px; font-weight: 600; margin-bottom: 12px; color: #f1f3f9;"
        >
          쓰레기 핫스팟 오염지수
        </div>
        <div class="legend-item">
          <div class="legend-color" style="background: #ff3366;"></div>
          <span>심각 구역 (Trash Score &ge; 0.7)</span>
        </div>
        <div class="legend-item">
          <div class="legend-color" style="background: #ff9900;"></div>
          <span>경계 구역 (Trash Score 0.4 ~ 0.7)</span>
        </div>
        <div class="legend-item">
          <div class="legend-color" style="background: #33ccff;"></div>
          <span>관심 구역 (Trash Score &lt; 0.4)</span>
        </div>
      </div>

      <div id="map"></div>

      <script>
        const map = new maplibregl.Map({
          container: "map",
          style:
            "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
          center: [126.8514, 35.1595],
          zoom: 11.5,
          minZoom: 8,
          maxZoom: 18,
        });

        map.addControl(new maplibregl.NavigationControl(), "top-right");

        map.on("zoom", () => {
          const zoom = map.getZoom().toFixed(2);
          document.getElementById("hud-zoom").innerText = zoom;

          const lodBadge = document.getElementById("hud-lod");
          if (zoom < 12.5) {
            lodBadge.innerText = "Coarse Hexagon (Res 7)";
            lodBadge.className = "lod-badge lod-coarse";
          } else if (zoom < 16.8) {
            lodBadge.innerText = "Fine Hexagon (Res 9)";
            lodBadge.className = "lod-badge lod-mid";
          } else {
            lodBadge.innerText = "Ultra-Fine H3 Res 11 Mode";
            lodBadge.className = "lod-badge lod-fine";
          }
        });

        map.on("load", () => {
          map.addSource("hotspots-source", {
            type: "vector",
            tiles: ["http://54.180.111.192:3000/hotspots/{z}/{x}/{y}"],
            minzoom: 4,
            maxzoom: 17,
          });

          // -------------------------------------------------------------
          // [1단계] H3 Resolution 7 (Coarse) 레이어 (줌 4 ~ 12.8)
          // -------------------------------------------------------------
          map.addLayer({
            id: "hotspots-res7-fill",
            type: "fill",
            source: "hotspots-source",
            "source-layer": "hotspots_res7",
            paint: {
              "fill-color": [
                "interpolate",
                ["linear"],
                ["get", "trash_score_avg"],
                0.0,
                "#33ccff",
                0.5,
                "#ff9900",
                1.0,
                "#ff3366",
              ],
              "fill-opacity": [
                "interpolate",
                ["linear"],
                ["zoom"],
                12.0,
                0.45,
                12.8,
                0.0,
              ],
            },
          });

          map.addLayer({
            id: "hotspots-res7-border",
            type: "line",
            source: "hotspots-source",
            "source-layer": "hotspots_res7",
            paint: {
              "line-color": "rgba(255, 255, 255, 0.15)",
              "line-width": 0.8,
              "line-opacity": [
                "interpolate",
                ["linear"],
                ["zoom"],
                12.0,
                0.8,
                12.8,
                0.0,
              ],
            },
          });

          // -------------------------------------------------------------
          // [2단계] H3 Resolution 9 (Fine) 레이어 (줌 12.0 ~ 17.2)
          // -------------------------------------------------------------
          map.addLayer({
            id: "hotspots-res9-fill",
            type: "fill",
            source: "hotspots-source",
            "source-layer": "hotspots_res9",
            paint: {
              "fill-color": [
                "interpolate",
                ["linear"],
                ["get", "trash_score_avg"],
                0.0,
                "#33ccff",
                0.5,
                "#ff9900",
                1.0,
                "#ff3366",
              ],
              "fill-opacity": [
                "interpolate",
                ["linear"],
                ["zoom"],
                12.0,
                0.0,
                12.8,
                0.6,
                16.5,
                0.6,
                17.2,
                0.0,
              ],
            },
          });

          map.addLayer({
            id: "hotspots-res9-border",
            type: "line",
            source: "hotspots-source",
            "source-layer": "hotspots_res9",
            paint: {
              "line-color": "rgba(255, 255, 255, 0.25)",
              "line-width": 1.0,
              "line-opacity": [
                "interpolate",
                ["linear"],
                ["zoom"],
                12.0,
                0.0,
                12.8,
                0.8,
                16.5,
                0.8,
                17.2,
                0.0,
              ],
            },
          });

          // -------------------------------------------------------------
          // [3단계] H3 Resolution 11 (Ultra-Fine) 레이어 (줌 16.5 ~ 18+)
          // -------------------------------------------------------------
          map.addLayer({
            id: "hotspots-res11-fill",
            type: "fill",
            source: "hotspots-source",
            "source-layer": "hotspots_res11",
            paint: {
              "fill-color": [
                "interpolate",
                ["linear"],
                ["get", "trash_score_avg"],
                0.0,
                "#33ccff",
                0.5,
                "#ff9900",
                1.0,
                "#ff3366",
              ],
              "fill-opacity": [
                "interpolate",
                ["linear"],
                ["zoom"],
                16.5,
                0.0,
                17.2,
                0.55,
              ],
            },
          });

          map.addLayer({
            id: "hotspots-res11-border",
            type: "line",
            source: "hotspots-source",
            "source-layer": "hotspots_res11",
            paint: {
              "line-color": "rgba(255, 255, 255, 0.0)",
              "line-width": 0.0,
              "line-opacity": 0.0,
            },
          });

          // -------------------------------------------------------------
          // 마우스 호버 다이내믹 팝업 컨트롤러
          // -------------------------------------------------------------
          const popup = new maplibregl.Popup({
            closeButton: false,
            closeOnClick: false,
          });

          function handleHover(e, title) {
            map.getCanvas().style.cursor = "pointer";

            if (e.features.length > 0) {
              const feature = e.features[0];
              const score = parseFloat(
                feature.properties.trash_score_avg
              ).toFixed(3);
              const maxScore = parseFloat(
                feature.properties.trash_score_max
              ).toFixed(3);
              const count = feature.properties.cell_count;
              const html = `
                          <div class="popup-title">${title} Summary</div>
                          <div class="popup-score">${score}</div>
                          <div style="font-size: 11px; color: #9ea4b0; margin-bottom: 4px;">
                              최대 점수: <strong>${maxScore}</strong>
                          </div>
                          <div style="font-size: 11px; color: #727985;">
                              집계 격자 수: <strong>${count}</strong> 개
                          </div>
                      `;

              popup.setLngLat(e.lngLat).setHTML(html).addTo(map);
            }
          }

          function handleLeave() {
            map.getCanvas().style.cursor = "";
            popup.remove();
          }

          map.on("mousemove", "hotspots-res7-fill", (e) =>
            handleHover(e, "H3 Res 7 (Coarse)")
          );
          map.on("mouseleave", "hotspots-res7-fill", handleLeave);

          map.on("mousemove", "hotspots-res9-fill", (e) =>
            handleHover(e, "H3 Res 9 (Fine)")
          );
          map.on("mouseleave", "hotspots-res9-fill", handleLeave);

          map.on("mousemove", "hotspots-res11-fill", (e) =>
            handleHover(e, "H3 Res 11 (Ultra-Fine)")
          );
          map.on("mouseleave", "hotspots-res11-fill", handleLeave);
        });
      </script>
    </body>
  </html>
  ```

---

## **2. ⚡ 플로깅 왕복 경로 추천 API 스펙 변경 안내**

다양하고 균형 잡힌 코스 큐레이션을 제공하기 위해 출발지 기준 **3개의 방향 다각화 왕복 경로**와 **인지 심리학 기반 상대 점수**가 탑재된 새로운 API 규격으로 전면 개편되었습니다.

- **요청 API 주소**: `GET /api/v1/routes`
- **요청 파라미터 (Query Param)**:
  - `lat` (Double, 필수): 출발지 위도
  - `lon` (Double, 필수): 출발지 경도
  - `time` (Integer, 필수): 플로깅 희망 시간 (분 단위, 예: 30)
  - `mode` (String, 선택): 기본값 `"PLOGGING"`

### **📥 최종 응답 JSON 데이터 포맷 (Response Body)**

기존 단일 객체 직배포 대신 **`routes` 배열을 가지는 래퍼 객체** 형태로 응답이 오며, 개별 경로에 **`ploggingScore`**가 추가되어 내려옵니다.

```
json
{
"routes": [
    {
"distanceMeter":5012.3,
"timeMillis":3612000,
"encodedPath":"_p~iF~ps|U_s@~...",
"ploggingScore":98
    },
    {
"distanceMeter":4890.1,
"timeMillis":3520000,
"encodedPath":"a~qjF~ptzU_e@~...",
"ploggingScore":65
    },
    {
"distanceMeter":5120.5,
"timeMillis":3685000,
"encodedPath":"m~zkF~psuU_w@~...",
"ploggingScore":24
    }
  ]
}
```

- **`ploggingScore` (15점 ~ 98점)**:
  - 단순한 절대치가 아닌, 그 동네에서 획득할 수 있는 쓰레기 오염 밀도를 인지 심리학적으로 스케일링한 점수입니다.
  - 1등 경로는 오염도에 따라 최대 79~98점을 유동적으로 획득하므로, 화면 구성 시 이 점수를 활용하여 **"최고 추천 코스 (98점)"**, **"여유로운 코스"** 등으로 게이밍 UX 카드를 아름답게 꾸며주시면 극상의 사용자 몰입감을 연출할 수 있습니다!
- **`encodedPath`**: 기존처럼 MapLibre / Google Maps Polyline 디코더로 풀어내어 지도 위에 얹어주시면 됩니다.

---

궁금하신 점이 있거나 스타일 코드 바인딩 예시가 추가로 필요하시면 언제든 말씀해 주세요. 감사합니다!
