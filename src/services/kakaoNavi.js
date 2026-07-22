const KAKAO_JAVASCRIPT_KEY = String(
  import.meta.env.VITE_KAKAO_JAVASCRIPT_KEY || ""
).trim();

const KAKAO_SDK_URL =
  "https://t1.kakaocdn.net/kakao_js_sdk/2.8.1/kakao.min.js";

/**
 * 카카오 JavaScript SDK를 불러오고 초기화합니다.
 */
export async function initializeKakaoSdk() {
  if (!KAKAO_JAVASCRIPT_KEY) {
    throw new Error(
      ".env 파일에 VITE_KAKAO_JAVASCRIPT_KEY를 설정해 주세요."
    );
  }

  await loadKakaoSdkScript();

  if (!window.Kakao) {
    throw new Error(
      "카카오 JavaScript SDK 객체를 확인할 수 없습니다."
    );
  }

  if (!window.Kakao.isInitialized()) {
    window.Kakao.init(KAKAO_JAVASCRIPT_KEY);
  }

  if (!window.Kakao.isInitialized()) {
    throw new Error(
      "카카오 JavaScript SDK 초기화에 실패했습니다."
    );
  }

  return window.Kakao;
}

/**
 * 지정한 목적지까지 카카오내비 길 안내를 실행합니다.
 *
 * destination 형식:
 * {
 *   name: "김철수 어르신댁",
 *   longitude: 128.123,
 *   latitude: 36.123
 * }
 */
export async function startKakaoNavigation(destination) {
  validateDestination(destination);

  const Kakao = await initializeKakaoSdk();

  if (!Kakao.Navi) {
    throw new Error(
      "카카오내비 기능을 사용할 수 없습니다."
    );
  }

  Kakao.Navi.start({
    name: destination.name || "다음 목적지",

    x: Number(destination.longitude),

    y: Number(destination.latitude),

    coordType: "wgs84",
  });
}

/**
 * 카카오내비에서 목적지 공유 화면을 실행합니다.
 */
export async function shareKakaoDestination(destination) {
  validateDestination(destination);

  const Kakao = await initializeKakaoSdk();

  if (!Kakao.Navi) {
    throw new Error(
      "카카오내비 기능을 사용할 수 없습니다."
    );
  }

  Kakao.Navi.share({
    name: destination.name || "목적지",

    x: Number(destination.longitude),

    y: Number(destination.latitude),

    coordType: "wgs84",
  });
}

/**
 * 현재 경로에서 다음 목적지를 찾아 카카오내비를 실행합니다.
 *
 * routeStops: 전체 운행경로
 * currentIndex: 현재 도착한 위치의 인덱스
 *
 * 예:
 * 현재 0번 센터에 있다면 다음 목적지는 1번입니다.
 */
export async function startNextDestination(
  routeStops,
  currentIndex
) {
  const safeRoute = Array.isArray(routeStops)
    ? routeStops
    : [];

  const nextIndex = Number(currentIndex) + 1;
  const destination = safeRoute[nextIndex];

  if (!destination) {
    throw new Error(
      "다음 목적지가 없습니다. 모든 운행이 완료되었습니다."
    );
  }

  await startKakaoNavigation(destination);

  return {
    destination,
    nextIndex,
  };
}

/**
 * 경로 전체에서 좌표가 없는 목적지가 있는지 확인합니다.
 */
export function validateNavigationRoute(routeStops) {
  const safeRoute = Array.isArray(routeStops)
    ? routeStops
    : [];

  if (safeRoute.length < 2) {
    return {
      valid: false,
      message:
        "운행 시작을 위해 경유지를 2곳 이상 추가해 주세요.",
      invalidStops: [],
    };
  }

  const invalidStops = safeRoute.filter((stop) => {
    const latitude = Number(stop.latitude);
    const longitude = Number(stop.longitude);

    return (
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude)
    );
  });

  if (invalidStops.length > 0) {
    return {
      valid: false,
      message:
        "좌표가 확인되지 않은 경유지가 있습니다. 실제도로 계산을 다시 실행해 주세요.",
      invalidStops,
    };
  }

  return {
    valid: true,
    message: "",
    invalidStops: [],
  };
}

/**
 * 현재 위치 다음의 목적지 정보를 반환합니다.
 */
export function getNextDestination(
  routeStops,
  currentIndex
) {
  const safeRoute = Array.isArray(routeStops)
    ? routeStops
    : [];

  const nextIndex = Number(currentIndex) + 1;

  return {
    nextIndex,

    destination:
      safeRoute[nextIndex] || null,

    hasNext:
      Boolean(safeRoute[nextIndex]),
  };
}

/**
 * 현재 구간의 거리와 예상시간을 반환합니다.
 */
export function getCurrentSegment(
  routeStops,
  currentIndex
) {
  const safeRoute = Array.isArray(routeStops)
    ? routeStops
    : [];

  const destination =
    safeRoute[Number(currentIndex) + 1];

  if (!destination) {
    return {
      distance: 0,
      duration: 0,
      destination: null,
    };
  }

  return {
    distance:
      Number(destination.segmentDistance) || 0,

    duration:
      Number(destination.segmentDuration) || 0,

    destination,
  };
}

function validateDestination(destination) {
  if (!destination) {
    throw new Error(
      "카카오내비로 실행할 목적지가 없습니다."
    );
  }

  const longitude = Number(
    destination.longitude
  );

  const latitude = Number(
    destination.latitude
  );

  if (
    !Number.isFinite(longitude) ||
    !Number.isFinite(latitude)
  ) {
    throw new Error(
      `${destination.name || "목적지"}의 좌표가 올바르지 않습니다.`
    );
  }
}

function loadKakaoSdkScript() {
  return new Promise((resolve, reject) => {
    if (window.Kakao) {
      resolve();
      return;
    }

    const existingScript =
      document.querySelector(
        'script[data-kakao-javascript-sdk="true"]'
      );

    if (existingScript) {
      if (window.Kakao) {
        resolve();
        return;
      }

      existingScript.addEventListener(
        "load",
        resolve,
        { once: true }
      );

      existingScript.addEventListener(
        "error",
        () => {
          reject(
            new Error(
              "카카오 JavaScript SDK를 불러오지 못했습니다."
            )
          );
        },
        { once: true }
      );

      return;
    }

    const script =
      document.createElement("script");

    script.src = KAKAO_SDK_URL;

    script.async = true;

    script.crossOrigin =
      "anonymous";

    script.dataset.kakaoJavascriptSdk =
      "true";

    script.onload = () => {
      if (window.Kakao) {
        resolve();
      } else {
        reject(
          new Error(
            "카카오 JavaScript SDK 로딩 후 객체를 확인할 수 없습니다."
          )
        );
      }
    };

    script.onerror = () => {
      reject(
        new Error(
          "카카오 JavaScript SDK를 불러오지 못했습니다. 인터넷 연결과 JavaScript 키를 확인해 주세요."
        )
      );
    };

    document.head.appendChild(script);
  });
}