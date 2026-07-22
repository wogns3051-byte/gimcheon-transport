const REST_API_KEY = String(
  import.meta.env.VITE_KAKAO_REST_API_KEY || ""
).trim();

export function getKakaoHeaders() {
  if (!REST_API_KEY) {
    throw new Error(
      ".env 파일에 VITE_KAKAO_REST_API_KEY를 설정해 주세요."
    );
  }

  return {
    Authorization: `KakaoAK ${REST_API_KEY}`,
  };
}

export async function readJson(response) {
  const text = await response.text();

  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text);
  } catch {
    return {
      message: text,
    };
  }
}

export function getKakaoError(data, fallback) {
  return (
    data?.msg ||
    data?.message ||
    data?.error_description ||
    data?.result_msg ||
    fallback
  );
}