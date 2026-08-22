// src/components/simulate/SimulationView.demo.tsx
// ─────────────────────────────────────────────────────────────────────────────
// DEMO TĨNH — ghép 1 cảnh LÝ (ném ngang) + 1 cảnh HÓA (Fe+CuSO₄) + 1 cảnh LÝ ok:false (ngoài phạm vi)
// bằng data mẫu ĐÚNG shape (sampleResults.ts), KHÔNG gọi API. Để xem/chụp nhanh.
//
// CÁCH XEM (không đụng router/App có sẵn):
//   `npm run dev:frontend` rồi tạm gắn <SimulationViewDemo/> vào 1 nơi đang render (vd trong
//   src/pages/… hoặc một route nháp), hoặc import trong một file demo cá nhân. Component THUẦN,
//   không cần Provider nào (PhysicsSceneView & ChemSceneView đều thuần).
// ─────────────────────────────────────────────────────────────────────────────
import { SimulationView } from './SimulationView';
import { samplePhysicsResult, sampleChemResult, samplePhysicsAbstain } from './sampleResults';

export function SimulationViewDemo() {
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8 p-6">
      <header>
        <h1 className="text-xl font-bold text-foreground">Mô phỏng đề Lý / Hóa — demo tĩnh</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Ba kết quả mẫu đúng shape <code>/api/analyze-problem</code>: Vật lý (ok), Hóa học (ok), và một
          trường hợp Vật lý “ngoài phạm vi” (ok:false). Bấm ▶ hoặc kéo thanh tua để xem chuyển động / hiện tượng.
        </p>
      </header>

      <div className="grid gap-8 lg:grid-cols-2">
        <section>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Vật lý · ném ngang</h2>
          <SimulationView result={samplePhysicsResult} title="Ném ngang từ độ cao 20 m" />
        </section>

        <section>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Hóa học · Fe + CuSO₄</h2>
          <SimulationView result={sampleChemResult} title="Ngâm đinh sắt trong dung dịch CuSO₄" />
        </section>

        <section>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Vật lý · ngoài phạm vi (ok:false)</h2>
          <SimulationView result={samplePhysicsAbstain} title="Đề thiếu dữ kiện" />
        </section>

        <section>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Trạng thái “cần đăng nhập” (401)</h2>
          <SimulationView result={null} error={{ message: 'Vui lòng đăng nhập để dùng tính năng giải Lý/Hóa.', kind: 'auth', status: 401 }} />
        </section>
      </div>
    </div>
  );
}

export default SimulationViewDemo;
