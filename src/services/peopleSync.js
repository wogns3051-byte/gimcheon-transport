import {
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { db, isFirebaseConfigured } from "./firebase";

const COLLECTION_NAME = "peopleRoster";
const DOCUMENT_ID = "current";

/**
 * 어르신 목록을 Firestore(공용 저장소)에 저장합니다.
 * 재업로드하지 않는 한 다른 기기·다음 접속에서도
 * 그대로 유지되도록 하기 위함입니다.
 */
export async function savePeopleToCloud(
  people,
  fileName
) {
  if (!isFirebaseConfigured || !db) {
    return { synced: false };
  }

  await setDoc(
    doc(db, COLLECTION_NAME, DOCUMENT_ID),
    {
      people: Array.isArray(people) ? people : [],
      fileName: fileName || "",
      updatedAt: serverTimestamp(),
    }
  );

  return { synced: true };
}

/**
 * 저장된 어르신 목록을 실시간으로 구독합니다.
 */
export function subscribePeopleRoster(
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