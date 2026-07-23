const STORAGE_KEY = "gimcheon-transport-people-roster";

/**
 * 마지막으로 업로드한 어르신 목록을 불러옵니다.
 * (새로고침해도 재업로드 없이 유지되도록 하기 위한 캐시)
 */
export function loadPeopleCache() {
  if (typeof window === "undefined") {
    return { people: [], fileName: "" };
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);

    if (!raw) {
      return { people: [], fileName: "" };
    }

    const parsed = JSON.parse(raw);

    return {
      people: Array.isArray(parsed?.people)
        ? parsed.people
        : [],
      fileName:
        typeof parsed?.fileName === "string"
          ? parsed.fileName
          : "",
    };
  } catch (error) {
    console.error(
      "어르신 목록을 불러오지 못했습니다:",
      error
    );

    return { people: [], fileName: "" };
  }
}

/**
 * 어르신 목록을 localStorage에 저장합니다.
 */
export function savePeopleCache(people, fileName) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        people: Array.isArray(people) ? people : [],
        fileName: fileName || "",
      })
    );
  } catch (error) {
    console.error(
      "어르신 목록을 저장하지 못했습니다:",
      error
    );
  }
}