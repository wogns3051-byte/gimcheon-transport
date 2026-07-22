import { geocodeAddress } from "./geocode";
import { getDrivingRoute } from "./directions";

export async function calculateSequentialRoute(
  routeStops,
  onProgress
) {
  const stops = Array.isArray(routeStops)
    ? routeStops
    : [];

  if (stops.length < 2) {
    throw new Error(
      "경로 계산을 위해 장소를 2곳 이상 추가해 주세요."
    );
  }

  const resolvedStops = [];

  for (
    let index = 0;
    index < stops.length;
    index += 1
  ) {
    const stop = stops[index];

    let latitude = Number(stop.latitude);
    let longitude = Number(stop.longitude);
    let coordinateData = {};

    if (
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude)
    ) {
      coordinateData = await geocodeAddress(
        stop.address
      );

      latitude = Number(
        coordinateData.latitude
      );

      longitude = Number(
        coordinateData.longitude
      );
    }

    resolvedStops.push({
      ...stop,
      ...coordinateData,
      latitude,
      longitude,
    });

    onProgress?.({
      current: index + 1,
      total: stops.length,
      stage: "geocoding",
    });
  }

  let totalDistance = 0;
  let totalDuration = 0;

  const calculatedStops = [
    {
      ...resolvedStops[0],
      segmentDistance: 0,
      segmentDuration: 0,
      cumulativeDistance: 0,
      cumulativeDuration: 0,
      pathPoints: [],
      status: "completed",
      errorMessage: "",
    },
  ];

  for (
    let index = 1;
    index < resolvedStops.length;
    index += 1
  ) {
    const origin =
      resolvedStops[index - 1];

    const destination =
      resolvedStops[index];

    try {
      const result =
        await getDrivingRoute(
          origin,
          destination
        );

      totalDistance +=
        result.distanceKilometers;

      totalDuration +=
        result.durationMinutes;

      calculatedStops.push({
        ...destination,

        fromStopId:
          origin.stopId,

        fromName:
          origin.name,

        segmentDistance:
          result.distanceKilometers,

        segmentDuration:
          result.durationMinutes,

        cumulativeDistance:
          Number(
            totalDistance.toFixed(2)
          ),

        cumulativeDuration:
          totalDuration,

        pathPoints:
          Array.isArray(
            result.pathPoints
          )
            ? result.pathPoints
            : [],

        tollFare:
          result.tollFare || 0,

        taxiFare:
          result.taxiFare || 0,

        status:
          "completed",

        errorMessage:
          "",
      });
    } catch (error) {
      calculatedStops.push({
        ...destination,

        fromStopId:
          origin.stopId,

        fromName:
          origin.name,

        segmentDistance:
          null,

        segmentDuration:
          null,

        cumulativeDistance:
          Number(
            totalDistance.toFixed(2)
          ),

        cumulativeDuration:
          totalDuration,

        pathPoints:
          [],

        tollFare:
          0,

        taxiFare:
          0,

        status:
          "error",

        errorMessage:
          error instanceof Error
            ? error.message
            : "경로 계산 오류",
      });
    }

    onProgress?.({
      current: index,
      total:
        resolvedStops.length - 1,
      stage: "directions",
    });
  }

  const successCount =
    calculatedStops.filter(
      (stop, index) =>
        index > 0 &&
        stop.status ===
          "completed"
    ).length;

  const errorCount =
    calculatedStops.filter(
      (stop) =>
        stop.status === "error"
    ).length;

  const fullPathPoints =
    calculatedStops.flatMap(
      (stop) =>
        Array.isArray(
          stop.pathPoints
        )
          ? stop.pathPoints
          : []
    );

  return {
    routeStops:
      calculatedStops,

    totalDistance:
      Number(
        totalDistance.toFixed(2)
      ),

    totalDuration,

    successCount,

    errorCount,

    fullPathPoints,
  };
}