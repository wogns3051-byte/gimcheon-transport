const STORAGE_KEY =
  "gimcheon-transport-drive-history";

const MAX_HISTORY_COUNT = 500;

/**
 * 저장된 전체 운행기록을 불러옵니다.
 */
export function loadDriveHistory() {
  try {
    const savedValue =
      window.localStorage.getItem(
        STORAGE_KEY
      );

    if (!savedValue) {
      return [];
    }

    const parsedValue =
      JSON.parse(savedValue);

    if (!Array.isArray(parsedValue)) {
      return [];
    }

    return parsedValue
      .filter(isValidDriveRecord)
      .sort(sortNewestFirst);
  } catch (error) {
    console.error(
      "운행기록 불러오기 오류:",
      error
    );

    return [];
  }
}

/**
 * 새로운 운행기록 한 건을 저장합니다.
 */
export function saveDriveRecord(
  driveRecord
) {
  const normalizedRecord =
    normalizeDriveRecord(
      driveRecord
    );

  const currentHistory =
    loadDriveHistory();

  const nextHistory = [
    normalizedRecord,
    ...currentHistory.filter(
      (record) =>
        record.id !==
        normalizedRecord.id
    ),
  ].slice(0, MAX_HISTORY_COUNT);

  saveHistoryArray(nextHistory);

  return normalizedRecord;
}

/**
 * 운행기록 전체 배열을 저장합니다.
 */
export function saveDriveHistory(
  driveHistory
) {
  const safeHistory =
    Array.isArray(driveHistory)
      ? driveHistory
      : [];

  const normalizedHistory =
    safeHistory
      .filter(Boolean)
      .map(normalizeDriveRecord)
      .sort(sortNewestFirst)
      .slice(0, MAX_HISTORY_COUNT);

  saveHistoryArray(
    normalizedHistory
  );

  return normalizedHistory;
}

/**
 * 특정 운행기록을 삭제합니다.
 */
export function deleteDriveRecord(
  driveId
) {
  const currentHistory =
    loadDriveHistory();

  const nextHistory =
    currentHistory.filter(
      (record) =>
        record.id !== driveId
    );

  saveHistoryArray(nextHistory);

  return nextHistory;
}

/**
 * 모든 운행기록을 삭제합니다.
 */
export function clearDriveHistory() {
  try {
    window.localStorage.removeItem(
      STORAGE_KEY
    );

    return [];
  } catch (error) {
    console.error(
      "운행기록 전체 삭제 오류:",
      error
    );

    return loadDriveHistory();
  }
}

/**
 * 운행기록 한 건을 조회합니다.
 */
export function findDriveRecord(
  driveId
) {
  return (
    loadDriveHistory().find(
      (record) =>
        record.id === driveId
    ) || null
  );
}

/**
 * 날짜별 운행기록을 조회합니다.
 *
 * dateString 예:
 * 2026-07-21
 */
export function getDriveHistoryByDate(
  dateString
) {
  const targetDate =
    String(dateString || "").trim();

  if (!targetDate) {
    return [];
  }

  return loadDriveHistory().filter(
    (record) =>
      getLocalDateString(
        record.completedAt ||
          record.date
      ) === targetDate
  );
}

/**
 * 오전 또는 오후 운행만 조회합니다.
 */
export function getDriveHistoryBySession(
  session
) {
  return loadDriveHistory().filter(
    (record) =>
      record.session === session
  );
}

/**
 * 특정 차량의 운행기록만 조회합니다.
 */
export function getDriveHistoryByVehicle(
  vehicleId
) {
  return loadDriveHistory().filter(
    (record) =>
      record.vehicle?.id ===
        vehicleId ||
      record.vehicleId ===
        vehicleId
  );
}

/**
 * 운행기록 통계를 계산합니다.
 */
export function calculateDriveStatistics(
  driveHistory
) {
  const history =
    Array.isArray(driveHistory)
      ? driveHistory
      : loadDriveHistory();

  const totalDistance =
    history.reduce(
      (total, record) =>
        total +
        toSafeNumber(
          record.totalDistance
        ),
      0
    );

  const totalDuration =
    history.reduce(
      (total, record) =>
        total +
        toSafeNumber(
          record.totalDuration
        ),
      0
    );

  const totalStops =
    history.reduce(
      (total, record) =>
        total +
        (Array.isArray(
          record.routeStops
        )
          ? record.routeStops.length
          : 0),
      0
    );

  return {
    totalDriveCount:
      history.length,

    totalDistance: Number(
      totalDistance.toFixed(2)
    ),

    totalDuration:
      Math.round(totalDuration),

    totalStops,

    morningCount:
      history.filter(
        (record) =>
          record.session ===
          "morning"
      ).length,

    afternoonCount:
      history.filter(
        (record) =>
          record.session ===
          "afternoon"
      ).length,
  };
}

function normalizeDriveRecord(
  record
) {
  const now =
    new Date().toISOString();

  const routeStops =
    Array.isArray(
      record?.routeStops
    )
      ? record.routeStops
      : [];

  return {
    ...record,

    id:
      record?.id ||
      createDriveId(),

    session:
      record?.session ===
      "afternoon"
        ? "afternoon"
        : "morning",

    sessionLabel:
      record?.session ===
      "afternoon"
        ? "오후 송영"
        : "오전 송영",

    vehicle:
      record?.vehicle || {
        id:
          record?.vehicleId ||
          "",
        name:
          record?.vehicleName ||
          "운행차량",
      },

    vehicleId:
      record?.vehicle?.id ||
      record?.vehicleId ||
      "",

    vehicleName:
      record?.vehicle?.name ||
      record?.vehicleName ||
      "운행차량",

    routeStops,

    totalDistance: Number(
      toSafeNumber(
        record?.totalDistance
      ).toFixed(2)
    ),

    totalDuration:
      Math.round(
        toSafeNumber(
          record?.totalDuration
        )
      ),

    startedAt:
      record?.startedAt ||
      now,

    completedAt:
      record?.completedAt ||
      record?.date ||
      now,

    date:
      record?.date ||
      record?.completedAt ||
      now,
  };
}

function isValidDriveRecord(
  record
) {
  return Boolean(
    record &&
      typeof record ===
        "object" &&
      record.id
  );
}

function saveHistoryArray(
  driveHistory
) {
  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(
        driveHistory
      )
    );
  } catch (error) {
    console.error(
      "운행기록 저장 오류:",
      error
    );

    throw new Error(
      "운행기록을 저장하지 못했습니다. 브라우저 저장공간을 확인해 주세요."
    );
  }
}

function sortNewestFirst(
  first,
  second
) {
  const firstTime =
    new Date(
      first.completedAt ||
        first.date ||
        0
    ).getTime();

  const secondTime =
    new Date(
      second.completedAt ||
        second.date ||
        0
    ).getTime();

  return secondTime - firstTime;
}

function getLocalDateString(
  dateValue
) {
  const date =
    dateValue
      ? new Date(dateValue)
      : new Date();

  if (
    Number.isNaN(
      date.getTime()
    )
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

function toSafeNumber(value) {
  const numberValue =
    Number(value);

  return Number.isFinite(
    numberValue
  )
    ? numberValue
    : 0;
}

function createDriveId() {
  return `drive-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}