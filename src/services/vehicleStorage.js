const STORAGE_KEY = "gimcheon-transport-vehicle-roster";

/**
 * 저장된 차량 명단(운전원/동승자 이름 등)을 불러옵니다.
 * 저장된 값이 없으면 기본값(defaultVehicles)을 그대로 반환합니다.
 */
export function loadVehicleRoster(defaultVehicles) {
  const safeDefaults = Array.isArray(defaultVehicles)
    ? defaultVehicles
    : [];

  if (typeof window === "undefined") {
    return safeDefaults;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);

    if (!raw) {
      return safeDefaults;
    }

    const parsed = JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      return safeDefaults;
    }

    const savedById = new Map(
      parsed.map((vehicle) => [vehicle.id, vehicle])
    );

    return safeDefaults.map((vehicle) => ({
      ...vehicle,
      ...(savedById.get(vehicle.id) || {}),
    }));
  } catch (error) {
    console.error(
      "차량 명단을 불러오지 못했습니다:",
      error
    );

    return safeDefaults;
  }
}

/**
 * 차량 명단(운전원/동승자 이름 등)을 localStorage에 저장합니다.
 */
export function saveVehicleRoster(vehicles) {
  if (typeof window === "undefined") {
    return;
  }

  const safeVehicles = Array.isArray(vehicles)
    ? vehicles
    : [];

  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(safeVehicles)
    );
  } catch (error) {
    console.error(
      "차량 명단을 저장하지 못했습니다:",
      error
    );
  }
}