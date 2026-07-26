/**
 * Bọc một đoạn mã `tikzpicture` thành một tài liệu LaTeX HOÀN CHỈNH, biên dịch
 * được ngay trên Overleaf.
 *
 * Trước đây phần xuất chỉ trả về khối `\begin{tikzpicture}...\end{tikzpicture}`
 * trần, thiếu `\documentclass`, `\usepackage{tikz}` và môi trường `document`,
 * nên khi dán thẳng vào Overleaf sẽ báo lỗi ("Missing \begin{document}",
 * "Undefined control sequence \tikz", ...). Helper này thêm đầy đủ khung tài
 * liệu để người dùng dán vào là chạy.
 *
 * - Nếu nội dung đã là một tài liệu hoàn chỉnh (đã có `\documentclass` hoặc
 *   `\begin{document}`) thì trả về nguyên trạng, tránh lồng document.
 * - Tự dò các màu dạng hex (vd `color=eab308`) do bộ sinh TikZ tạo ra và bổ
 *   sung `\definecolor` tương ứng — nếu không Overleaf sẽ báo màu chưa định nghĩa.
 */
export function wrapTikzAsDocument(tikz: string): string {
  const body = (tikz || '').trim();
  if (!body) return body;

  // Đã là tài liệu hoàn chỉnh → không bọc lại.
  if (/\\documentclass/.test(body) || /\\begin\{document\}/.test(body)) {
    return body;
  }

  // Dò các màu hex (color=RRGGBB / fill=RRGGBB / draw=RRGGBB) để định nghĩa trước.
  const hexColors = new Set<string>();
  const colorRegex = /(?:color|fill|draw)=([0-9a-fA-F]{6})\b/g;
  let match: RegExpExecArray | null;
  while ((match = colorRegex.exec(body)) !== null) {
    hexColors.add(match[1].toLowerCase());
  }
  const colorDefs = Array.from(hexColors)
    .map((hex) => `\\definecolor{${hex}}{HTML}{${hex.toUpperCase()}}`)
    .join('\n');

  const preamble = [
    '\\documentclass[border=10pt]{standalone}',
    '\\usepackage{tikz}',
    '\\usepackage{xcolor}',
    colorDefs,
  ]
    .filter(Boolean)
    .join('\n');

  return `${preamble}\n\\begin{document}\n${body}\n\\end{document}\n`;
}
