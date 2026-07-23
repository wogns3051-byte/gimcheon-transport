import { geocodeAddress } from "./geocode";

/**
 * 출발지점(startPoint)에서 시작해, 남은 경유지 중
 * 매번 가장 가까운 곳을 다음 방문지로 선택하는
 * '최근접 이웃' 방식으로 방문 순서를 추천합니다.
 *
 * 실제 도로 거리가 아닌 직선거리 기준의 "예상 순서"이며,
 * 정확한 거리·시간은 이후 실제도로 계산으로 확인해야 합니다.
 */
export async function suggestVisitOrder(
  startPoint,
  stops
) {
  const safeStops = Array.isArray(stops)
    ? stops
    : [];

  const resolvedStart = await ensureCoordinates(
    startPoint
  );

  const resolvedStops = [];

  for (const stop of safeStops) {
    const resolved = await ensureCoordinates(
      stop
    );

    resolvedStops.push(resolved);
  }

  const remaining = [...resolvedStops];
  const ordered = [];

  let currentPoint = resolvedStart;

  while (remaining.length > 0) {
    let nearestIndex = 0;
    let nearestDistance = Infinity;

    remaining.forEach((stop, index) => {
      const distance = calculateHaversineKm(
        currentPoint,
        stop
      );

      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestIndex = index;
      }
    });

    const [nextStop] = remaining.splice(
      nearestIndex,
      1
    );

    ordered.push(nextStop);
    currentPoint = nextStop;
  }

  return ordered;
}

async function ensureCoordinates(point) {
  const latitude = Number(point?.latitude);
  const longitude = Number(point?.longitude);

  if (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude)
  ) {
    return { ...point, latitude, longitude };
  }

  const coordinateData = await geocodeAddress(
    point?.address
  );

  return {
    ...point,
    ...coordinateData,
    latitude: Number(coordinateData.latitude),
    longitude: Number(coordinateData.longitude),
  };
}

function calculateHaversineKm(pointA, pointB) {
  const earthRadiusKm = 6371;

  const lat1 = toRadians(
    Number(pointA.latitude)
  );

  const lat2 = toRadians(
    Number(pointB.latitude)
  );

  const deltaLat = toRadians(
    Number(pointB.latitude) -
      Number(pointA.latitude)
  );

  const deltaLng = toRadians(
    Number(pointB.longitude) -
      Number(pointA.longitude)
  );

  const a =
    Math.sin(deltaLat / 2) *
      Math.sin(deltaLat / 2) +
    Math.cos(lat1) *
      Math.cos(lat2) *
      Math.sin(deltaLng / 2) *
      Math.sin(deltaLng / 2);

  const c =
    2 *
    Math.atan2(
      Math.sqrt(a),
      Math.sqrt(1 - a)
    );

  return earthRadiusKm * c;
}

function toRadians(degrees) {
  return (degrees * Math.PI) / 180;
}