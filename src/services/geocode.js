import {
  getKakaoHeaders,
  getKakaoError,
  readJson,
} from "./kakaoApi";

const ADDRESS_URL =
  "https://dapi.kakao.com/v2/local/search/address.json";

const KEYWORD_URL =
  "https://dapi.kakao.com/v2/local/search/keyword.json";

export async function geocodeAddress(address) {
  const query = cleanAddress(address);

  if (!query) {
    throw new Error("검색할 주소가 없습니다.");
  }

  const addressResult = await search(
    ADDRESS_URL,
    query
  );

  let documents = Array.isArray(
    addressResult.documents
  )
    ? addressResult.documents
    : [];

  if (!documents.length) {
    const keywordResult = await search(
      KEYWORD_URL,
      query
    );

    documents = Array.isArray(
      keywordResult.documents
    )
      ? keywordResult.documents
      : [];
  }

  if (!documents.length) {
    throw new Error(
      `주소를 찾지 못했습니다: ${query}`
    );
  }

  const document =
    documents.find((item) =>
      String(item.address_name || "").includes(
        "김천시"
      )
    ) || documents[0];

  const longitude = Number(document.x);
  const latitude = Number(document.y);

  if (
    !Number.isFinite(longitude) ||
    !Number.isFinite(latitude)
  ) {
    throw new Error(
      `주소 좌표를 확인할 수 없습니다: ${query}`
    );
  }

  return {
    longitude,
    latitude,
    matchedAddress:
      document.address_name ||
      document.road_address_name ||
      query,
    roadAddress:
      document.road_address_name ||
      document.address_name ||
      query,
  };
}

async function search(endpoint, query) {
  const url = new URL(endpoint);

  url.searchParams.set("query", query);
  url.searchParams.set("size", "10");

  const response = await fetch(
    url.toString(),
    {
      headers: getKakaoHeaders(),
    }
  );

  const data = await readJson(response);

  if (!response.ok) {
    throw new Error(
      getKakaoError(
        data,
        `주소 검색에 실패했습니다. (${response.status})`
      )
    );
  }

  return data;
}

function cleanAddress(value) {
  return String(value || "")
    .replace(/\(\s*\d{5}\s*\)/g, "")
    .replace(/^\d{5}\s+/, "")
    .replace(/\s+/g, " ")
    .trim();
}