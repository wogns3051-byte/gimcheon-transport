import {
  getKakaoHeaders,
  getKakaoError,
  readJson,
} from "./kakaoApi";

const DIRECTIONS_URL =
  "https://apis-navi.kakaomobility.com/v1/directions";

/**
 * 두 장소 사이의 실제 자동차 도로 경로를 계산합니다.
 *
 * 반환값:
 * - 실제 주행거리
 * - 예상 소요시간
 * - 지도 경로선을 그릴 도로 좌표
 */
export async function getDrivingRoute(
  origin,
  destination
) {
  validateLocation(origin, "출발지");
  validateLocation(destination, "목적지");

  const url = new URL(DIRECTIONS_URL);

  url.searchParams.set(
    "origin",
    `${origin.longitude},${origin.latitude}`
  );

  url.searchParams.set(
    "destination",
    `${destination.longitude},${destination.latitude}`
  );

  url.searchParams.set(
    "priority",
    "RECOMMEND"
  );

  url.searchParams.set(
    "alternatives",
    "false"
  );

  /*
   * summary=false:
   * 거리·시간 요약뿐 아니라 sections, roads,
   * vertexes 등 실제 도로 좌표까지 받습니다.
   */
  url.searchParams.set(
    "summary",
    "false"
  );

  url.searchParams.set(
    "road_details",
    "false"
  );

  url.searchParams.set(
    "car_fuel",
    "GASOLINE"
  );

  url.searchParams.set(
    "car_hipass",
    "false"
  );

  const response = await fetch(
    url.toString(),
    {
      method: "GET",
      headers: {
        ...getKakaoHeaders(),
        "Content-Type": "application/json",
      },
    }
  );

  const data = await readJson(response);

  if (!response.ok) {
    throw new Error(
      getKakaoError(
        data,
        `자동차 경로 계산에 실패했습니다. (${response.status})`
      )
    );
  }

  const route = data?.routes?.[0];
  const summary = route?.summary;

  if (!summary) {
    throw new Error(
      data?.result_msg ||
        "두 장소 사이의 자동차 경로를 찾지 못했습니다."
    );
  }

  const distanceMeters = Number(
    summary.distance
  );

  const durationSeconds = Number(
    summary.duration
  );

  if (
    !Number.isFinite(distanceMeters) ||
    !Number.isFinite(durationSeconds)
  ) {
    throw new Error(
      "자동차 경로 계산 결과가 올바르지 않습니다."
    );
  }

  return {
    distanceMeters,

    durationSeconds,

    distanceKilometers: Number(
      (distanceMeters / 1000).toFixed(2)
    ),

    durationMinutes: Math.max(
      1,
      Math.ceil(durationSeconds / 60)
    ),

    tollFare:
      Number(summary.fare?.toll) || 0,

    taxiFare:
      Number(summary.fare?.taxi) || 0,

    /*
     * 카카오 지도 Polyline에서 사용할
     * 실제 자동차 도로 좌표입니다.
     */
    pathPoints: extractPathPoints(route),
  };
}

/**
 * 카카오모빌리티 응답의
 * sections → roads → vertexes를
 * 지도용 좌표 배열로 변환합니다.
 *
 * vertexes 형식:
 * [경도, 위도, 경도, 위도, ...]
 */
function extractPathPoints(route) {
  const sections = Array.isArray(
    route?.sections
  )
    ? route.sections
    : [];

  const points = [];

  sections.forEach((section) => {
    const roads = Array.isArray(
      section?.roads
    )
      ? section.roads
      : [];

    roads.forEach((road) => {
      const vertexes = Array.isArray(
        road?.vertexes
      )
        ? road.vertexes
        : [];

      for (
        let index = 0;
        index < vertexes.length - 1;
        index += 2
      ) {
        const longitude = Number(
          vertexes[index]
        );

        const latitude = Number(
          vertexes[index + 1]
        );

        if (
          !Number.isFinite(longitude) ||
          !Number.isFinite(latitude)
        ) {
          continue;
        }

        const previous =
          points[points.length - 1];

        const isSameAsPrevious =
          previous &&
          previous.longitude === longitude &&
          previous.latitude === latitude;

        if (!isSameAsPrevious) {
          points.push({
            longitude,
            latitude,
          });
        }
      }
    });
  });

  return points;
}

function validateLocation(
  location,
  label
) {
  const latitude = Number(
    location?.latitude
  );

  const longitude = Number(
    location?.longitude
  );

  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude)
  ) {
    throw new Error(
      `${label} 좌표가 올바르지 않습니다.`
    );
  }
}