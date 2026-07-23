import { useEffect, useMemo, useState } from "react";
import KakaoMap from "../components/map/kakaoMap";
import {
  getTodayDateKey,
  subscribeAssignment,
} from "../services/dispatchSync";
import { isFirebaseConfigured } from "../services/firebase";

const DEFAULT_VEHICLES = [
  { id: "vehicle-1", name: "1호차" },
  { id: "vehicle-2", name: "2호차" },
  { id: "vehicle-3", name: "3호차" },
  { id: "sub-vehicle", name: "서브차량" },
];

function DriverHomePage({
  vehicles = DEFAULT_VEHICLES,
  onStartDrive,
  onExitDriverMode,
}) {
  const [session, setSession] = useState("morning");
  const [vehicleId, setVehicleId] = useState(
    vehicles[0]?.id || "vehicle-1"
  );

  const [assignment, setAssignment] = useState(null);
  const [status, setStatus] = useState("loading");
  const [errorMessage, setErrorMessage] = useState("");

  const todayDateKey = useMemo(
    () => getTodayDateKey(),
    []
  );

  const safeVehicles =
    Array.isArray(vehicles) && vehicles.length > 0
      ? vehicles
      : DEFAULT_VEHICLES;

  const currentVehicle =
    safeVehicles.find(
      (vehicle) => vehicle.id === vehicleId
    ) || safeVehicles[0];

  useEffect(() => {
    setStatus("loading");
    setErrorMessage("");
    setAssignment(null);

    const unsubscribe = subscribeAssignment(
      {
        dateKey: todayDateKey,
        session,
        vehicleId,
      },
      (data) => {
        setAssignment(data);
        setStatus("ready");
      },
      (error) => {
        setStatus("error");
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "배차 정보를 불러오지 못했습니다."
        );
      }
    );

    return () => {
      unsubscribe?.();
    };
  }, [todayDateKey, session, vehicleId]);

  const routeStops = Array.isArray(
    assignment?.routeStops
  )
    ? assignment.routeStops
    : [];

  const hasAssignment = routeStops.length > 0;

  const handleStartDrive = () => {
    if (!hasAssignment) {
      window.alert(
        "아직 사무실에서 배차된 경로가 없습니다."
      );
      return;
    }

    onStartDrive?.({
      session,
      vehicle: currentVehicle,
      routeStops,
    });
  };

  return (
    <main style={styles.page}>
      <header style={styles.header}>
        <button
          type="button"
          onClick={onExitDriverMode}
          style={styles.backButton}
        >
          ← 모드 선택
        </button>

        <div style={styles.headerTitleArea}>
          <span style={styles.eyebrow}>
            DRIVER MODE
          </span>

          <h1 style={styles.title}>
            🚐 오늘의 배차 확인
          </h1>

          <p style={styles.subtitle}>
            사무실에서 배정한 오늘({todayDateKey}) 운행경로를
            실시간으로 확인합니다.
          </p>
        </div>
      </header>

      {!isFirebaseConfigured && (
        <section style={styles.warningBanner}>
          ⚠️ Firebase 연결이 설정되지 않았습니다. 관리자에게
          문의해 .env(VITE_FIREBASE_...) 값을 설정해 주세요.
        </section>
      )}

      <section style={styles.selectSection}>
        <div style={styles.selectGroup}>
          <label style={styles.selectLabel}>
            송영 구분
          </label>

          <div style={styles.pillGroup}>
            <button
              type="button"
              onClick={() => setSession("morning")}
              style={{
                ...styles.pillButton,
                ...(session === "morning"
                  ? styles.pillButtonActive
                  : {}),
              }}
            >
              오전 송영
            </button>

            <button
              type="button"
              onClick={() => setSession("afternoon")}
              style={{
                ...styles.pillButton,
                ...(session === "afternoon"
                  ? styles.pillButtonActive
                  : {}),
              }}
            >
              오후 송영
            </button>
          </div>
        </div>

        <div style={styles.selectGroup}>
          <label style={styles.selectLabel}>
            내 이름
          </label>

          <select
            value={vehicleId}
            onChange={(event) =>
              setVehicleId(event.target.value)
            }
            style={styles.vehicleSelect}
          >
            {safeVehicles.map((vehicle) => (
              <option
                key={vehicle.id}
                value={vehicle.id}
              >
                {vehicle.driverName
                  ? `${vehicle.driverName} (${vehicle.name})`
                  : `${vehicle.name} · 이름 미지정`}
              </option>
            ))}
          </select>
        </div>
      </section>

      {status === "loading" && (
        <section style={styles.statusCard}>
          ⏳ 배차 정보를 불러오는 중입니다...
        </section>
      )}

      {status === "error" && (
        <section
          style={{
            ...styles.statusCard,
            ...styles.errorCard,
          }}
        >
          ⚠️ {errorMessage}
        </section>
      )}

      {status === "ready" && !hasAssignment && (
        <section style={styles.emptyCard}>
          <span style={styles.emptyIcon}>📭</span>
          <strong>
            아직 사무실에서 배차된 경로가 없습니다.
          </strong>
          <p style={styles.emptyText}>
            사무실에서 경로 계산을 완료하면 이 화면에 자동으로
            표시됩니다. (잠시 후 자동으로 갱신됩니다)
          </p>
        </section>
      )}

      {status === "ready" && hasAssignment && (
        <>
          <section style={styles.mapSection}>
            <KakaoMap
              routeStops={routeStops}
              fullPathPoints={routeStops.flatMap(
                (stop) =>
                  Array.isArray(stop.pathPoints)
                    ? stop.pathPoints
                    : []
              )}
              height={380}
            />
          </section>

          <section style={styles.routeListSection}>
            <div style={styles.sectionHeader}>
              <h2 style={styles.sectionTitle}>
                배정된 운행순서
              </h2>

              <span style={styles.routeCount}>
                총 {routeStops.length}곳
              </span>
            </div>

            <div style={styles.routeList}>
              {routeStops.map((stop, index) => (
                <article
                  key={
                    stop.stopId ||
                    `${stop.id}-${index}`
                  }
                  style={styles.routeItem}
                >
                  <span
                    style={{
                      ...styles.routeNumber,
                      backgroundColor:
                        stop.type === "center"
                          ? "#1f3c88"
                          : "#f4a261",
                    }}
                  >
                    {index + 1}
                  </span>

                  <div style={styles.routeInfo}>
                    <strong>
                      {stop.name || "경유지"}
                    </strong>
                    <span style={styles.routeAddress}>
                      {stop.address || "주소 없음"}
                    </span>

                    {stop.type !== "center" &&
                      stop.scheduledTime && (
                        <span
                          style={
                            styles.scheduledTimeBadge
                          }
                        >
                          {session === "afternoon"
                            ? "하차"
                            : "탑승"}{" "}
                          기준 {stop.scheduledTime}
                        </span>
                      )}
                  </div>
                </article>
              ))}
            </div>
          </section>

          <button
            type="button"
            onClick={handleStartDrive}
            style={styles.startButton}
          >
            ▶ 운행 시작
          </button>
        </>
      )}
    </main>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    padding: "22px",
    boxSizing: "border-box",
    backgroundColor: "#f4f7fb",
    color: "#172033",
    fontFamily:
      '"Pretendard", "Noto Sans KR", Arial, sans-serif',
  },

  header: {
    maxWidth: "900px",
    margin: "0 auto 16px",
    padding: "22px",
    display: "flex",
    alignItems: "center",
    gap: "16px",
    flexWrap: "wrap",
    background:
      "linear-gradient(135deg, #172033 0%, #1f3c88 100%)",
    borderRadius: "18px",
  },

  backButton: {
    minHeight: "40px",
    padding: "0 13px",
    border: "1px solid rgba(255,255,255,0.25)",
    borderRadius: "10px",
    backgroundColor: "rgba(255,255,255,0.12)",
    color: "#ffffff",
    fontWeight: "900",
    cursor: "pointer",
  },

  headerTitleArea: { minWidth: "220px", flex: "1" },

  eyebrow: {
    display: "block",
    marginBottom: "3px",
    color: "#bfdbfe",
    fontSize: "9px",
    fontWeight: "900",
  },

  title: {
    margin: "0 0 5px",
    color: "#ffffff",
    fontSize: "22px",
  },

  subtitle: {
    margin: "0",
    color: "#dbeafe",
    fontSize: "11px",
  },

  warningBanner: {
    maxWidth: "900px",
    margin: "0 auto 16px",
    padding: "13px 15px",
    backgroundColor: "#fef2f2",
    border: "1px solid #fecaca",
    borderRadius: "12px",
    color: "#991b1b",
    fontSize: "11px",
    fontWeight: "700",
  },

  selectSection: {
    maxWidth: "900px",
    margin: "0 auto 16px",
    padding: "16px",
    display: "flex",
    gap: "16px",
    flexWrap: "wrap",
    backgroundColor: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: "15px",
  },

  selectGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "7px",
  },

  selectLabel: {
    color: "#64748b",
    fontSize: "10px",
    fontWeight: "800",
  },

  pillGroup: { display: "flex", gap: "7px" },

  pillButton: {
    minHeight: "40px",
    padding: "0 14px",
    border: "1px solid #cbd5e1",
    borderRadius: "999px",
    backgroundColor: "#f8fafc",
    color: "#334155",
    fontSize: "12px",
    fontWeight: "800",
    cursor: "pointer",
  },

  pillButtonActive: {
    backgroundColor: "#1f3c88",
    borderColor: "#1f3c88",
    color: "#ffffff",
  },

  vehicleSelect: {
    minHeight: "40px",
    padding: "0 11px",
    border: "1px solid #cbd5e1",
    borderRadius: "9px",
    backgroundColor: "#ffffff",
    fontSize: "12px",
  },

  statusCard: {
    maxWidth: "900px",
    margin: "0 auto 16px",
    padding: "26px",
    textAlign: "center",
    backgroundColor: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: "15px",
    color: "#1e40af",
    fontWeight: "800",
  },

  errorCard: {
    backgroundColor: "#fef2f2",
    borderColor: "#fecaca",
    color: "#991b1b",
  },

  emptyCard: {
    maxWidth: "900px",
    margin: "0 auto 16px",
    padding: "34px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "8px",
    textAlign: "center",
    backgroundColor: "#ffffff",
    border: "1px dashed #cbd5e1",
    borderRadius: "15px",
    color: "#334155",
  },

  emptyIcon: { fontSize: "36px" },

  emptyText: {
    maxWidth: "420px",
    margin: "0",
    color: "#64748b",
    fontSize: "11px",
    lineHeight: "1.7",
  },

  mapSection: {
    maxWidth: "900px",
    margin: "0 auto 16px",
    borderRadius: "16px",
    overflow: "hidden",
    backgroundColor: "#ffffff",
    border: "1px solid #e2e8f0",
  },

  routeListSection: {
    maxWidth: "900px",
    margin: "0 auto 16px",
    padding: "18px",
    boxSizing: "border-box",
    backgroundColor: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: "15px",
  },

  sectionHeader: {
    marginBottom: "12px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },

  sectionTitle: { margin: "0", fontSize: "16px" },

  routeCount: { color: "#64748b", fontSize: "11px" },

  routeList: { display: "grid", gap: "8px" },

  routeItem: {
    padding: "11px",
    display: "flex",
    alignItems: "center",
    gap: "10px",
    backgroundColor: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: "10px",
  },

  routeNumber: {
    width: "27px",
    height: "27px",
    flexShrink: "0",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#ffffff",
    borderRadius: "50%",
    fontSize: "10px",
    fontWeight: "900",
  },

  routeInfo: {
    minWidth: "0",
    display: "flex",
    flexDirection: "column",
    gap: "3px",
    fontSize: "12px",
  },

  routeAddress: {
    color: "#64748b",
    fontSize: "10px",
  },

  scheduledTimeBadge: {
    marginTop: "2px",
    color: "#c2410c",
    fontSize: "9px",
    fontWeight: "800",
  },

  startButton: {
    width: "100%",
    maxWidth: "900px",
    margin: "0 auto",
    display: "block",
    minHeight: "54px",
    border: "none",
    borderRadius: "13px",
    backgroundColor: "#1f3c88",
    color: "#ffffff",
    fontSize: "15px",
    fontWeight: "900",
    cursor: "pointer",
  },
};

export default DriverHomePage;