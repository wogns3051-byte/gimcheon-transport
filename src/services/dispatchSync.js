import {
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { db, isFirebaseConfigured } from "./firebase";

const COLLECTION_NAME = "dispatchAssignments";

export function getTodayDateKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function buildAssignmentId(
  dateKey,
  session,
  vehicleId
) {
  return `${dateKey}_${session}_${vehicleId}`;
}

/**
 * 사무실에서 계산/수정한 운행경로를 Firestore에 저장합니다.
 * (운전원 화면에서 실시간으로 이 값을 구독합니다)
 */
export async function saveAssignment({
  dateKey,
  session,
  vehicleId,
  vehicleName = "",
  routeStops = [],
  totalDistance = 0,
  totalDuration = 0,
}) {
  if (!isFirebaseConfigured || !db) {
    return { synced: false };
  }

  if (!dateKey || !session || !vehicleId) {
    return { synced: false };
  }

  const assignmentId = buildAssignmentId(
    dateKey,
    session,
    vehicleId
  );

  await setDoc(
    doc(db, COLLECTION_NAME, assignmentId),
    {
      dateKey,
      session,
      vehicleId,
      vehicleName,
      routeStops: Array.isArray(routeStops)
        ? routeStops
        : [],
      totalDistance: Number(totalDistance) || 0,
      totalDuration: Number(totalDuration) || 0,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );

  return { synced: true };
}

/**
 * 특정 날짜·세션·차량의 배차 정보를 한 번만 조회합니다.
 * (사무실에서 다른 날짜로 전환했을 때, 이전에 저장해둔
 * 배차 내용을 화면에 다시 불러오기 위해 사용합니다)
 */
export async function loadAssignmentOnce({
  dateKey,
  session,
  vehicleId,
}) {
  if (!isFirebaseConfigured || !db) {
    return null;
  }

  if (!dateKey || !session || !vehicleId) {
    return null;
  }

  const assignmentId = buildAssignmentId(
    dateKey,
    session,
    vehicleId
  );

  const snapshot = await getDoc(
    doc(db, COLLECTION_NAME, assignmentId)
  );

  if (!snapshot.exists()) {
    return null;
  }

  return snapshot.data();
}

/**
 * 운전원 화면에서 특정 날짜·세션·차량의 배차 정보를
 * 실시간으로 구독합니다. 반환값(구독 해제 함수)을
 * useEffect의 cleanup에서 호출해야 합니다.
 */
export function subscribeAssignment(
  { dateKey, session, vehicleId },
  onChange,
  onError
) {
  if (!isFirebaseConfigured || !db) {
    onError?.(
      new Error(
        "Firebase 연결이 설정되지 않았습니다. .env를 확인해 주세요."
      )
    );

    return () => {};
  }

  if (!dateKey || !session || !vehicleId) {
    onChange?.(null);
    return () => {};
  }

  const assignmentId = buildAssignmentId(
    dateKey,
    session,
    vehicleId
  );

  const unsubscribe = onSnapshot(
    doc(db, COLLECTION_NAME, assignmentId),
    (snapshot) => {
      if (!snapshot.exists()) {
        onChange?.(null);
        return;
      }

      onChange?.(snapshot.data());
    },
    (error) => {
      onError?.(error);
    }
  );

  return unsubscribe;
}