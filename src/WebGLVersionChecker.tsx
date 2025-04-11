import { useEffect } from "react";
import { useThree } from "@react-three/fiber";

function WebGLVersionChecker() {
  const { gl } = useThree(); // useThree 훅으로 gl 인스턴스 가져오기

  useEffect(() => {
    if (gl && gl.capabilities) {
      const isWebGL2 = gl.capabilities.isWebGL2;
      console.log(
        `현재 사용 중인 WebGL 버전: ${isWebGL2 ? "WebGL 2" : "WebGL 1"}`
      );
      // 필요하다면 더 자세한 정보 로깅
      // console.log('WebGL Capabilities:', gl.capabilities);
    }
  }, [gl]); // gl 인스턴스가 준비되면 실행

  return null; // 화면에는 아무것도 렌더링하지 않음
}

export default WebGLVersionChecker;
