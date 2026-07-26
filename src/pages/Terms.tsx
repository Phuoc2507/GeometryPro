import { useEffect } from 'react';
import { LegalLayout } from '@/components/LegalLayout';

const Terms = () => {
  useEffect(() => { document.title = 'Điều khoản dịch vụ — geo3d'; }, []);

  return (
    <LegalLayout title="Điều khoản dịch vụ" updated="26/07/2026">
      <p>
        Chào mừng bạn đến với <strong>geo3d</strong> (“Dịch vụ”), công cụ dựng hình học không gian 3D
        từ đề bài bằng AI. Khi tạo tài khoản hoặc sử dụng Dịch vụ, bạn đồng ý với các điều khoản dưới đây.
        Nếu không đồng ý, vui lòng ngừng sử dụng Dịch vụ.
      </p>

      <h2>1. Về đơn vị cung cấp</h2>
      <p>
        Dịch vụ được vận hành bởi <strong>[TÊN ĐƠN VỊ/CÁ NHÂN]</strong>
        {' '}(mã số thuế/ĐKKD: <strong>[MST]</strong>), địa chỉ <strong>[ĐỊA CHỈ]</strong>.
        Mọi liên hệ về điều khoản xin gửi tới <a href="mailto:lienhe@geo3d.io.vn">lienhe@geo3d.io.vn</a>.
      </p>

      <h2>2. Tài khoản</h2>
      <ul>
        <li>Bạn có thể dùng thử một số tính năng mà không cần đăng nhập. Để lưu hình, đồng bộ và dùng các tính năng nâng cao, bạn cần tạo tài khoản.</li>
        <li>Bạn chịu trách nhiệm bảo mật thông tin đăng nhập và mọi hoạt động diễn ra dưới tài khoản của mình.</li>
        <li>Nếu bạn dưới 16 tuổi (ví dụ học sinh), việc sử dụng cần có sự đồng ý và giám sát của cha mẹ hoặc người giám hộ.</li>
        <li>Bạn cam kết cung cấp thông tin chính xác và không mạo danh người khác.</li>
      </ul>

      <h2>3. Gói cước, credit và thanh toán</h2>
      <ul>
        <li>Dịch vụ cung cấp gói miễn phí (giới hạn lượt dùng mỗi ngày) và các gói trả phí/credit. Giá và quyền lợi được hiển thị công khai tại thời điểm mua.</li>
        <li>Thanh toán được xử lý qua đối tác cổng thanh toán <strong>PayOS</strong>. geo3d không lưu trữ thông tin thẻ của bạn.</li>
        <li>Credit và quyền lợi gói được cấp sau khi thanh toán thành công. Gói có thời hạn; credit gói sẽ được làm mới theo chu kỳ, credit mua lẻ không hết hạn theo chu kỳ.</li>
        <li><strong>Hoàn tiền:</strong> do đặc thù sản phẩm số được sử dụng ngay, các khoản đã thanh toán về nguyên tắc không hoàn lại, trừ trường hợp lỗi từ phía chúng tôi khiến bạn không nhận được quyền lợi đã mua. Khiếu nại xin gửi trong vòng 7 ngày.</li>
        <li>Nếu bạn tự xoá tài khoản, credit và gói còn lại sẽ mất và không được hoàn tiền.</li>
      </ul>

      <h2>4. Sử dụng hợp lệ</h2>
      <p>Khi dùng Dịch vụ, bạn đồng ý KHÔNG:</p>
      <ul>
        <li>Lạm dụng, dò tìm hoặc vượt qua giới hạn lượt dùng (quota) bằng thủ đoạn kỹ thuật;</li>
        <li>Truy cập trái phép hệ thống, dịch ngược, can thiệp hoặc gây quá tải Dịch vụ;</li>
        <li>Tải lên nội dung vi phạm pháp luật, bản quyền, hoặc xâm phạm quyền của người khác;</li>
        <li>Sử dụng Dịch vụ cho mục đích bất hợp pháp hoặc bán lại khi chưa được phép.</li>
      </ul>

      <h2>5. Nội dung của bạn</h2>
      <p>
        Đề bài bạn nhập và hình bạn tạo (“Nội dung của bạn”) thuộc về bạn. Bạn cấp cho geo3d quyền
        xử lý, lưu trữ và hiển thị Nội dung của bạn chỉ nhằm mục đích vận hành và cải thiện Dịch vụ
        cho chính bạn. Chúng tôi không tuyên bố quyền sở hữu đối với Nội dung của bạn.
      </p>

      <h2>6. Sở hữu trí tuệ của geo3d</h2>
      <p>
        Toàn bộ phần mềm, giao diện, thương hiệu và tài liệu của Dịch vụ thuộc quyền sở hữu của
        đơn vị vận hành. Bạn không được sao chép, phân phối hay tạo sản phẩm phái sinh khi chưa được phép.
      </p>

      <h2>7. Miễn trừ về kết quả AI</h2>
      <p>
        geo3d dùng AI để dựng hình và hỗ trợ lời giải. Kết quả có thể <strong>chưa chính xác hoặc
        chưa đầy đủ</strong>, và <strong>không thay thế</strong> việc kiểm tra của giáo viên hay
        tài liệu chính thống. Bạn tự chịu trách nhiệm khi sử dụng kết quả cho mục đích giảng dạy,
        thi cử hoặc học tập.
      </p>

      <h2>8. Giới hạn trách nhiệm</h2>
      <p>
        Trong phạm vi pháp luật cho phép, Dịch vụ được cung cấp “nguyên trạng”. geo3d không chịu
        trách nhiệm cho các thiệt hại gián tiếp, ngẫu nhiên hoặc hệ quả phát sinh từ việc sử dụng
        hoặc không thể sử dụng Dịch vụ. Tổng trách nhiệm (nếu có) không vượt quá số tiền bạn đã
        thanh toán cho geo3d trong 3 tháng gần nhất.
      </p>

      <h2>9. Tạm ngừng và chấm dứt</h2>
      <p>
        Bạn có thể ngừng sử dụng và <strong>xoá tài khoản</strong> bất cứ lúc nào trong mục
        Cài đặt → Vùng nguy hiểm. Chúng tôi có thể tạm ngừng hoặc chấm dứt tài khoản vi phạm
        điều khoản này.
      </p>

      <h2>10. Thay đổi điều khoản</h2>
      <p>
        Chúng tôi có thể cập nhật điều khoản theo thời gian. Thay đổi quan trọng sẽ được thông báo
        hợp lý. Việc bạn tiếp tục sử dụng sau khi cập nhật đồng nghĩa với việc chấp nhận điều khoản mới.
      </p>

      <h2>11. Luật áp dụng</h2>
      <p>
        Điều khoản này được điều chỉnh bởi pháp luật Việt Nam. Tranh chấp phát sinh sẽ được ưu tiên
        giải quyết bằng thương lượng; nếu không thành, sẽ được đưa ra cơ quan có thẩm quyền tại Việt Nam.
      </p>

      <h2>12. Liên hệ</h2>
      <p>
        Mọi câu hỏi xin gửi tới <a href="mailto:lienhe@geo3d.io.vn">lienhe@geo3d.io.vn</a>.
      </p>
    </LegalLayout>
  );
};

export default Terms;
