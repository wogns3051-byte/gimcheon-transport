import { useMemo, useState } from "react";
import KakaoMap from "../components/map/kakaoMap";
import { useIsMobile } from "../hooks/useIsMobile";
import {
  getCurrentSegment,
  getNextDestination,
  startNextDestination,
  validateNavigationRoute,
} from "../services/kakaoNavi";

function NavigationPage({
  session = "morning",
  vehicle = {
    id: "vehicle-1",
    name: "1호차",
    driverName: "",
    assistantName: "",
  },
  routeStops = [],
  onBack,
  onComplete,
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [completedStopIds, setCompletedStopIds] = useState([]);
  const [stopArrivalTimes, setStopArrivalTimes] = useState(
    {}
  );
  const [message, setMessage] = useState("");
  const [isStartingNavi, setIsStartingNavi] = useState(false);

  const isMobile = useIsMobile();

  const safeRouteStops = Array.isArray(routeStops)
    ? routeStops
    : [];

  const sessionLabel =
    session === "afternoon"
      ? "오후 송영"
      : "오전 송영";

  const arrivalTimeLabel =
    session === "afternoon"
      ? "하차시간"
      : "탑승시간";

  const currentStop =
    safeRouteStops[currentIndex] || null;

  const nextInformation = useMemo(() => {
    return getNextDestination(
      safeRouteStops,
      currentIndex
    );
  }, [safeRouteStops, currentIndex]);

  const segmentInformation = useMemo(() => {
    return getCurrentSegment(
      safeRouteStops,
      currentIndex
    );
  }, [safeRouteStops, currentIndex]);

  const progressPercent = useMemo(() => {
    if (safeRouteStops.length <= 1) {
      return 0;
    }

    return Math.min(
      100,
      Math.round(
        (currentIndex /
          (safeRouteStops.length - 1)) *
          100
      )
    );
  }, [currentIndex, safeRouteStops.length]);

  const isRouteCompleted =
    safeRouteStops.length > 0 &&
    currentIndex >= safeRouteStops.length - 1;

  const validationResult = useMemo(() => {
    return validateNavigationRoute(
      safeRouteStops
    );
  }, [safeRouteStops]);

  const fullPathPoints = useMemo(() => {
    return safeRouteStops.flatMap((stop) =>
      Array.isArray(stop.pathPoints) ? stop.pathPoints : []
    );
  }, [safeRouteStops]);

  const handleStartNavigation = async () => {
    if (isStartingNavi) {
      return;
    }

    if (!validationResult.valid) {
      setMessage(validationResult.message);
      return;
    }

    if (!nextInformation.hasNext) {
      setMessage(
        "다음 목적지가 없습니다. 모든 운행이 완료되었습니다."
      );
      return;
    }

    try {
      setIsStartingNavi(true);
      setMessage("");

      const result =
        await startNextDestination(
          safeRouteStops,
          currentIndex
        );

      setMessage(
        `${result.destination.name}까지 카카오내비를 실행했습니다.`
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "카카오내비 실행에 실패했습니다."
      );
    } finally {
      setIsStartingNavi(false);
    }
  };

  const handleArrivalComplete = () => {
    if (!nextInformation.hasNext) {
      return;
    }

    const destination =
      nextInformation.destination;

    const arrivedAt =
      new Date().toISOString();

    setCompletedStopIds((current) => [
      ...current,
      destination.stopId,
    ]);

    setStopArrivalTimes((current) => ({
      ...current,
      [destination.stopId]: arrivedAt,
    }));

    setCurrentIndex(
      nextInformation.nextIndex
    );

    setMessage(
      `${destination.name} ${arrivalTimeLabel} ${formatClockTime(
        arrivedAt
      )}(으)로 기록되었습니다.`
    );
  };

  const handlePreviousStop = () => {
    if (currentIndex <= 0) {
      return;
    }

    const previousIndex =
      currentIndex - 1;

    setCurrentIndex(previousIndex);

    const previousStop =
      safeRouteStops[previousIndex];

    setCompletedStopIds((current) =>
      current.filter(
        (stopId) =>
          stopId !== previousStop?.stopId
      )
    );

    setStopArrivalTimes((current) => {
      const next = { ...current };
      delete next[previousStop?.stopId];
      return next;
    });

    setMessage(
      "이전 경유지로 돌아갔습니다."
    );
  };

  const handleCompleteRoute = () => {
    if (!isRouteCompleted) {
      setMessage(
        "마지막 목적지까지 도착 완료 처리해 주세요."
      );
      return;
    }

    const routeStopsWithArrivalTimes =
      safeRouteStops.map((stop) => ({
        ...stop,
        actualArrivalTime:
          stopArrivalTimes[stop.stopId] ||
          null,
      }));

    const result = {
      session,
      vehicle,
      routeStops: routeStopsWithArrivalTimes,
      completedAt:
        new Date().toISOString(),
      totalDistance:
        calculateTotalDistance(
          safeRouteStops
        ),
      totalDuration:
        calculateTotalDuration(
          safeRouteStops
        ),
    };

    onComplete?.(result);
  };

  if (safeRouteStops.length === 0) {
    return (
      <main style={styles.page}>
        <section style={styles.emptyPage}>
          <span style={styles.emptyIcon}>
            🛣️
          </span>

          <h1 style={styles.emptyTitle}>
            운행경로가 없습니다.
          </h1>

          <p style={styles.emptyDescription}>
            차량 화면에서 센터와 어르신을
            추가하고 실제도로 계산을 먼저
            실행해 주세요.
          </p>

          <button
            type="button"
            onClick={onBack}
            style={styles.backToRouteButton}
          >
            ← 경로 설정으로 돌아가기
          </button>
        </section>
      </main>
    );
  }

  return (
    <main style={styles.page}>
      <header style={styles.header}>
        <button
          type="button"
          onClick={onBack}
          style={styles.backButton}
        >
          ← 경로 화면
        </button>

        <div style={styles.headerTitleArea}>
          <span style={styles.sessionBadge}>
            {sessionLabel}
          </span>

          <h1 style={styles.title}>
            🚐 {vehicle?.name || "운행차량"}
          </h1>

          <p style={styles.subtitle}>
            목적지 도착 후 반드시
            ‘도착 완료’를 눌러 주세요.
          </p>
        </div>

        <div style={styles.staffCard}>
          <span>
            운전원:{" "}
            <strong>
              {vehicle?.driverName ||
                "미지정"}
            </strong>
          </span>

          <span>
            동승자:{" "}
            <strong>
              {vehicle?.assistantName ||
                "미지정"}
            </strong>
          </span>
        </div>
      </header>

      <section style={styles.progressSection}>
        <div style={styles.progressHeader}>
          <span style={styles.progressLabel}>
            운행 진행률
          </span>

          <strong style={styles.progressValue}>
            {progressPercent}%
          </strong>
        </div>

        <div style={styles.progressTrack}>
          <div
            style={{
              ...styles.progressBar,
              width: `${progressPercent}%`,
            }}
          />
        </div>

        <div style={styles.progressText}>
          현재 {currentIndex + 1} /{" "}
          {safeRouteStops.length}
        </div>
      </section>

      {message && (
        <div
          style={{
            ...styles.message,
            ...(message.includes("실패") ||
            message.includes("없습니다") ||
            message.includes("올바르지")
              ? styles.errorMessage
              : styles.infoMessage),
          }}
        >
          {message}
        </div>
      )}

      <section
        style={{
          ...styles.driveSection,
          ...(isMobile
            ? styles.driveSectionMobile
            : {}),
        }}
      >
        <div style={styles.currentCard}>
          <span style={styles.cardLabel}>
            현재 위치
          </span>

          <div style={styles.locationRow}>
            <span style={styles.locationIcon}>
              {currentStop?.type === "center"
                ? "🏢"
                : "🏠"}
            </span>

            <div style={styles.locationInfo}>
              <strong
                style={styles.locationName}
              >
                {currentStop?.name ||
                  "현재 위치"}
              </strong>

              <span
                style={
                  styles.locationAddress
                }
              >
                {currentStop?.address ||
                  "주소 없음"}
              </span>
            </div>
          </div>
        </div>

        <div style={styles.directionArrow}>
          ↓
        </div>

        <div style={styles.nextCard}>
          <span style={styles.cardLabel}>
            다음 목적지
          </span>

          {nextInformation.hasNext ? (
            <>
              <div
                style={styles.locationRow}
              >
                <span
                  style={
                    styles.locationIcon
                  }
                >
                  {nextInformation
                    .destination?.type ===
                  "center"
                    ? "🏢"
                    : "🏠"}
                </span>

                <div
                  style={
                    styles.locationInfo
                  }
                >
                  <strong
                    style={
                      styles.locationName
                    }
                  >
                    {nextInformation
                      .destination?.name ||
                      "다음 목적지"}
                  </strong>

                  <span
                    style={
                      styles.locationAddress
                    }
                  >
                    {nextInformation
                      .destination
                      ?.address ||
                      "주소 없음"}
                  </span>
                </div>
              </div>

              <div
                style={
                  styles.segmentSummary
                }
              >
                <div
                  style={
                    styles.segmentItem
                  }
                >
                  <span
                    style={
                      styles.segmentLabel
                    }
                  >
                    거리
                  </span>

                  <strong
                    style={
                      styles.segmentValue
                    }
                  >
                    {formatDistance(
                      segmentInformation.distance
                    )}
                  </strong>
                </div>

                <div
                  style={
                    styles.segmentItem
                  }
                >
                  <span
                    style={
                      styles.segmentLabel
                    }
                  >
                    예상시간
                  </span>

                  <strong
                    style={
                      styles.segmentValue
                    }
                  >
                    {formatDuration(
                      segmentInformation.duration
                    )}
                  </strong>
                </div>
              </div>
            </>
          ) : (
            <div
              style={
                styles.completedMessage
              }
            >
              <span
                style={
                  styles.completedIcon
                }
              >
                ✅
              </span>

              <strong>
                모든 목적지 운행이
                완료되었습니다.
              </strong>
            </div>
          )}
        </div>
      </section>

      <section style={styles.mapSection}>
        <KakaoMap
          routeStops={safeRouteStops}
          fullPathPoints={fullPathPoints}
          height={380}
        />
      </section>

      <section style={styles.actionSection}>
        <button
          type="button"
          onClick={handleStartNavigation}
          disabled={
            isStartingNavi ||
            !nextInformation.hasNext
          }
          style={{
            ...styles.navigationButton,
            ...(isStartingNavi ||
            !nextInformation.hasNext
              ? styles.disabledButton
              : {}),
          }}
        >
          {isStartingNavi
            ? "카카오내비 실행 중..."
            : "🧭 카카오내비 실행"}
        </button>

        <button
          type="button"
          onClick={handleArrivalComplete}
          disabled={
            !nextInformation.hasNext
          }
          style={{
            ...styles.arrivalButton,
            ...(!nextInformation.hasNext
              ? styles.disabledButton
              : {}),
          }}
        >
          ✓ 도착 완료
        </button>
      </section>

      <section style={styles.routeListSection}>
        <div style={styles.sectionHeader}>
          <div>
            <span
              style={styles.sectionNumber}
            >
              ROUTE
            </span>

            <h2 style={styles.sectionTitle}>
              전체 운행순서
            </h2>
          </div>

          <span style={styles.routeCount}>
            총 {safeRouteStops.length}곳
          </span>
        </div>

        <div style={styles.routeList}>
          {safeRouteStops.map(
            (stop, index) => {
              const isCurrent =
                index === currentIndex;

              const isCompleted =
                index < currentIndex ||
                completedStopIds.includes(
                  stop.stopId
                );

              return (
                <article
                  key={
                    stop.stopId ||
                    `${stop.id}-${index}`
                  }
                  style={{
                    ...styles.routeItem,
                    ...(isCurrent
                      ? styles.currentRouteItem
                      : {}),
                    ...(isCompleted
                      ? styles.completedRouteItem
                      : {}),
                  }}
                >
                  <div
                    style={{
                      ...styles.routeNumber,
                      ...(isCurrent
                        ? styles.currentRouteNumber
                        : {}),
                      ...(isCompleted
                        ? styles.completedRouteNumber
                        : {}),
                    }}
                  >
                    {isCompleted
                      ? "✓"
                      : index + 1}
                  </div>

                  <span
                    style={
                      styles.routeTypeIcon
                    }
                  >
                    {stop.type === "center"
                      ? "🏢"
                      : "🏠"}
                  </span>

                  <div
                    style={
                      styles.routeInformation
                    }
                  >
                    <strong
                      style={
                        styles.routeName
                      }
                    >
                      {stop.name ||
                        "경유지"}
                    </strong>

                    <span
                      style={
                        styles.routeAddress
                      }
                    >
                      {stop.address ||
                        "주소 없음"}
                    </span>

                    {stop.type !==
                      "center" &&
                      stopArrivalTimes[
                        stop.stopId
                      ] && (
                        <span
                          style={
                            styles.routeArrivalTime
                          }
                        >
                          {arrivalTimeLabel}{" "}
                          {formatClockTime(
                            stopArrivalTimes[
                              stop.stopId
                            ]
                          )}
                        </span>
                      )}
                  </div>

                  <span
                    style={{
                      ...styles.routeStatus,
                      ...(isCurrent
                        ? styles.currentStatus
                        : {}),
                      ...(isCompleted
                        ? styles.completedStatus
                        : {}),
                    }}
                  >
                    {isCompleted
                      ? "완료"
                      : isCurrent
                        ? "현재"
                        : "대기"}
                  </span>
                </article>
              );
            }
          )}
        </div>
      </section>

      <section style={styles.footerActions}>
        <button
          type="button"
          onClick={handlePreviousStop}
          disabled={currentIndex === 0}
          style={{
            ...styles.previousButton,
            ...(currentIndex === 0
              ? styles.disabledButton
              : {}),
          }}
        >
          ← 이전 경유지
        </button>

        <button
          type="button"
          onClick={handleCompleteRoute}
          disabled={!isRouteCompleted}
          style={{
            ...styles.completeButton,
            ...(!isRouteCompleted
              ? styles.disabledButton
              : {}),
          }}
        >
          운행 종료 및 저장
        </button>
      </section>
    </main>
  );
}

function formatClockTime(value) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function calculateTotalDistance(
  routeStops
) {
  return routeStops.reduce(
    (total, stop) => {
      const value = Number(
        stop.segmentDistance
      );

      return Number.isFinite(value)
        ? total + value
        : total;
    },
    0
  );
}

function calculateTotalDuration(
  routeStops
) {
  return routeStops.reduce(
    (total, stop) => {
      const value = Number(
        stop.segmentDuration
      );

      return Number.isFinite(value)
        ? total + value
        : total;
    },
    0
  );
}

function formatDistance(distance) {
  const value = Number(distance);

  if (
    !Number.isFinite(value) ||
    value <= 0
  ) {
    return "0km";
  }

  return `${value.toFixed(2)}km`;
}

function formatDuration(duration) {
  const minutes = Math.round(
    Number(duration) || 0
  );

  if (minutes <= 0) {
    return "0분";
  }

  if (minutes < 60) {
    return `${minutes}분`;
  }

  const hours = Math.floor(
    minutes / 60
  );

  const restMinutes =
    minutes % 60;

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
  },

  backButton: {
    minHeight: "42px",
    padding: "0 14px",
    border:
      "1px solid rgba(255,255,255,0.25)",
    borderRadius: "10px",
    backgroundColor:
      "rgba(255,255,255,0.12)",
    color: "#ffffff",
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
  },

  staffCard: {
    minWidth: "210px",
    padding: "13px 15px",
    display: "flex",
    flexDirection: "column",
    gap: "6px",
    backgroundColor:
      "rgba(255,255,255,0.11)",
    borderRadius: "12px",
    color: "#ffffff",
    fontSize: "11px",
  },

  progressSection: {
    maxWidth: "1180px",
    margin: "0 auto 16px",
    padding: "17px",
    boxSizing: "border-box",
    backgroundColor: "#ffffff",
    borderRadius: "14px",
  },

  progressHeader: {
    marginBottom: "9px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },

  progressLabel: {
    color: "#64748b",
    fontSize: "11px",
    fontWeight: "800",
  },

  progressValue: {
    color: "#1f3c88",
    fontSize: "15px",
  },

  progressTrack: {
    height: "11px",
    overflow: "hidden",
    backgroundColor: "#e2e8f0",
    borderRadius: "999px",
  },

  progressBar: {
    height: "100%",
    backgroundColor: "#55c7b0",
    borderRadius: "999px",
    transition: "width 0.25s ease",
  },

  progressText: {
    marginTop: "7px",
    color: "#64748b",
    fontSize: "10px",
    textAlign: "right",
  },

  message: {
    maxWidth: "1180px",
    margin: "0 auto 16px",
    padding: "12px 15px",
    boxSizing: "border-box",
    border: "1px solid",
    borderRadius: "10px",
    fontSize: "12px",
    fontWeight: "800",
  },

  infoMessage: {
    backgroundColor: "#eff6ff",
    borderColor: "#bfdbfe",
    color: "#1e40af",
  },

  errorMessage: {
    backgroundColor: "#fef2f2",
    borderColor: "#fecaca",
    color: "#991b1b",
  },

  driveSection: {
    maxWidth: "1180px",
    margin: "0 auto 16px",
    display: "grid",
    gridTemplateColumns:
      "minmax(0, 1fr) 50px minmax(0, 1fr)",
    gap: "12px",
    alignItems: "stretch",
  },

  driveSectionMobile: {
    gridTemplateColumns: "1fr",
  },

  mapSection: {
    maxWidth: "1180px",
    margin: "0 auto 16px",
    borderRadius: "17px",
    overflow: "hidden",
    backgroundColor: "#ffffff",
    border: "1px solid #e2e8f0",
  },

  currentCard: {
    padding: "22px",
    backgroundColor: "#ffffff",
    border:
      "2px solid #1f3c88",
    borderRadius: "17px",
  },

  nextCard: {
    padding: "22px",
    backgroundColor: "#fff7ed",
    border:
      "2px solid #f4a261",
    borderRadius: "17px",
  },

  cardLabel: {
    display: "block",
    marginBottom: "13px",
    color: "#64748b",
    fontSize: "10px",
    fontWeight: "900",
  },

  locationRow: {
    display: "flex",
    alignItems: "center",
    gap: "13px",
  },

  locationIcon: {
    width: "50px",
    height: "50px",
    flexShrink: "0",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ffffff",
    borderRadius: "13px",
    fontSize: "25px",
  },

  locationInfo: {
    minWidth: "0",
    display: "flex",
    flexDirection: "column",
    gap: "5px",
  },

  locationName: {
    fontSize: "17px",
  },

  locationAddress: {
    overflow: "hidden",
    color: "#64748b",
    fontSize: "10px",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },

  directionArrow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#1f3c88",
    fontSize: "30px",
    fontWeight: "900",
  },

  segmentSummary: {
    marginTop: "17px",
    display: "grid",
    gridTemplateColumns:
      "repeat(2, minmax(0, 1fr))",
    gap: "8px",
  },

  segmentItem: {
    padding: "11px",
    display: "flex",
    flexDirection: "column",
    gap: "3px",
    backgroundColor: "#ffffff",
    borderRadius: "10px",
  },

  segmentLabel: {
    color: "#64748b",
    fontSize: "9px",
  },

  segmentValue: {
    color: "#1f3c88",
    fontSize: "16px",
  },

  completedMessage: {
    minHeight: "120px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    color: "#047857",
    textAlign: "center",
  },

  completedIcon: {
    fontSize: "35px",
  },

  actionSection: {
    maxWidth: "1180px",
    margin: "0 auto 16px",
    display: "grid",
    gridTemplateColumns:
      "repeat(2, minmax(0, 1fr))",
    gap: "10px",
  },

  navigationButton: {
    minHeight: "58px",
    border: "none",
    borderRadius: "13px",
    backgroundColor: "#f4a261",
    color: "#ffffff",
    fontSize: "15px",
    fontWeight: "900",
    cursor: "pointer",
  },

  arrivalButton: {
    minHeight: "58px",
    border: "none",
    borderRadius: "13px",
    backgroundColor: "#1f3c88",
    color: "#ffffff",
    fontSize: "15px",
    fontWeight: "900",
    cursor: "pointer",
  },

  routeListSection: {
    maxWidth: "1180px",
    margin: "0 auto 16px",
    padding: "22px",
    boxSizing: "border-box",
    backgroundColor: "#ffffff",
    borderRadius: "17px",
  },

  sectionHeader: {
    marginBottom: "15px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },

  sectionNumber: {
    display: "block",
    color: "#1f3c88",
    fontSize: "9px",
    fontWeight: "900",
    letterSpacing: "1px",
  },

  sectionTitle: {
    margin: "3px 0 0",
    fontSize: "20px",
  },

  routeCount: {
    color: "#64748b",
    fontSize: "11px",
  },

  routeList: {
    display: "grid",
    gap: "8px",
  },

  routeItem: {
    padding: "12px",
    display: "flex",
    alignItems: "center",
    gap: "10px",
    backgroundColor: "#f8fafc",
    border:
      "2px solid transparent",
    borderRadius: "11px",
  },

  currentRouteItem: {
    backgroundColor: "#eff6ff",
    borderColor: "#1f3c88",
  },

  completedRouteItem: {
    backgroundColor: "#ecfdf5",
    opacity: "0.72",
  },

  routeNumber: {
    width: "31px",
    height: "31px",
    flexShrink: "0",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#cbd5e1",
    color: "#ffffff",
    borderRadius: "50%",
    fontSize: "11px",
    fontWeight: "900",
  },

  currentRouteNumber: {
    backgroundColor: "#1f3c88",
  },

  completedRouteNumber: {
    backgroundColor: "#059669",
  },

  routeTypeIcon: {
    fontSize: "20px",
  },

  routeInformation: {
    minWidth: "0",
    flex: "1",
    display: "flex",
    flexDirection: "column",
    gap: "3px",
  },

  routeName: {
    fontSize: "12px",
  },

  routeAddress: {
    overflow: "hidden",
    color: "#64748b",
    fontSize: "9px",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },

  routeArrivalTime: {
    marginTop: "2px",
    color: "#047857",
    fontSize: "9px",
    fontWeight: "800",
  },

  routeStatus: {
    padding: "5px 8px",
    backgroundColor: "#e2e8f0",
    color: "#64748b",
    borderRadius: "999px",
    fontSize: "9px",
    fontWeight: "900",
  },

  currentStatus: {
    backgroundColor: "#dbeafe",
    color: "#1e40af",
  },

  completedStatus: {
    backgroundColor: "#d1fae5",
    color: "#047857",
  },

  footerActions: {
    maxWidth: "1180px",
    margin: "0 auto",
    display: "grid",
    gridTemplateColumns:
      "repeat(2, minmax(0, 1fr))",
    gap: "10px",
  },

  previousButton: {
    minHeight: "48px",
    border:
      "1px solid #cbd5e1",
    borderRadius: "11px",
    backgroundColor: "#ffffff",
    color: "#475569",
    fontWeight: "900",
    cursor: "pointer",
  },

  completeButton: {
    minHeight: "48px",
    border: "none",
    borderRadius: "11px",
    backgroundColor: "#059669",
    color: "#ffffff",
    fontWeight: "900",
    cursor: "pointer",
  },

  emptyPage: {
    maxWidth: "620px",
    margin: "100px auto",
    padding: "50px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: "20px",
    textAlign: "center",
  },

  emptyIcon: {
    fontSize: "48px",
  },

  emptyTitle: {
    margin: "15px 0 8px",
  },

  emptyDescription: {
    margin: "0 0 22px",
    color: "#64748b",
    fontSize: "12px",
    lineHeight: "1.7",
  },

  backToRouteButton: {
    minHeight: "45px",
    padding: "0 16px",
    border: "none",
    borderRadius: "10px",
    backgroundColor: "#1f3c88",
    color: "#ffffff",
    fontWeight: "900",
    cursor: "pointer",
  },

  disabledButton: {
    opacity: "0.42",
    cursor: "not-allowed",
  },
};

export default NavigationPage;