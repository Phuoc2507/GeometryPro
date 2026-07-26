import { useEffect } from 'react';
import { LegalLayout } from '@/components/LegalLayout';

const Privacy = () => {
  useEffect(() => { document.title = 'Chính sách bảo mật — geo3d'; }, []);

  return (
    <LegalLayout title="Chính sách bảo mật" updated="26/07/2026">
      <p>
        Chính sách này mô tả cách <strong>geo3d</strong> thu thập, sử dụng và bảo vệ dữ liệu cá nhân
        của bạn, phù hợp với <strong>Nghị định 13/2023/NĐ-CP</strong> về bảo vệ dữ liệu cá nhân và
        pháp luật Việt Nam có liên quan.
      </p>

      <h2>1. Đơn vị kiểm soát dữ liệu</h2>
      <p>
        Dữ liệu của bạn được kiểm soát bởi <strong>[TÊN ĐƠN VỊ/CÁ NHÂN]</strong>, địa chỉ
        <strong> [ĐỊA CHỈ]</strong>. Liên hệ về dữ liệu cá nhân: <a href="mailto:lienhe@geo3d.io.vn">lienhe@geo3d.io.vn</a>.
      </p>

      <h2>2. Dữ liệu chúng tôi thu thập</h2>
      <ul>
        <li><strong>Thông tin tài khoản:</strong> email, tên hiển thị, ảnh đại diện (nếu đăng nhập bằng Google).</li>
        <li><strong>Nội dung của bạn:</strong> đề bài bạn nhập và hình học bạn tạo/lưu.</li>
        <li><strong>Dữ liệu sử dụng:</strong> số lượt dùng tính năng (quota), nhật ký kỹ thuật để vận hành và chống lạm dụng.</li>
        <li><strong>Với người dùng thử (chưa đăng nhập):</strong> chúng tôi chỉ lưu <strong>giá trị băm không thể đảo ngược (HMAC)</strong> của mã thiết bị và địa chỉ IP để đếm lượt dùng thử — không lưu IP hay mã thiết bị ở dạng gốc.</li>
        <li><strong>Thanh toán:</strong> được xử lý bởi PayOS. Chúng tôi <strong>không</strong> lưu số thẻ; chỉ lưu mã đơn hàng, số tiền, gói và trạng thái để cấp quyền lợi.</li>
      </ul>

      <h2>3. Mục đích và cơ sở pháp lý</h2>
      <ul>
        <li>Cung cấp và vận hành Dịch vụ (thực hiện hợp đồng với bạn);</li>
        <li>Lưu và đồng bộ hình của bạn giữa các thiết bị (theo yêu cầu của bạn);</li>
        <li>Xử lý thanh toán và cấp credit/gói (thực hiện hợp đồng);</li>
        <li>Bảo mật, chống gian lận và giới hạn lạm dụng (lợi ích hợp pháp);</li>
        <li>Cải thiện chất lượng Dịch vụ.</li>
      </ul>

      <h2>4. Bên thứ ba xử lý dữ liệu</h2>
      <p>Chúng tôi sử dụng các nhà cung cấp sau để vận hành:</p>
      <ul>
        <li><strong>Supabase</strong> — cơ sở dữ liệu và xác thực (lưu trữ tài khoản, hình đã lưu).</li>
        <li><strong>Vercel</strong> — hạ tầng lưu trữ và chạy ứng dụng.</li>
        <li><strong>PayOS</strong> — cổng thanh toán.</li>
        <li><strong>Google</strong> — khi bạn chọn đăng nhập bằng Google.</li>
        <li><strong>Nhà cung cấp mô hình AI</strong> — để xử lý đề bài và dựng hình. Đề bài bạn gửi có thể được truyền tới nhà cung cấp AI nhằm tạo kết quả.</li>
        <li><strong>Sentry</strong> — giám sát lỗi kỹ thuật để cải thiện độ ổn định. Chúng tôi chỉ gắn <strong>mã người dùng</strong> vào báo cáo lỗi, không gửi email; và không bật thu thập thông tin cá nhân mặc định.</li>
      </ul>
      <p>
        Một số nhà cung cấp có thể xử lý dữ liệu trên máy chủ <strong>ngoài lãnh thổ Việt Nam</strong>.
        Chúng tôi lựa chọn đối tác có cam kết bảo mật phù hợp.
      </p>

      <h2>5. Cookie</h2>
      <p>
        Chúng tôi dùng cookie kỹ thuật cần thiết, gồm một cookie đã ký (HttpOnly) để đếm lượt dùng thử
        cho người chưa đăng nhập. Chúng tôi <strong>không</strong> dùng cookie cho quảng cáo.
      </p>

      <h2>6. Lưu trữ và bảo mật</h2>
      <p>
        Dữ liệu được bảo vệ bằng phân quyền hàng (Row Level Security) — mỗi người chỉ truy cập được
        dữ liệu của chính mình — và mã hoá khi truyền tải (HTTPS). Các khoá bí mật và thao tác nhạy cảm
        chỉ thực hiện ở phía máy chủ.
      </p>

      <h2>7. Thời gian lưu trữ</h2>
      <p>
        Chúng tôi lưu dữ liệu của bạn trong thời gian tài khoản còn hoạt động. Khi bạn xoá tài khoản,
        dữ liệu cá nhân liên quan sẽ được xoá (xem mục 8). Một số nhật ký kỹ thuật/bản ghi tối thiểu
        có thể được lưu thêm trong thời gian ngắn cho mục đích bảo mật hoặc theo yêu cầu pháp luật.
      </p>

      <h2>8. Quyền của bạn</h2>
      <p>Theo Nghị định 13/2023/NĐ-CP, bạn có quyền:</p>
      <ul>
        <li>Truy cập và xem dữ liệu của mình (trong ứng dụng);</li>
        <li>Chỉnh sửa thông tin cá nhân (Cài đặt);</li>
        <li><strong>Xoá dữ liệu và tài khoản</strong>: vào <strong>Cài đặt → Vùng nguy hiểm → Xoá tài khoản</strong>. Thao tác này xoá vĩnh viễn hồ sơ, hình đã lưu, lịch sử, gói và credit của bạn;</li>
        <li>Rút lại sự đồng ý và phản đối việc xử lý, bằng cách ngừng sử dụng hoặc liên hệ với chúng tôi;</li>
        <li>Khiếu nại tới cơ quan có thẩm quyền nếu cho rằng quyền của bạn bị vi phạm.</li>
      </ul>
      <p>
        Để thực hiện các quyền trên hoặc yêu cầu bản sao dữ liệu, hãy liên hệ
        <a href="mailto:lienhe@geo3d.io.vn"> lienhe@geo3d.io.vn</a>.
      </p>

      <h2>9. Trẻ em</h2>
      <p>
        Dịch vụ hướng tới học sinh và giáo viên. Nếu bạn dưới 16 tuổi, vui lòng sử dụng dưới sự đồng ý
        và giám sát của cha mẹ hoặc người giám hộ. Nếu chúng tôi phát hiện đã thu thập dữ liệu của trẻ
        mà không có sự đồng ý phù hợp, chúng tôi sẽ xoá dữ liệu đó.
      </p>

      <h2>10. Thay đổi chính sách</h2>
      <p>
        Chính sách có thể được cập nhật. Thay đổi quan trọng sẽ được thông báo hợp lý trên Dịch vụ.
      </p>

      <h2>11. Liên hệ</h2>
      <p>
        Mọi câu hỏi về quyền riêng tư xin gửi tới <a href="mailto:lienhe@geo3d.io.vn">lienhe@geo3d.io.vn</a>.
      </p>
    </LegalLayout>
  );
};

export default Privacy;
