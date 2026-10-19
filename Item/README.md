# Trang bị Tiên Lộ

- `Ao`, `Chan`, `Giay`: icon áo, đai hộ thối và giày. Hộ thối dùng `Chan/dai-v2.png` (ImageGen, prompt cùng thư mục), không dùng lại icon áo; không thay sprite thân nhân vật.
- `VuKhi`: vũ khí của Kiếm, Liềm, Thương, Quạt.
- `PhapBao/9..12.png`: bốn pháp bảo lưng gốc; `PhapBao/1..8.png`: các pháp bảo mở rộng, mọi class đều dùng được.
- `Thuan/1..7.png`: bảy hộ thuẫn; `BuffThuan/1..7.png`: sprite kết giới hộ thể.
- `PhapTran/5..8.png`: bốn pháp trận alpha dưới chân. `PhapTran/1..4.png` giữ ảnh mới còn nền đen để xử lý sau, không nạp vào game.
- `Nhan`, `Consumable`: nhẫn trữ vật và đan dược.
- `equipment.json`: tên món, class, dòng tẩy luyện, giới hạn và thông số buff. Bản client tương ứng là `js/24c-equipment-rules.js`; kiểm thử đối chiếu hai bản.

## Quy tắc

Bốn ô trái: vũ khí, đạo bào, hộ thối, giày; có `classIndex` bắt buộc khớp class người mang. Có 60 template riêng (15 mỗi class) và chỉ những món này được cường hóa +15, không có thưởng full set. Class yêu cầu hiện trong chi tiết món và kho GM.

Bốn ô phải: pháp bảo lưng, hộ thuẫn, nhẫn trữ vật và pháp trận; dùng chung cho mọi class, không cường hóa. Chỉ `classIndex` của bốn ô này ghi kiểu ảnh gốc. Nhẫn thêm 10/20/30/40 ô cho túi 30 ô; không thể tháo nếu túi không đủ chỗ. Pháp bảo, thuẫn và pháp trận hiển thị theo món đang mặc.

Nhân vật mới không có đồ, thuốc hay trứng trong túi và không mặc món nào. Bật GM mở kho 120 vật phẩm, lọc/tìm và lấy đồ hoặc mặc thử. GM bỏ yêu cầu cấp để thử, vẫn giữ giới hạn class của bốn ô trái.

Pháp bảo và hộ thuẫn luôn có năm dòng khác loại. Đồ mới có năm dòng tối thiểu; tẩy luyện tiêu 60 Linh Thạch và 12 Linh Nguyên, server chọn lại cả năm dòng. Số phần trăm trong JSON là basis point: `100` = 1%. Dòng cố định dùng số nguyên, riêng hồi sinh lực chia 100 HP/giây. Dòng tẩy luyện không nhân theo cường hóa. Tổng né giới hạn 20%, bạo kích 35%, kháng sát thương 15%.

Kỹ năng thuẫn cộng 35% giáp hiện tại (tối thiểu 6, tối đa 25) trong 20 giây, hồi 90 giây từ khi dùng. Hồi chiêu lưu SQLite; tải lại, đổi thuẫn hay khởi động lại service không xóa hồi. Chết sẽ mất buff, vẫn giữ hồi chiêu. Hút máu/linh lực tính trên sát thương thực tế, không trên phần sát thương vượt HP quái hay lượt phát lại phần thưởng.

`js/12b-equipment-motion.js` giữ điểm đeo pháp bảo ở giữa lưng, với điểm neo riêng cho 12 ảnh. Phần ngoài uốn nhẹ và ánh sáng quét theo alpha ảnh; khi quay lưng vẫn chừa đầu nhân vật. Buff thuẫn chia lớp sau/trước, có dải năng lượng chuyển động trên mặt cầu và hiệu ứng mở/tan theo thời hạn server. Ảnh gốc được giữ nguyên; bản render thu nhỏ được cache. Chế độ giảm chuyển động tắt chuyển động trang trí.

## Hiệu ứng chân và cảnh giới

- `DiChuyen/1..6.png`: sáu vật phẩm cosmetic không tăng chỉ số/cường hóa, mọi class dùng được. Ô `dichuyen` nằm giữa giày và pháp trận; GM và cửa hàng dùng cùng catalog. Nhân vật mới để trống ô này.
- `CanhGioi/`: 12 hào quang tự mở theo tu vi `r=3..14`, Kim Đan đến Đạo Tổ, không theo level. File `kiemtien.png` được ánh xạ Kim Tiên (`r=11`), giữ nguyên tên file nguồn.
- `js/35j-character-auras.js`: cánh sen nở, mây tách lớp, điện tím, băng kết tinh, lông phượng/tàn lửa, sao xuất hiện và tan. Chỉ nạp ảnh đang dùng, cache bản render, tối đa 72 dấu bước; không vẽ thêm dấu khi đứng yên/truyền tống. Hào quang nằm sau nhân vật, chỉ viền chân ở lớp trước. Người chơi từ xa dùng trang bị/cảnh giới server đã lưu.
- Catalog version 5 chỉ thêm ô mới và đổi art hộ thối khi nâng từ version 4; giữ UID, chỉ số, dòng tẩy luyện và cường hóa. Không chuyển đổi mảnh/tiền lần nữa.

## Danh hiệu cảnh giới

`DHCanhGioi/` giữ 14 ảnh PNG alpha người dùng cung cấp (tỷ lệ 3:1), tương ứng `r=1..14` từ Luyện Khí đến Đạo Tổ; tên file `kimtien.png` đúng cho Kim Tiên. Danh sách `realmTitles` trong catalog dùng chung tên đường dẫn phân biệt hoa/thường. `js/35k-character-titles.js` nạp theo cảnh giới đang thấy, cache ảnh 1024px và vẽ đúng tỷ lệ trên đầu; preview túi giữ chỗ cho trang bị, không chèn danh hiệu. Tên đạo hữu dùng chữ nhỏ dưới chân ở cả tư thế thường/đả tọa và người chơi online.

## Ô mặt nạ

Ô `matna` nằm chính giữa vũ khí và pháp bảo ở hàng trên, dùng chung cho mọi class và không nằm trong bốn ô cường hóa. Catalog version 6 thêm ô trống vào bản lưu cũ, giữ nguyên vật phẩm, chỉ số và tiền. `MatNa/slot.svg` là biểu tượng ô trống. `MatNa/Nam/1..10.png` và `MatNa/Nu/1..10.png` là 20 mặt nạ ngoại hình, không tăng chỉ số: dùng chung bốn class cùng giới tính, lấy qua kho GM hoặc mua tại Bảo Khí Các. Khi mặc, mặt nạ gắn theo gương mặt/tư thế và đổi avatar HUD; khi quay lưng giữ tóc sau, không vẽ mặt phía sau đầu. Khi tháo trả lại mặt gốc. `js/35l-character-masks.js` quản lý ảnh và neo gương mặt theo từng class; người chơi online nhận `maskId` từ trang bị đã lưu trên server. Ảnh gốc giữ nguyên, runtime cache 384px và nạp khi cần. Kiểm tra bằng `node tests/character-masks.test.cjs`.

## Di chuyển dữ liệu

`equipment.py` chuyển bản lưu cũ sang trang bị độc lập, giữ UID, đồ sở hữu, dòng tẩy luyện và cấp cường hóa đã lưu. Cường hóa cũ của đồ phải không còn tác dụng. Mảnh bí cảnh đổi 20 Linh Thạch/mảnh; mảnh Thăng Vị đổi 1 Linh Thạch/mảnh. Món bí cảnh chờ nhận được chuyển vào túi, hoặc hoàn Linh Thạch nếu túi đầy. JSON gốc được giữ trong bảng backup và bản sao DB trước deploy. Không còn tính năng bộ đồ hoặc đổi mảnh. Bí cảnh chỉ thưởng Linh Thạch.

Toàn bộ asset chia bốn gốc `Character`, `Map`, `Item`, `Skill`, phân biệt chữ hoa/thường trên Ubuntu. Không xóa atlas, ảnh nguồn hoặc video người dùng cung cấp. Chỉ bỏ hai icon ngọc/đỉnh đã hết vai trò và các thư mục trống sau khi chuyển.

Game vẫn dùng cơ chế client báo tiến trình chiến đấu hiện có; thay đổi này bảo vệ giao dịch tẩy luyện và hồi thuẫn, chưa chuyển toàn bộ HP, rơi đồ và kinh tế sang mô phỏng server.
