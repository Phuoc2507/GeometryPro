// api/_lib/advance/runAdvance.js
// Chạy pipeline "Nâng cao" (nạp ĐỘNG builder + gọi assembleAdvance) — DÙNG CHUNG cho:
//   • định tuyến Vẽ kỹ → Nâng cao (api/analyze-geometry.js, chế độ 'detailed'),
//   • nút "Nhờ AI vẽ lại" (api/_lib/redrawProblem.js).
// (Route api/analyze-advance.js giữ bản nạp-động RIÊNG của nó — kèm deadline/credit — nên KHÔNG dùng
//  helper này; nếu thêm builder mới, nhớ đồng bộ CẢ hai danh sách.)
//
// Nạp ĐỘNG vì các builder kéo theo kernel-dist (bị gitignore, chỉ có sau `npm run build:kernel`):
// import tĩnh sẽ giết route lúc load nếu kernel chưa build. Lỗi ⇒ ném ra cho caller bọc try/catch.

export async function runAdvance(problem, opts = {}) {
  const [adv, split, adf, kb, rev, slc, area, sec, ves] = await Promise.all([
    import('../../analyze-advance.js'),
    import('./splitProblem.js'),
    import('./buildAdvanceScene.js'),
    import('../kernel-bridge/solveWithKernel.js'),
    import('./buildRevolutionScene.js'),
    import('./buildSliceScene.js'),
    import('./buildAreaScene.js'),
    import('./buildSectionScene.js'),
    import('./buildVesselScene.js'),
  ]);
  const deps = {
    splitProblem: split.splitProblem,
    buildAdvanceScene: adf.buildAdvanceScene,
    solveProblem: kb.solveProblem,
    buildRevolutionScene: rev.buildRevolutionScene,
    buildSliceScene: slc.buildSliceScene,
    buildAreaScene: area.buildAreaScene,
    buildSectionScene: sec.buildSectionScene,
    buildVesselScene: ves.buildVesselScene,
  };
  return adv.assembleAdvance(problem, deps, opts);
}
