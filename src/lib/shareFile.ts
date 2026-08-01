import { GeometryData } from '@/types/geometry';
import { downloadBlob } from '@/lib/downloadBlob';

/**
 * Định dạng "file bài" để chia sẻ ngoại tuyến (gửi qua Zalo/Messenger/email...).
 * Bọc geometry_data trong một header nhận dạng để lúc import biết đây là file của app
 * (và mở đường cho nâng cấp phiên bản sau này qua `version`).
 */
export const SHARE_FILE_APP = 'geometrypro';
export const SHARE_FILE_TYPE = 'geo3d-share';
export const SHARE_FILE_VERSION = 1;

export interface ProblemFile {
  app: typeof SHARE_FILE_APP;
  type: typeof SHARE_FILE_TYPE;
  version: number;
  /** Tên hiển thị của bài. */
  name: string;
  /** Đề bài (nếu có) — tách riêng để trang xem/link preview dùng mà không phải lục geometry_data. */
  prompt: string;
  geometry_data: GeometryData;
}

/** Đề bài gắn với một hình: lời giải đã lưu → llmPrompt → rỗng. */
export function extractPrompt(geometry: GeometryData): string {
  return geometry.solve?.problem ?? geometry.llmPrompt ?? '';
}

/** Đưa tên bài về dạng an toàn cho tên file. */
export function slugifyFileName(name: string): string {
  const base = (name || 'bai-hinh-hoc')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // bỏ dấu tiếng Việt
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
  return base || 'bai-hinh-hoc';
}

/** Dựng đối tượng ProblemFile từ một hình. */
export function buildProblemFile(geometry: GeometryData): ProblemFile {
  return {
    app: SHARE_FILE_APP,
    type: SHARE_FILE_TYPE,
    version: SHARE_FILE_VERSION,
    name: geometry.name || 'Bài hình học',
    prompt: extractPrompt(geometry),
    geometry_data: geometry,
  };
}

/** Serialize thành chuỗi JSON (đẹp, dễ đọc nếu người dùng lỡ mở bằng trình xem text). */
export function serializeProblemFile(geometry: GeometryData): string {
  return JSON.stringify(buildProblemFile(geometry), null, 2);
}

/** Xuất & tải file `.geo3d.json` về máy. */
export function exportProblemFile(geometry: GeometryData): void {
  const json = serializeProblemFile(geometry);
  const blob = new Blob([json], { type: 'application/json' });
  // Đuôi .json để tương thích tối đa; phần .geo3d giúp nhận diện file của app.
  downloadBlob(blob, `${slugifyFileName(geometry.name)}.geo3d.json`);
}

export interface ParseResult {
  ok: boolean;
  file?: ProblemFile;
  error?: string;
}

function isGeometryDataShaped(value: unknown): value is GeometryData {
  if (!value || typeof value !== 'object') return false;
  const g = value as Record<string, unknown>;
  // Một hình hợp lệ tối thiểu phải có mảng points và lines (advance có thể rỗng nhưng vẫn là mảng).
  return Array.isArray(g.points) && Array.isArray(g.lines);
}

/**
 * Đọc nội dung file người dùng chọn. Chấp nhận:
 *  - File chuẩn { app, type, version, geometry_data }
 *  - File geometry_data "trần" (chỉ có points/lines...) để dễ tương thích ngược.
 */
export function parseProblemFile(text: string): ParseResult {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { ok: false, error: 'Tệp không phải JSON hợp lệ.' };
  }

  if (!data || typeof data !== 'object') {
    return { ok: false, error: 'Tệp không đúng định dạng bài hình học.' };
  }

  const obj = data as Record<string, unknown>;

  // Trường hợp 1: file bọc chuẩn.
  if (obj.type === SHARE_FILE_TYPE || obj.geometry_data) {
    if (obj.type && obj.type !== SHARE_FILE_TYPE) {
      return { ok: false, error: 'Đây không phải tệp bài của GeometryPro.' };
    }
    if (!isGeometryDataShaped(obj.geometry_data)) {
      return { ok: false, error: 'Tệp thiếu dữ liệu hình học hợp lệ.' };
    }
    const geometry = obj.geometry_data as GeometryData;
    return {
      ok: true,
      file: {
        app: SHARE_FILE_APP,
        type: SHARE_FILE_TYPE,
        version: typeof obj.version === 'number' ? obj.version : SHARE_FILE_VERSION,
        name: typeof obj.name === 'string' && obj.name ? obj.name : geometry.name || 'Bài hình học',
        prompt: typeof obj.prompt === 'string' ? obj.prompt : extractPrompt(geometry),
        geometry_data: geometry,
      },
    };
  }

  // Trường hợp 2: geometry_data trần.
  if (isGeometryDataShaped(obj)) {
    const geometry = obj as unknown as GeometryData;
    return {
      ok: true,
      file: {
        app: SHARE_FILE_APP,
        type: SHARE_FILE_TYPE,
        version: SHARE_FILE_VERSION,
        name: geometry.name || 'Bài hình học',
        prompt: extractPrompt(geometry),
        geometry_data: geometry,
      },
    };
  }

  return { ok: false, error: 'Tệp không đúng định dạng bài hình học.' };
}

export interface NativeSharePayload {
  title?: string;
  text?: string;
  url?: string;
  files?: File[];
}

/** Có hỗ trợ Web Share API (thanh chia sẻ của hệ điều hành) không? */
export function canNativeShare(payload?: NativeSharePayload): boolean {
  if (typeof navigator === 'undefined' || typeof navigator.share !== 'function') {
    return false;
  }
  if (payload?.files && payload.files.length > 0) {
    return typeof navigator.canShare === 'function' && navigator.canShare({ files: payload.files });
  }
  return true;
}

/**
 * Gọi thanh chia sẻ của hệ điều hành. Trả về:
 *  - 'shared'    : đã mở thanh chia sẻ (Zalo/Messenger/... nằm ở đây trên di động)
 *  - 'unsupported': trình duyệt không hỗ trợ
 *  - 'cancelled' : người dùng đóng thanh chia sẻ
 *  - 'error'     : lỗi khác
 */
export async function shareViaNative(
  payload: NativeSharePayload,
): Promise<'shared' | 'unsupported' | 'cancelled' | 'error'> {
  if (!canNativeShare(payload)) return 'unsupported';
  try {
    await navigator.share({
      title: payload.title,
      text: payload.text,
      url: payload.url,
      files: payload.files,
    });
    return 'shared';
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') return 'cancelled';
    return 'error';
  }
}
