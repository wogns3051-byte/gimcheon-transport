import { useMemo, useState } from "react";
import KakaoMap from "../components/map/kakaoMap";

const DEFAULT_CENTER = {
  id: "center",
  type: "center",
  name: "김천통합재가서비스센터",
  address: "경상북도 김천시 김천로 92",
};

const DEFAULT_PEOPLE = [
  {
    id: "person-1",
    name: "김철수",
    address: "경상북도 김천시",
    phone: "",
  },
  {
    id: "person-2",
    name: "이영희",
    address: "경상북도 김천시",
    phone: "",
  },
  {
    id: "person-3",
    name: "박민수",
    address: "경상북도 김천시",
    phone: "",
  },
  {
    id: "person-4",
    name: "최영자",
    address: "경상북도 김천시",
    phone: "",
  },
];

function VehiclePage({
  session = "morning",
  vehicle = {
    id: "vehicle-1",
    name: "1호차",
    driverName: "",
    assistantName: "",
  },
  people = DEFAULT_PEOPLE,
  center = DEFAULT_CENTER,
  initialRoute = [],
  isCalculating = false,
  calculationProgress = "",
  calculationMessage = "",
  onBack,
  onRouteChange,
  onCalculateRoute,
  onStartDrive,
  onUpdateDefaultTime,
}) {
  const [routeStops, setRouteStops] = useState(
    Array.isArray(initialRoute) ? initialRoute : []
  );
  const [showPeopleModal, setShowPeopleModal] =
    useState(false);
  const [selectedPersonIds, setSelectedPersonIds] =
    useState([]);
  const [searchText, setSearchText] = useState("");

  const sessionLabel =
    session === "afternoon"
      ? "오후 송영"
      : "오전 송영";

  const safePeople = Array.isArray(people)
    ? people
    : [];

  const filteredPeople = useMemo(() => {
    const query = normalizeText(searchText);

    if (!query) {
      return safePeople;
    }

    return safePeople.filter((person) => {
      const combined = [
        person.name,
        person.address,
        person.phone,
      ]
        .filter(Boolean)
        .join(" ");

      return normalizeText(combined).includes(query);
    });
  }, [safePeople, searchText]);

  const totalDistance = useMemo(() => {
    return routeStops.reduce((total, stop) => {
      const value = Number(stop.segmentDistance);

      return Number.isFinite(value)
        ? total + value
        : total;
    }, 0);
  }, [routeStops]);

  const totalDuration = useMemo(() => {
    return routeStops.reduce((total, stop) => {
      const value = Number(stop.segmentDuration);

      return Number.isFinite(value)
        ? total + value
        : total;
    }, 0);
  }, [routeStops]);

  const fullPathPoints = useMemo(() => {
    return routeStops.flatMap((stop) =>
      Array.isArray(stop.pathPoints) ? stop.pathPoints : []
    );
  }, [routeStops]);

  const updateRoute = (nextRoute) => {
    setRouteStops(nextRoute);
    onRouteChange?.(nextRoute);
  };

  const handleAddCenter = () => {
    if (isCalculating) {
      return;
    }

    const newStop = {
      ...center,
      stopId: createStopId(),
      type: "center",
      segmentDistance: null,
      segmentDuration: null,
    };

    updateRoute([...routeStops, newStop]);
  };

  const handleOpenPeopleModal = () => {
    if (isCalculating) {
      return;
    }

    setSelectedPersonIds([]);
    setSearchText("");
    setShowPeopleModal(true);
  };

  const handleTogglePerson = (personId) => {
    setSelectedPersonIds((current) =>
      current.includes(personId)
        ? current.filter((id) => id !== personId)
        : [...current, personId]
    );
  };

  const handleAddSelectedPeople = () => {
    if (selectedPersonIds.length === 0) {
      window.alert("추가할 어르신을 선택해 주세요.");
      return;
    }

    const newStops = safePeople
      .filter((person) =>
        selectedPersonIds.includes(person.id)
      )
      .map((person) => ({
        ...person,
        stopId: createStopId(),
        type: "person",
        segmentDistance: null,
        segmentDuration: null,
        scheduledTime:
          (session === "afternoon"
            ? person.defaultAlightingTime
            : person.defaultBoardingTime) || "",
      }));

    updateRoute([...routeStops, ...newStops]);
    setShowPeopleModal(false);
    setSelectedPersonIds([]);
  };

  const handleMoveStop = (stopId, direction) => {
    const currentIndex = routeStops.findIndex(
      (stop) => stop.stopId === stopId
    );

    if (currentIndex < 0) {
      return;
    }

    const targetIndex =
      direction === "up"
        ? currentIndex - 1
        : currentIndex + 1;

    if (
      targetIndex < 0 ||
      targetIndex >= routeStops.length
    ) {
      return;
    }

    const nextRoute = [...routeStops];

    [nextRoute[currentIndex], nextRoute[targetIndex]] = [
      nextRoute[targetIndex],
      nextRoute[currentIndex],
    ];

    updateRoute(nextRoute);
  };

  const handleRemoveStop = (stopId) => {
    updateRoute(
      routeStops.filter(
        (stop) => stop.stopId !== stopId
      )
    );
  };

  const handleUpdateScheduledTime = (
    stopId,
    scheduledTime
  ) => {
    const targetStop = routeStops.find(
      (stop) => stop.stopId === stopId
    );

    updateRoute(
      routeStops.map((stop) =>
        stop.stopId === stopId
          ? { ...stop, scheduledTime }
          : stop
      )
    );

    if (targetStop?.id) {
      onUpdateDefaultTime?.(
        targetStop.id,
        session,
        scheduledTime
      );
    }
  };

  const handleClearRoute = () => {
    if (isCalculating || routeStops.length === 0) {
      return;
    }

    const confirmed = window.confirm(
      "현재 운행경로를 모두 삭제하시겠습니까?"
    );

    if (confirmed) {
      updateRoute([]);
    }
  };

  const handleCalculate = () => {
    if (isCalculating) {
      return;
    }

    if (routeStops.length < 2) {
      window.alert(
        "경로 계산을 위해 장소를 2곳 이상 추가해 주세요."
      );
      return;
    }

    onCalculateRoute?.(routeStops);
  };

  const handleStartDrive = () => {
    if (isCalculating) {
      return;
    }

    if (routeStops.length < 2) {
      window.alert(
        "운행 시작을 위해 장소를 2곳 이상 추가해 주세요."
      );
      return;
    }

    onStartDrive?.({
      session,
      vehicle,
      routeStops,
    });
  };

  return (
    <main style={styles.page}>
      <header style={styles.header}>
        <button
          type="button"
          onClick={onBack}
          style={styles.backButton}
        >
          ← 뒤로
        </button>

        <div style={styles.headerTitleArea}>
          <span style={styles.sessionBadge}>
            {sessionLabel}
          </span>

          <h1 style={styles.title}>
            🚐 {vehicle?.name || "운행차량"}
          </h1>

          <p style={styles.subtitle}>
            센터와 어르신을 원하는 순서대로 추가해
            실제 운행경로를 만드세요.
          </p>
        </div>

        <div style={styles.staffCard}>
          <span>
            운전원:{" "}
            <strong>
              {vehicle?.driverName || "미지정"}
            </strong>
          </span>

          <span>
            동승자:{" "}
            <strong>
              {vehicle?.assistantName || "미지정"}
            </strong>
          </span>
        </div>
      </header>

      <section style={styles.actionSection}>
        <button
          type="button"
          onClick={handleAddCenter}
          disabled={isCalculating}
          style={{
            ...styles.centerButton,
            ...(isCalculating ? styles.disabledButton : {}),
          }}
        >
          <span style={styles.actionIcon}>🏢</span>
          센터 추가
        </button>

        <button
          type="button"
          onClick={handleOpenPeopleModal}
          disabled={isCalculating}
          style={{
            ...styles.personButton,
            ...(isCalculating ? styles.disabledButton : {}),
          }}
        >
          <span style={styles.actionIcon}>👵</span>
          어르신 추가
        </button>

        <button
          type="button"
          onClick={handleClearRoute}
          disabled={isCalculating || routeStops.length === 0}
          style={{
            ...styles.clearButton,
            ...(isCalculating || routeStops.length === 0
              ? styles.disabledButton
              : {}),
          }}
        >
          전체 삭제
        </button>
      </section>

      {(isCalculating || calculationMessage) && (
        <section style={styles.calcStatusSection}>
          <div
            style={{
              ...styles.calcStatusBanner,
              ...(calculationMessage &&
              calculationMessage.startsWith("오류")
                ? styles.calcStatusError
                : {}),
            }}
          >
            {isCalculating ? (
              <>
                <span style={styles.calcSpinner}>⏳</span>
                <div style={styles.calcStatusText}>
                  <strong>실제 도로거리를 계산하고 있습니다.</strong>
                  {calculationProgress && (
                    <span style={styles.calcStatusSub}>
                      {calculationProgress}
                    </span>
                  )}
                </div>
              </>
            ) : (
              <>
                <span style={styles.calcSpinner}>
                  {calculationMessage.startsWith("오류")
                    ? "⚠️"
                    : "✅"}
                </span>
                <div style={styles.calcStatusText}>
                  <strong>{calculationMessage}</strong>
                </div>
              </>
            )}
          </div>
        </section>
      )}

      <section style={styles.routeSection}>
        <div style={styles.sectionHeader}>
          <div>
            <span style={styles.sectionNumber}>01</span>
            <h2 style={styles.sectionTitle}>
              현재 운행경로
            </h2>
          </div>

          <span style={styles.routeCount}>
            총 {routeStops.length}곳
          </span>
        </div>

        {routeStops.length > 0 ? (
          <div style={styles.routeList}>
            {routeStops.map((stop, index) => (
              <RouteItem
                key={stop.stopId}
                stop={stop}
                index={index}
                totalCount={routeStops.length}
                session={session}
                onMoveUp={() =>
                  handleMoveStop(stop.stopId, "up")
                }
                onMoveDown={() =>
                  handleMoveStop(stop.stopId, "down")
                }
                onRemove={() =>
                  handleRemoveStop(stop.stopId)
                }
                onUpdateScheduledTime={(
                  value
                ) =>
                  handleUpdateScheduledTime(
                    stop.stopId,
                    value
                  )
                }
              />
            ))}
          </div>
        ) : (
          <div style={styles.emptyRoute}>
            <div style={styles.emptyIcon}>🛣️</div>

            <strong style={styles.emptyTitle}>
              아직 운행경로가 없습니다.
            </strong>

            <p style={styles.emptyText}>
              위의 ‘센터 추가’ 또는 ‘어르신 추가’
              버튼을 눌러 경로를 만들어 주세요.
            </p>
          </div>
        )}
      </section>

      <section style={styles.mapSection}>
        <KakaoMap
          routeStops={routeStops}
          fullPathPoints={fullPathPoints}
          height={420}
        />
      </section>

      <section style={styles.summarySection}>
        <div style={styles.summaryCard}>
          <span style={styles.summaryLabel}>
            예상거리
          </span>

          <strong style={styles.summaryValue}>
            {formatDistance(totalDistance)}
          </strong>
        </div>

        <div style={styles.summaryCard}>
          <span style={styles.summaryLabel}>
            예상시간
          </span>

          <strong style={styles.summaryValue}>
            {formatDuration(totalDuration)}
          </strong>
        </div>

        <div style={styles.summaryCard}>
          <span style={styles.summaryLabel}>
            경유지
          </span>

          <strong style={styles.summaryValue}>
            {routeStops.length}곳
          </strong>
        </div>
      </section>

      <section style={styles.bottomActions}>
        <button
          type="button"
          onClick={handleCalculate}
          disabled={isCalculating || routeStops.length < 2}
          style={{
            ...styles.calculateButton,
            ...(isCalculating || routeStops.length < 2
              ? styles.disabledButton
              : {}),
          }}
        >
          {isCalculating ? "⏳ 계산 중..." : "🚗 실제도로 계산"}
        </button>

        <button
          type="button"
          onClick={handleStartDrive}
          disabled={isCalculating || routeStops.length < 2}
          style={{
            ...styles.startButton,
            ...(isCalculating || routeStops.length < 2
              ? styles.disabledButton
              : {}),
          }}
        >
          ▶ 운행 시작
        </button>
      </section>

      {showPeopleModal && (
        <div style={styles.modalBackdrop}>
          <section style={styles.modal}>
            <div style={styles.modalHeader}>
              <div>
                <span style={styles.modalEyebrow}>
                  PERSON SELECT
                </span>

                <h2 style={styles.modalTitle}>
                  어르신 추가
                </h2>
              </div>

              <button
                type="button"
                onClick={() =>
                  setShowPeopleModal(false)
                }
                style={styles.modalCloseButton}
              >
                ×
              </button>
            </div>

            <div style={styles.searchBox}>
              <span style={styles.searchIcon}>🔍</span>

              <input
                type="search"
                value={searchText}
                onChange={(event) =>
                  setSearchText(event.target.value)
                }
                placeholder="성명 또는 주소 검색"
                style={styles.searchInput}
              />
            </div>

            <div style={styles.personList}>
              {filteredPeople.length > 0 ? (
                filteredPeople.map((person) => (
                  <label
                    key={person.id}
                    style={{
                      ...styles.personSelectCard,
                      ...(selectedPersonIds.includes(
                        person.id
                      )
                        ? styles.selectedPersonCard
                        : {}),
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedPersonIds.includes(
                        person.id
                      )}
                      onChange={() =>
                        handleTogglePerson(person.id)
                      }
                      style={styles.checkbox}
                    />

                    <div style={styles.personAvatar}>
                      {getInitial(person.name)}
                    </div>

                    <div style={styles.personInfo}>
                      <strong
                        style={styles.personName}
                      >
                        {person.name || "이름 없음"}
                      </strong>

                      <span
                        style={styles.personAddress}
                      >
                        {person.address || "주소 없음"}
                      </span>

                      {person.usageDurationText && (
                        <span
                          style={
                            styles.personUsageBadge
                          }
                        >
                          이용시간{" "}
                          {person.usageDurationText}
                        </span>
                      )}
                    </div>
                  </label>
                ))
              ) : (
                <div style={styles.noResult}>
                  검색 결과가 없습니다.
                </div>
              )}
            </div>

            <div style={styles.modalActions}>
              <button
                type="button"
                onClick={() =>
                  setShowPeopleModal(false)
                }
                style={styles.cancelButton}
              >
                취소
              </button>

              <button
                type="button"
                onClick={handleAddSelectedPeople}
                disabled={
                  selectedPersonIds.length === 0
                }
                style={{
                  ...styles.addSelectedButton,
                  ...(selectedPersonIds.length === 0
                    ? styles.disabledButton
                    : {}),
                }}
              >
                선택한 어르신 추가
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}

function RouteItem({
  stop,
  index,
  totalCount,
  session,
  onMoveUp,
  onMoveDown,
  onRemove,
  onUpdateScheduledTime,
}) {
  const isCenter = stop.type === "center";

  const scheduledTimeLabel =
    session === "afternoon"
      ? "하차 기준시간"
      : "탑승 기준시간";

  return (
    <article
      style={{
        ...styles.routeItem,
        borderLeftColor: isCenter
          ? "#1f3c88"
          : "#f4a261",
      }}
    >
      <div
        style={{
          ...styles.routeNumber,
          backgroundColor: isCenter
            ? "#1f3c88"
            : "#f4a261",
        }}
      >
        {index + 1}
      </div>

      <div style={styles.routeTypeIcon}>
        {isCenter ? "🏢" : "🏠"}
      </div>

      <div style={styles.routeInfo}>
        <div style={styles.routeTitleRow}>
          <strong style={styles.routeName}>
            {stop.name || "경유지"}
          </strong>

          <span
            style={{
              ...styles.routeTypeBadge,
              backgroundColor: isCenter
                ? "#e8eefc"
                : "#ffedd5",
              color: isCenter
                ? "#1f3c88"
                : "#c2410c",
            }}
          >
            {isCenter ? "센터" : "어르신집"}
          </span>
        </div>

        <span style={styles.routeAddress}>
          {stop.address || "주소 없음"}
        </span>

        {!isCenter && (
          <label style={styles.scheduledTimeLabel}>
            {scheduledTimeLabel}
            <input
              type="time"
              value={stop.scheduledTime || ""}
              onChange={(event) =>
                onUpdateScheduledTime?.(
                  event.target.value
                )
              }
              style={styles.scheduledTimeInput}
            />
          </label>
        )}
      </div>

      <div style={styles.routeActions}>
        <button
          type="button"
          onClick={onMoveUp}
          disabled={index === 0}
          style={{
            ...styles.moveButton,
            ...(index === 0
              ? styles.disabledButton
              : {}),
          }}
        >
          ▲
        </button>

        <button
          type="button"
          onClick={onMoveDown}
          disabled={index === totalCount - 1}
          style={{
            ...styles.moveButton,
            ...(index === totalCount - 1
              ? styles.disabledButton
              : {}),
          }}
        >
          ▼
        </button>

        <button
          type="button"
          onClick={onRemove}
          style={styles.removeButton}
        >
          삭제
        </button>
      </div>
    </article>
  );
}

function createStopId() {
  return `stop-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/\s+/g, "")
    .trim();
}

function getInitial(name) {
  const safeName = String(name || "").trim();
  return safeName ? safeName.charAt(0) : "?";
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

const styles = {
  page: {
    minHeight: "100vh",
    padding: "28px",
    boxSizing: "border-box",
    backgroundColor: "#f4f7fb",
    color: "#172033",
    fontFamily:
      '"Pretendard", "Noto Sans KR", Arial, sans-serif',
  },

  header: {
    maxWidth: "1180px",
    margin: "0 auto 20px",
    padding: "24px",
    display: "flex",
    alignItems: "center",
    gap: "18px",
    flexWrap: "wrap",
    background:
      "linear-gradient(135deg, #172033 0%, #1f3c88 100%)",
    borderRadius: "20px",
    boxShadow:
      "0 15px 35px rgba(31,60,136,0.18)",
  },

  backButton: {
    minHeight: "42px",
    padding: "0 14px",
    border: "1px solid rgba(255,255,255,0.25)",
    borderRadius: "10px",
    backgroundColor: "rgba(255,255,255,0.12)",
    color: "#ffffff",
    fontSize: "12px",
    fontWeight: "900",
    cursor: "pointer",
  },

  headerTitleArea: {
    minWidth: "240px",
    flex: "1",
  },

  sessionBadge: {
    display: "inline-flex",
    marginBottom: "6px",
    padding: "5px 9px",
    backgroundColor: "#f4a261",
    color: "#ffffff",
    borderRadius: "999px",
    fontSize: "10px",
    fontWeight: "900",
  },

  title: {
    margin: "0 0 6px",
    color: "#ffffff",
    fontSize: "27px",
  },

  subtitle: {
    margin: "0",
    color: "#dbeafe",
    fontSize: "12px",
    lineHeight: "1.6",
  },

  staffCard: {
    minWidth: "210px",
    padding: "13px 15px",
    display: "flex",
    flexDirection: "column",
    gap: "6px",
    backgroundColor: "rgba(255,255,255,0.11)",
    border: "1px solid rgba(255,255,255,0.18)",
    borderRadius: "12px",
    color: "#ffffff",
    fontSize: "11px",
  },

  actionSection: {
    maxWidth: "1180px",
    margin: "0 auto 20px",
    padding: "18px",
    display: "flex",
    alignItems: "center",
    gap: "10px",
    flexWrap: "wrap",
    backgroundColor: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: "16px",
  },

  centerButton: {
    minHeight: "48px",
    padding: "0 17px",
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
    border: "none",
    borderRadius: "11px",
    backgroundColor: "#1f3c88",
    color: "#ffffff",
    fontSize: "13px",
    fontWeight: "900",
    cursor: "pointer",
  },

  personButton: {
    minHeight: "48px",
    padding: "0 17px",
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
    border: "none",
    borderRadius: "11px",
    backgroundColor: "#f4a261",
    color: "#ffffff",
    fontSize: "13px",
    fontWeight: "900",
    cursor: "pointer",
  },

  actionIcon: {
    fontSize: "18px",
  },

  clearButton: {
    minHeight: "48px",
    padding: "0 16px",
    marginLeft: "auto",
    border: "1px solid #fecaca",
    borderRadius: "11px",
    backgroundColor: "#ffffff",
    color: "#b91c1c",
    fontSize: "11px",
    fontWeight: "900",
    cursor: "pointer",
  },

  calcStatusSection: {
    maxWidth: "1180px",
    margin: "0 auto 20px",
  },

  calcStatusBanner: {
    padding: "14px 16px",
    display: "flex",
    alignItems: "center",
    gap: "12px",
    backgroundColor: "#eff6ff",
    border: "1px solid #bfdbfe",
    borderRadius: "13px",
    color: "#1e40af",
  },

  calcStatusError: {
    backgroundColor: "#fef2f2",
    borderColor: "#fecaca",
    color: "#991b1b",
  },

  calcSpinner: {
    fontSize: "22px",
    flexShrink: "0",
  },

  calcStatusText: {
    display: "flex",
    flexDirection: "column",
    gap: "3px",
    fontSize: "12px",
  },

  calcStatusSub: {
    color: "#3b82f6",
    fontSize: "10px",
    fontWeight: "700",
  },

  mapSection: {
    maxWidth: "1180px",
    margin: "0 auto 20px",
    borderRadius: "17px",
    overflow: "hidden",
    backgroundColor: "#ffffff",
    border: "1px solid #e2e8f0",
  },

  routeSection: {
    maxWidth: "1180px",
    margin: "0 auto 20px",
    padding: "22px",
    boxSizing: "border-box",
    backgroundColor: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: "17px",
  },

  sectionHeader: {
    marginBottom: "15px",
    display: "flex",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: "12px",
  },

  sectionNumber: {
    display: "block",
    marginBottom: "3px",
    color: "#1f3c88",
    fontSize: "10px",
    fontWeight: "900",
    letterSpacing: "1px",
  },

  sectionTitle: {
    margin: "0",
    fontSize: "20px",
  },

  routeCount: {
    color: "#64748b",
    fontSize: "11px",
  },

  routeList: {
    display: "grid",
    gap: "9px",
  },

  routeItem: {
    padding: "13px",
    display: "flex",
    alignItems: "center",
    gap: "10px",
    backgroundColor: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderLeft: "5px solid",
    borderRadius: "11px",
  },

  routeNumber: {
    width: "31px",
    height: "31px",
    flexShrink: "0",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#ffffff",
    borderRadius: "50%",
    fontSize: "11px",
    fontWeight: "900",
  },

  routeTypeIcon: {
    width: "36px",
    height: "36px",
    flexShrink: "0",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: "9px",
    fontSize: "18px",
  },

  routeInfo: {
    minWidth: "0",
    flex: "1",
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },

  routeTitleRow: {
    display: "flex",
    alignItems: "center",
    gap: "7px",
    flexWrap: "wrap",
  },

  routeName: {
    fontSize: "13px",
  },

  routeTypeBadge: {
    padding: "4px 7px",
    borderRadius: "999px",
    fontSize: "9px",
    fontWeight: "900",
  },

  routeAddress: {
    overflow: "hidden",
    color: "#64748b",
    fontSize: "10px",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },

  scheduledTimeLabel: {
    marginTop: "6px",
    display: "flex",
    alignItems: "center",
    gap: "7px",
    color: "#1f3c88",
    fontSize: "9px",
    fontWeight: "800",
  },

  scheduledTimeInput: {
    height: "28px",
    padding: "0 8px",
    boxSizing: "border-box",
    border: "1px solid #cbd5e1",
    borderRadius: "7px",
    fontSize: "11px",
    color: "#172033",
  },

  routeActions: {
    display: "flex",
    gap: "5px",
    flexWrap: "wrap",
  },

  moveButton: {
    width: "34px",
    height: "34px",
    border: "1px solid #cbd5e1",
    borderRadius: "8px",
    backgroundColor: "#ffffff",
    color: "#475569",
    cursor: "pointer",
  },

  removeButton: {
    minHeight: "34px",
    padding: "0 10px",
    border: "1px solid #fecaca",
    borderRadius: "8px",
    backgroundColor: "#ffffff",
    color: "#b91c1c",
    fontSize: "10px",
    fontWeight: "900",
    cursor: "pointer",
  },

  emptyRoute: {
    minHeight: "260px",
    padding: "30px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f8fafc",
    border: "1px dashed #cbd5e1",
    borderRadius: "12px",
    textAlign: "center",
  },

  emptyIcon: {
    marginBottom: "10px",
    fontSize: "40px",
  },

  emptyTitle: {
    marginBottom: "6px",
    color: "#334155",
    fontSize: "15px",
  },

  emptyText: {
    maxWidth: "420px",
    margin: "0",
    color: "#64748b",
    fontSize: "11px",
    lineHeight: "1.7",
  },

  summarySection: {
    maxWidth: "1180px",
    margin: "0 auto 20px",
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(180px, 1fr))",
    gap: "10px",
  },

  summaryCard: {
    padding: "16px",
    display: "flex",
    flexDirection: "column",
    gap: "4px",
    backgroundColor: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: "13px",
  },

  summaryLabel: {
    color: "#64748b",
    fontSize: "10px",
    fontWeight: "700",
  },

  summaryValue: {
    color: "#1f3c88",
    fontSize: "20px",
  },

  bottomActions: {
    maxWidth: "1180px",
    margin: "0 auto",
    display: "grid",
    gridTemplateColumns:
      "repeat(2, minmax(0, 1fr))",
    gap: "10px",
  },

  calculateButton: {
    minHeight: "54px",
    border: "none",
    borderRadius: "12px",
    backgroundColor: "#f4a261",
    color: "#ffffff",
    fontSize: "14px",
    fontWeight: "900",
    cursor: "pointer",
  },

  startButton: {
    minHeight: "54px",
    border: "none",
    borderRadius: "12px",
    backgroundColor: "#1f3c88",
    color: "#ffffff",
    fontSize: "14px",
    fontWeight: "900",
    cursor: "pointer",
  },

  modalBackdrop: {
    position: "fixed",
    inset: "0",
    zIndex: "1000",
    padding: "20px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(15,23,42,0.68)",
  },

  modal: {
    width: "100%",
    maxWidth: "620px",
    maxHeight: "84vh",
    padding: "21px",
    display: "flex",
    flexDirection: "column",
    backgroundColor: "#ffffff",
    borderRadius: "17px",
    boxShadow:
      "0 22px 55px rgba(15,23,42,0.28)",
  },

  modalHeader: {
    marginBottom: "13px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },

  modalEyebrow: {
    display: "block",
    marginBottom: "3px",
    color: "#1f3c88",
    fontSize: "9px",
    fontWeight: "900",
    letterSpacing: "1px",
  },

  modalTitle: {
    margin: "0",
    fontSize: "20px",
  },

  modalCloseButton: {
    width: "34px",
    height: "34px",
    border: "none",
    borderRadius: "9px",
    backgroundColor: "#e2e8f0",
    color: "#475569",
    fontSize: "20px",
    cursor: "pointer",
  },

  searchBox: {
    position: "relative",
    marginBottom: "12px",
  },

  searchIcon: {
    position: "absolute",
    top: "50%",
    left: "12px",
    transform: "translateY(-50%)",
  },

  searchInput: {
    width: "100%",
    height: "43px",
    padding: "0 40px",
    boxSizing: "border-box",
    outline: "none",
    border: "1px solid #cbd5e1",
    borderRadius: "9px",
    fontSize: "12px",
  },

  personList: {
    overflowY: "auto",
    display: "grid",
    gap: "8px",
    paddingRight: "3px",
  },

  personSelectCard: {
    padding: "11px",
    display: "flex",
    alignItems: "center",
    gap: "10px",
    backgroundColor: "#f8fafc",
    border: "2px solid #e2e8f0",
    borderRadius: "10px",
    cursor: "pointer",
  },

  selectedPersonCard: {
    backgroundColor: "#eff6ff",
    borderColor: "#1f3c88",
  },

  checkbox: {
    width: "18px",
    height: "18px",
    accentColor: "#1f3c88",
  },

  personAvatar: {
    width: "38px",
    height: "38px",
    flexShrink: "0",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f4a261",
    color: "#ffffff",
    borderRadius: "50%",
    fontSize: "13px",
    fontWeight: "900",
  },

  personInfo: {
    minWidth: "0",
    display: "flex",
    flexDirection: "column",
    gap: "3px",
  },

  personName: {
    fontSize: "12px",
  },

  personAddress: {
    overflow: "hidden",
    color: "#64748b",
    fontSize: "10px",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },

  personUsageBadge: {
    marginTop: "2px",
    color: "#1f3c88",
    fontSize: "9px",
    fontWeight: "800",
  },

  noResult: {
    padding: "30px",
    color: "#64748b",
    textAlign: "center",
    fontSize: "12px",
  },

  modalActions: {
    marginTop: "14px",
    display: "flex",
    justifyContent: "flex-end",
    gap: "8px",
  },

  cancelButton: {
    minHeight: "40px",
    padding: "0 14px",
    border: "1px solid #cbd5e1",
    borderRadius: "9px",
    backgroundColor: "#ffffff",
    color: "#475569",
    fontSize: "11px",
    fontWeight: "800",
    cursor: "pointer",
  },

  addSelectedButton: {
    minHeight: "40px",
    padding: "0 15px",
    border: "none",
    borderRadius: "9px",
    backgroundColor: "#1f3c88",
    color: "#ffffff",
    fontSize: "11px",
    fontWeight: "900",
    cursor: "pointer",
  },

  disabledButton: {
    opacity: "0.42",
    cursor: "not-allowed",
  },
};

export default VehiclePage;