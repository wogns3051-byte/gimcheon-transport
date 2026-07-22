import { useEffect, useState } from "react";

/**
 * 화면 너비가 지정한 기준(px) 이하일 때 true를 반환합니다.
 * 인라인 style 객체 기반 페이지에서 반응형(모바일 최적화)
 * 레이아웃을 적용하기 위해 사용합니다.
 */
export function useIsMobile(breakpoint = 720) {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === "undefined") {
      return false;
    }

    return window.innerWidth <= breakpoint;
  });

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    const handleResize = () => {
      setIsMobile(window.innerWidth <= breakpoint);
    };

    handleResize();

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [breakpoint]);

  return isMobile;
}

export default useIsMobile;