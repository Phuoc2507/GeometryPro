import { useEffect, useRef } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/**
 * CameraFlyer — bay (animate) camera mượt tới một tập điểm của hình.
 *
 * `focus`: { pts, nonce } | null — `pts` là toạ độ math (x,y,z). Mỗi khi `nonce`
 * đổi, component tính pose mục tiêu (ôm sát các điểm `pts`) rồi lerp vị trí camera
 * + target của OrbitControls trong ~0.6s (smoothstep). Xong thì trả quyền lại cho
 * OrbitControls. Nhận thẳng toạ độ (không tra geometry) nên độc lập với hình nào
 * đang render — orchestrator (GeometryRenderer) tự giải id→toạ độ rồi truyền vào.
 *
 * Khi `focus == null` (bài thường / chưa nối nguồn) → KHÔNG làm gì: return null,
 * anim = null, camera giữ nguyên luồng CameraFitter + OrbitControls.
 *
 * Hệ toạ độ khớp CameraFitter: three x = math x, three y = math z, three z = math y.
 */
export function CameraFlyer({
  controlsRef,
  focus,
}: {
  controlsRef: React.MutableRefObject<any>;
  focus: { pts: Array<{ x: number; y: number; z: number }>; nonce: number } | null;
}) {
  const { camera, size } = useThree();
  const anim = useRef<null | {
    fromPos: THREE.Vector3;
    toPos: THREE.Vector3;
    fromTgt: THREE.Vector3;
    toTgt: THREE.Vector3;
    t: number;
  }>(null);
  const lastNonce = useRef(-1);

  useEffect(() => {
    if (!focus || focus.nonce === lastNonce.current) return;
    lastNonce.current = focus.nonce;

    const pts = focus?.pts ?? [];
    if (pts.length === 0) return;

    // Bounding box in Three.js coords (three y = math z, three z = math y)
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    let minZ = Infinity, maxZ = -Infinity;
    pts.forEach((p: any) => {
      const x = Number(p.x), y = Number(p.z), z = Number(p.y);
      if (!isNaN(x)) { minX = Math.min(minX, x); maxX = Math.max(maxX, x); }
      if (!isNaN(y)) { minY = Math.min(minY, y); maxY = Math.max(maxY, y); }
      if (!isNaN(z)) { minZ = Math.min(minZ, z); maxZ = Math.max(maxZ, z); }
    });
    if (!isFinite(minX) || !isFinite(minY) || !isFinite(minZ)) return;

    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    const cz = (minZ + maxZ) / 2;
    // 1 điểm → bbox = 0 → dùng bán kính tối thiểu để vẫn "lấy nét" được.
    const R = Math.max(0.5 * Math.hypot(maxX - minX, maxY - minY, maxZ - minZ), 1.2);

    // Khoảng cách camera theo FOV dọc + ngang (fit theo chiều hẹp của khung nhìn),
    // tái dùng công thức của CameraFitter, chừa lề rộng hơn chút (×1.6) cho 1 điểm.
    const fov = (((camera as THREE.PerspectiveCamera).fov ?? 50) * Math.PI) / 180;
    const aspect = Math.max(0.1, size.width / Math.max(1, size.height));
    const distV = R / Math.tan(fov / 2);
    const hFov = 2 * Math.atan(Math.tan(fov / 2) * aspect);
    const distH = R / Math.tan(hFov / 2);
    const dist = Math.max(distV, distH) * 1.6;

    // Giữ HƯỚNG nhìn hiện tại (từ target cũ tới camera) để đỡ chóng mặt,
    // thay vì ép một hướng cố định.
    const ctrl = controlsRef.current;
    const fromTgt = ctrl ? ctrl.target.clone() : new THREE.Vector3(cx, cy, cz);
    const dir = camera.position.clone().sub(fromTgt);
    if (dir.lengthSq() < 1e-6) dir.set(0.55, 0.55, 0.75);
    dir.normalize();

    const toTgt = new THREE.Vector3(cx, cy, cz);
    const toPos = toTgt.clone().add(dir.multiplyScalar(dist));

    anim.current = {
      fromPos: camera.position.clone(),
      toPos,
      fromTgt,
      toTgt,
      t: 0,
    };
    // Chỉ trigger khi nonce đổi; focus.pts/camera/size được đọc từ closure của
    // render hiện tại (đã fresh vì đổi focus kèm re-render).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus?.nonce]);

  useFrame((_, delta) => {
    const a = anim.current;
    if (!a) return;
    const ctrl = controlsRef.current;

    a.t = Math.min(1, a.t + delta / 0.6); // ~0.6s
    const s = a.t * a.t * (3 - 2 * a.t);  // smoothstep

    camera.position.lerpVectors(a.fromPos, a.toPos, s);
    if (ctrl) {
      ctrl.target.lerpVectors(a.fromTgt, a.toTgt, s);
      ctrl.update();
    } else {
      camera.lookAt(a.toTgt);
    }

    if (a.t >= 1) anim.current = null; // xong: trả quyền lại cho OrbitControls
  });

  return null;
}
