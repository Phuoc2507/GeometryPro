# Trang Cài đặt — Gói & Tuỳ chọn hiển thị (Tiểu-dự án E) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Biến `/settings` thành trang Cài đặt hợp nhất (gói/credit chỉ-đọc + tuỳ chọn hiển thị lưu bền qua localStorage), và nối sống nút "Lưới toạ độ" đang chết.

**Architecture:** Thêm một lớp preferences thuần (`src/lib/preferences.ts`) đọc/ghi một khoá localStorage `geo3d:prefs`, làm nguồn sự thật cho các toggle hiển thị. `GeometryContext` **seed** state từ prefs lúc mount và **ghi ngược** prefs qua một `useEffect` khi state đổi (không đồng bộ live vì Settings và scene 3D khác route, không mở đồng thời). Trang Settings đọc/ghi prefs qua hook `usePreferences`, và hiển thị gói/credit lấy từ `useAuth()` (chỉ đọc).

**Tech Stack:** Vite + React + TypeScript, shadcn/ui (`Card`, `Switch`, `Button`, `Label`), Vitest 4 (env `node`), localStorage.

**Worktree thực thi:** Toàn bộ mã E nằm ở `F:\geo3dnew\geo3d\.claude\worktrees\integration-engine` (branch `claude/kinematic`, == origin/main). Thực thi plan trong worktree đó, KHÔNG phải worktree `project-reading-e990ce`.

**Ràng buộc chốt:**
- Không migration DB — chỉ localStorage.
- Không đổi luồng gate/engine/route API.
- `npm run build` phải exit 0 TRƯỚC khi commit cuối/push (push origin/main = auto-deploy Vercel).
- KHÔNG commit churn `dist/` kèm commit feature.

---

## Bối cảnh mã thật (đã khảo sát — dùng để đối chiếu khi code)

- `src/pages/Settings.tsx` (187 dòng): cột trái `md:col-span-1` (avatar + badge Pro/Free + nút Đăng xuất), cột phải `md:col-span-2 space-y-6` chứa 1 Card "Thông tin cá nhân" (kết thúc `</Card>` ở **dòng 179**, ngay trước `</div>` dòng 180). `useAuth()` destructure hiện tại ở **dòng 14**.
- `src/context/AuthContext.tsx`: value provider expose `tier`, `credits`, `planCredits`, `purchasedCredits`, `isPro`, `profile`, `openUpgradeModal` (dòng 230-254). Modal nâng cấp toàn cục render ở `src/App.tsx:36` theo `isUpgradeModalOpen`; gọi `openUpgradeModal()` là đủ để mở.
- `src/lib/utils.ts:12`: `formatCredits(n: number): string`.
- `src/types/geometry.ts`: `interface GeometryState` (dòng 271-294, có `autoRotate`/`showPoints`/`autoColor`); `type GeometryAction` (dòng 296-331, có `TOGGLE_POINTS`/`TOGGLE_AUTO_COLOR`).
- `src/context/GeometryContext.tsx`: import react dòng 1 (chưa có `useEffect`); `initialState` dòng 106-129; `rawGeometryReducer` dòng 144 (case `TOGGLE_AUTO_COLOR` dòng 176-177); `const [state, dispatch] = useReducer(rawGeometryReducer, initialState)` dòng **395**; dispatchers `togglePoints`/`toggleAutoColor` dòng 1157-1163; value provider dòng 1178-1184; `interface GeometryContextType` dòng 348 (method `toggleAutoColor` dòng 379).
- `src/components/3d/GeometryCanvas.tsx`: `interface SceneProps` dòng 122-130; `function Scene(...)` dòng 132; `<CoordinateGridPlanes showXY ... />` **hard-code `showXY`** dòng 268; `const autoRotate = state?.autoRotate ?? false;` dòng 314; `<Scene ... autoRotate={autoRotate} ... />` dòng 387.
- `src/components/layout/TopToolbar.tsx`: item "Lưới tọa độ" chết ở dòng 67-70 (`onClick={() => {}}`); `context` = `useGeometryOptional()`, dùng `context.togglePoints()` (dòng 75) và `state.showPoints` (dòng 59); `Grid3X3` đã import.
- Vitest: `vitest.config.ts` env = `node`, include `src/**/*.test.ts`. Env `node` KHÔNG có `localStorage` native → preferences.ts phải đọc qua `globalThis.localStorage` và guard undefined; test tự tiêm fake storage.

---

## File Structure

| File | Trách nhiệm | Create/Modify |
|---|---|---|
| `src/lib/preferences.ts` | Schema + load/save/set một khoá localStorage `geo3d:prefs` | Create |
| `src/lib/preferences.test.ts` | Unit test thuần cho preferences (TDD) | Create |
| `src/hooks/usePreferences.ts` | Hook React bọc preferences cho phần UI | Create |
| `src/types/geometry.ts` | Thêm field `showCoordinateGrid` + action `TOGGLE_COORDINATE_GRID` | Modify |
| `src/context/GeometryContext.tsx` | Reducer case, initialState, seed-from-prefs, persist effect, dispatcher, context type, value | Modify |
| `src/components/3d/GeometryCanvas.tsx` | Truyền `showCoordinateGrid` xuống `CoordinateGridPlanes` | Modify |
| `src/components/layout/TopToolbar.tsx` | Nối sống item "Lưới tọa độ" | Modify |
| `src/pages/Settings.tsx` | Card "Gói của tôi" + Card "Hiển thị & Bản vẽ" | Modify |

---

## Task 1: Lớp Preferences + Unit test (TDD)

**Files:**
- Create: `src/lib/preferences.ts`
- Test: `src/lib/preferences.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/preferences.test.ts`:

```ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  AppPreferences,
  DEFAULT_PREFERENCES,
  loadPreferences,
  savePreferences,
  setPreference,
} from './preferences';

// Vitest env = 'node' → không có localStorage native. Tiêm một fake in-memory.
function makeFakeStorage() {
  const map = new Map<string, string>();
  return {
    getItem: (k: string) => (map.has(k) ? map.get(k)! : null),
    setItem: (k: string, v: string) => void map.set(k, v),
    removeItem: (k: string) => void map.delete(k),
    clear: () => map.clear(),
    key: (i: number) => Array.from(map.keys())[i] ?? null,
    get length() {
      return map.size;
    },
  } as Storage;
}

describe('preferences', () => {
  beforeEach(() => {
    (globalThis as any).localStorage = makeFakeStorage();
  });
  afterEach(() => {
    delete (globalThis as any).localStorage;
  });

  it('trả DEFAULT_PREFERENCES khi chưa có gì lưu', () => {
    expect(loadPreferences()).toEqual(DEFAULT_PREFERENCES);
  });

  it('round-trip: save rồi load ra đúng object', () => {
    const custom: AppPreferences = {
      ...DEFAULT_PREFERENCES,
      showCoordinateGrid: false,
      autoRotate: true,
    };
    savePreferences(custom);
    expect(loadPreferences()).toEqual(custom);
  });

  it('hợp nhất default khi thiếu key', () => {
    globalThis.localStorage.setItem('geo3d:prefs', JSON.stringify({ showPoints: false }));
    const loaded = loadPreferences();
    expect(loaded.showPoints).toBe(false);
    expect(loaded.showCoordinateGrid).toBe(DEFAULT_PREFERENCES.showCoordinateGrid);
    expect(loaded.autoRotate).toBe(DEFAULT_PREFERENCES.autoRotate);
  });

  it('fallback về default khi JSON hỏng', () => {
    globalThis.localStorage.setItem('geo3d:prefs', '{not valid json');
    expect(loadPreferences()).toEqual(DEFAULT_PREFERENCES);
  });

  it('bỏ qua giá trị sai kiểu, giữ default cho khoá đó', () => {
    globalThis.localStorage.setItem('geo3d:prefs', JSON.stringify({ showPoints: 'yes', autoRotate: true }));
    const loaded = loadPreferences();
    expect(loaded.showPoints).toBe(DEFAULT_PREFERENCES.showPoints); // 'yes' bị bỏ
    expect(loaded.autoRotate).toBe(true); // boolean hợp lệ được nhận
  });

  it('setPreference chỉ đổi một khoá và trả bản mới', () => {
    const next = setPreference('autoColorPlanes', true);
    expect(next.autoColorPlanes).toBe(true);
    expect(next.showPoints).toBe(DEFAULT_PREFERENCES.showPoints);
    expect(loadPreferences().autoColorPlanes).toBe(true);
  });

  it('không ném khi localStorage vắng mặt (SSR/node)', () => {
    delete (globalThis as any).localStorage;
    expect(() => loadPreferences()).not.toThrow();
    expect(loadPreferences()).toEqual(DEFAULT_PREFERENCES);
    expect(() => savePreferences(DEFAULT_PREFERENCES)).not.toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:
```bash
npx vitest run src/lib/preferences.test.ts
```
Expected: FAIL — không import được `./preferences` (module chưa tồn tại).

- [ ] **Step 3: Write minimal implementation**

Create `src/lib/preferences.ts`:

```ts
/**
 * Tuỳ chọn hiển thị bản vẽ, lưu bền trong localStorage (một khoá JSON).
 * Nguồn sự thật cho các toggle; GeometryContext seed state từ đây lúc mount.
 * Thuần logic — không phụ thuộc React — nên test được trong env 'node'.
 */

export interface AppPreferences {
  /** Bật/tắt mặt phẳng lưới Oxy trong scene 3D. */
  showCoordinateGrid: boolean;
  /** Hiện nhãn/chấm cho các điểm. */
  showPoints: boolean;
  /** Tự tô màu các mặt phẳng (khớp GeometryState.autoColor). */
  autoColorPlanes: boolean;
  /** Tự động xoay hình 3D. */
  autoRotate: boolean;
  /** Hiện giá trị đo ở hình minh hoạ đại diện (dành cho tiểu-dự án C). */
  showIllustrationValues: boolean;
}

export const DEFAULT_PREFERENCES: AppPreferences = {
  showCoordinateGrid: true,
  showPoints: true,
  autoColorPlanes: false,
  autoRotate: false,
  showIllustrationValues: true,
};

const STORAGE_KEY = 'geo3d:prefs';

function getStorage(): Storage | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

/** Chỉ nhận giá trị boolean cho mỗi khoá đã biết; khoá thiếu/sai kiểu → default. */
function normalize(parsed: Record<string, unknown>): AppPreferences {
  const out: AppPreferences = { ...DEFAULT_PREFERENCES };
  (Object.keys(DEFAULT_PREFERENCES) as (keyof AppPreferences)[]).forEach((k) => {
    if (typeof parsed[k] === 'boolean') {
      out[k] = parsed[k] as boolean;
    }
  });
  return out;
}

export function loadPreferences(): AppPreferences {
  const storage = getStorage();
  if (!storage) return { ...DEFAULT_PREFERENCES };
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_PREFERENCES };
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return { ...DEFAULT_PREFERENCES };
    return normalize(parsed as Record<string, unknown>);
  } catch {
    return { ...DEFAULT_PREFERENCES };
  }
}

export function savePreferences(next: AppPreferences): void {
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* localStorage đầy/không khả dụng → bỏ qua, giữ in-memory */
  }
}

export function setPreference<K extends keyof AppPreferences>(
  key: K,
  value: AppPreferences[K],
): AppPreferences {
  const next = { ...loadPreferences(), [key]: value };
  savePreferences(next);
  return next;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run:
```bash
npx vitest run src/lib/preferences.test.ts
```
Expected: PASS — 7 tests passed.

- [ ] **Step 5: Commit**

```bash
git add src/lib/preferences.ts src/lib/preferences.test.ts
git commit -m "feat(prefs): lớp preferences localStorage + unit test (Tiểu-dự án E)"
```

---

## Task 2: Hook `usePreferences`

**Files:**
- Create: `src/hooks/usePreferences.ts`

- [ ] **Step 1: Write implementation**

Create `src/hooks/usePreferences.ts`:

```ts
import { useState, useCallback } from 'react';
import { AppPreferences, loadPreferences, setPreference } from '@/lib/preferences';

/**
 * Đọc/ghi tuỳ chọn hiển thị cho phần UI (trang Settings).
 * `prefs` là snapshot lúc mount; `setPref` ghi localStorage rồi cập nhật state để render lại.
 */
export function usePreferences() {
  const [prefs, setPrefs] = useState<AppPreferences>(() => loadPreferences());

  const setPref = useCallback(
    <K extends keyof AppPreferences>(key: K, value: AppPreferences[K]) => {
      setPrefs(setPreference(key, value));
    },
    [],
  );

  return { prefs, setPref };
}
```

- [ ] **Step 2: Typecheck compiles (build gate quick check)**

Run:
```bash
npx tsc --noEmit -p tsconfig.app.json
```
Expected: không có lỗi mới liên quan `usePreferences.ts` / `preferences.ts`.
(Ghi chú: `tsc` không phải cổng build chính thức của repo; đây chỉ là kiểm nhanh. Nếu repo không có `tsconfig.app.json`, chạy `npx tsc --noEmit` với config mặc định.)

- [ ] **Step 3: Commit**

```bash
git add src/hooks/usePreferences.ts
git commit -m "feat(prefs): hook usePreferences cho trang Settings"
```

---

## Task 3: State lưới toạ độ + seed/persist trong GeometryContext

**Files:**
- Modify: `src/types/geometry.ts` (interface + action union)
- Modify: `src/context/GeometryContext.tsx` (import, initialState, reducer, seed, persist effect, dispatcher, context type, value)

- [ ] **Step 1: Thêm field vào `GeometryState`**

Trong `src/types/geometry.ts`, ở `interface GeometryState` (dòng 284 hiện là `autoRotate: boolean;`, dòng 287 là `autoColor: boolean;`), thêm ngay SAU dòng `autoColor: boolean;`:

```ts
  autoColor: boolean;
  showCoordinateGrid: boolean;
```

- [ ] **Step 2: Thêm action `TOGGLE_COORDINATE_GRID`**

Trong `src/types/geometry.ts`, ở `type GeometryAction`, ngay SAU dòng `| { type: 'TOGGLE_AUTO_COLOR' }` (dòng 302), thêm:

```ts
  | { type: 'TOGGLE_AUTO_COLOR' }
  | { type: 'TOGGLE_COORDINATE_GRID' }
```

- [ ] **Step 3: Thêm `useEffect` + import preferences vào GeometryContext**

Trong `src/context/GeometryContext.tsx`:

Dòng 1 hiện là:
```ts
import React, { createContext, useContext, useReducer, useCallback, useRef } from 'react';
```
Đổi thành (thêm `useEffect`):
```ts
import React, { createContext, useContext, useReducer, useCallback, useRef, useEffect } from 'react';
```

Ngay SAU dòng 2 (`import { GeometryState, GeometryAction, ... } from '@/types/geometry';`), thêm import:
```ts
import { loadPreferences, savePreferences } from '@/lib/preferences';
```

- [ ] **Step 4: Thêm mặc định vào `initialState`**

Trong `initialState` (dòng 122 là `autoColor: false,`), thêm ngay SAU:
```ts
  autoColor: false,
  showCoordinateGrid: true,
```

- [ ] **Step 5: Thêm case reducer**

Trong `rawGeometryReducer`, sau case `TOGGLE_AUTO_COLOR` (dòng 176-177):
```ts
    case 'TOGGLE_AUTO_COLOR':
      return { ...state, autoColor: !state.autoColor };
    case 'TOGGLE_COORDINATE_GRID':
      return { ...state, showCoordinateGrid: !state.showCoordinateGrid };
```

- [ ] **Step 6: Seed state từ prefs lúc mount**

Dòng 395 hiện là:
```ts
  const [state, dispatch] = useReducer(rawGeometryReducer, initialState);
```
Đổi thành (dùng lazy initializer đọc prefs):
```ts
  const [state, dispatch] = useReducer(
    rawGeometryReducer,
    initialState,
    (base): GeometryState => {
      const prefs = loadPreferences();
      return {
        ...base,
        showPoints: prefs.showPoints,
        autoColor: prefs.autoColorPlanes,
        autoRotate: prefs.autoRotate,
        showCoordinateGrid: prefs.showCoordinateGrid,
      };
    },
  );
```

- [ ] **Step 7: Ghi ngược prefs khi state đổi**

Ngay SAU dòng `const { addToHistory } = useGeometryHistory();` (dòng 398), thêm effect persist:
```ts
  // Ghi ngược tuỳ chọn hiển thị vào localStorage khi đổi, để lần mount sau seed lại đúng.
  // Merge `...loadPreferences()` để giữ các khoá chỉ-Settings (vd showIllustrationValues).
  useEffect(() => {
    savePreferences({
      ...loadPreferences(),
      showPoints: state.showPoints,
      autoColorPlanes: state.autoColor,
      autoRotate: state.autoRotate,
      showCoordinateGrid: state.showCoordinateGrid,
    });
  }, [state.showPoints, state.autoColor, state.autoRotate, state.showCoordinateGrid]);
```

- [ ] **Step 8: Thêm dispatcher `toggleCoordinateGrid`**

Sau `toggleAutoColor` (dòng 1161-1163):
```ts
  const toggleAutoColor = useCallback(() => {
    dispatch({ type: 'TOGGLE_AUTO_COLOR' });
  }, []);

  const toggleCoordinateGrid = useCallback(() => {
    dispatch({ type: 'TOGGLE_COORDINATE_GRID' });
  }, []);
```

- [ ] **Step 9: Khai báo method trong `GeometryContextType`**

Trong `interface GeometryContextType`, sau `toggleAutoColor: () => void;` (dòng 379):
```ts
  toggleAutoColor: () => void;
  toggleCoordinateGrid: () => void;
```

- [ ] **Step 10: Đưa dispatcher vào value provider**

Ở object value (dòng 1182), đổi `... setAutoRotate, togglePoints, toggleAutoColor,` thành thêm `toggleCoordinateGrid`:
```ts
      updatePoint, setManualMode, setManualTool, setVideoMode, toggleVideoMode, setSelectedIds, setAutoRotate, togglePoints, toggleAutoColor, toggleCoordinateGrid,
```

- [ ] **Step 11: Verify compile + preferences test vẫn xanh**

Run:
```bash
npx tsc --noEmit -p tsconfig.app.json
npx vitest run src/lib/preferences.test.ts
```
Expected: không lỗi type mới; test preferences vẫn 7 PASS.

- [ ] **Step 12: Commit**

```bash
git add src/types/geometry.ts src/context/GeometryContext.tsx
git commit -m "feat(prefs): GeometryState.showCoordinateGrid + seed/persist qua prefs"
```

---

## Task 4: Truyền `showCoordinateGrid` xuống lưới trong GeometryCanvas

**Files:**
- Modify: `src/components/3d/GeometryCanvas.tsx`

- [ ] **Step 1: Thêm prop vào `SceneProps`**

Trong `interface SceneProps` (dòng 126 là `autoRotate?: boolean;`), thêm ngay SAU:
```ts
  autoRotate?: boolean;
  showCoordinateGrid?: boolean;
```

- [ ] **Step 2: Nhận prop trong `Scene` (mặc định true)**

Dòng 132 hiện là:
```ts
function Scene({ geometry, isBuilding, autoRotate = false, is2D = false, focus = null }: SceneProps) {
```
Đổi thành:
```ts
function Scene({ geometry, isBuilding, autoRotate = false, is2D = false, focus = null, showCoordinateGrid = true }: SceneProps) {
```

- [ ] **Step 3: Nối vào `CoordinateGridPlanes`**

Dòng 268 hiện là:
```tsx
      <CoordinateGridPlanes showXY showXZ={false} showYZ={false} size={gridSize} is2D={is2D} unit={geometry?.axisUnit} />
```
Đổi `showXY` (đang hard-code true) thành binding:
```tsx
      <CoordinateGridPlanes showXY={showCoordinateGrid} showXZ={false} showYZ={false} size={gridSize} is2D={is2D} unit={geometry?.axisUnit} />
```

- [ ] **Step 4: Lấy giá trị từ state ở component cha**

Dòng 314 hiện là:
```ts
  const autoRotate = state?.autoRotate ?? false;
```
Thêm ngay SAU:
```ts
  const autoRotate = state?.autoRotate ?? false;
  const showCoordinateGrid = state?.showCoordinateGrid ?? true;
```

- [ ] **Step 5: Truyền prop khi render `Scene`**

Dòng 387 hiện là:
```tsx
          <Scene geometry={scaledGeometry} isBuilding={isBuilding} autoRotate={autoRotate} is2D={is2D} focus={cameraContext?.cameraFocus ?? focus} />
```
Đổi thành (thêm `showCoordinateGrid`):
```tsx
          <Scene geometry={scaledGeometry} isBuilding={isBuilding} autoRotate={autoRotate} showCoordinateGrid={showCoordinateGrid} is2D={is2D} focus={cameraContext?.cameraFocus ?? focus} />
```

- [ ] **Step 6: Verify compile**

Run:
```bash
npx tsc --noEmit -p tsconfig.app.json
```
Expected: không lỗi mới ở `GeometryCanvas.tsx`.

- [ ] **Step 7: Commit**

```bash
git add src/components/3d/GeometryCanvas.tsx
git commit -m "feat(prefs): GeometryCanvas nối showCoordinateGrid vào lưới Oxy"
```

---

## Task 5: Nối sống item "Lưới toạ độ" trong TopToolbar

**Files:**
- Modify: `src/components/layout/TopToolbar.tsx`

- [ ] **Step 1: Thay item chết bằng toggle thật**

Dòng 67-70 hiện là:
```tsx
            <DropdownMenuItem onClick={() => {}}>
              <Grid3X3 className="w-4 h-4 mr-2 text-muted-foreground" />
              Lưới tọa độ
            </DropdownMenuItem>
```
Đổi thành (dùng `context.toggleCoordinateGrid()` và phản ánh trạng thái như các item anh em):
```tsx
            <DropdownMenuItem onClick={() => context.toggleCoordinateGrid()}>
              <Grid3X3 className={`w-4 h-4 mr-2 ${state.showCoordinateGrid ? 'text-blue-500' : 'text-muted-foreground'}`} />
              {state.showCoordinateGrid ? 'Ẩn lưới tọa độ' : 'Hiện lưới tọa độ'}
            </DropdownMenuItem>
```
(`context` và `state` đã có sẵn trong scope — xem `context.togglePoints()` dòng 75 và `state.showPoints` dòng 59.)

- [ ] **Step 2: Verify compile**

Run:
```bash
npx tsc --noEmit -p tsconfig.app.json
```
Expected: không lỗi mới; `context.toggleCoordinateGrid` đã có kiểu từ Task 3.

- [ ] **Step 3: Commit**

```bash
git add src/components/layout/TopToolbar.tsx
git commit -m "feat(prefs): nối sống nút Lưới toạ độ trong TopToolbar"
```

---

## Task 6: Trang Settings — Card "Gói của tôi" + "Hiển thị & Bản vẽ"

**Files:**
- Modify: `src/pages/Settings.tsx`

- [ ] **Step 1: Cập nhật imports + hằng số module**

Dòng 3 hiện là:
```ts
import { ArrowLeft, User, Mail, Shield, LogOut, Save } from 'lucide-react';
```
Đổi thành (thêm 3 icon):
```ts
import { ArrowLeft, User, Mail, Shield, LogOut, Save, Crown, Sparkles, SlidersHorizontal } from 'lucide-react';
```

Sau dòng 8 (`import { Avatar, ... }`), thêm các import mới:
```ts
import { Switch } from '@/components/ui/switch';
import { usePreferences } from '@/hooks/usePreferences';
import { AppPreferences } from '@/lib/preferences';
import { formatCredits } from '@/lib/utils';
```

Ngay TRƯỚC `const Settings = () => {` (dòng 12), thêm hai hằng cấp module:
```ts
const TIER_LABELS: Record<string, string> = {
  free: 'Miễn phí',
  teacher: 'Giáo viên',
  pro: 'Chuyên nghiệp',
  school: 'Trường học',
};

const PREF_TOGGLES: { key: keyof AppPreferences; label: string; hint: string }[] = [
  { key: 'showCoordinateGrid', label: 'Lưới toạ độ', hint: 'Hiện mặt phẳng lưới Oxy trong không gian.' },
  { key: 'showPoints', label: 'Hiện điểm', hint: 'Hiện nhãn và chấm cho các điểm.' },
  { key: 'autoColorPlanes', label: 'Tô màu mặt phẳng', hint: 'Tự tô màu các mặt phẳng để dễ phân biệt.' },
  { key: 'autoRotate', label: 'Tự xoay', hint: 'Tự động xoay hình 3D.' },
  { key: 'showIllustrationValues', label: 'Hiện số ở bài minh hoạ', hint: 'Hiện giá trị đo được ở các hình minh hoạ đại diện.' },
];
```

- [ ] **Step 2: Mở rộng destructure `useAuth` + thêm hook + biến dẫn xuất**

Dòng 14 hiện là:
```ts
  const { user, profile, isPro, updateProfile, signOut, isLoading: authLoading } = useAuth();
```
Đổi thành (thêm `tier`, `credits`, `openUpgradeModal`):
```ts
  const { user, profile, isPro, tier, credits, openUpgradeModal, updateProfile, signOut, isLoading: authLoading } = useAuth();
```

Ngay SAU dòng 15 (`const { toast } = useToast();`), thêm:
```ts
  const { prefs, setPref } = usePreferences();
```

Ngay TRƯỚC `return (` chính (dòng 72), tức sau dòng 70 (`const initial = ...`), thêm biến trạng thái gói:
```ts
  const planName = TIER_LABELS[tier] ?? 'Miễn phí';
  const planStatus = (() => {
    if (!isPro) return 'Miễn phí';
    const exp = profile?.plan_expires_at ? new Date(profile.plan_expires_at) : null;
    if (!exp) return 'Đang kích hoạt';
    const days = Math.ceil((exp.getTime() - Date.now()) / 86400000);
    return days > 0 ? `Còn ${days} ngày` : 'Đã hết hạn';
  })();
```

- [ ] **Step 3: Chèn hai Card mới vào cột phải**

Trong cột phải `md:col-span-2`, SAU `</Card>` của "Thông tin cá nhân" (dòng 179) và TRƯỚC `</div>` (dòng 180), chèn:

```tsx
            <Card className="border-border/50 bg-background/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Crown className="w-5 h-5 text-amber-500" />
                  Gói của tôi
                </CardTitle>
                <CardDescription>
                  Gói hiện tại và số credit còn lại.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Gói</span>
                  <span className="font-medium">{planName}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Trạng thái</span>
                  <span className="font-medium">{planStatus}</span>
                </div>
                {tier !== 'free' && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Credit còn lại</span>
                    <span className="font-medium">{formatCredits(credits)}</span>
                  </div>
                )}
              </CardContent>
              <CardFooter className="border-t border-border/50 pt-6">
                <Button variant="outline" className="gap-2" onClick={() => openUpgradeModal()}>
                  <Sparkles className="w-4 h-4" />
                  Nâng cấp / Quản lý gói
                </Button>
              </CardFooter>
            </Card>

            <Card className="border-border/50 bg-background/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <SlidersHorizontal className="w-5 h-5 text-primary" />
                  Hiển thị & Bản vẽ
                </CardTitle>
                <CardDescription>
                  Tuỳ chọn hiển thị bản vẽ 3D. Lưu trên trình duyệt này.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {PREF_TOGGLES.map(({ key, label, hint }) => (
                  <div key={key} className="flex items-center justify-between gap-4">
                    <div className="space-y-0.5">
                      <Label htmlFor={`pref-${key}`}>{label}</Label>
                      <p className="text-xs text-muted-foreground">{hint}</p>
                    </div>
                    <Switch
                      id={`pref-${key}`}
                      checked={prefs[key]}
                      onCheckedChange={(v) => setPref(key, v)}
                    />
                  </div>
                ))}
              </CardContent>
            </Card>
```

- [ ] **Step 4: Verify compile**

Run:
```bash
npx tsc --noEmit -p tsconfig.app.json
```
Expected: không lỗi mới. (`prefs[key]` là boolean, khớp `Switch.checked`; `setPref(key, v)` khớp chữ ký generic.)

- [ ] **Step 5: Commit**

```bash
git add src/pages/Settings.tsx
git commit -m "feat(settings): Card Gói của tôi + Hiển thị & Bản vẽ (đọc/ghi prefs)"
```

---

## Task 7: Cổng build + kiểm thử thủ công + push (deploy)

**Files:** (không sửa mã — chỉ verify & release)

- [ ] **Step 1: Chạy toàn bộ test**

Run:
```bash
npm test
```
Expected: bộ test hiện có + `preferences.test.ts` đều PASS (không hồi quy).

- [ ] **Step 2: Cổng build**

Run:
```bash
npm run build
```
Expected: exit 0 (build kernel + `vite build` thành công). Nếu lỗi → sửa trước khi tiếp.

- [ ] **Step 3: Kiểm thử thủ công trên dev (:8080)**

Khởi động dev server (nếu chưa chạy) và kiểm:
1. `/settings`: hiện đủ 3 khối — avatar/account (cũ), **Gói của tôi** (tên gói + trạng thái; dòng credit chỉ hiện khi không phải Free), **Hiển thị & Bản vẽ** (5 Switch).
2. Nút **"Nâng cấp / Quản lý gói"** mở UpgradeModal toàn cục.
3. Vào Teacher mode, mở một hình 3D: menu **"Góc nhìn & Hiển thị" → "Lưới tọa độ"** bật/tắt được, lưới Oxy ẩn/hiện đúng.
4. Tắt lưới, **reload trang** → lưới vẫn tắt (đã lưu prefs). Bật lại ở Settings → sang Teacher thấy lưới bật.
5. Các toggle khác (Hiện điểm, Tô màu, Tự xoay) ở Settings đồng bộ với hành vi Teacher sau khi chuyển route.

Ghi chú kiểm thử: `tsc` KHÔNG phải cổng build của repo (dùng `npm run build`). Không có testing-library trong deps → phần UI dựa verify thủ công + build gate. Xác nhận screenshot hay timeout: dùng đọc DOM thay vì chụp ảnh.

- [ ] **Step 4: Đảm bảo KHÔNG kèm churn `dist/`**

Run:
```bash
git status --porcelain
```
Nếu có `dist/` bị thay đổi do build ở Step 2, KHÔNG stage chúng. Các commit feature ở Task 1-6 đã tách sạch; chỉ push khi cây làm việc chỉ còn thay đổi mã nguồn đã commit.

- [ ] **Step 5: Push (auto-deploy Vercel)**

Chỉ push sau khi Step 2 build xanh và Step 3 thủ công đạt:
```bash
git push origin claude/kinematic
```
(Prod deploy từ origin/main; branch `claude/kinematic` == origin/main theo cấu hình hiện tại — xác nhận nhánh đích trước khi push nếu môi trường đã đổi.)

---

## Self-Review (đã chạy khi viết plan)

**1. Spec coverage:**
- Hiển thị gói/credit + lối Nâng cấp → Task 6 (Card "Gói của tôi", `openUpgradeModal()`). ✔
- Tuỳ chọn hiển thị lưu bền → Task 1-2 (preferences + hook), Task 3 (seed/persist), Task 6 (UI Switch). ✔
- Nối sống "Lưới toạ độ" → Task 3 (state/action/dispatcher), Task 4 (canvas), Task 5 (toolbar). ✔
- Không migration DB / không đổi engine-gate → chỉ localStorage + frontend. ✔
- Schema 5 khoá đúng thiết kế (`showCoordinateGrid`, `showPoints`, `autoColorPlanes`, `autoRotate`, `showIllustrationValues`). ✔
- Suy biến lỗi (JSON hỏng, thiếu localStorage, plan_code/credit undefined) → Task 1 test + `tier !== 'free'` guard credit. ✔

**2. Placeholder scan:** Không có TBD/TODO; mọi step có code hoặc lệnh cụ thể + expected output.

**3. Type consistency:**
- `AppPreferences` khoá dùng nhất quán: `autoColorPlanes` (prefs) ↔ `autoColor` (GeometryState) — đã map tường minh ở seed (Step 6, Task 3) và persist effect (Step 7, Task 3). ✔
- `toggleCoordinateGrid` khai báo (Task 3 Step 8-10) và dùng (Task 5). ✔
- `showCoordinateGrid` thêm ở `GeometryState` (Task 3 Step 1), `initialState` (Step 4), seed (Step 6), canvas prop (Task 4). ✔
- `setPref`/`prefs` từ `usePreferences` khớp chữ ký generic `<K extends keyof AppPreferences>`. ✔

**4. Điểm lệch spec đã điều chỉnh có chủ đích (DRY, tương đương hành vi):**
- Spec nói "mỗi dispatcher toggle ghi ngược prefs"; plan dùng MỘT `useEffect` persist theo state (DRY hơn, cùng hợp đồng seed-on-mount, giữ `showIllustrationValues` qua merge). Hành vi người dùng thấy không đổi.
- Spec nói tên gói tra bảng `plans`; plan dùng map tĩnh `TIER_LABELS` theo `tier` (không async, không điểm lỗi mạng) — đúng tinh thần "map tĩnh kiểu FALLBACK_PLANS" và fallback "Miễn phí".

## Ngoài phạm vi (YAGNI — không làm trong plan này)
- Lịch sử giao dịch credit (`credit_ledger` UI).
- Đồng bộ prefs đa thiết bị qua server.
- Đồng bộ hai chiều live giữa Settings và scene 3D đang mở (khác route — seed-on-mount là đủ).
- Áp lưới cho StudentMode (nếu Student có provider/scene riêng, xử lý ở tiểu-dự án sau; E chỉ đảm bảo Teacher + Settings).
