import KakaoMap from "../components/map/kakaoMap";
import { useMemo, useState } from "react";

const DEFAULT_VEHICLES = [
  { id: "vehicle-1", name: "1호차", assignedCount: 0, driverName: "", assistantName: "" },
  { id: "vehicle-2", name: "2호차", assignedCount: 0, driverName: "", assistantName: "" },
  { id: "vehicle-3", name: "3호차", assignedCount: 0, driverName: "", assistantName: "" },
  { id: "sub-vehicle", name: "서브차량", assignedCount: 0, driverName: "", assistantName: "" },
];

function DashboardPage({
  vehicles = DEFAULT_VEHICLES,
  selectedDate,
  initialSession = "morning",
  selectedVehicleId = "vehicle-1",
  routeStops = [],
  onDateChange,
  onSessionChange,
  onVehicleSelect,
  onStartPreparation,
  onOpenHistory,
  onSwitchMode,
  onUpdateVehicleStaff,
}) {
  const [selectedSession, setSelectedSession] = useState(initialSession);

  const safeRouteStops = useMemo(() => {
    return Array.isArray(routeStops) ? routeStops : [];
  }, [routeStops]);

  const fullPathPoints = useMemo(() => {
    return safeRouteStops.flatMap((stop) =>
      Array.isArray(stop.pathPoints) ? stop.pathPoints : []
    );
  }, [safeRouteStops]);

  const safeVehicles = useMemo(() => {
    return Array.isArray(vehicles) && vehicles.length > 0
      ? vehicles
      : DEFAULT_VEHICLES;
  }, [vehicles]);

  const currentVehicle = useMemo(() => {
    return (
      safeVehicles.find((vehicle) => vehicle.id === selectedVehicleId) ||
      safeVehicles[0]
    );
  }, [safeVehicles, selectedVehicleId]);

  const totalAssignedCount = useMemo(() => {
    return safeVehicles.reduce((total, vehicle) => {
      const count = Number(vehicle.assignedCount);
      return total + (Number.isFinite(count) ? count : 0);
    }, 0);
  }, [safeVehicles]);

  const safeSelectedDate = useMemo(() => {
    return selectedDate || getTodayDateKeyLocal();
  }, [selectedDate]);

  const selectedDateText = useMemo(() => {
    return formatKoreanDate(
      new Date(`${safeSelectedDate}T00:00:00`)
    );
  }, [safeSelectedDate]);

  const handleSessionChange = (session) => {
    setSelectedSession(session);
    onSessionChange?.(session);
  };

  const handleStartPreparation = () => {
    onStartPreparation?.({
      session: selectedSession,
      vehicleId: currentVehicle?.id,
    });
  };

  return (
    <main style={styles.page}>
      <section style={styles.hero}>
        <div style={styles.brandArea}>
          <div style={styles.logo}>🚐</div>
          <div>
            <span style={styles.organization}>김천통합재가서비스센터</span>
            <h1 style={styles.title}>송영관리시스템</h1>
            <p style={styles.subtitle}>
              오전·오후 송영과 차량별 운행 준비를 한 화면에서 관리합니다.
            </p>
          </div>
        </div>

        <div style={styles.dateCard}>
          <span style={styles.dateLabel}>배차 날짜</span>
          <input
            type="date"
            value={safeSelectedDate}
            onChange={(event) =>
              onDateChange?.(event.target.value)
            }
            style={styles.dateInput}
          />
          <span style={styles.dateSubText}>
            {selectedDateText}
          </span>
        </div>

        <button
          type="button"
          onClick={() => onOpenHistory?.()}
          style={styles.historyButton}
        >
          📋 운행기록 보기
        </button>

        <button
          type="button"
          onClick={() => onSwitchMode?.()}
          style={styles.historyButton}
        >
          🔀 모드 전환
        </button>
      </section>

      <section style={styles.content}>
        <div style={styles.sectionHeader}>
          <div>
            <span style={styles.sectionNumber}>01</span>
            <h2 style={styles.sectionTitle}>송영 시간 선택</h2>
          </div>
          <span style={styles.sectionHint}>오전 또는 오후를 선택해 주세요.</span>
        </div>

        <div style={styles.sessionGrid}>
          <SessionButton
            icon="🌅"
            title="오전 송영"
            description="어르신 댁에서 센터로 등원"
            selected={selectedSession === "morning"}
            onClick={() => handleSessionChange("morning")}
          />
          <SessionButton
            icon="🌇"
            title="오후 송영"
            description="센터에서 어르신 댁으로 귀가"
            selected={selectedSession === "afternoon"}
            onClick={() => handleSessionChange("afternoon")}
          />
        </div>
      </section>

      <section style={styles.content}>
        <div style={styles.sectionHeader}>
          <div>
            <span style={styles.sectionNumber}>02</span>
            <h2 style={styles.sectionTitle}>운행차량 선택</h2>
          </div>
          <span style={styles.sectionHint}>전체 배정 {totalAssignedCount}명</span>
        </div>

        <div style={styles.vehicleGrid}>
          {safeVehicles.map((vehicle) => (
            <VehicleCard
              key={vehicle.id}
              vehicle={vehicle}
              selected={vehicle.id === currentVehicle?.id}
              onClick={() => onVehicleSelect?.(vehicle.id)}
              onUpdateStaff={(staff) =>
                onUpdateVehicleStaff?.(vehicle.id, staff)
              }
            />
          ))}
        </div>
      </section>
<section style={styles.mapSection}>
  <KakaoMap
    routeStops={safeRouteStops}
    fullPathPoints={fullPathPoints}
    height={600}
  />
</section>
      <section style={styles.prepareCard}>
        <div style={styles.prepareInfo}>
          <span style={styles.prepareLabel}>현재 선택</span>
          <strong style={styles.prepareValue}>
            {selectedSession === "morning" ? "오전 송영" : "오후 송영"}
            {" · "}
            {currentVehicle?.name || "차량 미선택"}
          </strong>
          <span style={styles.prepareDescription}>
            선택한 차량의 담당 어르신과 운행경로를 설정합니다.
          </span>
        </div>

        <button type="button" onClick={handleStartPreparation} style={styles.startButton}>
          운행 준비 시작 <span style={styles.startArrow}>→</span>
        </button>
      </section>

      <footer style={styles.footer}>
        김천통합재가서비스센터 전용 송영관리시스템
      </footer>
    </main>
  );
}

function SessionButton({ icon, title, description, selected, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        ...styles.sessionButton,
        ...(selected ? styles.selectedSessionButton : {}),
      }}
    >
      <span style={styles.sessionIcon}>{icon}</span>
      <span style={styles.sessionText}>
        <strong style={styles.sessionTitle}>{title}</strong>
        <span style={styles.sessionDescription}>{description}</span>
      </span>
      <span
        style={{
          ...styles.selectionMark,
          ...(selected ? styles.selectedMark : {}),
        }}
      >
        {selected ? "✓" : ""}
      </span>
    </button>
  );
}

function VehicleCard({
  vehicle,
  selected,
  onClick,
  onUpdateStaff,
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [driverNameDraft, setDriverNameDraft] =
    useState(vehicle.driverName || "");
  const [assistantNameDraft, setAssistantNameDraft] =
    useState(vehicle.assistantName || "");

  const assignedCount = Number(vehicle.assignedCount) || 0;

  const handleStartEdit = (event) => {
    event.stopPropagation();
    setDriverNameDraft(vehicle.driverName || "");
    setAssistantNameDraft(vehicle.assistantName || "");
    setIsEditing(true);
  };

  const handleCancelEdit = (event) => {
    event.stopPropagation();
    setIsEditing(false);
  };

  const handleSaveEdit = (event) => {
    event.stopPropagation();

    onUpdateStaff?.({
      driverName: driverNameDraft.trim(),
      assistantName: assistantNameDraft.trim(),
    });

    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div
        style={{
          ...styles.vehicleCard,
          ...styles.vehicleCardEditing,
        }}
        onClick={(event) => event.stopPropagation()}
      >
        <div style={styles.vehicleCardTop}>
          <span style={styles.vehicleIcon}>🚐</span>
        </div>

        <strong style={styles.vehicleName}>
          {vehicle.name}
        </strong>

        <label style={styles.editLabel}>
          운전원 이름
          <input
            type="text"
            value={driverNameDraft}
            onChange={(event) =>
              setDriverNameDraft(event.target.value)
            }
            placeholder="예: 김철수"
            style={styles.editInput}
          />
        </label>

        <label style={styles.editLabel}>
          동승자 이름
          <input
            type="text"
            value={assistantNameDraft}
            onChange={(event) =>
              setAssistantNameDraft(event.target.value)
            }
            placeholder="예: 이영희"
            style={styles.editInput}
          />
        </label>

        <div style={styles.editActions}>
          <button
            type="button"
            onClick={handleCancelEdit}
            style={styles.editCancelButton}
          >
            취소
          </button>

          <button
            type="button"
            onClick={handleSaveEdit}
            style={styles.editSaveButton}
          >
            저장
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        ...styles.vehicleCard,
        ...(selected ? styles.selectedVehicleCard : {}),
      }}
    >
      <div style={styles.vehicleCardTop}>
        <span style={styles.vehicleIcon}>🚐</span>
        <span
          style={{
            ...styles.vehicleSelectedBadge,
            visibility: selected ? "visible" : "hidden",
          }}
        >
          선택됨
        </span>
      </div>

      <strong style={styles.vehicleName}>{vehicle.name}</strong>

      <div style={styles.vehicleAssigned}>
        <span style={styles.vehicleAssignedLabel}>담당 어르신</span>
        <strong style={styles.vehicleAssignedValue}>{assignedCount}명</strong>
      </div>

      <div style={styles.vehicleStaff}>
        <span>운전원: {vehicle.driverName || "미지정"}</span>
        <span>동승자: {vehicle.assistantName || "미지정"}</span>
      </div>

      <span
        onClick={handleStartEdit}
        style={styles.editTrigger}
      >
        ✏️ 이름 입력/수정
      </span>
    </button>
  );
}

function getTodayDateKeyLocal() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatKoreanDate(date) {
  const weekday = ["일", "월", "화", "수", "목", "금", "토"];
  return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일 (${weekday[date.getDay()]})`;
}

const styles = {
  page: {
    minHeight: "100vh",
    padding: "32px",
    boxSizing: "border-box",
    backgroundColor: "#f4f7fb",
    color: "#172033",
    fontFamily: '"Pretendard", "Noto Sans KR", Arial, sans-serif',
  },
  hero: {
    maxWidth: "1180px",
    margin: "0 auto 24px",
    padding: "28px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "20px",
    flexWrap: "wrap",
    background: "linear-gradient(135deg, #172033 0%, #1f3c88 100%)",
    borderRadius: "22px",
    boxShadow: "0 16px 38px rgba(31, 60, 136, 0.2)",
  },
  brandArea: { display: "flex", alignItems: "center", gap: "18px" },
  logo: {
    width: "68px",
    height: "68px",
    flexShrink: "0",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.14)",
    border: "1px solid rgba(255,255,255,0.2)",
    borderRadius: "18px",
    fontSize: "34px",
  },
  organization: { display: "block", marginBottom: "5px", color: "#cbd5e1", fontSize: "13px", fontWeight: "800" },
  title: { margin: "0 0 7px", color: "#ffffff", fontSize: "30px", letterSpacing: "-1px" },
  subtitle: { margin: "0", color: "#dbeafe", fontSize: "13px", lineHeight: "1.6" },
  dateCard: {
    minWidth: "220px",
    padding: "17px 19px",
    display: "flex",
    flexDirection: "column",
    gap: "5px",
    backgroundColor: "rgba(255,255,255,0.12)",
    border: "1px solid rgba(255,255,255,0.2)",
    borderRadius: "15px",
  },
  dateLabel: { color: "#bfdbfe", fontSize: "11px", fontWeight: "800" },
  dateValue: { color: "#ffffff", fontSize: "17px" },
  dateInput: {
    height: "38px",
    padding: "0 10px",
    boxSizing: "border-box",
    border: "1px solid rgba(255,255,255,0.35)",
    borderRadius: "9px",
    backgroundColor: "rgba(255,255,255,0.14)",
    color: "#ffffff",
    fontSize: "14px",
    fontWeight: "800",
    colorScheme: "dark",
  },
  dateSubText: { color: "#dbeafe", fontSize: "10px" },
  historyButton: {
    minHeight: "44px",
    padding: "0 16px",
    border: "1px solid rgba(255,255,255,0.25)",
    borderRadius: "11px",
    backgroundColor: "rgba(255,255,255,0.12)",
    color: "#ffffff",
    fontSize: "12px",
    fontWeight: "800",
    cursor: "pointer",
  },
  content: {
    maxWidth: "1180px",
    margin: "0 auto 20px",
    padding: "25px",
    boxSizing: "border-box",
    backgroundColor: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: "18px",
    boxShadow: "0 8px 25px rgba(15,23,42,0.05)",
  },
  sectionHeader: {
    marginBottom: "16px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-end",
    gap: "12px",
    flexWrap: "wrap",
  },
  sectionNumber: { display: "block", marginBottom: "3px", color: "#1f3c88", fontSize: "11px", fontWeight: "900", letterSpacing: "1.1px" },
  sectionTitle: { margin: "0", color: "#172033", fontSize: "21px", letterSpacing: "-0.5px" },
  sectionHint: { color: "#64748b", fontSize: "12px" },
  sessionGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(270px, 1fr))", gap: "12px" },
  sessionButton: {
    minHeight: "95px",
    padding: "18px",
    display: "flex",
    alignItems: "center",
    gap: "14px",
    position: "relative",
    border: "2px solid #e2e8f0",
    borderRadius: "15px",
    backgroundColor: "#f8fafc",
    color: "#334155",
    textAlign: "left",
    cursor: "pointer",
  },
  selectedSessionButton: { borderColor: "#1f3c88", backgroundColor: "#eff6ff", boxShadow: "0 7px 18px rgba(31,60,136,0.12)" },
  sessionIcon: { fontSize: "34px" },
  sessionText: { display: "flex", flexDirection: "column", gap: "5px" },
  sessionTitle: { color: "#172033", fontSize: "17px" },
  sessionDescription: { color: "#64748b", fontSize: "11px" },
  selectionMark: {
    width: "26px",
    height: "26px",
    marginLeft: "auto",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    border: "2px solid #cbd5e1",
    borderRadius: "50%",
    color: "#ffffff",
    fontSize: "12px",
    fontWeight: "900",
  },
  selectedMark: { borderColor: "#1f3c88", backgroundColor: "#1f3c88" },
  vehicleGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "12px" },
  vehicleCard: {
    minHeight: "190px",
    padding: "17px",
    display: "flex",
    flexDirection: "column",
    border: "2px solid #e2e8f0",
    borderRadius: "15px",
    backgroundColor: "#f8fafc",
    color: "#334155",
    textAlign: "left",
    cursor: "pointer",
  },
  selectedVehicleCard: { borderColor: "#f4a261", backgroundColor: "#fff7ed", boxShadow: "0 7px 18px rgba(244,162,97,0.15)" },
  vehicleCardTop: { marginBottom: "12px", display: "flex", justifyContent: "space-between", alignItems: "center" },
  vehicleIcon: { width: "47px", height: "47px", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#1f3c88", borderRadius: "12px", fontSize: "23px" },
  vehicleSelectedBadge: { padding: "5px 8px", backgroundColor: "#f4a261", color: "#ffffff", borderRadius: "999px", fontSize: "9px", fontWeight: "900" },
  vehicleName: { marginBottom: "13px", color: "#172033", fontSize: "18px" },
  vehicleAssigned: { marginBottom: "12px", padding: "9px 10px", display: "flex", alignItems: "center", justifyContent: "space-between", backgroundColor: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "9px" },
  vehicleAssignedLabel: { color: "#64748b", fontSize: "10px" },
  vehicleAssignedValue: { color: "#1f3c88", fontSize: "15px" },
 
  vehicleStaff: { display: "flex", flexDirection: "column", gap: "4px", color: "#64748b", fontSize: "10px" },

  editTrigger: {
    marginTop: "10px",
    color: "#1f3c88",
    fontSize: "10px",
    fontWeight: "800",
    textDecoration: "underline",
    cursor: "pointer",
  },

  vehicleCardEditing: {
    cursor: "default",
    borderColor: "#1f3c88",
    backgroundColor: "#eff6ff",
  },

  editLabel: {
    marginTop: "8px",
    display: "flex",
    flexDirection: "column",
    gap: "4px",
    color: "#475569",
    fontSize: "10px",
    fontWeight: "800",
  },

  editInput: {
    height: "34px",
    padding: "0 10px",
    boxSizing: "border-box",
    border: "1px solid #cbd5e1",
    borderRadius: "8px",
    fontSize: "12px",
    color: "#172033",
  },

  editActions: {
    marginTop: "12px",
    display: "flex",
    gap: "8px",
  },

  editCancelButton: {
    flex: "1",
    minHeight: "36px",
    border: "1px solid #cbd5e1",
    borderRadius: "8px",
    backgroundColor: "#ffffff",
    color: "#475569",
    fontSize: "11px",
    fontWeight: "800",
    cursor: "pointer",
  },

  editSaveButton: {
    flex: "1",
    minHeight: "36px",
    border: "none",
    borderRadius: "8px",
    backgroundColor: "#1f3c88",
    color: "#ffffff",
    fontSize: "11px",
    fontWeight: "800",
    cursor: "pointer",
  },
 
  prepareCard: {
    maxWidth: "1180px",
    margin: "0 auto",
    padding: "22px 25px",
    boxSizing: "border-box",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "18px",
    flexWrap: "wrap",
    backgroundColor: "#ecfdf5",
    border: "1px solid #a7f3d0",
    borderRadius: "18px",
  },
  prepareInfo: { display: "flex", flexDirection: "column", gap: "4px" },
  prepareLabel: { color: "#047857", fontSize: "10px", fontWeight: "800" },
  prepareValue: { color: "#065f46", fontSize: "17px" },
  prepareDescription: { color: "#047857", fontSize: "11px" },
  startButton: {
    minHeight: "52px",
    padding: "0 20px",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "12px",
    border: "none",
    borderRadius: "12px",
    backgroundColor: "#1f3c88",
    color: "#ffffff",
    fontSize: "14px",
    fontWeight: "900",
    cursor: "pointer",
  },
  startArrow: { fontSize: "18px" },
  mapSection: {
  maxWidth: "1180px",
  margin: "0 auto 20px",
  borderRadius: "18px",
  overflow: "hidden",
  backgroundColor: "#ffffff",
  border: "1px solid #e2e8f0",
  boxShadow: "0 8px 25px rgba(15,23,42,0.05)",
},
  footer: { maxWidth: "1180px", margin: "20px auto 0", color: "#94a3b8", fontSize: "10px", textAlign: "center" },
};

export default DashboardPage;