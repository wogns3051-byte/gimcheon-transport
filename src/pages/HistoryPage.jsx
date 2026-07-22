import { useMemo, useState } from "react";
import {
  calculateDriveStatistics,
  clearDriveHistory,
  deleteDriveRecord,
} from "../services/driveStorage";

function HistoryPage({
  driveHistory = [],
  onBack,
  onHistoryChange,
}) {
  const [selectedDate, setSelectedDate] =
    useState("");

  const [selectedSession, setSelectedSession] =
    useState("all");

  const [selectedVehicleId, setSelectedVehicleId] =
    useState("all");

  const [selectedRecord, setSelectedRecord] =
    useState(null);

  const safeHistory = Array.isArray(driveHistory)
    ? driveHistory
    : [];

  const vehicleOptions = useMemo(() => {
    const vehicleMap = new Map();

    safeHistory.forEach((record) => {
      const vehicleId =
        record.vehicle?.id ||
        record.vehicleId ||
        "";

      const vehicleName =
        record.vehicle?.name ||
        record.vehicleName ||
        "운행차량";

      if (vehicleId) {
        vehicleMap.set(vehicleId, vehicleName);
      }
    });

    return Array.from(vehicleMap.entries()).map(
      ([id, name]) => ({
        id,
        name,
      })
    );
  }, [safeHistory]);

  const filteredHistory = useMemo(() => {
    return safeHistory
      .filter((record) => {
        if (
          selectedSession !== "all" &&
          record.session !== selectedSession
        ) {
          return false;
        }

        const vehicleId =
          record.vehicle?.id ||
          record.vehicleId ||
          "";

        if (
          selectedVehicleId !== "all" &&
          vehicleId !== selectedVehicleId
        ) {
          return false;
        }

        if (selectedDate) {
          const recordDate = getLocalDateString(
            record.completedAt ||
              record.date
          );

          if (recordDate !== selectedDate) {
            return false;
          }
        }

        return true;
      })
      .sort(sortNewestFirst);
  }, [
    safeHistory,
    selectedDate,
    selectedSession,
    selectedVehicleId,
  ]);

  const statistics = useMemo(() => {
    return calculateDriveStatistics(
      filteredHistory
    );
  }, [filteredHistory]);

  const handleDeleteRecord = (record) => {
    const confirmed = window.confirm(
      `${record.sessionLabel || "송영"} · ${
        record.vehicleName ||
        record.vehicle?.name ||
        "운행차량"
      } 기록을 삭제하시겠습니까?`
    );

    if (!confirmed) {
      return;
    }

    const nextHistory =
      deleteDriveRecord(record.id);

    onHistoryChange?.(nextHistory);

    if (
      selectedRecord?.id === record.id
    ) {
      setSelectedRecord(null);
    }
  };

  const handleClearHistory = () => {
    if (safeHistory.length === 0) {
      return;
    }

    const confirmed = window.confirm(
      "저장된 모든 운행기록을 삭제하시겠습니까?\n삭제한 기록은 복구할 수 없습니다."
    );

    if (!confirmed) {
      return;
    }

    const nextHistory =
      clearDriveHistory();

    onHistoryChange?.(nextHistory);
    setSelectedRecord(null);
  };

  const handleResetFilters = () => {
    setSelectedDate("");
    setSelectedSession("all");
    setSelectedVehicleId("all");
  };

  const handlePrintRecord = (record) => {
    if (!record) {
      return;
    }

    const printWindow = window.open(
      "",
      "_blank",
      "width=800,height=900"
    );

    if (!printWindow) {
      window.alert(
        "인쇄 창을 열 수 없습니다. 팝업 차단을 해제해 주세요."
      );
      return;
    }

    const sessionLabel =
      record.sessionLabel ||
      (record.session === "afternoon"
        ? "오후 송영"
        : "오전 송영");

    const vehicleName =
      record.vehicleName ||
      record.vehicle?.name ||
      "운행차량";

    const routeStops = Array.isArray(
      record.routeStops
    )
      ? record.routeStops
      : [];

    const rowsHtml = routeStops
      .map((stop, index) => {
        const segment =
          index > 0 &&
          Number.isFinite(
            Number(stop.segmentDistance)
          )
            ? `${Number(
                stop.segmentDistance
              ).toFixed(2)}km / ${formatDuration(
                stop.segmentDuration
              )}`
            : "-";

        return `
          <tr>
            <td>${index + 1}</td>
            <td>${escapeHtml(
              stop.type === "center"
                ? "센터"
                : "어르신집"
            )}</td>
            <td>${escapeHtml(
              stop.name || "경유지"
            )}</td>
            <td>${escapeHtml(
              stop.address || "주소 없음"
            )}</td>
            <td>${segment}</td>
          </tr>
        `;
      })
      .join("");

    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="ko">
        <head>
          <meta charset="UTF-8" />
          <title>운행기록 - ${escapeHtml(
            sessionLabel
          )} ${escapeHtml(vehicleName)}</title>
          <style>
            body {
              margin: 32px;
              color: #172033;
              font-family: "Noto Sans KR", Arial, sans-serif;
            }
            h1 { font-size: 20px; margin-bottom: 4px; }
            p.sub { color: #64748b; font-size: 12px; margin-top: 0; }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 16px;
            }
            th, td {
              border: 1px solid #cbd5e1;
              padding: 8px 10px;
              font-size: 12px;
              text-align: left;
            }
            th { background-color: #f1f5f9; }
            .summary {
              display: flex;
              gap: 20px;
              margin-top: 14px;
              font-size: 13px;
            }
            @media print {
              body { margin: 12mm; }
            }
          </style>
        </head>
        <body>
          <h1>김천통합재가서비스센터 송영관리시스템</h1>
          <p class="sub">운행기록 상세</p>
          <div class="summary">
            <span>운행일: ${escapeHtml(
              formatDateTime(
                record.completedAt || record.date
              )
            )}</span>
            <span>송영구분: ${escapeHtml(
              sessionLabel
            )}</span>
            <span>운행차량: ${escapeHtml(
              vehicleName
            )}</span>
            <span>총거리: ${escapeHtml(
              formatDistance(record.totalDistance)
            )}</span>
            <span>총시간: ${escapeHtml(
              formatDuration(record.totalDuration)
            )}</span>
          </div>
          <table>
            <thead>
              <tr>
                <th>순번</th>
                <th>구분</th>
                <th>이름</th>
                <th>주소</th>
                <th>이전 구간(거리/시간)</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();

    printWindow.onload = () => {
      printWindow.print();
    };
  };

  return (
    <main style={styles.page}>
      <header style={styles.header}>
        <button
          type="button"
          onClick={onBack}
          style={styles.backButton}
        >
          ← 대시보드
        </button>

        <div style={styles.headerTitleArea}>
          <span style={styles.eyebrow}>
            DRIVE HISTORY
          </span>

          <h1 style={styles.title}>
            📋 운행기록
          </h1>

          <p style={styles.subtitle}>
            날짜·오전·오후·차량별로
            완료된 송영기록을 확인합니다.
          </p>
        </div>

        <button
          type="button"
          onClick={handleClearHistory}
          disabled={safeHistory.length === 0}
          style={{
            ...styles.clearAllButton,
            ...(safeHistory.length === 0
              ? styles.disabledButton
              : {}),
          }}
        >
          전체 기록 삭제
        </button>
      </header>

      <section style={styles.filterSection}>
        <div style={styles.filterGroup}>
          <label style={styles.filterLabel}>
            운행일
          </label>

          <input
            type="date"
            value={selectedDate}
            onChange={(event) =>
              setSelectedDate(
                event.target.value
              )
            }
            style={styles.filterInput}
          />
        </div>

        <div style={styles.filterGroup}>
          <label style={styles.filterLabel}>
            송영 구분
          </label>

          <select
            value={selectedSession}
            onChange={(event) =>
              setSelectedSession(
                event.target.value
              )
            }
            style={styles.filterInput}
          >
            <option value="all">
              전체
            </option>

            <option value="morning">
              오전 송영
            </option>

            <option value="afternoon">
              오후 송영
            </option>
          </select>
        </div>

        <div style={styles.filterGroup}>
          <label style={styles.filterLabel}>
            운행차량
          </label>

          <select
            value={selectedVehicleId}
            onChange={(event) =>
              setSelectedVehicleId(
                event.target.value
              )
            }
            style={styles.filterInput}
          >
            <option value="all">
              전체 차량
            </option>

            {vehicleOptions.map(
              (vehicle) => (
                <option
                  key={vehicle.id}
                  value={vehicle.id}
                >
                  {vehicle.name}
                </option>
              )
            )}
          </select>
        </div>

        <button
          type="button"
          onClick={handleResetFilters}
          style={styles.resetButton}
        >
          조건 초기화
        </button>
      </section>

      <section style={styles.summaryGrid}>
        <SummaryCard
          label="운행횟수"
          value={`${statistics.totalDriveCount}회`}
        />

        <SummaryCard
          label="총 운행거리"
          value={formatDistance(
            statistics.totalDistance
          )}
        />

        <SummaryCard
          label="총 운행시간"
          value={formatDuration(
            statistics.totalDuration
          )}
        />

        <SummaryCard
          label="전체 경유지"
          value={`${statistics.totalStops}곳`}
        />

        <SummaryCard
          label="오전 송영"
          value={`${statistics.morningCount}회`}
        />

        <SummaryCard
          label="오후 송영"
          value={`${statistics.afternoonCount}회`}
        />
      </section>

      <section style={styles.historySection}>
        <div style={styles.sectionHeader}>
          <div>
            <span style={styles.sectionNumber}>
              HISTORY
            </span>

            <h2 style={styles.sectionTitle}>
              운행기록 목록
            </h2>
          </div>

          <span style={styles.historyCount}>
            검색 결과 {filteredHistory.length}건
          </span>
        </div>

        {filteredHistory.length > 0 ? (
          <div style={styles.historyList}>
            {filteredHistory.map(
              (record) => (
                <HistoryCard
                  key={record.id}
                  record={record}
                  onOpen={() =>
                    setSelectedRecord(record)
                  }
                  onDelete={() =>
                    handleDeleteRecord(record)
                  }
                />
              )
            )}
          </div>
        ) : (
          <div style={styles.emptyState}>
            <span style={styles.emptyIcon}>
              📭
            </span>

            <strong style={styles.emptyTitle}>
              표시할 운행기록이 없습니다.
            </strong>

            <p style={styles.emptyText}>
              운행을 완료하거나 검색조건을
              변경해 주세요.
            </p>
          </div>
        )}
      </section>

      {selectedRecord && (
        <div style={styles.modalBackdrop}>
          <section style={styles.modal}>
            <div style={styles.modalHeader}>
              <div>
                <span style={styles.modalEyebrow}>
                  DRIVE DETAIL
                </span>

                <h2 style={styles.modalTitle}>
                  운행 상세기록
                </h2>
              </div>

              <button
                type="button"
                onClick={() =>
                  setSelectedRecord(null)
                }
                style={styles.modalCloseButton}
              >
                ×
              </button>
            </div>

            <div style={styles.detailSummary}>
              <DetailItem
                label="운행일"
                value={formatDateTime(
                  selectedRecord.completedAt ||
                    selectedRecord.date
                )}
              />

              <DetailItem
                label="송영 구분"
                value={
                  selectedRecord.sessionLabel ||
                  (selectedRecord.session ===
                  "afternoon"
                    ? "오후 송영"
                    : "오전 송영")
                }
              />

              <DetailItem
                label="운행차량"
                value={
                  selectedRecord.vehicleName ||
                  selectedRecord.vehicle
                    ?.name ||
                  "운행차량"
                }
              />

              <DetailItem
                label="총 거리"
                value={formatDistance(
                  selectedRecord.totalDistance
                )}
              />

              <DetailItem
                label="총 시간"
                value={formatDuration(
                  selectedRecord.totalDuration
                )}
              />

              <DetailItem
                label="경유지"
                value={`${
                  Array.isArray(
                    selectedRecord.routeStops
                  )
                    ? selectedRecord.routeStops
                        .length
                    : 0
                }곳`}
              />
            </div>

            <div style={styles.detailRoute}>
              <h3 style={styles.detailRouteTitle}>
                운행순서
              </h3>

              {Array.isArray(
                selectedRecord.routeStops
              ) &&
              selectedRecord.routeStops
                .length > 0 ? (
                <div style={styles.routeList}>
                  {selectedRecord.routeStops.map(
                    (stop, index) => (
                      <div
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
                              stop.type ===
                              "center"
                                ? "#1f3c88"
                                : "#f4a261",
                          }}
                        >
                          {index + 1}
                        </span>

                        <span
                          style={styles.routeIcon}
                        >
                          {stop.type ===
                          "center"
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

                          {index > 0 &&
                            Number.isFinite(
                              Number(
                                stop.segmentDistance
                              )
                            ) && (
                              <span
                                style={
                                  styles.routeSegment
                                }
                              >
                                이전 장소에서{" "}
                                {Number(
                                  stop.segmentDistance
                                ).toFixed(
                                  2
                                )}
                                km ·{" "}
                                {formatDuration(
                                  stop.segmentDuration
                                )}
                              </span>
                            )}
                        </div>
                      </div>
                    )
                  )}
                </div>
              ) : (
                <div style={styles.noRoute}>
                  저장된 운행순서가 없습니다.
                </div>
              )}
            </div>

            <div style={styles.modalActions}>
              <button
                type="button"
                onClick={() =>
                  setSelectedRecord(null)
                }
                style={styles.closeButton}
              >
                닫기
              </button>

              <button
                type="button"
                onClick={() =>
                  handlePrintRecord(
                    selectedRecord
                  )
                }
                style={styles.printButton}
              >
                🖨 PDF로 저장(인쇄)
              </button>

              <button
                type="button"
                onClick={() =>
                  handleDeleteRecord(
                    selectedRecord
                  )
                }
                style={styles.deleteButton}
              >
                기록 삭제
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}

function HistoryCard({
  record,
  onOpen,
  onDelete,
}) {
  const sessionLabel =
    record.sessionLabel ||
    (record.session === "afternoon"
      ? "오후 송영"
      : "오전 송영");

  const vehicleName =
    record.vehicleName ||
    record.vehicle?.name ||
    "운행차량";

  const routeCount =
    Array.isArray(record.routeStops)
      ? record.routeStops.length
      : 0;

  return (
    <article style={styles.historyCard}>
      <div style={styles.historyCardDate}>
        <span style={styles.historyDay}>
          {formatDay(
            record.completedAt ||
              record.date
          )}
        </span>

        <span style={styles.historyMonth}>
          {formatYearMonth(
            record.completedAt ||
              record.date
          )}
        </span>
      </div>

      <div style={styles.historyInformation}>
        <div style={styles.historyTitleRow}>
          <strong style={styles.historyTitle}>
            {sessionLabel} · {vehicleName}
          </strong>

          <span
            style={{
              ...styles.sessionBadge,
              backgroundColor:
                record.session ===
                "afternoon"
                  ? "#f4a261"
                  : "#1f3c88",
            }}
          >
            {sessionLabel}
          </span>
        </div>

        <span style={styles.historyDateTime}>
          {formatDateTime(
            record.completedAt ||
              record.date
          )}
        </span>

        <div style={styles.historyMeta}>
          <span>
            거리{" "}
            <strong>
              {formatDistance(
                record.totalDistance
              )}
            </strong>
          </span>

          <span>
            시간{" "}
            <strong>
              {formatDuration(
                record.totalDuration
              )}
            </strong>
          </span>

          <span>
            경유지{" "}
            <strong>
              {routeCount}곳
            </strong>
          </span>
        </div>
      </div>

      <div style={styles.historyActions}>
        <button
          type="button"
          onClick={onOpen}
          style={styles.detailButton}
        >
          상세보기
        </button>

        <button
          type="button"
          onClick={onDelete}
          style={styles.cardDeleteButton}
        >
          삭제
        </button>
      </div>
    </article>
  );
}

function SummaryCard({
  label,
  value,
}) {
  return (
    <div style={styles.summaryCard}>
      <span style={styles.summaryLabel}>
        {label}
      </span>

      <strong style={styles.summaryValue}>
        {value}
      </strong>
    </div>
  );
}

function DetailItem({
  label,
  value,
}) {
  return (
    <div style={styles.detailItem}>
      <span style={styles.detailLabel}>
        {label}
      </span>

      <strong style={styles.detailValue}>
        {value}
      </strong>
    </div>
  );
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
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

function formatDateTime(value) {
  const date = value
    ? new Date(value)
    : new Date();

  if (
    Number.isNaN(date.getTime())
  ) {
    return "-";
  }

  return new Intl.DateTimeFormat(
    "ko-KR",
    {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }
  ).format(date);
}

function formatDay(value) {
  const date = value
    ? new Date(value)
    : new Date();

  if (
    Number.isNaN(date.getTime())
  ) {
    return "--";
  }

  return String(
    date.getDate()
  ).padStart(2, "0");
}

function formatYearMonth(value) {
  const date = value
    ? new Date(value)
    : new Date();

  if (
    Number.isNaN(date.getTime())
  ) {
    return "-";
  }

  return `${date.getFullYear()}.${String(
    date.getMonth() + 1
  ).padStart(2, "0")}`;
}

function getLocalDateString(value) {
  const date = value
    ? new Date(value)
    : new Date();

  if (
    Number.isNaN(date.getTime())
  ) {
    return "";
  }

  const year =
    date.getFullYear();

  const month =
    String(
      date.getMonth() + 1
    ).padStart(2, "0");

  const day =
    String(
      date.getDate()
    ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function sortNewestFirst(
  first,
  second
) {
  return (
    new Date(
      second.completedAt ||
        second.date ||
        0
    ).getTime() -
    new Date(
      first.completedAt ||
        first.date ||
        0
    ).getTime()
  );
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
    margin: "0 auto 18px",
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

  eyebrow: {
    display: "block",
    marginBottom: "4px",
    color: "#bfdbfe",
    fontSize: "9px",
    fontWeight: "900",
    letterSpacing: "1px",
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

  clearAllButton: {
    minHeight: "42px",
    padding: "0 14px",
    border:
      "1px solid rgba(254,202,202,0.7)",
    borderRadius: "10px",
    backgroundColor:
      "rgba(127,29,29,0.32)",
    color: "#ffffff",
    fontWeight: "900",
    cursor: "pointer",
  },

  filterSection: {
    maxWidth: "1180px",
    margin: "0 auto 16px",
    padding: "18px",
    display: "grid",
    gridTemplateColumns:
      "repeat(3, minmax(0, 1fr)) auto",
    gap: "10px",
    alignItems: "end",
    boxSizing: "border-box",
    backgroundColor: "#ffffff",
    borderRadius: "15px",
  },

  filterGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },

  filterLabel: {
    color: "#64748b",
    fontSize: "10px",
    fontWeight: "800",
  },

  filterInput: {
    width: "100%",
    height: "42px",
    padding: "0 11px",
    boxSizing: "border-box",
    border: "1px solid #cbd5e1",
    borderRadius: "9px",
    backgroundColor: "#ffffff",
    color: "#172033",
  },

  resetButton: {
    minHeight: "42px",
    padding: "0 15px",
    border: "1px solid #cbd5e1",
    borderRadius: "9px",
    backgroundColor: "#f8fafc",
    color: "#475569",
    fontWeight: "900",
    cursor: "pointer",
  },

  summaryGrid: {
    maxWidth: "1180px",
    margin: "0 auto 16px",
    display: "grid",
    gridTemplateColumns:
      "repeat(6, minmax(0, 1fr))",
    gap: "9px",
  },

  summaryCard: {
    padding: "15px",
    display: "flex",
    flexDirection: "column",
    gap: "5px",
    backgroundColor: "#ffffff",
    borderRadius: "12px",
  },

  summaryLabel: {
    color: "#64748b",
    fontSize: "9px",
    fontWeight: "800",
  },

  summaryValue: {
    color: "#1f3c88",
    fontSize: "18px",
  },

  historySection: {
    maxWidth: "1180px",
    margin: "0 auto",
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

  historyCount: {
    color: "#64748b",
    fontSize: "11px",
  },

  historyList: {
    display: "grid",
    gap: "9px",
  },

  historyCard: {
    padding: "14px",
    display: "flex",
    alignItems: "center",
    gap: "14px",
    backgroundColor: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: "12px",
  },

  historyCardDate: {
    width: "62px",
    height: "62px",
    flexShrink: "0",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1f3c88",
    color: "#ffffff",
    borderRadius: "13px",
  },

  historyDay: {
    fontSize: "21px",
    fontWeight: "900",
  },

  historyMonth: {
    fontSize: "9px",
  },

  historyInformation: {
    minWidth: "0",
    flex: "1",
    display: "flex",
    flexDirection: "column",
    gap: "5px",
  },

  historyTitleRow: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    flexWrap: "wrap",
  },

  historyTitle: {
    fontSize: "14px",
  },

  sessionBadge: {
    padding: "4px 7px",
    color: "#ffffff",
    borderRadius: "999px",
    fontSize: "8px",
    fontWeight: "900",
  },

  historyDateTime: {
    color: "#64748b",
    fontSize: "9px",
  },

  historyMeta: {
    display: "flex",
    gap: "13px",
    flexWrap: "wrap",
    color: "#64748b",
    fontSize: "10px",
  },

  historyActions: {
    display: "flex",
    gap: "6px",
    flexWrap: "wrap",
  },

  detailButton: {
    minHeight: "36px",
    padding: "0 11px",
    border: "none",
    borderRadius: "8px",
    backgroundColor: "#1f3c88",
    color: "#ffffff",
    fontWeight: "900",
    cursor: "pointer",
  },

  cardDeleteButton: {
    minHeight: "36px",
    padding: "0 11px",
    border: "1px solid #fecaca",
    borderRadius: "8px",
    backgroundColor: "#ffffff",
    color: "#b91c1c",
    fontWeight: "900",
    cursor: "pointer",
  },

  emptyState: {
    minHeight: "260px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f8fafc",
    border: "1px dashed #cbd5e1",
    borderRadius: "12px",
  },

  emptyIcon: {
    fontSize: "42px",
  },

  emptyTitle: {
    marginTop: "10px",
  },

  emptyText: {
    color: "#64748b",
    fontSize: "11px",
  },

  modalBackdrop: {
    position: "fixed",
    inset: "0",
    zIndex: "1000",
    padding: "20px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor:
      "rgba(15,23,42,0.7)",
  },

  modal: {
    width: "100%",
    maxWidth: "760px",
    maxHeight: "88vh",
    padding: "22px",
    display: "flex",
    flexDirection: "column",
    backgroundColor: "#ffffff",
    borderRadius: "18px",
  },

  modalHeader: {
    marginBottom: "15px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },

  modalEyebrow: {
    display: "block",
    color: "#1f3c88",
    fontSize: "9px",
    fontWeight: "900",
  },

  modalTitle: {
    margin: "3px 0 0",
  },

  modalCloseButton: {
    width: "35px",
    height: "35px",
    border: "none",
    borderRadius: "9px",
    backgroundColor: "#e2e8f0",
    fontSize: "20px",
    cursor: "pointer",
  },

  detailSummary: {
    marginBottom: "15px",
    display: "grid",
    gridTemplateColumns:
      "repeat(3, minmax(0, 1fr))",
    gap: "8px",
  },

  detailItem: {
    padding: "11px",
    display: "flex",
    flexDirection: "column",
    gap: "3px",
    backgroundColor: "#f8fafc",
    borderRadius: "9px",
  },

  detailLabel: {
    color: "#64748b",
    fontSize: "9px",
  },

  detailValue: {
    fontSize: "12px",
  },

  detailRoute: {
    overflowY: "auto",
    flex: "1",
  },

  detailRouteTitle: {
    margin: "0 0 10px",
    fontSize: "14px",
  },

  routeList: {
    display: "grid",
    gap: "7px",
  },

  routeItem: {
    padding: "10px",
    display: "flex",
    alignItems: "center",
    gap: "9px",
    backgroundColor: "#f8fafc",
    borderRadius: "9px",
  },

  routeNumber: {
    width: "29px",
    height: "29px",
    flexShrink: "0",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#ffffff",
    borderRadius: "50%",
    fontSize: "10px",
    fontWeight: "900",
  },

  routeIcon: {
    fontSize: "19px",
  },

  routeInformation: {
    minWidth: "0",
    display: "flex",
    flexDirection: "column",
    gap: "3px",
  },

  routeName: {
    fontSize: "11px",
  },

  routeAddress: {
    overflow: "hidden",
    color: "#64748b",
    fontSize: "9px",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },

  routeSegment: {
    color: "#047857",
    fontSize: "9px",
    fontWeight: "800",
  },

  noRoute: {
    padding: "30px",
    color: "#64748b",
    textAlign: "center",
  },

  modalActions: {
    marginTop: "15px",
    display: "flex",
    justifyContent: "flex-end",
    gap: "8px",
  },

  closeButton: {
    minHeight: "40px",
    padding: "0 14px",
    border: "1px solid #cbd5e1",
    borderRadius: "9px",
    backgroundColor: "#ffffff",
    color: "#475569",
    fontWeight: "900",
    cursor: "pointer",
  },

  printButton: {
    minHeight: "40px",
    padding: "0 14px",
    border: "none",
    borderRadius: "9px",
    backgroundColor: "#1f3c88",
    color: "#ffffff",
    fontWeight: "900",
    cursor: "pointer",
  },

  deleteButton: {
    minHeight: "40px",
    padding: "0 14px",
    border: "none",
    borderRadius: "9px",
    backgroundColor: "#b91c1c",
    color: "#ffffff",
    fontWeight: "900",
    cursor: "pointer",
  },

  disabledButton: {
    opacity: "0.42",
    cursor: "not-allowed",
  },
};

export default HistoryPage;