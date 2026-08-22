// src/components/chem/ChemSceneView.demo.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Demo tĩnh: ghép các cảnh mẫu cạnh nhau để xem nhanh (KHÔNG cần route).
// Cách xem: import <ChemSceneDemo /> vào một trang bất kỳ, hoặc tạm gắn vào App để chụp.
// Mỗi cảnh tự chạy (autoPlay + loop) nên mở lên là thấy hiện tượng "diễn".
// ─────────────────────────────────────────────────────────────────────────────
import { ChemSceneView } from './ChemSceneView';
import { SAMPLE_SCENES } from './sampleScenes';

export function ChemSceneDemo() {
  return (
    <div className="min-h-screen bg-background p-6 text-foreground">
      <div className="mx-auto max-w-6xl">
        <header className="mb-6">
          <h1 className="text-2xl font-bold">ChemScene — cảnh thí nghiệm Hóa (2D)</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Render bằng SVG + Tailwind. Mỗi cảnh có thanh tua (play/pause/scrub) để diễn chuỗi hiện tượng:
            đổ vào → đổi màu → kết tủa/sủi khí. Hỗ trợ dark mode.
          </p>
        </header>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {SAMPLE_SCENES.map(({ key, title, scene }) => (
            <ChemSceneView key={key} scene={scene} title={title} autoPlay loop stepMs={1300} />
          ))}
        </div>
      </div>
    </div>
  );
}

export default ChemSceneDemo;
