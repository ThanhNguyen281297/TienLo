# Thiết kế gameplay Tiên Lộ Online

Không có gameplay tốt nhất cho mọi nhóm người chơi. Hướng phù hợp với source này là **ARPG tu tiên hợp tác**, chơi được một mình nhưng gặp đạo hữu sẽ có lợi: combo rõ, skill chủ động, tiến trình có mục tiêu và trang bị có lựa chọn.

Thiết kế tham khảo cách hướng dẫn theo mốc của [Guild Wars 2 New Player Guide](https://www.guildwars2.com/en/new-player-guide/) và chiến đấu hợp tác ngoài thế giới của [Guild Wars 2 Combat](https://www.guildwars2.com/en/the-game/combat/). Các con số dưới đây là lựa chọn riêng của Tiên Lộ, chưa phải kết quả cân bằng qua dữ liệu người chơi.

## Vòng chơi đã triển khai

Đăng ký → chọn phái → nhận bộ đồ/thuốc → gặp Sư phụ → farm và nhiệm vụ nhập môn → Phàm Nhân 3 → học skill trong thành → chọn thuộc tính/trang bị → luyện đan/tăng tầng → farm cùng đạo hữu → thử đấu trường.

Khung Tiên Đồ hiển thị mục tiêu hiện tại. Túi 30 ô và sáu ô trang bị hỗ trợ kéo thả/chạm. Đồ khởi hành gồm Mộc Kiếm, Vải Bố Đạo Bào và ba thuốc mỗi loại hồi máu/linh; người chơi chủ động trang bị thay vì tự cộng chỉ số.

## Bản sắc bốn phái

| Phái | Điểm mạnh | Quyết định khi chơi |
|---|---|---|
| Kiếm Tông | Combo nhanh, dash, kiếm trận và bộc phát | Giữ khoảng cách ngắn, chọn lúc dựng trận và ultimate |
| Minh Nguyệt Tông | Lưỡi bay/thu về, dịch chuyển, khống chế vùng | Canh đường đi/về và điểm dịch chuyển an toàn |
| Lôi Thương Tông | Áp sát, tích ấn, kích nổ | Tích ấn trước chiêu lớn, tận dụng trận tăng tốc đánh |
| Thiên Cơ Môn | Tầm xa, phù, trận và phong ấn | Giữ khoảng cách, đặt vùng khống chế để nối combo |

Đánh thường dùng ngay, không tốn mana; chọn mục tiêu bằng chạm/Tab và bật/tắt F. Skill phải học riêng, có mana/cooldown. Auto Z dành cho farm; kiểm tra cao hơn nên yêu cầu di chuyển và chọn thời điểm dùng chiêu.

## Tu luyện và kinh tế hiện tại

15 cảnh giới, mỗi cảnh giới 10 tầng, tổng 150 tầng. Tầng 1–9 dùng đạo hạnh và Linh Thạch để tăng; tầng 10 cần một Đột Phá Đan và r+1 Thăng Vị Đan để sang cảnh giới mới. Đạo Tổ 10 là giới hạn. Không có đột phá ngẫu nhiên làm mất tiến độ.

Đạo hạnh dự trữ tối đa ba lần yêu cầu hiện tại, nhất quán giữa đánh quái, đả tọa, đan và nhận thưởng. Tăng tầng tiêu thụ phần đã dùng. Tăng tầng cấp ba điểm thuộc tính, đột phá năm điểm.

Thăng Vị Đan vừa có drop ngẫu nhiên, vừa có tích mảnh: mỗi quái nhận một mảnh; 20 mảnh đổi một đan tự động. Quái thường 1,5%, Linh Mạch Cốc 2,5%; quái đấu trường 2%, thủ lĩnh chắc chắn ít nhất một. Nhờ đó người chơi luôn tiến gần tới đột phá. Thủ lĩnh rơi trang bị theo cấp hiện tại hoặc mốc sắp tới, tránh chỉ cho đồ chưa dùng được trong thời gian quá dài.

Sáu ô: vũ khí, đạo bào, linh ngọc, nhẫn, giày, pháp bảo. Thuộc tính Lực tăng công; Thể tăng máu/giáp; Nhanh tăng bạo/né; Linh tăng mana/sát thương skill. Phẩm chất Phàm/Huyền/Linh/Tiên có màu và ánh sáng; vũ khí trang bị tăng cường độ phát sáng nhưng giữ asset phái.

## Học skill

| Ô | Điều kiện | Phí |
|---|---|---|
| 1 | Phàm Nhân 3 | 15 Linh Thạch |
| 2 | Luyện Khí 1 | 50 Linh Thạch |
| 3 | Trúc Cơ 1 | 120 Linh Thạch |
| 4 | Kim Đan 1 | 250 Linh Thạch |

Học tại Truyền Công Các ở Thiên Vân Thành. Tu luyện tối đa ba cấp, mỗi cấp +8% sát thương; phí 30/60/90 Linh Thạch. Đủ cảnh giới không tự mở kỹ năng.

## Hợp tác và thử thách

Người cùng map nhìn thấy nhau và chat/biểu cảm. Quái farm chia phòng theo map/cảnh giới luyện công để tân thủ không phải đánh quái của người quá mạnh. Người góp sát thương trong 15 giây trước khi quái chết được nhận thưởng khi còn cùng phòng. Quái hồi sinh sau tám giây; máu/quá trình chết dùng trạng thái chung trên server. Loot cá nhân được sinh ở client trong bản alpha.

Đấu trường là instance riêng, 30 lượt, 3–10 quái mỗi lượt, thủ lĩnh mỗi năm lượt, nghỉ hai giây giữa lượt. Độ khó chốt theo cấp lúc vào, hoàn tất +300 Linh Thạch. Hai lượt mỗi tài khoản mỗi ngày, reset 00:00 giờ Việt Nam, không hoàn khi thua hoặc rời sớm.

## Hướng phát triển nên ưu tiên tiếp theo

1. Chuyển toàn bộ skill/cooldown/mana, tiến trình và kinh tế sang server trước PvP hoặc giao dịch. Hiện server chỉ quản lý HP quái chung, kiểm tra tầm/tần suất damage và xác thực tài khoản/bản lưu.
2. Thêm boss hợp tác có vùng báo đòn trước 0,7–1 giây, ba cơ chế tránh được bằng di chuyển. Mục tiêu là thắng nhờ hiểu chiêu, không chỉ đứng auto và tăng chỉ số. Chưa triển khai trong bản này.
3. Thêm nhiệm vụ tuần/sự kiện bản đồ và đội nhỏ, phần thưởng cá nhân; tránh tranh quyền last-hit. Giữ solo đủ khả năng tiến trình.
4. Đo thời gian tới skill đầu, số lần chết, thời gian hoàn thành tầng và mức dùng thuốc. Điều chỉnh từ dữ liệu playtest; chưa tuyên bố các chỉ số hiện tại đã cân bằng.
5. Tách renderer/update/event thành hệ thống rõ ràng, chuyển online transport sang WebSocket và benchmark tải trước khi mở đông người.

Mốc playtest đề xuất: người mới hiểu điều khiển và trang bị trong năm phút; được dùng skill đầu trong 10–15 phút; mỗi lần chơi 15–30 phút có một nâng cấp nhìn thấy được. Đây là mục tiêu thiết kế để kiểm chứng, chưa phải số đo thực tế.

## Trạng thái skill 3 theo class

Các hiệu ứng dưới đây áp dụng cho quái trong vùng trận. Rời vùng sẽ bỏ trạng thái; quay vào phải tích lại thời gian tiếp xúc. Mỗi mục tiêu chỉ chịu một lần khống chế cứng từ mỗi lần đặt trận. Boss và tinh anh chỉ chịu 40% thời gian khống chế. Nhiều nguồn tăng sát thương hoặc suy yếu lấy mức mạnh nhất, không nhân chồng.

| Class | Trạng thái | Tác dụng | Mục đích gameplay |
|---|---|---|---|
| Kiếm | Kiếm áp | Chậm 20%; nhận thêm 12% sát thương (boss/tinh anh 6%) | Giữ mục tiêu trong trận để combo kiếm và hỗ trợ đồng đội |
| Liềm | Hàn nguyệt | Chậm 30%; đứng liên tục 1,2 giây sẽ đóng băng 0,65 giây | Giữ quái để nguyệt nhận bay về và trúng nhiều nhát |
| Thương | Lôi tê | Chậm 20%; tích điện liên tục 3 giây sẽ choáng 0,45 giây | Phối hợp nhịp lôi ấn và đòn kết liễu; không gây choáng mỗi nhát |
| Quạt | Phong ấn | Chậm 35%; giảm 20% sát thương quái gây ra; đứng trong tâm bán kính 60 liên tục 1,8 giây sẽ bị khóa đánh 0,65 giây | Hỗ trợ, thả diều và bảo vệ đồng đội; khóa đánh không đóng băng di chuyển |

Quái bị đóng băng/choáng không di chuyển hoặc đánh. Quái bị khóa đánh vẫn di chuyển chậm. Dấu hiệu là kiếm áp hướng xuống, tinh thể tuyết, điện tích/ngôi sao choáng và lá phù phong ấn; không thêm vòng bao quanh quái.

Bản online xử lý trạng thái, sát thương và AI quái trên server, gửi trạng thái quái và trận của đồng đội qua `/api/world`. Server cố định thời gian tồn tại/cooldown của trận theo class, không làm mới trận khi client gửi lại cùng ID. Cấu hình chung ở `MAP/field-effects.json`, bản trình duyệt tương ứng ở `js/13c-field-rules.js`.

## Trang bị +15 và linh thú

Trang bị lưng của bốn class cao hơn đầu, nổi nhẹ theo nhịp linh khí; lưng vẽ sau thân khi quay mặt, phủ trước sprite sau lưng khi quay đi (kể cả tóc dài). Vũ khí giữ vị trí và góc riêng cố định theo class, không quay vòng quanh người. Viền cường hóa bám silhouette của vũ khí, đạo bào và pháp bảo lưng; các ô trang bị có huy hiệu +N và viền sáng chuyển động.

Cường hóa từng món tối đa +15, thành công 100%, mỗi cấp tăng 5% chỉ số gốc món đó. Lên cấp N cần `40 × N` Linh Thạch và `8 × N` Linh Nguyên. GM đang bật bỏ qua toàn bộ chi phí. Có thể nâng cả đồ trong túi lẫn đồ đang mặc qua chi tiết vật phẩm, Luyện Khí Phường hoặc menu Khác → Cường hóa.

Màu viền: +1–8 xanh lá; +9–10 xanh dương; +11–13 cam; +14 đỏ; +15 vàng kim. Tại khoảng trùng +9/+11, lấy màu mốc cao hơn.

Full set là đủ sáu món đang mặc. Lấy cấp thấp nhất của sáu món: đạt +9/+11/+13/+15 nhận tương ứng +5%/+10%/+15%/+20%. Chỉ lấy mốc cao nhất, không cộng bốn mốc. Thưởng áp dụng công, tổng HP/MP, tổng giáp, bạo kích, né và tăng sát thương kỹ năng; giới hạn né/bạo hiện có vẫn áp dụng. Tháo hoặc thay món thấp hơn làm thưởng thay đổi ngay. Chỉ số gốc được giữ nguyên trong DB, cấp cường hóa lưu riêng để tránh nhân lại chỉ số khi đăng nhập.

Mỗi nhân vật được nhận một lần bốn trứng: Linh Đường Lang, Nguyệt Thố, Huyết Nhện và Băng Dực Dơi. Bản lưu cũ cũng nhận quà một lần; túi đầy sẽ chờ ô trống thay vì xóa đồ. Ấp một trứng trong ba giây; trạng thái đang ấp, bộ sưu tập và pet xuất chiến được lưu cùng nhân vật. Một pet đi theo, tối đa 20 pet trong bộ sưu tập. Pet dùng sprite quái sẵn có với kích thước nhỏ, có idle/di chuyển và không tham gia chiến đấu ở phiên bản này. Người chơi online nhìn thấy pet và cấp cường hóa của nhau.

## Vân Hải Bí Cảnh (solo)

Mở Khác → Bí cảnh sau khi nhập môn và đứng tại vùng an toàn. Dùng đài riêng như đấu trường nhưng không tiêu hao lượt đấu trường, không trộn quái/người chơi của thế giới chung. Đây là bản solo; tổ đội và boss thế giới chưa nằm trong tính năng này.

Ba đợt gồm 4/6/8 yêu thú, mỗi đợt kết thúc chọn một phúc duyên: Kiếm Tâm (+15% sát thương), Kim Cang (-15% sát thương nhận, tối đa 45%), Hồi Xuân (hồi ngay 30% HP và thêm 1% HP/MP mỗi giây). Có thể chọn lặp; tất cả biến mất khi rời lượt. Độ khó khóa theo công, HP và cấp lúc vào. Auto tắt khi vào đợt/chọn phúc duyên; có thể chủ động bật lại.

Hộ Pháp có hai giai đoạn, chuyển ở 50% HP, miễn sát thương 1,5 giây khi chuyển. Chiêu báo vùng đỏ trước 1,35 giây (giai đoạn 1) hoặc ba vùng lệch nhịp, báo trước 1,1 giây (giai đoạn 2). Đòn nổ gây 20%/25% HP tối đa trước giảm sát thương; di chuyển khỏi vùng hoặc dịch chuyển để né. Boss đứng yên và không đánh thường trong lúc vận chiêu. Sau chuỗi nổ, điểm yếu mở 1,5 giây, nhận thêm 25% sát thương.

Hoàn thành nhận 120 + cấp×4 Linh Thạch, 30 + floor(cấp/2) Linh Nguyên, một Đột Phá Đan và một trang bị theo mốc cảnh giới 0/10/25/45. Trang bị ở rương chờ nhận, túi đầy không mất; phải nhận trước khi vào lượt mới. Lưu vật phẩm, lượt thắng và thưởng cùng nhân vật trong SQLite theo cơ chế lưu hiện có. Trận và phúc duyên không tiếp tục sau tải lại; không nhận thưởng hoàn thành nếu chết/rời giữa trận. Cơ chế chiến đấu solo tính ở client như đấu trường hiện tại; chưa phải chế độ thi đấu có xác thực chiến đấu phía server.
