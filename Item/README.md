# Trang bị Tiên Lộ

- `Ao`, `Chan`, `Giay`: icon áo, hộ thối và giày. Hộ thối hiện dùng cùng nét vẽ icon đạo bào; không thay sprite thân nhân vật.
- `VuKhi`: vũ khí của Kiếm, Liềm, Thương, Quạt.
- `PhapBao/9..12.png`: bốn pháp bảo lưng gốc; `PhapBao/1..8.png`: các pháp bảo mở rộng, mọi class đều dùng được.
- `Thuan/1..7.png`: bảy hộ thuẫn; `BuffThuan/1..7.png`: sprite kết giới hộ thể.
- `PhapTran/5..8.png`: bốn pháp trận alpha dưới chân. `PhapTran/1..4.png` giữ ảnh mới còn nền đen để xử lý sau, không nạp vào game.
- `Nhan`, `Consumable`: nhẫn trữ vật và đan dược.
- `equipment.json`: tên món, class, dòng tẩy luyện, giới hạn và thông số buff. Bản client tương ứng là `js/24c-equipment-rules.js`; kiểm thử đối chiếu hai bản.

## Quy tắc

Tám ô trang bị: vũ khí, áo, chân, giày, pháp bảo, hộ thuẫn, nhẫn và pháp trận. Sáu món chiến đấu tính bộ bí cảnh/cường hóa; nhẫn và pháp trận là ô riêng. Pháp bảo, hộ thuẫn, pháp trận và nhẫn không giới hạn class; yêu cầu cấp của món đồ vẫn áp dụng. Hình lưng, thuẫn, pháp trận và chi tiết nhẫn ở tay theo món đang mặc, kể cả khi người chơi khác nhìn thấy. `classIndex` trong catalog chỉ ghi nguồn kiểu dáng ảnh, không khóa class. Nhẫn chỉ thêm 10/20/30/40 ô cho túi mặc định 30 ô, không tăng công hoặc bạo kích. Không thể tháo/đổi nhẫn nếu túi vượt sức chứa mới.

Pháp bảo và hộ thuẫn luôn có năm dòng khác loại. Đồ mới có năm dòng tối thiểu; tẩy luyện tiêu 60 Linh Thạch và 12 Linh Nguyên, server chọn lại cả năm dòng. Số phần trăm trong JSON là basis point: `100` = 1%. Dòng cố định dùng số nguyên, riêng hồi sinh lực chia 100 HP/giây. Dòng tẩy luyện không nhân theo cường hóa. Tổng né giới hạn 20%, bạo kích 35%, kháng sát thương 15%.

Kỹ năng thuẫn cộng 35% giáp hiện tại (tối thiểu 6, tối đa 25) trong 60 giây, hồi 180 giây từ khi dùng. Hồi chiêu lưu SQLite; tải lại, đổi thuẫn hay khởi động lại service không xóa hồi. Chết sẽ mất buff, vẫn giữ hồi chiêu. Hút máu/linh lực tính trên sát thương thực tế, không trên phần sát thương vượt HP quái hay lượt phát lại phần thưởng.

## Di chuyển dữ liệu

`equipment.py` chuyển dữ liệu một lần khi khởi động: nhẫn bộ bí cảnh cũ sang hộ thối, linh ngọc cũ sang thuẫn, pháp bảo cũ sang lưng theo class. Giữ UID và cường hóa; tặng lại ô pháp trận để giữ hình cũ. JSON gốc được giữ trong bảng `equipment_migration_backup`. Đồ/phôi mới nằm trong rương giữ nguyên số lượng, không xóa đồ vì thiếu ô.

Toàn bộ asset chia bốn gốc `Character`, `Map`, `Item`, `Skill`, phân biệt chữ hoa/thường trên Ubuntu. Không xóa atlas, ảnh nguồn hoặc video người dùng cung cấp. Chỉ bỏ hai icon ngọc/đỉnh đã hết vai trò và các thư mục trống sau khi chuyển.

Game vẫn dùng cơ chế client báo tiến trình chiến đấu hiện có; thay đổi này bảo vệ giao dịch tẩy luyện và hồi thuẫn, chưa chuyển toàn bộ HP, rơi đồ và kinh tế sang mô phỏng server.
