# Advance — Camera đồng bộ (C) Implementation Plan

> REQUIRED SUB-SKILL: superpowers:subagent-driven-development.

**Goal:** Trong Advance, khi đổi **câu** (outer stepper) HOẶC đổi **bước lời giải** (inner solution step): **bay camera** tới phần tử mới → **vẽ dần** → panel lời giải cuộn tới bước đó — đồng bộ. Đúng ý user: "camera di chuyển tới đó, app vẽ điểm/đường, cùng lúc panel hiện vẽ điểm đó".

**Architecture:** `CameraFlyer` (trong Canvas `<Scene>`): đọc **focus target** (danh sách id cần lấy nét); khi focus đổi → lerp `camera.position` + `OrbitControls.target` sang pose ôm phần tử focus (dùng lại toán bbox/fit của `CameraFitter`) trong `useFrame` (~0.6s), gọi `controls.update()` mỗi frame. Một **orchestrator** (hook) tính focus từ advance `currentStep` (câu) + solution step → set target + trigger reveal.

**Tech Stack:** React/TS, R3F/three, drei OrbitControls. Verify visual do USER (camera là hoạt ảnh, screenshot WebGL treo).

**Nhánh:** `claude/kinematic` (= origin/main, đã có Advance + B). HỎI trước gộp/deploy.

**Rủi ro chính (từ đọc code):** `OrbitControls target={centroid}` (cả hình) + damping, `CameraTracker` sync từ cameraState, `CameraFitter` fit khi name đổi. CameraFlyer phải điều khiển camera+target trực tiếp trong lúc bay, KHÔNG để 3 kênh kia ghi đè; xong bay thì trả quyền (ghi cameraState).

---

## Bối cảnh (đọc trước — `src/components/3d/GeometryCanvas.tsx`)
- `CameraFitter` (dòng 16-95): bbox điểm → centroid (cx,cy,cz) + `dist` (theo FOV+aspect, ×1.2) + `dir=(0.55,0.55,0.75)`; set camera.position + lookAt + ghi cameraState. **TÁI DÙNG toán này** để tính pose focus.
- `OrbitControls` (273-290): `target={centroid}` (memo theo geometry), `enableDamping`, `onEnd=persist`. Cần **ref** tới controls để set `controls.target` + `controls.update()`.
- `CameraTracker` (97-120): sync cameraState→camera khi lệch >0.05. Trong lúc bay CameraFlyer điều khiển camera; ĐỪNG ghi cameraState giữa chừng (chỉ ghi khi bay xong) để tránh vòng lặp.
- Toạ độ: math z-up → three y-up (three x=math x, three y=math z, three z=math y).
- Advance: `state.advanceScene`, `state.currentStep` (câu); solution step ở `useSolver().currentStep` trong AdvanceSolutionPanel. `buildSolveReveal(base, solution.steps)` → `stepConstructIds` (id điểm dựng mỗi bước).

---

## Task C1: `CameraFlyer` — bay camera tới một tập điểm

**Files:** Create `src/components/3d/CameraFlyer.tsx`; Modify `GeometryCanvas.tsx` (đưa ref OrbitControls + render CameraFlyer)

- [ ] **Step 1:** Cho `OrbitControls` một `ref` (`const controlsRef = useRef<any>(null)`; `<OrbitControls ref={controlsRef} .../>`). Render `<CameraFlyer geometry={geometry} controlsRef={controlsRef} focus={cameraFocus} />` trong `<Scene>` (sau CameraFitter).
- [ ] **Step 2:** `CameraFlyer({ geometry, controlsRef, focus })`:
  - `focus`: `{ ids: string[], nonce: number } | null` — id cần lấy nét + nonce (đổi nonce = trigger bay mới).
  - Khi `focus.nonce` đổi: tính **pose đích** = bbox của các điểm ∈ `focus.ids` (toạ độ three, tái dùng công thức CameraFitter: centroid + dist theo FOV/aspect; nếu 1 điểm → dùng bán kính nhỏ mặc định + giữ hướng camera hiện tại). Lưu `fromPos/toPos`, `fromTarget/toTarget`, `t=0`.
  - `useFrame((_, dt))`: nếu đang bay, `t += dt / DURATION` (DURATION~0.6s); `camera.position.lerpVectors(fromPos, toPos, ease(t))`; `controls.target.lerpVectors(fromTarget, toTarget, ease(t))`; `controls.update()`. Khi `t>=1`: kết thúc, ghi cameraState (position+target) 1 lần để CameraTracker/persist khớp. `ease` = smoothstep.
  - KHÔNG bay nếu focus rỗng / geometry đổi name (để CameraFitter lo fit lần đầu).
- [ ] **Step 3:** tsc sạch; app chạy không lỗi console. (Verify bay mượt = USER xem.)
- [ ] **Step 4:** Commit — `feat(advance-fe): CameraFlyer - bay camera toi tap diem (lerp useFrame)`

---

## Task C2: Orchestrator — tính focus từ câu + bước lời giải, trigger

**Files:** Modify `GeometryCanvas.tsx` hoặc context; `AdvanceSolutionPanel.tsx`

- [ ] **Step 1:** Nguồn `cameraFocus` (state/context nhẹ, vd trong GeometryContext hoặc một CameraFocusContext): `{ ids, nonce }`.
- [ ] **Step 2:** Orchestrator (effect):
  - **Đổi câu** (advance `currentStep`): focus = id "mới của câu này" = `visibleIds[cur] \ visibleIds[cur-1]` (nếu rỗng → toàn `visibleIds[cur]` để fit câu). Tăng nonce.
  - **Đổi bước lời giải** (solution `currentStep` trong AdvanceSolutionPanel): focus = `stepConstructIds[solStep]` (điểm dựng bước đó); nếu rỗng → `highlight` của bước. Tăng nonce. (Ưu tiên inner khi đang xem lời giải.)
- [ ] **Step 3:** (Đồng bộ vẽ) khi bay tới điểm mới → điểm/đường mới "hiện dần": v1 tối thiểu = điểm mới đã reveal sẵn (projectScene/solveReveal), CameraFlyer chỉ lấy nét; nếu kịp, trigger scale-in cho id mới (tái dùng AnimatedPoint). Panel cuộn tới bước: `SolveResultView` đã hiển thị step hiện tại (không cần thêm).
- [ ] **Step 4:** tsc + suite xanh; bài thường KHÔNG bay (chỉ advance có focus).
- [ ] **Step 5:** Commit — `feat(advance-fe): orchestrator focus camera theo cau + buoc loi giai`

---

## Task C3: Verify + polish (USER xem prod)
- [ ] tsc + `npx vitest run` xanh; không hồi quy (bài thường, Giải bài on-demand không đổi camera).
- [ ] Deploy (HỎI) → USER xem: bay mượt? tới đúng chỗ? không giật/không kẹt OrbitControls? Ghi Findings, iterate theo phản hồi.
- [ ] Commit — `feat(advance-fe): tinh chinh camera dong bo theo phan hoi`

## Findings
*(Điền khi thực thi + phản hồi visual của user.)*
