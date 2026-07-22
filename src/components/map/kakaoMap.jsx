import { useEffect, useMemo, useRef, useState } from "react";

const KAKAO_JAVASCRIPT_KEY = String(
  import.meta.env.VITE_KAKAO_JAVASCRIPT_KEY || ""
).trim();

const DEFAULT_CENTER = {
  latitude: 36.1194,
  longitude: 128.1194,
};

function KakaoMap({
  routeStops = [],
  fullPathPoints = [],
  height = 520,
}) {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const overlaysRef = useRef([]);
  const polylineRef = useRef(null);

  const [mapStatus, setMapStatus] = useState("loading");
  const [errorMessage, setErrorMessage] = useState("");

  const validStops = useMemo(() => {
    return (Array.isArray(routeStops) ? routeStops : []).filter(
      (stop) =>
        Number.isFinite(Number(stop.latitude)) &&
        Number.isFinite(Number(stop.longitude))
    );
  }, [routeStops]);

  const validPathPoints = useMemo(() => {
    const suppliedPoints = Array.isArray(fullPathPoints)
      ? fullPathPoints
      : [];

    if (suppliedPoints.length > 0) {
      return suppliedPoints.filter(
        (point) =>
          Number.isFinite(Number(point.latitude)) &&
          Number.isFinite(Number(point.longitude))
      );
    }

    return (Array.isArray(routeStops) ? routeStops : [])
      .flatMap((stop) =>
        Array.isArray(stop.pathPoints) ? stop.pathPoints : []
      )
      .filter(
        (point) =>
          Number.isFinite(Number(point.latitude)) &&
          Number.isFinite(Number(point.longitude))
      );
  }, [fullPathPoints, routeStops]);

  const totalDistance = useMemo(() => {
    return (Array.isArray(routeStops) ? routeStops : []).reduce(
      (total, stop) => {
        const value = Number(stop.segmentDistance);
        return Number.isFinite(value) ? total + value : total;
      },
      0
    );
  }, [routeStops]);

  const totalDuration = useMemo(() => {
    return (Array.isArray(routeStops) ? routeStops : []).reduce(
      (total, stop) => {
        const value = Number(stop.segmentDuration);
        return Number.isFinite(value) ? total + value : total;
      },
      0
    );
  }, [routeStops]);

  useEffect(() => {
    let cancelled = false;

    async function initializeMap() {
      try {
        setMapStatus("loading");
        setErrorMessage("");

        if (!KAKAO_JAVASCRIPT_KEY) {
          throw new Error(
            ".env 파일에 VITE_KAKAO_JAVASCRIPT_KEY를 설정해 주세요."
          );
        }

        await loadKakaoMapSdk(KAKAO_JAVASCRIPT_KEY);

        if (cancelled || !mapContainerRef.current) {
          return;
        }

        const kakao = window.kakao;

        const firstStop = validStops[0];

        const initialCenter = firstStop
          ? new kakao.maps.LatLng(
              Number(firstStop.latitude),
              Number(firstStop.longitude)
            )
          : new kakao.maps.LatLng(
              DEFAULT_CENTER.latitude,
              DEFAULT_CENTER.longitude
            );

        mapRef.current = new kakao.maps.Map(
          mapContainerRef.current,
          {
            center: initialCenter,
            level: 5,
          }
        );

        setMapStatus("ready");
      } catch (error) {
        if (!cancelled) {
          setMapStatus("error");
          setErrorMessage(
            error instanceof Error
              ? error.message
              : "카카오 지도를 불러오지 못했습니다."
          );
        }
      }
    }

    initializeMap();

    return () => {
      cancelled = true;
      clearMapObjects();
    };
  }, []);

  useEffect(() => {
    if (
      mapStatus !== "ready" ||
      !mapRef.current ||
      !window.kakao?.maps
    ) {
      return;
    }

    drawRoute();
  }, [mapStatus, validStops, validPathPoints]);

  const clearMapObjects = () => {
    overlaysRef.current.forEach((overlay) => {
      overlay.setMap(null);
    });

    overlaysRef.current = [];

    if (polylineRef.current) {
      polylineRef.current.setMap(null);
      polylineRef.current = null;
    }
  };

  const drawRoute = () => {
    const kakao = window.kakao;
    const map = mapRef.current;

    clearMapObjects();

    const bounds = new kakao.maps.LatLngBounds();

    validStops.forEach((stop, index) => {
      const position = new kakao.maps.LatLng(
        Number(stop.latitude),
        Number(stop.longitude)
      );

      bounds.extend(position);

      const overlay = new kakao.maps.CustomOverlay({
        position,
        content: createMarkerContent(stop, index),
        yAnchor: 1.15,
        zIndex: 10,
      });

      overlay.setMap(map);
      overlaysRef.current.push(overlay);
    });

    if (validPathPoints.length > 1) {
      const polylinePath = validPathPoints.map(
        (point) =>
          new kakao.maps.LatLng(
            Number(point.latitude),
            Number(point.longitude)
          )
      );

      polylinePath.forEach((position) => {
        bounds.extend(position);
      });

      polylineRef.current = new kakao.maps.Polyline({
        map,
        path: polylinePath,
        strokeWeight: 6,
        strokeColor: "#1F3C88",
        strokeOpacity: 0.88,
        strokeStyle: "solid",
      });
    }

    if (validStops.length > 0 || validPathPoints.length > 0) {
      map.setBounds(bounds, 55, 55, 55, 55);
    }
  };

  return (
    <section style={styles.wrapper}>
      <div style={styles.header}>
        <div>
          <span style={styles.eyebrow}>KAKAO ROAD MAP</span>

          <h2 style={styles.title}>실제 운행경로 지도</h2>

          <p style={styles.description}>
            교수님이 정한 순서와 카카오모빌리티의 실제 자동차
            도로 경로를 표시합니다.
          </p>
        </div>

        <div style={styles.summary}>
          <span style={styles.summaryDistanceBadge}>
            🚗 {formatDistance(totalDistance)}
          </span>
          <span style={styles.summaryDurationBadge}>
            ⏱ {formatDuration(totalDuration)}
          </span>
          <span>경유지 {validStops.length}곳</span>
          <span>도로좌표 {validPathPoints.length}개</span>
        </div>
      </div>

      <div style={styles.mapArea}>
        <div
          ref={mapContainerRef}
          style={{
            ...styles.map,
            height: `${height}px`,
          }}
        />

        {mapStatus === "ready" &&
          validStops.length > 0 && (
            <div style={styles.floatingBadge}>
              <span style={styles.floatingBadgeItem}>
                🚗 총거리 {formatDistance(totalDistance)}
              </span>
              <span style={styles.floatingBadgeDivider}>
                ·
              </span>
              <span style={styles.floatingBadgeItem}>
                ⏱ 총시간 {formatDuration(totalDuration)}
              </span>
            </div>
          )}

        {mapStatus === "loading" && (
          <div style={styles.statusOverlay}>
            <span style={styles.statusIcon}>⏳</span>
            <strong>카카오 지도를 불러오는 중입니다.</strong>
          </div>
        )}

        {mapStatus === "error" && (
          <div style={styles.errorOverlay}>
            <span style={styles.statusIcon}>⚠️</span>
            <strong>지도를 표시할 수 없습니다.</strong>
            <p style={styles.errorText}>{errorMessage}</p>
          </div>
        )}

        {mapStatus === "ready" &&
          validStops.length === 0 && (
            <div style={styles.emptyOverlay}>
              <span style={styles.statusIcon}>🗺️</span>
              <strong>계산된 경로가 없습니다.</strong>
              <p style={styles.emptyText}>
                센터와 어르신집을 추가한 뒤 실제도로 계산을
                실행해 주세요.
              </p>
            </div>
          )}
      </div>

      <div style={styles.legend}>
        <span style={styles.legendItem}>
          <i
            style={{
              ...styles.legendCircle,
              backgroundColor: "#1F3C88",
            }}
          />
          센터
        </span>

        <span style={styles.legendItem}>
          <i
            style={{
              ...styles.legendCircle,
              backgroundColor: "#F4A261",
            }}
          />
          어르신집
        </span>

        <span style={styles.legendItem}>
          <i style={styles.legendLine} />
          실제 자동차 도로
        </span>
      </div>
    </section>
  );
}

function createMarkerContent(stop, index) {
  const isCenter = stop.type === "center";
  const backgroundColor = isCenter ? "#1F3C88" : "#F4A261";
  const typeLabel = isCenter ? "센터" : "어르신집";
  const safeName = escapeHtml(stop.name || "경유지");
  const safeAddress = escapeHtml(stop.address || "주소 없음");

  const segmentDistance = Number(stop.segmentDistance);
  const segmentDuration = Number(stop.segmentDuration);

  const hasSegmentInfo =
    index > 0 && Number.isFinite(segmentDistance);

  const segmentText = hasSegmentInfo
    ? `이전 구간 ${segmentDistance.toFixed(
        2
      )}km · ${formatDuration(segmentDuration)}`
    : "";

  return `
    <div style="
      position:relative;
      min-width:150px;
      max-width:220px;
      padding:10px 12px;
      background:#ffffff;
      border:2px solid ${backgroundColor};
      border-radius:12px;
      box-shadow:0 7px 18px rgba(15,23,42,0.18);
      font-family:Arial,'Noto Sans KR',sans-serif;
    ">
      <div style="
        display:flex;
        align-items:center;
        gap:8px;
      ">
        <span style="
          width:30px;
          height:30px;
          flex:none;
          display:flex;
          align-items:center;
          justify-content:center;
          background:${backgroundColor};
          color:#ffffff;
          border-radius:50%;
          font-size:12px;
          font-weight:900;
        ">
          ${index + 1}
        </span>

        <div style="
          min-width:0;
          flex:1;
        ">
          <div style="
            margin-bottom:3px;
            color:#172033;
            font-size:12px;
            font-weight:900;
            white-space:nowrap;
            overflow:hidden;
            text-overflow:ellipsis;
          ">
            ${safeName}
          </div>

          <div style="
            color:#64748b;
            font-size:9px;
            white-space:nowrap;
            overflow:hidden;
            text-overflow:ellipsis;
          ">
            ${safeAddress}
          </div>
        </div>

        <span style="
          padding:3px 6px;
          background:${backgroundColor}18;
          color:${backgroundColor};
          border-radius:999px;
          font-size:8px;
          font-weight:900;
        ">
          ${typeLabel}
        </span>
      </div>

      ${
        segmentText
          ? `<div style="
              margin-top:7px;
              padding-top:7px;
              border-top:1px dashed #e2e8f0;
              color:#047857;
              font-size:9px;
              font-weight:800;
              white-space:nowrap;
            ">
              🚗 ${segmentText}
            </div>`
          : ""
      }

      <div style="
        position:absolute;
        left:50%;
        bottom:-9px;
        width:16px;
        height:16px;
        background:#ffffff;
        border-right:2px solid ${backgroundColor};
        border-bottom:2px solid ${backgroundColor};
        transform:translateX(-50%) rotate(45deg);
      "></div>
    </div>
  `;
}

function loadKakaoMapSdk(appKey) {
  return new Promise((resolve, reject) => {
    if (window.kakao?.maps) {
      window.kakao.maps.load(resolve);
      return;
    }

    const existingScript = document.querySelector(
      'script[data-kakao-map-sdk="true"]'
    );

    if (existingScript) {
      existingScript.addEventListener("load", () => {
        window.kakao.maps.load(resolve);
      });

      existingScript.addEventListener("error", () => {
        reject(
          new Error("카카오 지도 SDK를 불러오지 못했습니다.")
        );
      });

      return;
    }

    const script = document.createElement("script");

    script.dataset.kakaoMapSdk = "true";
    script.async = true;

    script.src =
      `https://dapi.kakao.com/v2/maps/sdk.js` +
      `?appkey=${encodeURIComponent(appKey)}` +
      `&autoload=false`;

    script.onload = () => {
      if (!window.kakao?.maps) {
        reject(
          new Error("카카오 지도 객체를 확인할 수 없습니다.")
        );
        return;
      }

      window.kakao.maps.load(resolve);
    };

    script.onerror = () => {
      reject(
        new Error(
          "카카오 지도 SDK를 불러오지 못했습니다. JavaScript 키와 도메인을 확인해 주세요."
        )
      );
    };

    document.head.appendChild(script);
  });
}

function formatDistance(distance) {
  const value = Number(distance);

  if (!Number.isFinite(value) || value <= 0) {
    return "0km";
  }

  return `${value.toFixed(1)}km`;
}

function formatDuration(duration) {
  const value = Number(duration);

  if (!Number.isFinite(value) || value <= 0) {
    return "0분";
  }

  const minutes = Math.round(value);

  if (minutes < 60) {
    return `${minutes}분`;
  }

  const hours = Math.floor(minutes / 60);
  const restMinutes = minutes % 60;

  return restMinutes > 0
    ? `${hours}시간 ${restMinutes}분`
    : `${hours}시간`;
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

const styles = {
  wrapper: {
    width: "100%",
    padding: "22px",
    boxSizing: "border-box",
    backgroundColor: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: "17px",
    boxShadow: "0 8px 25px rgba(15,23,42,0.05)",
  },

  header: {
    marginBottom: "15px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-end",
    gap: "15px",
    flexWrap: "wrap",
  },

  eyebrow: {
    display: "block",
    marginBottom: "3px",
    color: "#1F3C88",
    fontSize: "10px",
    fontWeight: "900",
    letterSpacing: "1.1px",
  },

  title: {
    margin: "0 0 5px",
    color: "#172033",
    fontSize: "21px",
  },

  description: {
    margin: "0",
    color: "#64748b",
    fontSize: "11px",
    lineHeight: "1.6",
  },

  summary: {
    display: "flex",
    gap: "8px",
    flexWrap: "wrap",
    color: "#475569",
    fontSize: "10px",
    fontWeight: "800",
  },

  summaryDistanceBadge: {
    padding: "5px 9px",
    backgroundColor: "#eff6ff",
    border: "1px solid #bfdbfe",
    borderRadius: "999px",
    color: "#1e40af",
  },

  summaryDurationBadge: {
    padding: "5px 9px",
    backgroundColor: "#fff7ed",
    border: "1px solid #fed7aa",
    borderRadius: "999px",
    color: "#c2410c",
  },

  floatingBadge: {
    position: "absolute",
    top: "14px",
    left: "14px",
    zIndex: "20",
    padding: "9px 14px",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    backgroundColor: "rgba(255,255,255,0.95)",
    border: "1px solid #e2e8f0",
    borderRadius: "999px",
    boxShadow: "0 6px 16px rgba(15,23,42,0.15)",
    color: "#172033",
    fontSize: "12px",
    fontWeight: "900",
  },

  floatingBadgeItem: {
    whiteSpace: "nowrap",
  },

  floatingBadgeDivider: {
    color: "#cbd5e1",
  },

  mapArea: {
    position: "relative",
    overflow: "hidden",
    border: "1px solid #cbd5e1",
    borderRadius: "14px",
    backgroundColor: "#f8fafc",
  },

  map: {
    width: "100%",
  },

  statusOverlay: {
    position: "absolute",
    inset: "0",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    gap: "9px",
    backgroundColor: "rgba(248,250,252,0.94)",
    color: "#1F3C88",
    fontSize: "13px",
  },

  errorOverlay: {
    position: "absolute",
    inset: "0",
    padding: "30px",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    gap: "8px",
    backgroundColor: "rgba(254,242,242,0.96)",
    color: "#991b1b",
    textAlign: "center",
  },

  emptyOverlay: {
    position: "absolute",
    inset: "0",
    padding: "30px",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    gap: "8px",
    backgroundColor: "rgba(248,250,252,0.9)",
    color: "#475569",
    textAlign: "center",
    pointerEvents: "none",
  },

  statusIcon: {
    fontSize: "34px",
  },

  errorText: {
    maxWidth: "500px",
    margin: "0",
    fontSize: "11px",
    lineHeight: "1.7",
  },

  emptyText: {
    maxWidth: "420px",
    margin: "0",
    color: "#64748b",
    fontSize: "11px",
    lineHeight: "1.7",
  },

  legend: {
    marginTop: "13px",
    display: "flex",
    alignItems: "center",
    gap: "15px",
    flexWrap: "wrap",
    color: "#64748b",
    fontSize: "10px",
  },

  legendItem: {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
  },

  legendCircle: {
    width: "11px",
    height: "11px",
    display: "inline-block",
    borderRadius: "50%",
  },

  legendLine: {
    width: "25px",
    height: "5px",
    display: "inline-block",
    backgroundColor: "#1F3C88",
    borderRadius: "999px",
  },
};

export default KakaoMap;