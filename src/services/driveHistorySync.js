import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { db, isFirebaseConfigured } from "./firebase";

const COLLECTION_NAME = "driveHistory";

/**
 * 완료된 운행기록 한 건을 Firestore(공용 저장소)에 저장합니다.
 * 사무실 PC, 운전원 폰 등 어떤 기기에서 봐도 같은 기록이
 * 보이도록 하기 위함입니다.
 */
export async function saveDriveRecordToCloud(
  record
) {
  if (!isFirebaseConfigured || !db || !record?.id) {
    return { synced: false };
  }

  await setDoc(
    doc(db, COLLECTION_NAME, record.id),
    {
      ...record,
      syncedAt: serverTimestamp(),
    },
    { merge: true }
  );

  return { synced: true };
}

/**
 * Firestore에서 운행기록 한 건을 삭제합니다.
 */
export async function deleteDriveRecordFromCloud(
  driveId
) {
  if (!isFirebaseConfigured || !db || !driveId) {
    return { synced: false };
  }

  await deleteDoc(
    doc(db, COLLECTION_NAME, driveId)
  );

  return { synced: true };
}

/**
 * Firestore에 저장된 운행기록을 모두 삭제합니다.
 * (현재 목록을 넘겨받아 하나씩 지웁니다)
 */
export async function clearDriveHistoryInCloud(
  records
) {
  if (!isFirebaseConfigured || !db) {
    return { synced: false };
  }

  const safeRecords = Array.isArray(records)
    ? records
    : [];

  await Promise.all(
    safeRecords
      .filter((record) => record?.id)
      .map((record) =>
        deleteDoc(
          doc(db, COLLECTION_NAME, record.id)
        )
      )
  );

  return { synced: true };
}

/**
 * 운행기록 전체를 실시간으로 구독합니다.
 * 사무실 PC와 운전원 폰이 서로 다른 기기에서 완료한
 * 운행기록도 실시간으로 같이 보이게 됩니다.
 */
export function subscribeDriveHistory(
  onChange,
  onError
) {
  if (!isFirebaseConfigured || !db) {
    onError?.(
      new Error(
        "Firebase 연결이 설정되지 않았습니다."
      )
    );

    return () => {};
  }

  const unsubscribe = onSnapshot(
    collection(db, COLLECTION_NAME),
    (snapshot) => {
      const records = snapshot.docs.map(
        (docSnapshot) => docSnapshot.data()
      );

      onChange?.(records);
    },
    (error) => {
      onError?.(error);
    }
  );

  return unsubscribe;
}