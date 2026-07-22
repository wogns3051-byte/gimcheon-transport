function ModeSelectPage({ onSelectMode }) {
  return (
    <main style={styles.page}>
      <div style={styles.card}>
        <span style={styles.eyebrow}>
          김천통합재가서비스센터
        </span>

        <h1 style={styles.title}>송영관리시스템</h1>

        <p style={styles.subtitle}>
          이 기기를 어떤 용도로 사용하시나요? (한 번 선택하면
          이 기기에서 계속 기억합니다)
        </p>

        <div style={styles.modeGrid}>
          <button
            type="button"
            onClick={() => onSelectMode("office")}
            style={styles.modeButton}
          >
            <span style={styles.modeIcon}>🏢</span>
            <strong style={styles.modeTitle}>
              사무실 모드
            </strong>
            <span style={styles.modeDescription}>
              엑셀 업로드, 배차 생성, 실제도로 계산,
              운행기록 관리
            </span>
          </button>

          <button
            type="button"
            onClick={() => onSelectMode("driver")}
            style={styles.modeButton}
          >
            <span style={styles.modeIcon}>🚐</span>
            <strong style={styles.modeTitle}>
              운전원 모드
            </strong>
            <span style={styles.modeDescription}>
              오늘 배차 확인 후 바로 운행 시작
            </span>
          </button>
        </div>
      </div>
    </main>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    padding: "24px",
    boxSizing: "border-box",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f4f7fb",
    fontFamily:
      '"Pretendard", "Noto Sans KR", Arial, sans-serif',
  },

  card: {
    width: "100%",
    maxWidth: "560px",
    padding: "34px 28px",
    boxSizing: "border-box",
    backgroundColor: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: "22px",
    boxShadow: "0 16px 38px rgba(15,23,42,0.08)",
    textAlign: "center",
  },

  eyebrow: {
    display: "block",
    marginBottom: "6px",
    color: "#1f3c88",
    fontSize: "12px",
    fontWeight: "900",
  },

  title: {
    margin: "0 0 10px",
    color: "#172033",
    fontSize: "26px",
  },

  subtitle: {
    margin: "0 0 24px",
    color: "#64748b",
    fontSize: "12px",
    lineHeight: "1.7",
  },

  modeGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: "12px",
  },

  modeButton: {
    padding: "22px 14px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "8px",
    border: "2px solid #e2e8f0",
    borderRadius: "16px",
    backgroundColor: "#f8fafc",
    color: "#172033",
    cursor: "pointer",
  },

  modeIcon: { fontSize: "34px" },

  modeTitle: { fontSize: "15px" },

  modeDescription: {
    color: "#64748b",
    fontSize: "10px",
    lineHeight: "1.6",
  },
};

export default ModeSelectPage;