import {
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { db, isFirebaseConfigured } from "./firebase";

const COLLECTION_NAME = "vehicleRoster";
const DOCUMENT_ID = "current";

/**
 * 차량 명단(운전원/동승자 이름)을 Firestore(공용 저장소)에
 * 저장합니다. 사무실 PC에서 입력한 이름이 운전원 폰에도
 * 그대로 보이도록 하기 위함입니다.
 */
export async function saveVehicleRosterToCloud(
  vehicles
) {
  if (!isFirebaseConfigured || !db) {
    return { synced: false };
  }

  await setDoc(
    doc(db, COLLECTION_NAME, DOCUMENT_ID),
    {
      vehicles: Array.isArray(vehicles)
        ? vehicles
        : [],
      updatedAt: serverTimestamp(),
    }
  );

  return { synced: true };
}

/**
 * 차량 명단을 실시간으로 구독합니다.
 */
export function subscribeVehicleRoster(
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
    doc(db, COLLECTION_NAME, DOCUMENT_ID),
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