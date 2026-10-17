# Trang bị Tiên Lộ

- `Ao`, `Chan`, `Giay`: icon áo, hộ thối và giày. Hộ thối hiện dùng cùng nét vẽ icon đạo bào; không thay sprite thân nhân vật.
- `VuKhi`: vũ khí của Kiếm, Liềm, Thương, Quạt.
- `PhapBao/9..12.png`: bốn pháp bảo lưng gốc; `PhapBao/1..8.png`: các pháp bảo mở rộng, mọi class đều dùng được.
- `Thuan/1..7.png`: bảy hộ thuẫn; `BuffThuan/1..7.png`: sprite kết giới hộ thể.
- `PhapTran/5..8.png`: bốn pháp trận alpha dưới chân. `PhapTran/1..4.png` giữ ảnh mới còn nền đen để xử lý sau, không nạp vào game.
- `Nhan`, `Consumable`: nhẫn trữ vật và đan dược.
- `equipment.json`: tên món, class, dòng tẩy luyện, giới hạn và thông số buff. Bản client tương ứng là `js/24c-equipment-rules.js`; kiểm thử đối chiếu hai bản.

## Quy tắc

Bốn ô trái: vũ khí, đạo bào, hộ thối, giày; có `classIndex` bắt buộc khớp class người mang. Có 60 template riêng (15 mỗi class) và chỉ những món này được cường hóa +15, không có thưởng full set. Class yêu cầu hiện trong chi tiết món và kho GM.

Bốn ô phải: pháp bảo lưng, hộ thuẫn, nhẫn trữ vật và pháp trận; dùng chung cho mọi class, không cường hóa. Chỉ `classIndex` của bốn ô này ghi kiểu ảnh gốc. Nhẫn thêm 10/20/30/40 ô cho túi 30 ô; không thể tháo nếu túi không đủ chỗ. Pháp bảo, thuẫn và pháp trận hiển thị theo món đang mặc.

Nhân vật mới không có đồ, thuốc hay trứng trong túi và không mặc món nào. Bật GM mở kho 94 vật phẩm, lọc/tìm và lấy đồ hoặc mặc thử. GM bỏ yêu cầu cấp để thử, vẫn giữ giới hạn class của bốn ô trái.

Pháp bảo và hộ thuẫn luôn có năm dòng khác loại. Đồ mới có năm dòng tối thiểu; tẩy luyện tiêu 60 Linh Thạch và 12 Linh Nguyên, server chọn lại cả năm dòng. Số phần trăm trong JSON là basis point: `100` = 1%. Dòng cố định dùng số nguyên, riêng hồi sinh lực chia 100 HP/giây. Dòng tẩy luyện không nhân theo cường hóa. Tổng né giới hạn 20%, bạo kích 35%, kháng sát thương 15%.

Kỹ năng thuẫn cộng 35% giáp hiện tại (tối thiểu 6, tối đa 25) trong 60 giây, hồi 180 giây từ khi dùng. Hồi chiêu lưu SQLite; tải lại, đổi thuẫn hay khởi động lại service không xóa hồi. Chết sẽ mất buff, vẫn giữ hồi chiêu. Hút máu/linh lực tính trên sát thương thực tế, không trên phần sát thương vượt HP quái hay lượt phát lại phần thưởng.

## Di chuyển dữ liệu

`equipment.py` chuyển bản lưu cũ sang trang bị độc lập, giữ UID, đồ sở hữu, dòng tẩy luyện và cấp cường hóa đã lưu. Cường hóa cũ của đồ phải không còn tác dụng. Mảnh bí cảnh đổi 20 Linh Thạch/mảnh; mảnh Thăng Vị đổi 1 Linh Thạch/mảnh. Món bí cảnh chờ nhận được chuyển vào túi, hoặc hoàn Linh Thạch nếu túi đầy. JSON gốc được giữ trong bảng backup và bản sao DB trước deploy. Không còn tính năng bộ đồ hoặc đổi mảnh. Bí cảnh chỉ thưởng Linh Thạch.

Toàn bộ asset chia bốn gốc `Character`, `Map`, `Item`, `Skill`, phân biệt chữ hoa/thường trên Ubuntu. Không xóa atlas, ảnh nguồn hoặc video người dùng cung cấp. Chỉ bỏ hai icon ngọc/đỉnh đã hết vai trò và các thư mục trống sau khi chuyển.

Game vẫn dùng cơ chế client báo tiến trình chiến đấu hiện có; thay đổi này bảo vệ giao dịch tẩy luyện và hồi thuẫn, chưa chuyển toàn bộ HP, rơi đồ và kinh tế sang mô phỏng server.
