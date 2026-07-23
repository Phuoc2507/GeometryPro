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
