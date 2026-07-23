import { useMemo, useState, useEffect } from "react";

import DashboardPage from "./pages/DashboardPage";
import VehiclePage from "./pages/VehiclePage";
import NavigationPage from "./pages/NavigationPage";
import HistoryPage from "./pages/HistoryPage";
import ModeSelectPage from "./pages/ModeSelectPage";
import DriverHomePage from "./pages/DriverHomePage";

import ExcelUpload from "./components/excel/ExcelUpload";

import { calculateSequentialRoute } from "./services/routeCalculator";
import {
  loadDriveHistory,
  saveDriveRecord,
  saveDriveHistory,
} from "./services/driveStorage";
import {
  getTodayDateKey,
  loadAssignmentOnce,
  saveAssignment,
} from "./services/dispatchSync";
import {
  loadVehicleRoster,
  saveVehicleRoster,
} from "./services/vehicleStorage";
import {
  saveDriveRecordToCloud,
  subscribeDriveHistory,
} from "./services/driveHistorySync";
import {
  loadPeopleCache,
  savePeopleCache,
} from "./services/peopleStorage";
import {
  savePeopleToCloud,
  subscribePeopleRoster,
} from "./services/peopleSync";

const APP_MODE_STORAGE_KEY =
  "gimcheon-transport-app-mode";

const INITIAL_VEHICLES = [
  {
    id: "vehicle-1",
    name: "1호차",
    assignedCount: 0,
    driverName: "",
    assistantName: "",
  },
  {
    id: "vehicle-2",
    name: "2호차",
    assignedCount: 0,
    driverName: "",
    assistantName: "",
  },
  {
    id: "vehicle-3",
    name: "3호차",
    assignedCount: 0,
    driverName: "",
    assistantName: "",
  },
  {
    id: "sub-vehicle",
    name: "서브차량",
    assignedCount: 0,
    driverName: "",
    assistantName: "",
  },
];

const CENTER_INFO = {
  id: "center",
  type: "center",
  name: "김천통합재가서비스센터",
  address: "경상북도 김천시 김천로 92",
};

function App() {
  const [appMode, setAppMode] = useState(() => {
    if (typeof window === "undefined") {
      return null;
    }

    const stored = window.localStorage.getItem(
      APP_MODE_STORAGE_KEY
    );

    return stored === "office" || stored === "driver"
      ? stored
      : null;
  });

  const [currentPage, setCurrentPage] =
    useState("dashboard");

  const [selectedDate, setSelectedDate] =
    useState(() => getTodayDateKey());

  const [selectedSession, setSelectedSession] =
  
    useState("morning");

  const [
    selectedVehicleId,
    setSelectedVehicleId,
  ] = useState("vehicle-1");

  const [vehicleRoster, setVehicleRoster] = useState(
    () => loadVehicleRoster(INITIAL_VEHICLES)
  );

  const [people, setPeople] = useState(
    () => loadPeopleCache().people
  );
  const [routeSummary, setRouteSummary] = useState(null);

  const [
    uploadFileName,
    setUploadFileName,
  ] = useState(() => loadPeopleCache().fileName);

  const [
    isCalculating,
    setIsCalculating,
  ] = useState(false);

  const [
    calculationProgress,
    setCalculationProgress,
  ] = useState("");

  const [
    calculationMessage,
    setCalculationMessage,
  ] = useState("");

  const [
    routesByDateSessionVehicle,
    setRoutesByDateSessionVehicle,
  ] = useState({});

  const [currentDrive, setCurrentDrive] =
    useState(null);

  const [completedDrives, setCompletedDrives] =
    useState(() => loadDriveHistory());

  useEffect(() => {
    const unsubscribe = subscribeDriveHistory(
      (records) => {
        const normalized =
          saveDriveHistory(records);

        setCompletedDrives(normalized);
      },
      (error) => {
        console.error(
          "운행기록 동기화 실패:",
          error
        );
      }
    );

    return () => {
      unsubscribe?.();
    };
  }, []);

  useEffect(() => {
    const unsubscribe = subscribePeopleRoster(
      (data) => {
        if (!data) {
          return;
        }

        const nextPeople = Array.isArray(
          data.people
        )
          ? data.people
          : [];

        const nextFileName =
          data.fileName || "";

        savePeopleCache(
          nextPeople,
          nextFileName
        );

        setPeople(nextPeople);
        setUploadFileName(nextFileName);
      },
      (error) => {
        console.error(
          "어르신 목록 동기화 실패:",
          error
        );
      }
    );

    return () => {
      unsubscribe?.();
    };
  }, []);

  const selectedVehicle = useMemo(() => {
    return (
      vehicleRoster.find(
        (vehicle) =>
          vehicle.id === selectedVehicleId
      ) || vehicleRoster[0]
    );
  }, [vehicleRoster, selectedVehicleId]);

  const currentRoute = useMemo(() => {
    const dateRoutes =
      routesByDateSessionVehicle[
        selectedDate
      ] || {};

    const sessionRoutes =
      dateRoutes[selectedSession] || {};

    return Array.isArray(
      sessionRoutes[selectedVehicleId]
    )
      ? sessionRoutes[selectedVehicleId]
      : [];
  }, [
    routesByDateSessionVehicle,
    selectedDate,
    selectedSession,
    selectedVehicleId,
  ]);

  const vehiclesWithAssignedCount =
    useMemo(() => {
      const dateRoutes =
        routesByDateSessionVehicle[
          selectedDate
        ] || {};

      const sessionRoutes =
        dateRoutes[selectedSession] || {};

      return vehicleRoster.map(
        (vehicle) => {
          const route = Array.isArray(
            sessionRoutes[vehicle.id]
          )
            ? sessionRoutes[vehicle.id]
            : [];

          const uniquePersonIds =
            new Set(
              route
                .filter(
                  (stop) =>
                    stop.type === "person"
                )
                .map((stop) => stop.id)
            );

          return {
            ...vehicle,
            assignedCount:
              uniquePersonIds.size,
          };
        }
      );
    }, [
      routesByDateSessionVehicle,
      selectedDate,
      selectedSession,
      vehicleRoster,
    ]);

  const handleDataLoaded = (
    nextPeople,
    fileName
  ) => {
    const safePeople =
      Array.isArray(nextPeople)
        ? nextPeople
        : [];

    setPeople(safePeople);

    setUploadFileName(
      fileName || ""
    );

    setCalculationMessage("");
    setCalculationProgress("");

    if (safePeople.length > 0) {
      savePeopleCache(
        safePeople,
        fileName || ""
      );

      savePeopleToCloud(
        safePeople,
        fileName || ""
      ).catch((error) => {
        console.error(
          "어르신 목록 클라우드 저장 실패:",
          error
        );
      });
    }

    if (safePeople.length === 0) {
      setRoutesByDateSessionVehicle({});
    }
  };

  const handleStartPreparation = async ({
    session,
    vehicleId,
  }) => {
    if (people.length === 0) {
      window.alert(
        "먼저 어르신 엑셀파일을 업로드해 주세요."
      );

      return;
    }

    setSelectedSession(session);
    setSelectedVehicleId(vehicleId);

    setCalculationMessage("");
    setCalculationProgress("");

    const alreadyLoaded =
      routesByDateSessionVehicle[
        selectedDate
      ]?.[session]?.[vehicleId];

    if (
      !Array.isArray(alreadyLoaded) ||
      alreadyLoaded.length === 0
    ) {
      try {
        const cloudAssignment =
          await loadAssignmentOnce({
            dateKey: selectedDate,
            session,
            vehicleId,
          });

        if (
          cloudAssignment &&
          Array.isArray(
            cloudAssignment.routeStops
          ) &&
          cloudAssignment.routeStops
            .length > 0
        ) {
          setRoutesByDateSessionVehicle(
            (current) => ({
              ...current,

              [selectedDate]: {
                ...(current[
                  selectedDate
                ] || {}),

                [session]: {
                  ...(current[
                    selectedDate
                  ]?.[session] || {}),

                  [vehicleId]:
                    cloudAssignment.routeStops,
                },
              },
            })
          );

          setCalculationMessage(
            `저장된 배차를 불러왔습니다: 총 ${Number(
              cloudAssignment.totalDistance || 0
            ).toFixed(
              2
            )}km · ${formatDuration(
              cloudAssignment.totalDuration ||
                0
            )}`
          );
        }
      } catch (error) {
        console.error(
          "저장된 배차 불러오기 실패:",
          error
        );
      }
    }

    setCurrentPage("vehicle");
  };

  const handleRouteChange = (
    nextRoute
  ) => {
    setRoutesByDateSessionVehicle(
      (current) => ({
        ...current,

        [selectedDate]: {
          ...(current[selectedDate] ||
            {}),

          [selectedSession]: {
            ...(current[
              selectedDate
            ]?.[selectedSession] || {}),

            [selectedVehicleId]:
              Array.isArray(nextRoute)
                ? nextRoute
                : [],
          },
        },
      })
    );

    setCalculationMessage("");
    setCalculationProgress("");
  };

  const handleCalculateRoute =
    async (routeStops) => {
      if (isCalculating) {
        return;
      }

      try {
        setIsCalculating(true);

        setCalculationMessage(
          "실제 자동차 도로 기준으로 거리와 시간을 계산하고 있습니다."
        );

        setCalculationProgress(
          "주소를 확인하고 있습니다."
        );

        const result =
          await calculateSequentialRoute(
            routeStops,

            ({
              current,
              total,
              stage,
            }) => {
              if (
                stage ===
                "geocoding"
              ) {
                setCalculationProgress(
                  `주소 좌표 확인 ${current}/${total}`
                );
              } else {
                setCalculationProgress(
                  `도로 경로 계산 ${current}/${total}`
                );
              }
            }
          );

        setRoutesByDateSessionVehicle(
          (current) => ({
            ...current,

            [selectedDate]: {
              ...(current[
                selectedDate
              ] || {}),

              [selectedSession]: {
                ...(current[
                  selectedDate
                ]?.[selectedSession] ||
                  {}),

                [selectedVehicleId]:
                  result.routeStops,
              },
            },
          })
        );

        try {
          await saveAssignment({
            dateKey: selectedDate,
            session: selectedSession,
            vehicleId: selectedVehicleId,
            vehicleName:
              selectedVehicle?.name || "",
            routeStops: result.routeStops,
            totalDistance:
              result.totalDistance,
            totalDuration:
              result.totalDuration,
          });
        } catch (syncError) {
          console.error(
            "배차 동기화 실패:",
            syncError
          );
        }

        if (
          result.errorCount > 0
        ) {
          setCalculationMessage(
            `계산 완료: 성공 ${result.successCount}구간, 오류 ${result.errorCount}구간`
          );
        } else {
          setCalculationMessage(
            `계산 완료: 총 ${result.totalDistance.toFixed(
              2
            )}km · ${formatDuration(
              result.totalDuration
            )}`
          );
        }

        setCalculationProgress("");
      } catch (error) {
        setCalculationMessage(
          `오류: ${
            error instanceof Error
              ? error.message
              : "경로 계산에 실패했습니다."
          }`
        );

        setCalculationProgress("");
      } finally {
        setIsCalculating(false);
      }
    };

  const handleStartDrive = ({
    session,
    vehicle,
    routeStops,
  }) => {
    if (
      !Array.isArray(routeStops) ||
      routeStops.length < 2
    ) {
      window.alert(
        "운행 시작을 위해 경유지를 2곳 이상 추가해 주세요."
      );

      return;
    }

    const hasInvalidCoordinate =
      routeStops.some((stop) => {
        const latitude = Number(
          stop.latitude
        );

        const longitude = Number(
          stop.longitude
        );

        return (
          !Number.isFinite(
            latitude
          ) ||
          !Number.isFinite(
            longitude
          )
        );
      });

    if (hasInvalidCoordinate) {
      window.alert(
        "좌표가 확인되지 않은 경유지가 있습니다. 실제도로 계산을 다시 실행해 주세요."
      );

      return;
    }

    setCurrentDrive({
      session,
      vehicle,
      routeStops,
      startedAt:
        new Date().toISOString(),
    });

    setCurrentPage("navigation");
  };

  const handleCompleteDrive = (
    driveResult
  ) => {
    const draftDrive = {
      ...driveResult,

      id: createDriveId(),

      date: new Date().toISOString(),

      sessionLabel:
        driveResult.session ===
        "afternoon"
          ? "오후 송영"
          : "오전 송영",

      vehicleName:
        driveResult.vehicle?.name ||
        "운행차량",
    };

    const completedDrive =
      saveDriveRecord(draftDrive);

    saveDriveRecordToCloud(
      completedDrive
    ).catch((error) => {
      console.error(
        "운행기록 클라우드 저장 실패:",
        error
      );
    });

    setCompletedDrives(
      (current) => [
        completedDrive,
        ...current,
      ]
    );

    setCurrentDrive(null);

    window.alert(
      `${completedDrive.sessionLabel} · ${completedDrive.vehicleName}\n운행이 완료되었습니다.\n총거리 ${Number(
        completedDrive.totalDistance
      ).toFixed(
        2
      )}km · ${formatDuration(
        completedDrive.totalDuration
      )}`
    );

    setCurrentPage("dashboard");
  };

  const handleUpdateVehicleStaff = (
    vehicleId,
    { driverName, assistantName }
  ) => {
    setVehicleRoster((current) => {
      const nextRoster = current.map((vehicle) =>
        vehicle.id === vehicleId
          ? {
              ...vehicle,
              driverName:
                driverName ?? vehicle.driverName,
              assistantName:
                assistantName ??
                vehicle.assistantName,
            }
          : vehicle
      );

      saveVehicleRoster(nextRoster);

      return nextRoster;
    });
  };

  const handleSelectMode = (mode) => {
    setAppMode(mode);

    if (typeof window !== "undefined") {
      window.localStorage.setItem(
        APP_MODE_STORAGE_KEY,
        mode
      );
    }

    setCurrentPage("dashboard");
  };

  const handleExitDriverMode = () => {
    setAppMode(null);
  };

  const handleBackFromNavigation =
    () => {
      setCurrentPage("vehicle");
    };

  const handleOpenHistory = () => {
    setCurrentPage("history");
  };

  const handleBackFromHistory =
    () => {
      setCurrentPage("dashboard");
    };

  const handleHistoryChange = (
    nextHistory
  ) => {
    setCompletedDrives(
      Array.isArray(nextHistory)
        ? nextHistory
        : []
    );
  };

  if (!appMode) {
    return (
      <ModeSelectPage
        onSelectMode={handleSelectMode}
      />
    );
  }

  if (
    currentPage ===
      "navigation" &&
    currentDrive
  ) {
    return (
      <NavigationPage
        session={
          currentDrive.session
        }
        vehicle={
          currentDrive.vehicle
        }
        routeStops={
          currentDrive.routeStops
        }
        onBack={
          handleBackFromNavigation
        }
        onComplete={
          handleCompleteDrive
        }
      />
    );
  }

  if (appMode === "driver") {
    return (
      <DriverHomePage
        vehicles={vehicleRoster}
        onStartDrive={handleStartDrive}
        onExitDriverMode={
          handleExitDriverMode
        }
      />
    );
  }

  if (currentPage === "history") {
    return (
      <HistoryPage
        driveHistory={completedDrives}
        onBack={handleBackFromHistory}
        onHistoryChange={handleHistoryChange}
      />
    );
  }

  if (
    currentPage === "vehicle"
  ) {
    return (
      <VehiclePage
        session={selectedSession}
        vehicle={selectedVehicle}
        people={people}
        center={CENTER_INFO}
        initialRoute={currentRoute}
        isCalculating={
          isCalculating
        }
        calculationProgress={
          calculationProgress
        }
        calculationMessage={
          calculationMessage
        }
        onBack={() => {
          if (!isCalculating) {
            setCurrentPage(
              "dashboard"
            );
          }
        }}
        onRouteChange={
          handleRouteChange
        }
        onCalculateRoute={
          handleCalculateRoute
        }
        onStartDrive={
          handleStartDrive
        }
      />
    );
  }

  return (
    <div>
      <div style={styles.uploadArea}>
        <div
          style={styles.uploadInner}
        >
          <ExcelUpload
            onDataLoaded={
              handleDataLoaded
            }
          />

          {people.length > 0 && (
            <div
              style={
                styles.uploadSummary
              }
            >
              <div>
                <span
                  style={
                    styles.uploadLabel
                  }
                >
                  불러온 파일
                </span>

                <strong
                  style={
                    styles.uploadValue
                  }
                >
                  {uploadFileName ||
                    "엑셀파일"}
                </strong>
              </div>

              <span
                style={
                  styles.uploadCount
                }
              >
                어르신{" "}
                {people.length}명
              </span>
            </div>
          )}

          {completedDrives.length >
            0 && (
            <div
              style={
                styles.completedSummary
              }
            >
              <span
                style={
                  styles.completedLabel
                }
              >
                최근 완료 운행
              </span>

              <strong
                style={
                  styles.completedValue
                }
              >
                {
                  completedDrives[0]
                    .sessionLabel
                }{" "}
                ·{" "}
                {
                  completedDrives[0]
                    .vehicleName
                }
              </strong>

              <span
                style={
                  styles.completedDetail
                }
              >
                {Number(
                  completedDrives[0]
                    .totalDistance
                ).toFixed(
                  2
                )}
                km ·{" "}
                {formatDuration(
                  completedDrives[0]
                    .totalDuration
                )}
              </span>
            </div>
          )}
        </div>
      </div>

      <DashboardPage
    vehicles={vehiclesWithAssignedCount}
    selectedDate={selectedDate}
    initialSession={selectedSession}
    selectedVehicleId={selectedVehicleId}

    routeStops={currentRoute}
    calculationMessage={calculationMessage}
    calculationProgress={calculationProgress}

    onDateChange={setSelectedDate}
    onSessionChange={setSelectedSession}
    onVehicleSelect={setSelectedVehicleId}
    onStartPreparation={handleStartPreparation}
    onOpenHistory={handleOpenHistory}
    onSwitchMode={handleExitDriverMode}
    onUpdateVehicleStaff={handleUpdateVehicleStaff}
/>
      
    </div>
  );
}

function createEmptyVehicleRouteMap() {
  return INITIAL_VEHICLES.reduce(
    (result, vehicle) => ({
      ...result,
      [vehicle.id]: [],
    }),
    {}
  );
}

function createDriveId() {
  return `drive-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

function formatDuration(duration) {
  const minutes = Math.round(
    Number(duration) || 0
  );

  if (minutes < 60) {
    return `${minutes}분`;
  }

  const hours = Math.floor(
    minutes / 60
  );

  const restMinutes =
    minutes % 60;

  return restMinutes > 0
    ? `${hours}시간 ${restMinutes}분`
    : `${hours}시간`;
}

const styles = {
  uploadArea: {
    padding: "24px 32px 0",
    boxSizing: "border-box",
    backgroundColor: "#f4f7fb",
  },

  uploadInner: {
    maxWidth: "1180px",
    margin: "0 auto",
  },

  uploadSummary: {
    marginTop: "12px",
    padding: "12px 15px",
    display: "flex",
    alignItems: "center",
    justifyContent:
      "space-between",
    gap: "10px",
    flexWrap: "wrap",
    backgroundColor: "#eff6ff",
    border: "1px solid #bfdbfe",
    borderRadius: "11px",
  },

  uploadLabel: {
    display: "block",
    marginBottom: "3px",
    color: "#64748b",
    fontSize: "10px",
    fontWeight: "700",
  },

  uploadValue: {
    color: "#1f3c88",
    fontSize: "12px",
  },

  uploadCount: {
    color: "#047857",
    fontSize: "11px",
    fontWeight: "800",
  },

  completedSummary: {
    marginTop: "10px",
    padding: "12px 15px",
    display: "flex",
    alignItems: "center",
    gap: "10px",
    flexWrap: "wrap",
    backgroundColor: "#ecfdf5",
    border: "1px solid #a7f3d0",
    borderRadius: "11px",
  },

  completedLabel: {
    color: "#047857",
    fontSize: "10px",
    fontWeight: "800",
  },

  completedValue: {
    color: "#065f46",
    fontSize: "12px",
  },

  completedDetail: {
    marginLeft: "auto",
    color: "#047857",
    fontSize: "11px",
    fontWeight: "800",
  },
};

export default App;