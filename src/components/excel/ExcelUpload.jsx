import { useRef, useState } from "react";
import * as XLSX from "xlsx";

const HEADER_ALIASES = {
  name: ["성명", "이름", "어르신", "대상자", "수급자"],
  address: ["주소", "도로명주소", "자택주소", "송영주소"],
  phone: ["연락처", "전화번호", "휴대전화", "휴대폰"],
};

function ExcelUpload({ onDataLoaded }) {
  const inputRef = useRef(null);
  const [fileName, setFileName] = useState("");
  const [message, setMessage] = useState("");

  const handleFile = async (file) => {
    try {
      if (!file) return;

      const lowerName = file.name.toLowerCase();

      if (!lowerName.endsWith(".xlsx") && !lowerName.endsWith(".xls")) {
        throw new Error("XLSX 또는 XLS 파일만 업로드할 수 있습니다.");
      }

      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });

      if (!workbook.SheetNames.length) {
        throw new Error("엑셀 시트를 찾을 수 없습니다.");
      }

      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet, {
        defval: "",
        raw: false,
      });

      const people = rows
        .map((row, index) => normalizeRow(row, index))
        .filter((person) => person.name || person.address);

      if (!people.length) {
        throw new Error("성명 또는 주소가 입력된 자료를 찾지 못했습니다.");
      }

      setFileName(file.name);
      setMessage(`${people.length}명의 어르신을 불러왔습니다.`);
      onDataLoaded?.(people, file.name);
    } catch (error) {
      setFileName("");
      setMessage(error.message || "엑셀파일을 읽지 못했습니다.");
      onDataLoaded?.([], "");
    }
  };

  return (
    <section style={styles.wrapper}>
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls"
        onChange={(event) => handleFile(event.target.files?.[0])}
        style={{ display: "none" }}
      />

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        style={styles.uploadButton}
      >
        📄 엑셀파일 선택
      </button>

      <div style={styles.info}>
        <strong>{fileName || "선택된 파일 없음"}</strong>
        <span>필수 열: 성명, 주소</span>
      </div>

      {message && <div style={styles.message}>{message}</div>}
    </section>
  );
}

function normalizeRow(row, index) {
  return {
    id: `person-${Date.now()}-${index}`,
    name: findValue(row, HEADER_ALIASES.name),
    address: findValue(row, HEADER_ALIASES.address),
    phone: formatPhone(findValue(row, HEADER_ALIASES.phone)),
  };
}

function findValue(row, aliases) {
  const normalizedEntries = Object.entries(row || {}).map(([key, value]) => [
    normalizeHeader(key),
    String(value ?? "").trim(),
  ]);

  for (const alias of aliases) {
    const normalizedAlias = normalizeHeader(alias);
    const match = normalizedEntries.find(([key]) => key === normalizedAlias);

    if (match) {
      return match[1];
    }
  }

  return "";
}

function normalizeHeader(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[._\-()[\]{}]/g, "");
}

function formatPhone(value) {
  const digits = String(value || "").replace(/\D/g, "");

  if (digits.length === 11) {
    return digits.replace(/(\d{3})(\d{4})(\d{4})/, "$1-$2-$3");
  }

  if (digits.length === 10) {
    return digits.replace(/(\d{3})(\d{3})(\d{4})/, "$1-$2-$3");
  }

  return String(value || "").trim();
}

const styles = {
  wrapper: {
    padding: "18px",
    display: "flex",
    alignItems: "center",
    gap: "14px",
    flexWrap: "wrap",
    backgroundColor: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: "14px",
  },

  uploadButton: {
    minHeight: "44px",
    padding: "0 16px",
    border: "none",
    borderRadius: "10px",
    backgroundColor: "#1f3c88",
    color: "#ffffff",
    fontSize: "12px",
    fontWeight: "800",
    cursor: "pointer",
  },

  info: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
    color: "#334155",
    fontSize: "11px",
  },

  message: {
    width: "100%",
    padding: "10px 12px",
    backgroundColor: "#ecfdf5",
    border: "1px solid #a7f3d0",
    borderRadius: "9px",
    color: "#047857",
    fontSize: "11px",
    fontWeight: "700",
  },
};

export default ExcelUpload;