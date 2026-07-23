# Khởi động & Môi trường — Kế hoạch triển khai

> **Cho người thực thi (agentic worker):** REQUIRED SUB-SKILL: dùng superpowers:subagent-driven-development hoặc superpowers:executing-plans để làm theo từng Task. Các bước dùng checkbox `- [ ]` để theo dõi.

**Mục tiêu:** Đưa 2 em từ "máy trắng" đến chỗ chạy được `npm test` thấy màu xanh, chạy được `npx tsx`, tạo commit đầu tiên, và hiểu vòng lặp TDD cùng cách giữ khoá API an toàn.

**Kiến trúc:** Đây là kế hoạch *cài đặt + xác minh môi trường*, không phải một hệ con phần mềm. Nó chuẩn bị nền tảng (Node, npm, vitest, tsx, git, .env) cho tất cả các kế hoạch 01–07 phía sau. Có đúng một vòng TDD nhỏ (hàm `greet()`) để 2 em làm quen nhịp đỏ → xanh → refactor ngay từ đầu.

**Công nghệ:** Node.js LTS · npm · TypeScript · vitest (chạy test) · tsx (chạy file TS trực tiếp) · git · dotenv (nạp khoá API từ `.env`).

> **Phạm vi cho vòng trường (3 tháng):** *toàn bộ* kế hoạch này. Đây là phần **LÕI** — hạ tầng nền, làm **ngay trong Tháng 1** để mọi kế hoạch 01–07 có chỗ chạy. **Để dành MỞ RỘNG (sau vòng trường):** không có hạng mục nào — kế hoạch 00 làm một lần là xong, không có phần nào để lại sau.

---

## Dành cho 2 em (đọc trước)

Chào 2 em! Đây là **kế hoạch số 00** — kế hoạch *đầu tiên* trong bộ, và là kế hoạch **cả 2 em cùng làm**. Nó nằm ở **Tuần 0–1**, tức là **trước Tháng 1 (T1)** trong lộ trình 3 tháng lõi (xem design.md §11.2). Kế hoạch này **không phụ thuộc** kế hoạch nào cả — nó là điểm xuất phát.

**Hệ con này là gì?** Nó không tạo ra tính năng nghiên cứu nào. Việc của nó là **dựng "xưởng làm việc"**: cài đủ công cụ, kiểm tra từng công cụ chạy đúng, và dạy 2 em nhịp làm việc mà cả dự án sẽ theo. Hãy hình dung như thợ mộc trước khi đóng bàn thì phải có cưa, búa, thước — và biết dùng chúng. Nếu bỏ qua bước này, mọi kế hoạch sau sẽ liên tục vấp lỗi "không tìm thấy lệnh", "test không chạy", "lỡ đẩy khoá API lên mạng".

**Vì sao cần?** Cả dự án VSGeo-Bench được viết theo lối **TDD (Test-Driven Development — phát triển hướng kiểm thử)**: *viết test trước, thấy nó fail, rồi mới viết code cho nó pass*. Để làm được vậy, máy của 2 em phải chạy được bộ test. Kế hoạch này bảo đảm điều đó, và cho 2 em thực hành một vòng TDD hoàn chỉnh trên một hàm siêu đơn giản.

**Sản phẩm cuối trông thế nào?** Sau khi làm xong, trên máy mỗi em sẽ có:
- Gõ `node -v` và `npm -v` → hiện ra số phiên bản (chứng tỏ Node đã cài).
- Gõ `npm test` ở gốc repo → thấy một danh sách test **màu xanh** (pass).
- Gõ `npx tsx research/vsgeo-bench/scripts/hello.ts` → in ra một dòng chữ.
- Một file `research/vsgeo-bench/.env.example` liệt kê tên các khoá API (không có giá trị thật).
- `.gitignore` chắc chắn đã bỏ qua file `.env` (khoá thật không bao giờ lên git).
- Ít nhất **một commit** do chính tay em tạo, với lời nhắn (commit message) đúng quy ước.
- Trong đầu em: hiểu **đỏ → xanh → refactor** là gì và vì sao dự án theo nó.

**Ai phụ trách?** Cả 2 em cùng làm, mỗi em làm trên máy của mình từ đầu đến cuối (đừng chia đôi — cả hai đều cần môi trường chạy được). Có thể ngồi cạnh nhau, một em đọc kế hoạch, một em gõ, rồi đổi vai.

**Một lời dặn nhỏ trước khi bắt đầu:** đừng sợ khi thấy chữ đỏ báo lỗi. Trong TDD, **màu đỏ là bạn** — nó cho em biết chính xác cái gì chưa xong. Cả kế hoạch này được chia thành từng bước 2–5 phút, mỗi bước có **lệnh cụ thể** và **kết quả mong đợi** để em tự biết mình đã đúng chưa. Cứ đi từ từ.

---

## Task 0: Cài Node.js LTS + npm

**Files:** (không tạo/sửa file nào — đây là bước cài phần mềm hệ thống)

Node.js là chương trình cho phép chạy JavaScript/TypeScript ngoài trình duyệt; nó đi kèm **npm** (Node Package Manager — công cụ tải và quản lý các "gói" thư viện). Cả dự án cần Node để chạy vitest, tsx, và mọi script.

- [ ] **Bước 1: Tải Node.js phiên bản LTS**

Vào trang <https://nodejs.org> và tải bản **LTS** (Long-Term Support — bản ổn định lâu dài). Dự án này cần **Node 18 trở lên**; khuyến nghị **Node 20 LTS hoặc mới hơn** (vì `vitest 4` và `tsx` chạy mượt nhất trên Node 20+). Cài như cài một phần mềm bình thường (Next → Next → Finish), giữ nguyên tùy chọn mặc định (đặc biệt để yên ô "Add to PATH").

- [ ] **Bước 2: Mở terminal**

*Terminal* (còn gọi là "dòng lệnh") là cửa sổ để gõ lệnh ra máy tính. Trên Windows, mở **PowerShell** (bấm phím Windows, gõ "PowerShell", Enter). Trên Mac, mở **Terminal**.

- [ ] **Bước 3: Kiểm tra Node đã cài đúng**

Gõ lần lượt:

```bash
node -v
npm -v
```

Kết quả mong đợi: hai dòng số phiên bản, ví dụ:

```
v20.11.1
10.2.4
```

Miễn là số sau chữ `v` **≥ 18** (lý tưởng ≥ 20) là đạt. Nếu máy báo `node: command not found` (hoặc `'node' is not recognized`), nghĩa là Node chưa vào PATH — hãy **đóng hẳn terminal, mở lại**, rồi thử lại; nếu vẫn lỗi thì cài lại Node và nhớ tick "Add to PATH".

> Không có gì để commit ở Task này — đây chỉ là cài công cụ. Xong bước 3 là qua Task 1.

---

## Task 1: Lấy mã nguồn & mở đúng thư mục làm việc

**Files:** (không tạo file — chỉ định vị thư mục)

Trước khi gõ code, cần hiểu ba từ hay gặp:

| Từ | Nghĩa dễ hiểu |
|----|---------------|
| **repo** (repository) | "Kho chứa mã nguồn" của cả dự án, được git quản lý. Nó là một thư mục lớn có lịch sử thay đổi. |
| **branch** (nhánh) | Một "dòng công việc" song song trong repo. Em làm việc trên một nhánh để không đụng vào nhánh chính (`main`). |
| **worktree** | Một *bản sao thư mục* của repo gắn với một nhánh cụ thể, cho phép làm việc trên nhánh đó ở một thư mục riêng mà không ảnh hưởng thư mục chính. Dự án này đang dùng một worktree sẵn. |

- [ ] **Bước 1: Mở thư mục repo trong terminal**

Repo của dự án nằm ở thư mục gốc chứa file `package.json` (file khai báo dự án). Trong môi trường này, thư mục làm việc là gốc repo. Dùng lệnh `cd` (change directory — đổi thư mục) nếu cần. Để chắc mình đang đứng đúng chỗ, gõ:

```bash
ls package.json
```

Kết quả mong đợi: in ra `package.json` (chứng tỏ đang ở gốc repo). Nếu báo "No such file", em đang sai thư mục — `cd` tới thư mục gốc repo rồi thử lại.

- [ ] **Bước 2: Xác nhận thư mục dự án NCKH tồn tại**

Gõ:

```bash
ls research/vsgeo-bench
```

Kết quả mong đợi: thấy các thư mục con `README.md  docs  data  grader  harness  perturbations  analysis  survey  dashboard`. Đây là "nhà" của cả đề tài (xem Bản đồ thư mục ở cuối kế hoạch). Nếu thiếu, báo lại anh/chị mentor — có thể em đang ở nhầm nhánh.

- [ ] **Bước 3: Xem mình đang ở nhánh nào**

Gõ:

```bash
git status
```

Kết quả mong đợi: dòng đầu ghi `On branch <tên-nhánh>`. Ghi nhớ tên nhánh này. (Ở Task 6 em sẽ học tạo nhánh riêng và commit.)

> Chưa commit gì ở Task này.

---

## Task 2: Cài phụ thuộc & chạy bộ test hiện có

**Files:** (không tạo file — chạy lệnh cài & test)

*Phụ thuộc* (dependencies) là các thư viện bên ngoài mà dự án cần. Chúng được liệt kê trong `package.json` và được npm tải về thư mục `node_modules/`. **vitest** là "người chạy test" (test runner) của dự án — nó tìm mọi file `*.test.ts`, chạy chúng, rồi báo cái nào pass (xanh) cái nào fail (đỏ).

- [ ] **Bước 1: Cài toàn bộ phụ thuộc**

Ở gốc repo, gõ:

```bash
npm install
```

Kết quả mong đợi: chạy một lúc (có thể vài phút lần đầu), cuối cùng in ra dòng kiểu `added 700 packages ...` và **không có chữ `ERR!` màu đỏ**. Lệnh này tạo (hoặc cập nhật) thư mục `node_modules/`. Cảnh báo (`warn`) màu vàng thì **không sao**, chỉ lỗi (`ERR!`) mới cần lo.

- [ ] **Bước 2: Chạy toàn bộ bộ test của repo**

Gõ:

```bash
npm test
```

Lệnh này chạy `vitest run` (chạy tất cả test **một lần rồi thoát**). Kết quả mong đợi: rất nhiều dòng, kết thúc bằng một bản tóm tắt kiểu:

```
 Test Files  60 passed (60)
      Tests  400 passed (400)
```

Con số chính xác không quan trọng; điều quan trọng là chữ **`passed`** và **không có `failed`**. Nếu thấy toàn xanh — chúc mừng, máy em chạy được bộ test của cả dự án!

> **Cách đọc kết quả test:** vitest liệt kê từng file. Dấu `✓` (hoặc chữ xanh `PASS`) = test đó **đúng**. Dấu `×` / `✗` (chữ đỏ `FAIL`) = test đó **sai**, và ngay bên dưới nó in ra "mong đợi (expected) X nhưng nhận được (received) Y" để em biết lệch ở đâu. Số cuối cùng `N passed` là tổng số test đã pass.

- [ ] **Bước 3: (Tùy chọn) Thử chế độ theo dõi rồi thoát**

Gõ:

```bash
npm run test:watch
```

Lệnh này chạy `vitest` ở **chế độ watch** — nó *đứng chờ*, và mỗi khi em sửa file thì tự chạy lại test liên quan. Đây là chế độ em sẽ dùng nhiều khi code. Để **thoát**, bấm `q` (hoặc `Ctrl + C`). Nhớ thoát trước khi làm tiếp Task 3.

> Chưa commit gì ở Task này — mới chỉ cài và chạy test.

---

## Task 3: Thêm tsx & làm một vòng TDD hoàn chỉnh với `greet()`

**Files:**
- Modify: `package.json` (thêm `tsx` vào `devDependencies` — npm tự làm khi chạy `npm i -D tsx`)
- Create: `research/vsgeo-bench/scripts/hello.ts`
- Test: `research/vsgeo-bench/scripts/__tests__/hello.test.ts`

Đây là Task quan trọng nhất về *học nghề*: em sẽ thêm công cụ `tsx` (để chạy một file TypeScript trực tiếp, không cần biên dịch trước), rồi thực hành **một vòng TDD đầy đủ** trên một hàm bé xíu tên `greet()`. Hãy làm đúng thứ tự các bước — đó chính là nhịp mà mọi kế hoạch sau lặp lại.

> **devDependency là gì?** Là phụ thuộc *chỉ dùng khi phát triển* (viết/chạy test, chạy script), **không** đi kèm vào sản phẩm chạy thật cho người dùng. `tsx` và `vitest` đều là devDependency. Cài devDependency bằng cờ `-D`.

- [ ] **Bước 1: Cài tsx như một devDependency**

Ở gốc repo, gõ:

```bash
npm i -D tsx
```

Kết quả mong đợi: `added 1 package ...` không lỗi đỏ. Mở `package.json`, trong mục `"devDependencies"` giờ có một dòng kiểu `"tsx": "^4.x.x"`. Đây là thay đổi file đầu tiên của em — lát nữa sẽ commit.

- [ ] **Bước 2: Viết test THẤT BẠI trước (đây là "màu đỏ" của TDD)**

Tạo file `research/vsgeo-bench/scripts/__tests__/hello.test.ts` với nội dung đầy đủ sau. Test được viết **mô tả bằng tiếng Việt** cho giống phần còn lại của codebase.

```ts
// research/vsgeo-bench/scripts/__tests__/hello.test.ts
import { describe, it, expect } from "vitest";
import { greet } from "../hello";

describe("greet", () => {
  it("chào một cái tên bình thường", () => {
    expect(greet("Minh")).toBe("Xin chào, Minh!");
  });

  it("khi tên rỗng thì chào cả nhóm VSGeo-Bench", () => {
    expect(greet("")).toBe("Xin chào, nhóm VSGeo-Bench!");
  });

  it("cắt khoảng trắng thừa ở hai đầu tên", () => {
    expect(greet("  Lan  ")).toBe("Xin chào, Lan!");
  });
});
```

Giải thích nhanh cú pháp vitest:
- `import { describe, it, expect } from "vitest"` — kéo ba công cụ test vào.
- `describe("greet", ...)` — nhóm các test cho hàm `greet`.
- `it("...", () => {...})` — một trường hợp test; chuỗi đầu là *mô tả* (nên viết rõ nghĩa).
- `expect(A).toBe(B)` — khẳng định "A phải bằng đúng B"; nếu không, test fail và in ra chỗ lệch.

- [ ] **Bước 3: Chạy test để THẤY nó fail**

Gõ:

```bash
npm test -- research/vsgeo-bench/scripts/__tests__/hello.test.ts
```

> Dấu `--` báo cho npm biết "phần sau là truyền thẳng cho vitest". Ở đây ta truyền đường dẫn file để **chỉ chạy đúng file test này** cho nhanh.

Kết quả mong đợi: **FAIL**, với thông báo kiểu `Failed to resolve import "../hello"` hoặc `does not provide an export named 'greet'` — vì file `hello.ts` **chưa tồn tại**. **Đây là điều tốt và đúng ý muốn.** Màu đỏ này xác nhận: test thật sự đang kiểm tra một thứ chưa có. Nếu test lại pass ngay bây giờ thì mới đáng lo (nghĩa là test không kiểm gì cả).

- [ ] **Bước 4: Viết code TỐI THIỂU để test pass (đây là "màu xanh")**

Tạo file `research/vsgeo-bench/scripts/hello.ts` với nội dung đầy đủ:

```ts
// research/vsgeo-bench/scripts/hello.ts
// Hàm thuần (pure function): cùng đầu vào luôn cho cùng đầu ra, không đụng gì bên ngoài.
// Tách riêng greet() ra khỏi phần in màn hình để có thể VIẾT TEST cho nó.
export function greet(name: string): string {
  const clean = name.trim(); // bỏ khoảng trắng thừa hai đầu
  if (clean === "") {
    return "Xin chào, nhóm VSGeo-Bench!";
  }
  return `Xin chào, ${clean}!`;
}

// Khi chạy file này trực tiếp bằng `npx tsx hello.ts`, dòng dưới sẽ in ra màn hình.
// (Phần import ở test KHÔNG chạy dòng này vì test chỉ import hàm greet, không "chạy" file
//  như một chương trình — nhưng để chắc chắn, có thể để nguyên; console.log vô hại với test.)
console.log(greet("thế giới"));
```

Chú ý thiết kế: ta **tách** phần tính toán (`greet`) khỏi phần in ra (`console.log`). Nhờ vậy test kiểm được *kết quả trả về* của `greet` mà không phải bắt chuỗi in ra màn hình. Đây là một thói quen tốt: **logic tách khỏi input/output**.

- [ ] **Bước 5: Chạy lại test để THẤY nó pass**

Gõ:

```bash
npm test -- research/vsgeo-bench/scripts/__tests__/hello.test.ts
```

Kết quả mong đợi: **PASS**, tóm tắt kiểu:

```
 ✓ research/vsgeo-bench/scripts/__tests__/hello.test.ts (3 tests)
   Test Files  1 passed (1)
        Tests  3 passed (3)
```

Ba test xanh. Em vừa hoàn thành một vòng **đỏ → xanh** đầu tiên!

- [ ] **Bước 6: Xác minh chạy TypeScript trực tiếp bằng tsx**

Gõ:

```bash
npx tsx research/vsgeo-bench/scripts/hello.ts
```

> `npx` = "chạy một công cụ npm đã cài mà không cần cài toàn cục". `tsx` = công cụ chạy thẳng file `.ts` (nó vừa dịch TypeScript vừa chạy trong một bước).

Kết quả mong đợi: in ra đúng một dòng:

```
Xin chào, thế giới!
```

Nếu thấy dòng này, nghĩa là em đã chạy được TypeScript trực tiếp — kỹ năng cần cho mọi script CLI (như harness gọi model ở kế hoạch sau).

- [ ] **Bước 7 (refactor — bước thứ ba của TDD, tùy chọn nhưng nên thử):**

"Refactor" = *sửa lại code cho gọn/đẹp hơn mà **không đổi hành vi***, và test vẫn phải xanh để chứng minh mình không làm hỏng gì. Thử một refactor nhỏ: đổi tên biến `clean` thành `ten` trong `hello.ts`, lưu lại, rồi chạy lại lệnh ở Bước 5. Test vẫn phải **PASS**. Đó là sức mạnh của TDD: có test rồi thì refactor rất an tâm. (Nếu không muốn đổi, cứ để nguyên.)

- [ ] **Bước 8: Commit thành quả**

```bash
git add package.json package-lock.json research/vsgeo-bench/scripts/hello.ts research/vsgeo-bench/scripts/__tests__/hello.test.ts
git commit -m "chore(setup): thêm tsx + hàm greet với test (vòng TDD đầu tiên)"
```

> `chore(setup): ...` là một *conventional commit message* — quy ước đặt lời nhắn: `loại(phạm vi): mô tả ngắn`. Các loại hay dùng: `feat` (tính năng mới), `fix` (sửa lỗi), `chore` (việc lặt vặt/cấu hình), `test` (thêm test), `docs` (tài liệu). Viết mô tả ngắn gọn, ở thì hiện tại.

Kết quả mong đợi: git in ra dòng kiểu `[<nhánh> abc1234] chore(setup): ...` cùng `4 files changed`. Em vừa tạo commit thực sự đầu tiên của dự án!

---

## Task 3.5: Mở đường cho vitest thấy test của dự án NCKH

**Files:**
- Modify: `vitest.config.ts` (ở **gốc repo**, cạnh `package.json` — *không* phải file nào trong `research/`)

Ở Task 3 em chạy được test `greet` bằng cách **chỉ đích danh đường dẫn file** (`npm test -- .../hello.test.ts`). Nhưng khi gõ `npm test` **trơn** (không kèm đường dẫn), vitest chỉ quét những thư mục ghi trong mảng `test.include` của `vitest.config.ts`. Hiện danh sách đó **chưa** có thư mục `research/vsgeo-bench/`, nên `npm test` trơn sẽ **bỏ sót** test của đề tài. Task này mở đường để từ kế hoạch 01 trở đi, chỉ cần gõ `npm test` là thấy mọi test NCKH.

> **Vì sao việc này nằm ở đây?** Bước mở đường này vốn thuộc kế hoạch 02, nhưng được **chuyển lên** kế hoạch 00 (và kế hoạch 02 sẽ **bỏ** nó đi). Lý do: ngay từ kế hoạch 01, 2 em đã cần `npm test` trơn nhìn thấy test của đề tài, nên phải thông đường sớm ngay trong bước khởi động môi trường.

- [ ] **Bước 1: Đọc file `vitest.config.ts` ở gốc repo**

Mở file `vitest.config.ts` (nằm ở **gốc repo**, cùng chỗ với `package.json`). Tìm mảng `test.include` — đây là danh sách các *mẫu đường dẫn* (glob) mà vitest dùng để đi tìm file test. Hiện tại nó trông giống:

```ts
include: ['api/_lib/kernel/**/*.test.ts', 'api/_lib/__tests__/**/*.test.js', 'api/_lib/advance/__tests__/**/*.test.js', 'src/**/*.test.ts', 'src/**/*.test.tsx'],
```

> **glob là gì?** Là mẫu đường dẫn có ký tự đại diện: `**` khớp "mọi thư mục con ở mọi độ sâu", `*` khớp "một đoạn tên bất kỳ". Ví dụ `research/vsgeo-bench/**/*.test.ts` nghĩa là "mọi file kết thúc bằng `.test.ts`, nằm bất kỳ đâu bên dưới `research/vsgeo-bench/`".

- [ ] **Bước 2: Thấy "màu đỏ" — `npm test` trơn đang BỎ SÓT test `greet`**

Ở gốc repo, gõ:

```bash
npm test
```

Kết quả mong đợi (khi **chưa** sửa config): bản tóm tắt **không** liệt kê file `research/vsgeo-bench/scripts/__tests__/hello.test.ts`, và **không** có 3 test `greet` trong tổng số. Đây chính là vấn đề cần sửa: `npm test` trơn chưa "nhìn thấy" thư mục đề tài. (Nếu bản tóm tắt *đã* có sẵn 3 test `greet` rồi, nghĩa là ai đó đã thêm glob từ trước — cứ sang Bước 3 kiểm tra cho chắc.)

- [ ] **Bước 3: Thêm 2 glob của `research/vsgeo-bench/` vào `test.include`**

Sửa mảng `test.include` trong `vitest.config.ts` để **có đủ cả 2** mẫu sau (thiếu mẫu nào thì thêm mẫu đó):

- `'research/vsgeo-bench/**/*.test.ts'`  ← bắt các file test đuôi `.test.ts`
- `'research/vsgeo-bench/**/*.test.tsx'` ← bắt các file test đuôi `.test.tsx` (kế hoạch 07 dashboard sẽ cần)

Sau khi thêm, mảng trông giống:

```ts
include: [
  'api/_lib/kernel/**/*.test.ts',
  'api/_lib/__tests__/**/*.test.js',
  'api/_lib/advance/__tests__/**/*.test.js',
  'src/**/*.test.ts',
  'src/**/*.test.tsx',
  'research/vsgeo-bench/**/*.test.ts',
  'research/vsgeo-bench/**/*.test.tsx',
],
```

> Giữ **nguyên** các glob cũ (`api/...`, `src/...`) — chỉ **thêm** 2 dòng của `research/`, đừng xoá dòng nào. Nếu 2 glob này đã có sẵn thì không cần sửa gì, chuyển thẳng sang Bước 4.

- [ ] **Bước 4: Thấy "màu xanh" — `npm test` trơn giờ đã thấy test `greet`**

Ở gốc repo, gõ lại:

```bash
npm test
```

Kết quả mong đợi: bản tóm tắt **có** liệt kê `research/vsgeo-bench/scripts/__tests__/hello.test.ts` với 3 test `greet` **passed**, chung với bộ test cũ của repo — và tất cả vẫn xanh. Vậy là `npm test` trơn đã "nhìn thấy" thư mục đề tài.

- [ ] **Bước 5: Commit riêng bước mở đường này**

```bash
git add vitest.config.ts
git commit -m "chore(setup): cho vitest quét test research/vsgeo-bench (npm test trơn)"
```

Kết quả mong đợi: git báo commit thành công với 1 file thay đổi. Đây là một commit **riêng** cho việc mở đường — từ kế hoạch 01 trở đi, chỉ cần gõ `npm test` là chạy luôn cả test của đề tài.

---

## Task 4: Khoá API an toàn — `.env.example` và bảo vệ `.env`

**Files:**
- Create: `research/vsgeo-bench/.env.example`
- Modify: `.gitignore` (chỉ khi kiểm tra thấy thiếu — xem Bước 1)

Ở các kế hoạch sau, harness sẽ gọi các model AI (GPT, Gemini, Claude…) qua internet. Mỗi nhà cung cấp yêu cầu một **API key** — một chuỗi bí mật giống mật khẩu, chứng minh "tôi được phép gọi và tính tiền vào tài khoản này". **Tuyệt đối không bao giờ** ghi khoá thật vào code hay đẩy lên git, vì:
- Repo có thể công khai (đề tài này sẽ mở mã nguồn) → ai cũng đọc được khoá.
- Người khác lấy khoá gọi model → **em bị tính tiền** và có thể bị nhà cung cấp khoá tài khoản.
- Khoá lỡ lên lịch sử git thì **rất khó xoá sạch** (nó nằm trong mọi commit cũ).

Cách an toàn chuẩn: khoá thật để trong một file tên **`.env`** (file này bị git bỏ qua, chỉ nằm trên máy em); còn trong repo chỉ có một file **mẫu** `.env.example` liệt kê *tên* các biến mà **không có giá trị**. `.env` được nạp vào chương trình qua thư viện **dotenv** (đã có sẵn trong `package.json`).

> **Biến môi trường (environment variable) là gì?** Là một cặp `TÊN=giá_trị` mà chương trình đọc được lúc chạy, nằm *ngoài* mã nguồn. Khoá API được truyền kiểu này để không phải viết cứng vào code.

- [ ] **Bước 1: Kiểm tra `.gitignore` đã bỏ qua `.env` chưa**

File `.gitignore` (ở gốc repo) liệt kê những gì git **không** theo dõi. Mở nó ra xem có dòng ứng với `.env` không. Repo này **đã có sẵn** dòng:

```
# env files (can opt-in for committing if needed)
.env*
```

Mẫu `.env*` khớp mọi file bắt đầu bằng `.env` (gồm `.env`, `.env.local`…). **Vấn đề:** nó cũng khớp luôn `.env.example` — mà file mẫu này ta LẠI MUỐN commit (để 2 em biết cần những khoá nào). Vì vậy, thêm một dòng *ngoại lệ* để cho phép `.env.example`. Sửa `.gitignore`, đổi khối trên thành:

```
# env files (can opt-in for committing if needed)
.env*
!.env.example
```

Dấu `!` nghĩa là "đừng bỏ qua file này" (ngoại lệ). Kết quả: mọi `.env` thật vẫn bị bỏ qua, riêng `.env.example` được phép commit.

> Nếu `.gitignore` của em *không* có dòng `.env*` thì tự thêm cả hai dòng trên vào cuối file.

- [ ] **Bước 2: Xác minh git thật sự bỏ qua `.env`**

Tạo thử một file `.env` giả ở thư mục dự án rồi hỏi git có thấy không:

```bash
echo "TEST_KEY=dummy" > research/vsgeo-bench/.env
git status --short research/vsgeo-bench/.env
```

Kết quả mong đợi: lệnh `git status` **không in ra gì cả** (git đang bỏ qua file `.env`). Nếu nó in ra dòng `?? research/vsgeo-bench/.env` màu đỏ, nghĩa là `.gitignore` chưa chặn được — quay lại Bước 1 kiểm tra dòng `.env*`. Sau khi xác minh xong, **xoá file thử** đi:

```bash
rm research/vsgeo-bench/.env
```

- [ ] **Bước 3: Tạo file mẫu `.env.example`**

Tạo file `research/vsgeo-bench/.env.example` với nội dung đầy đủ sau. **Chỉ có TÊN biến, không có khoá thật** — mỗi em tự lấy khoá từ nhà cung cấp và điền vào file `.env` riêng (không phải file này).

```bash
# research/vsgeo-bench/.env.example
# ------------------------------------------------------------------
# FILE MẪU — KHÔNG chứa khoá thật, AN TOÀN để commit lên git.
# Cách dùng: mỗi em COPY file này thành ".env" (cùng thư mục), rồi
# điền khoá thật vào bên phải dấu "=". File ".env" đã bị .gitignore
# bỏ qua nên sẽ KHÔNG bao giờ lên git.  TUYỆT ĐỐI không dán khoá thật
# vào file .env.example này.
#
#   Lệnh copy:  (Windows PowerShell)  Copy-Item .env.example .env
#               (Mac/Linux)           cp .env.example .env
# ------------------------------------------------------------------

# --- Khoá của các nhà cung cấp model (lấy từ trang của họ, dán vào .env) ---
OPENAI_API_KEY=
GEMINI_API_KEY=
ANTHROPIC_API_KEY=
OPENROUTER_API_KEY=

# --- Tuỳ chọn: nếu dùng gateway nội bộ của dự án (xem api/_lib/vilao.js) ---
# VILAO_API_KEY=
# VILAO_BASE_URL=
```

> Bốn khoá trên phủ các nhà cung cấp mà dàn model §6.1 nhắm tới (GPT của OpenAI, Gemini của Google, Claude của Anthropic, và OpenRouter cho các model mở như Qwen/Llama). Kế hoạch 05 (harness) sẽ dùng dotenv để đọc đúng các tên biến này — nên **giữ nguyên tên**, đừng đổi.

- [ ] **Bước 4: Xác minh chỉ `.env.example` được git thấy (còn `.env` thì không)**

```bash
git status --short research/vsgeo-bench/
```

Kết quả mong đợi: có dòng `?? research/vsgeo-bench/.env.example` (git thấy file mẫu — tốt), và **không** có dòng nào cho `.env` thật. Đúng như ý muốn: mẫu thì công khai, khoá thật thì ẩn.

- [ ] **Bước 5: Commit file mẫu và (nếu có sửa) `.gitignore`**

```bash
git add research/vsgeo-bench/.env.example .gitignore
git commit -m "chore(setup): thêm .env.example + chốt .gitignore bỏ qua .env thật"
```

Kết quả mong đợi: git báo commit thành công với 1–2 file thay đổi. Từ giờ, quy tắc vàng: **khoá thật chỉ sống trong `.env` trên máy em, không đi đâu khác.**

---

## Task 5: Hiểu vòng lặp TDD (đỏ → xanh → refactor)

**Files:** (không code — đây là bước *hiểu*, để làm nền cho mọi kế hoạch sau)

Ở Task 3 em đã *làm* một vòng TDD. Task này chốt lại *vì sao* làm vậy, để em tự tin lặp lại ở kế hoạch 01–07.

- [ ] **Bước 1: Nắm ba nhịp của TDD**

Hình dung như đèn giao thông chạy vòng:

1. **ĐỎ (Red):** Viết một test cho hành vi *chưa có*. Chạy → **fail**. Màu đỏ này chứng minh test thật sự đang đòi hỏi một thứ chưa tồn tại (chứ không phải test rỗng luôn pass).
2. **XANH (Green):** Viết *lượng code ít nhất* đủ để test chuyển sang pass. Chưa cần đẹp, chỉ cần đúng.
3. **REFACTOR (Dọn dẹp):** Giờ có "lưới an toàn" là test xanh, sửa lại code cho gọn/rõ. Chạy test sau mỗi lần sửa — vẫn phải xanh. Nếu lỡ làm hỏng, test đỏ báo ngay.

Rồi quay lại bước ĐỎ cho hành vi tiếp theo. Cứ thế, dự án lớn dần bằng những vòng nhỏ chắc chắn.

- [ ] **Bước 2: Hiểu vì sao VSGeo-Bench chọn TDD**

Ghi nhớ 3 lý do (em sẽ cần giải thích chúng khi bảo vệ đề tài):
- **Máy chấm phải chính xác.** Oracle (máy chấm) và grader là *trái tim khoa học* của đề tài (design.md §4). Nếu chúng chấm sai thì **mọi** con số kết quả đều sai. Viết test trước buộc ta định nghĩa rõ "đúng" nghĩa là gì *trước khi* code, và giữ cho nó không hỏng về sau.
- **Tái lập được (reproducible).** ViSEF đề cao tính tái lập. Một bộ test xanh là bằng chứng khách quan "code làm đúng như mô tả", ai chạy lại cũng thấy.
- **An toàn khi sửa.** Đề tài kéo dài nhiều tháng (3 tháng lõi rồi mở rộng), code sẽ được sửa nhiều lần. Test giúp sửa mà không vô tình làm hỏng phần đã chạy.

- [ ] **Bước 3: Tự kiểm tra hiểu bài**

Tự trả lời (không cần viết ra, chỉ cần chắc trong đầu): *"Nếu tôi viết một test mới mà nó pass ngay lần đầu, chưa cần viết code gì, thì điều đó cảnh báo gì?"* → Đáp: có thể test **không kiểm gì thật** (hoặc hành vi đã có sẵn); cần xem lại test có đang khẳng định đúng thứ mình muốn không. Đây chính là lý do bước **ĐỎ** bắt buộc phải có.

> Không có gì để commit ở Task này — đây là kiến thức nền.

---

## Task 6: Git cơ bản — nhánh, add, commit

**Files:** (thao tác git; không tạo file mới)

Ở Task 3 và 4 em đã commit rồi. Task này gom lại các thao tác git nền để em dùng suốt dự án, và tập tạo **nhánh riêng** cho gọn gàng.

| Lệnh | Làm gì |
|------|--------|
| `git status` | Xem file nào đã đổi / đã "add" / chưa. |
| `git checkout -b <tên-nhánh>` | Tạo một *nhánh mới* và chuyển sang đó. |
| `git add <file...>` | Đưa các file thay đổi vào "vùng chờ commit" (staging). |
| `git commit -m "..."` | Đóng gói vùng chờ thành một *commit* kèm lời nhắn. |
| `git log --oneline -5` | Xem 5 commit gần nhất, mỗi cái một dòng. |

- [ ] **Bước 1: (Tuỳ chọn nhưng nên) Tạo một nhánh làm việc riêng**

Để không commit thẳng lên nhánh chính, tạo nhánh riêng cho phần khởi động:

```bash
git checkout -b setup/moi-truong
```

Kết quả mong đợi: `Switched to a new branch 'setup/moi-truong'`. (Nếu anh/chị mentor đã dặn dùng sẵn một nhánh khác, cứ theo dặn dò đó — bỏ qua bước này.)

- [ ] **Bước 2: Xem trạng thái và lịch sử**

```bash
git status
git log --oneline -5
```

Kết quả mong đợi: `git status` báo "nothing to commit, working tree clean" (nếu em đã commit hết ở Task 3–4), và `git log` hiện các commit em vừa tạo (dòng `chore(setup): ...`).

- [ ] **Bước 3: Nhớ quy tắc "commit thường xuyên"**

Nguyên tắc: **mỗi lần một việc nhỏ chạy được thì commit ngay**, đừng dồn một commit khổng lồ. Commit nhỏ giúp: dễ đọc lịch sử, dễ quay lui nếu sai, dễ để người khác review. Lời nhắn theo quy ước `loại(phạm vi): mô tả` (xem lại Task 3 Bước 8).

> **Về việc "push" (đẩy lên máy chủ):** kế hoạch này **cố ý không** hướng dẫn tự động push. Khi nào đẩy lên remote, đẩy nhánh nào, là việc 2 em bàn với anh/chị mentor. Ở bước khởi động, chỉ cần commit ở máy (local) là đủ.

> Không có commit bắt buộc mới ở Task này (nếu working tree đã sạch). Nếu em có sửa gì lẻ, cứ `git add` + `git commit` theo bảng trên.

---

## Task 7: Đọc bản đồ thư mục & biết các kế hoạch 01–07 sẽ làm gì

**Files:** (không code — định hướng để em thấy bức tranh toàn cảnh)

- [ ] **Bước 1: Ghi nhớ bản đồ thư mục `research/vsgeo-bench/`**

Cấu trúc này bám theo design.md §14. Mỗi thư mục có đúng một nhiệm vụ:

| Thư mục | Nhiệm vụ (một dòng) |
|---------|---------------------|
| `docs/` | Bản thiết kế (`design.md`), README điều hướng, và các kế hoạch triển khai `plans/00..07`. |
| `data/seeds/` | ~300 bài "hạt giống" (seed), mỗi bài một file JSON theo schema §3.3. |
| `data/schema/` | Định nghĩa schema (kiểu `Seed`) + bộ kiểm tra hợp lệ (validator) bằng zod. |
| `grader/` | Máy chấm oracle (§4): hàm `grade()` so đáp án model với đáp án chuẩn; dùng lại engine ký hiệu. |
| `harness/` | Pipeline gọi model (`callModel()`), trích đáp án, ghi bản ghi `EvalRecord` ra JSONL (§6). |
| `perturbations/` | Bộ biến đổi có kiểm soát (§5): hàm `perturb()` sinh biến thể (đổi tên, đổi tỉ lệ…). |
| `analysis/` | Thống kê (CI bootstrap, McNemar) + bảng phân loại lỗi (taxonomy) (§6.4, §7). |
| `survey/` | Phiếu và dữ liệu khảo sát giáo viên (§8). |
| `dashboard/` | Giao diện xếp hạng model (tái dùng React của web app) (§9.1). |
| `scripts/` | Các script CLI chạy bằng `npx tsx` (nơi em vừa đặt `hello.ts`). |

- [ ] **Bước 2: Biết trước 8 kế hoạch sẽ dẫn đi đâu**

Bộ kế hoạch được đánh số. Em vừa xong số 00. Dưới đây là *dự kiến* các kế hoạch tiếp theo (tên/thứ tự có thể tinh chỉnh khi triển khai) — để em thấy mình đang ở đâu trên hành trình:

| # | Tên hệ con (dự kiến) | Làm ra gì | Gắn với §spec |
|---|----------------------|-----------|---------------|
| **00** | **Khởi động & Môi trường** (kế hoạch này) | Môi trường chạy được, vòng TDD đầu tiên, khoá an toàn. | §11.2 (Tuần 0–1), §14 |
| 01 | Schema & Validator dữ liệu | Kiểu `Seed`/`Answer` + validator zod kiểm mọi seed hợp lệ. | §3.3 |
| 02 | Oracle & Grader | Hàm `grade()` chấm đáp án mở bằng engine ký hiệu. | §4 |
| 03 | Bộ 50 bài pilot + đáp án chuẩn kép | Nội dung 2 em tự soạn + engine xác minh. | §3, §3.5 |
| 04 | Bộ biến đổi (perturbations) | Hàm `perturb()` sinh biến thể robustness. | §5 |
| 05 | Harness gọi model | `callModel()` + vòng chạy eval ghi `EvalRecord` JSONL. | §6 |
| 06 | Phân tích & thống kê | CI bootstrap, McNemar, robustness gap, calibration. | §6.3–6.4 |
| 07 | Dashboard & khảo sát giáo viên | UI xếp hạng + công cụ khảo sát §8. | §8, §9.1 |

> Mọi hệ con dùng chung một bộ tên kiểu dữ liệu (`Seed`, `Answer`, `GradeResult`, `EvalRecord`, `PerturbKind`…) để khớp nhau. Em chưa cần thuộc chúng bây giờ — chỉ cần biết chúng tồn tại và sẽ được định nghĩa ở kế hoạch 01 trở đi.

- [ ] **Bước 3: Xác nhận đã sẵn sàng cho kế hoạch 01**

Chạy lại toàn bộ để chắc mọi thứ còn xanh:

```bash
npm test
```

Kết quả mong đợi: tất cả **passed**, *bao gồm* 3 test `greet` mới của em. Nếu xanh hết — môi trường đã sẵn sàng, em có thể bước sang kế hoạch 01.

---

## Tiêu chí hoàn thành (Definition of Done)

Kế hoạch 00 coi là **xong** khi *tất cả* điều sau đúng (ánh xạ tới §13 — "mức đủ nộp" bắt đầu từ nền tảng chạy được này):

- [ ] `node -v` ≥ 18 (lý tưởng ≥ 20) và `npm -v` chạy ra số phiên bản trên máy **cả 2 em**.
- [ ] `npm install` ở gốc repo chạy xong không lỗi đỏ.
- [ ] `npm test` chạy ra **toàn bộ passed** (bộ test cũ của repo **và** 3 test `greet` mới).
- [ ] `npx tsx research/vsgeo-bench/scripts/hello.ts` in ra `Xin chào, thế giới!`.
- [ ] File `research/vsgeo-bench/scripts/hello.ts` và `.../scripts/__tests__/hello.test.ts` tồn tại và được commit.
- [ ] `tsx` xuất hiện trong `devDependencies` của `package.json`.
- [ ] `research/vsgeo-bench/.env.example` tồn tại (chỉ tên biến, không khoá thật) và được commit.
- [ ] `.gitignore` bỏ qua `.env` thật nhưng *cho phép* `.env.example` (đã xác minh bằng `git status`).
- [ ] Có ≥ 2 commit với message đúng quy ước `loại(phạm vi): mô tả`.
- [ ] Cả 2 em giải thích được bằng lời: đỏ → xanh → refactor là gì, và vì sao đề tài theo TDD.

---

## Bảng thuật ngữ

| Thuật ngữ | Giải thích ngắn |
|-----------|-----------------|
| **terminal / dòng lệnh** | Cửa sổ gõ lệnh ra máy tính (PowerShell trên Windows, Terminal trên Mac). |
| **npm** | Node Package Manager — công cụ tải & quản lý các gói thư viện của dự án. |
| **package.json** | File khai báo dự án: tên, scripts (`test`, `dev`…), và danh sách phụ thuộc. |
| **devDependency** | Phụ thuộc chỉ dùng khi phát triển (vitest, tsx), không đi vào sản phẩm chạy thật. Cài bằng `npm i -D`. |
| **vitest** | "Người chạy test" của dự án; tìm các file `*.test.ts`, chạy và báo pass/fail. |
| **test đỏ / xanh** | Đỏ = test đang fail (hành vi chưa đúng/chưa có). Xanh = test pass (đúng như mong đợi). |
| **TS / TypeScript** | JavaScript có thêm kiểu dữ liệu; file đuôi `.ts`. |
| **tsx** | Công cụ chạy thẳng một file `.ts` (`npx tsx file.ts`) mà không cần biên dịch trước. |
| **ESM** | ECMAScript Modules — kiểu chia mã bằng `import`/`export` (dự án đặt `"type":"module"`). |
| **git branch (nhánh)** | Một "dòng công việc" song song trong repo; làm việc trên nhánh riêng để không đụng `main`. |
| **git commit** | Một "ảnh chụp" các thay đổi kèm lời nhắn; đơn vị lịch sử của repo. |
| **.env** | File chứa khoá bí mật dạng `TÊN=giá_trị`; bị git bỏ qua, chỉ nằm trên máy em. |
| **biến môi trường** | Cặp `TÊN=giá_trị` chương trình đọc lúc chạy, nằm ngoài mã nguồn (nơi để khoá API). |
| **API key** | Chuỗi bí mật (như mật khẩu) cho phép gọi model AI và bị tính tiền vào tài khoản chủ khoá. |
| **JSON** | Định dạng dữ liệu văn bản `{ "khoá": giá_trị }`; mỗi seed là một file JSON. |
| **JSONL** | "JSON Lines" — mỗi *dòng* là một object JSON độc lập; dùng để ghi log kết quả (mỗi bản ghi một dòng). |
| **LLM / model** | Large Language Model — mô hình AI ngôn ngữ lớn (GPT, Gemini, Claude…) mà đề tài đem đi đánh giá. |
| **benchmark** | Bộ bài chuẩn + cách chấm để đo và so sánh năng lực của các model một cách khách quan. |
| **oracle** | Máy chấm tự động: phán đáp án của model đúng/sai bằng so khớp ký hiệu chính xác (design.md §4). |

---

## Em sẽ bảo vệ được gì trước hội đồng

- **Quy trình kỹ thuật chuẩn:** em dựng được môi trường phát triển tái lập (Node, npm, vitest, tsx) và chứng minh bằng bộ test xanh — năng lực *reproducibility* mà ViSEF đánh giá cao (§13).
- **Hiểu và thực hành TDD:** em giải thích được vòng đỏ → xanh → refactor *và* đã tự làm một vòng hoàn chỉnh (hàm `greet`) — nền tảng cho lập luận "máy chấm của chúng em đáng tin vì được kiểm thử" (§4.3).
- **Ý thức an toàn & đạo đức dữ liệu:** em tách khoá API ra `.env`, cấu hình `.gitignore` để không rò rỉ bí mật, và nêu được *vì sao* — thể hiện liêm chính và tuân thủ điều khoản nhà cung cấp (§9.3).
- **Làm chủ cấu trúc dự án:** em đọc được bản đồ thư mục §14 và biết mỗi phần (grader, harness, perturbations…) phục vụ câu hỏi khoa học nào — cho thấy em nắm tổng thể chứ không chỉ một mảnh code.
