# Thiết kế gameplay Tiên Lộ Online

Không có gameplay tốt nhất cho mọi nhóm người chơi. Hướng phù hợp với source này là **ARPG tu tiên hợp tác**, chơi được một mình nhưng gặp đạo hữu sẽ có lợi: combo rõ, skill chủ động, tiến trình có mục tiêu và trang bị có lựa chọn.

Thiết kế tham khảo cách hướng dẫn theo mốc của [Guild Wars 2 New Player Guide](https://www.guildwars2.com/en/new-player-guide/) và chiến đấu hợp tác ngoài thế giới của [Guild Wars 2 Combat](https://www.guildwars2.com/en/the-game/combat/). Các con số dưới đây là lựa chọn riêng của Tiên Lộ, chưa phải kết quả cân bằng qua dữ liệu người chơi.

## Giao diện thiên về thao tác — 17/10/2026

Thay phần lớn đoạn mô tả thường trực bằng sprite hiện có, thẻ hoạt động, ô thưởng, thanh tiến độ và nút hành động. Chi tiết đầy đủ vẫn có trong phần mở rộng; xác nhận rời đội/chuyển quyền và chi phí không bị giấu. Không thay asset map, chiến đấu hoặc dữ liệu nhân vật khi đổi giao diện.

- Hoạt động: hai cột, hình khu vực, thưởng dạng chip, tiến độ đạo hạnh/nhiệm vụ/mảnh. HUD chỉ giữ mục tiêu ngắn, chạm mở bảng.
- Học chiêu: icon từ sprite đúng class, MP/cooldown, điều kiện cảnh giới, học hoặc nâng cấp và thanh 0–3.
- Cường hóa: hình từng món, cấp 0–15, chỉ số hiện tại, giá cấp tiếp theo; không đủ nguyên liệu thì khóa nút. Thành công có thông báo hình trang bị.
- Bộ đồ: bốn thẻ bộ, tiến độ 0–6, mốc 2/4/6; sáu ô đổi món có icon. Giữ chặn đổi bộ săn giữa lượt bí cảnh và giữ kiểm tra túi đầy.
- Linh thú: chọn trứng bằng hình, chọn pet bằng thẻ, tên kỹ năng/cooldown ngắn. Chạm Chi tiết xem tác dụng pet đang chọn.
- Boss/bí cảnh: hình boss và thưởng, luật đóng góp/né đòn mở trong Chi tiết. Trạng thái hồi sinh và quyền nhận rương vẫn từ server.
- Bách khoa: 12 mục/trang, icon và chỉ số chính, tìm không dấu, chi tiết/nguồn nhận mở theo từng mục; đổi bộ lọc/từ khóa quay về trang đầu.

Sửa auto giữ mục tiêu khi khoảng cách chỉ thay đổi nhỏ, tránh liên tục reset combo. Ưu tiên boss và bộ lọc quái vẫn được tôn trọng. Callback nhận thưởng nhập môn/Hộ thành kiểm tra lại trạng thái và số quái trước khi phát, tránh cộng lần nữa khi gọi lại nút cũ. Đây là kiểm tra tính đúng đắn phía client, không thay thế lộ trình server xác thực toàn bộ kinh tế.

## Tham khảo gameplay và sổ tay mới

Ngày 16/10/2026, xem trực tiếp tài khoản Phàm Nhân tại [Tu Tiên 2D](https://tutien2d.com/?choi): nhiệm vụ nhiều bước, auto có bộ combo và ưu tiên mục tiêu, bí tịch có điều kiện học, bảng hoạt động/lịch boss, bản đồ mô tả khu vực, công thức rèn chỉ rõ nguyên liệu thiếu. Các hoạt động cấp cao bị khóa theo cảnh giới; chưa kiểm chứng thực chiến của chúng. Chỉ tham khảo cấu trúc, không dùng code hay asset của trang này.

Tiên Lộ triển khai ba phần dựa trên dữ liệu và luật riêng đang có:

- **Tiên Đồ → Hoạt động** (hoặc chạm khung Tiên Đồ): nhiệm vụ nhập môn, điều kiện học chiêu tiếp theo, tu luyện, Linh Mạch Cốc, bí cảnh, đấu trường, boss thế giới, tổ đội/tông môn và bộ đồ. Hiện tiến độ, nguồn thưởng, trạng thái chờ nhận. Mở chi tiết đấu trường chỉ kiểm tra lượt; nút vào trận hiện có mới tiêu lượt. Truyền tống từ bảng chỉ cho phép sau nhập môn, ở nơi an toàn, ngoài thử thách. Không thêm cơ chế phát thưởng song song.
- **Chiến pháp → Combo Auto**: hai bộ Luyện công / Săn boss lưu riêng từng class vào SQLite cùng nhân vật. Có đổi thứ tự bốn skill, bật/tắt từng skill và đánh thường, ưu tiên gần nhất / boss-thủ lĩnh / chỉ quái thường / tỉ lệ HP thấp nhất trong bán kính 380. Bộ Luyện công mặc định đánh đủ năm chiêu như cũ. Bộ Săn boss mặc định tắt tự dùng skill 2, giữ lại để người chơi né; có thể bật lại. Tự đổi bộ theo loại mục tiêu là tùy chọn, mặc định tắt; luật tìm mục tiêu lấy từ bộ đang chọn. Đánh thường vẫn đan giữa các skill, khoảng cách giữa hai lần tự tung skill ít nhất 0,85s, không bỏ qua mana/học chiêu/cooldown. Thuốc trong túi có công tắc và ngưỡng HP/MP 10–80%, mặc định 30%/20%; không mua thuốc tự động. Auto không tự né boss và không đánh người chơi.
- **Bách khoa**: tìm có dấu hoặc không dấu, lọc kỹ năng / vật phẩm / bản đồ / yêu thú / linh thú. Đọc trực tiếp catalog skill, cooldown, mana, điều kiện học, trang bị thường và 96 template bộ, map và pet. Chỉ số quái là gốc, ghi rõ có tăng theo tầng/hoạt động. Không dùng dữ liệu cân bằng của game tham khảo.

Hướng tiếp theo từ khảo sát: mở rộng nhiệm vụ kể chuyện dẫn vào từng vùng, hệ thống bí tịch chủ động/bị động với lựa chọn build, thêm công thức có nguyên liệu theo vùng. Chỉ mở giao dịch hoặc PvP có phần thưởng khi kinh tế và tiến trình được server xác thực đầy đủ; bản này chưa thêm các hệ thống đó.

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
2. Tiếp tục mở rộng boss hợp tác sau Thái Cổ Huyết Ma đã triển khai: thêm cơ chế phối hợp, kiểm chứng thời gian né bằng playtest. Mục tiêu là thắng nhờ hiểu chiêu, không chỉ đứng auto và tăng chỉ số.
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

Mỗi nhân vật được nhận một lần bốn trứng: Linh Đường Lang, Nguyệt Thố, Huyết Nhện và Băng Dực Dơi. Bản lưu cũ cũng nhận quà một lần; túi đầy sẽ chờ ô trống thay vì xóa đồ. Ấp một trứng trong ba giây; trạng thái đang ấp, bộ sưu tập và pet xuất chiến được lưu cùng nhân vật. Một pet đi theo, tối đa 20 pet trong bộ sưu tập. Pet dùng sprite quái sẵn có với kích thước nhỏ, có idle/di chuyển và kỹ năng chiến đấu mô tả ở phần Bộ trang bị và kỹ năng pet bên dưới. Người chơi online nhìn thấy pet và cấp cường hóa của nhau.

## Vân Hải Bí Cảnh (solo)

Mở Khác → Bí cảnh sau khi nhập môn và đứng tại vùng an toàn. Dùng đài riêng như đấu trường nhưng không tiêu hao lượt đấu trường, không trộn quái/người chơi của thế giới chung. Đây là bản solo; tổ đội và boss thế giới chưa nằm trong tính năng này.

Ba đợt gồm 4/6/8 yêu thú, mỗi đợt kết thúc chọn một phúc duyên: Kiếm Tâm (+15% sát thương), Kim Cang (-15% sát thương nhận, tối đa 45%), Hồi Xuân (hồi ngay 30% HP và thêm 1% HP/MP mỗi giây). Có thể chọn lặp; tất cả biến mất khi rời lượt. Độ khó dùng công/HP cơ bản theo cấp khi vào, không tăng theo đồ mặc: trang bị tốt giúp vượt nhanh và chịu đòn tốt hơn. Auto tắt khi vào đợt/chọn phúc duyên; có thể chủ động bật lại.

Hộ Pháp có hai giai đoạn, chuyển ở 50% HP, miễn sát thương 1,5 giây khi chuyển. Chiêu báo vùng đỏ trước 1,35 giây (giai đoạn 1) hoặc ba vùng lệch nhịp, báo trước 1,1 giây (giai đoạn 2). Đòn nổ gây 20%/25% HP tối đa trước giảm sát thương; di chuyển khỏi vùng hoặc dịch chuyển để né. Boss đứng yên và không đánh thường trong lúc vận chiêu. Sau chuỗi nổ, điểm yếu mở 1,5 giây, nhận thêm 25% sát thương.

Hoàn thành nhận 120 + cấp×4 Linh Thạch, 30 + floor(cấp/2) Linh Nguyên, một Đột Phá Đan và một trang bị theo mốc cảnh giới 0/10/25/45. Trang bị ở rương chờ nhận, túi đầy không mất; phải nhận trước khi vào lượt mới. Lưu vật phẩm, lượt thắng và thưởng cùng nhân vật trong SQLite theo cơ chế lưu hiện có. Trận và phúc duyên không tiếp tục sau tải lại; không nhận thưởng hoàn thành nếu chết/rời giữa trận. Cơ chế chiến đấu solo tính ở client như đấu trường hiện tại; chưa phải chế độ thi đấu có xác thực chiến đấu phía server.

## Phản hồi và cân bằng chiến đấu

Quái có phản ứng giật nhẹ theo hướng nhận đòn và chớp sáng theo silhouette. Đánh liên tục không khởi động lại animation đau ở mỗi hit. Quái chung chỉ phản ứng khi snapshot server xác nhận mất máu; hiệu ứng giật ảnh không đẩy tọa độ quái trên server.

Skill 2 thi triển thành công cấp cửa sổ né 0,22 giây cho cả bốn class; chiêu thiếu mana, chưa học hoặc đang hồi không cấp né. Cửa sổ không khóa di chuyển và không thay tốc độ animation skill. Né đòn cận chiến, đòn server gửi hoặc vùng boss có thông báo NÉ THÀNH CÔNG; các hit dồn được gộp để tránh spam. Xóa trạng thái khi hồi sinh/chuyển map; dialog tạm dừng đồng hồ.

Boss/thủ lĩnh local ngoài bí cảnh báo vùng đỏ trước 1,3 giây, dưới 50% HP báo trước 1,1 giây với vùng lớn hơn. Boss đứng vận chiêu, không đánh thường trong lúc vận hoặc hồi sức 0,85 giây. Đóng băng/choáng/phong ấn trong lúc vận ngắt chiêu. Boss bí cảnh dùng chung cách hiển thị cảnh báo và phản hồi né; hiệu ứng khống chế cứng cũng ngắt chuỗi nổ đang vận, mở điểm yếu 0,7 giây. Cảnh báo được khóa tại vị trí khi bắt đầu, không đuổi theo người chơi. Không tạo boss giả hay tự tính sát thương boss thay server trong map quái chung.

Cân bằng đánh thường dùng một bảng duy nhất trong combatBalance: Kiếm 0,34 giây/đòn, tầm 82, sát thương combo 0,8/0,85/1/1,8× công; Liềm 0,44 giây, tầm 215, 0,75/0,85/1,25× công (còn đòn quay về); Thương 0,50 giây, tầm 115, 1,1/1,2/1,25/1,65× công; Quạt 0,50 giây, tầm 275, 0,75/0,9/1,25× công. Giữ cơ chế đòn kết, Lôi/Phù Ấn, AoE, trường khống chế, giảm sát thương và cooldown bốn skill đã có. Đây là lượt cân bằng đầu, chưa phải kết luận cân bằng PvP. Tu luyện và tooltip skill giải thích vai trò từng class.

## Bộ trang bị và kỹ năng pet

Bốn bộ cho mọi class, mỗi bộ đủ sáu slot; bốn bậc yêu cầu cấp 0/10/25/45, tổng cộng 96 template. Mốc 2/4/6 cộng dồn, đếm theo slot đang mặc, có thể phối 4+2 hoặc 2+2+2. Được trộn bậc trong cùng bộ. Thưởng bộ độc lập và nhân tiếp với thưởng full set cường hóa hiện có; không ghi đè chỉ số gốc. Giới hạn bạo/né cũ giữ nguyên.

- Kiếm Phong: 2 món +6% tổng công; 4 món +3% bạo; 6 món +10% sát thương skill.
- Kim Cang: 2 món +10% tổng HP; 4 món +8 giáp; 6 món +3% né.
- Nguyệt Ảnh: 2 món +15% tổng MP; 4 món +8% sát thương skill; 6 món +3% bạo.
- Vạn Linh: 2 món +5% tổng HP; 4 món +25% hiệu lực kỹ năng pet (cả hồi phục); 6 món -20% hồi chiêu pet.

Khác → Bộ đồ: chọn bộ muốn săn, xem các mốc đang kích hoạt và đổi món. Bí cảnh khóa bộ săn khi vào; chiến thắng thưởng một món đúng bộ, đúng bậc cảnh giới lúc vào, ưu tiên các món chưa có trong túi/trên người. Ngoài rương trang bị còn có 3 mảnh bí cảnh mỗi lượt; 6 mảnh đổi một slot chỉ định của bộ đã chọn. Mảnh lưu SQLite cùng nhân vật. Túi đầy không tiêu mảnh; rương cũ vẫn chờ nhận và chặn vào lượt mới đến khi nhận. Các template độc quyền không được bán trong shop hoặc lẫn vào bảng rơi quái thường.

Nút Pet phía trên cụm skill dùng kỹ năng linh thú đang xuất chiến. Trong Linh thú có mô tả kỹ năng và tùy chọn Pet tự dùng skill khi Auto. Auto tấn công pet chỉ hoạt động khi auto nhân vật bật, có mục tiêu ngoài vùng an toàn; Thỏ hồi phục khi HP <65% hoặc MP <25%.

- Linh Đường Lang: Liêm Phong, chém đơn mục tiêu 240% công, hồi 12s.
- Nguyệt Thố: Nguyệt Quang, hồi 18% HP và 15% MP tối đa, hồi 20s; không tiêu chiêu nếu cả hai đầy.
- Huyết Nhện: Độc Vụ, năm nhịp độc, mỗi giây 70% công (tổng 350%), hồi 16s.
- Băng Dực Dơi: Băng Tức, 90% công trong bán kính 70, chậm 30% trong 3s; boss/thủ lĩnh chậm 15%, hồi 14s.

Tầm tấn công pet 260. Pet không tự bạo kích, không hưởng hệ số buff đánh của trường Kiếm/Quạt; vẫn chịu tác động yếu điểm mục tiêu. Hồi chiêu dùng chung giữa tất cả pet, lưu thời điểm sẵn sàng theo thời gian thực để đổi pet, thu hồi, chuyển map hoặc tải lại không reset. Hiệu ứng và độc local kết thúc khi đổi pet/rời trận; snapshot online công khai trạng thái độc/băng và sự kiện pet cho người khác.

Quái chung: client gửi ID lần dùng và ID mục tiêu; server đọc pet đang xuất chiến trong bản lưu, kiểm tra loài, khoảng cách và trạng thái, tự tính sát thương/độc/băng theo catalog chung. SQLite có bảng pet_skill_cooldowns giữ hồi chiêu qua tái kết nối/restart, từ chối replay và đổi pet để spam. Pet gây chết quái đi qua cùng cơ chế contributor/reward/ack của đòn người chơi. Độc online tiếp tục khi mở UI, dừng nếu chủ đổi map/đổi pet hoặc rời thế giới. Hồi phục và trận solo dùng mô hình chỉ số client/lưu nhân vật hiện có.

## Tổ đội, tông môn người chơi và boss thế giới

Khác → Đạo hữu mở ba thẻ Tổ đội / Tông môn / Boss & Rương. Dữ liệu xã hội nằm trong SQLite, độc lập với JSON nhân vật để bản lưu cũ không ghi đè thành viên, quyền hoặc nhiệm vụ. Lời mời, duyệt đơn và rương chưa nhận có dấu báo trên nút Khác.

Tổ đội tối đa 4 người: đội trưởng tạo/mời, thành viên chấp nhận hoặc từ chối lời mời trong 120 giây. Có rời đội, chuyển trưởng và mời rời; trưởng rời thì tự chuyển quyền cho người vào lâu nhất. Đội lưu qua đăng nhập/restart. HUD hiện HP đồng đội, vị trí xem trong bảng Đạo hữu; đồng đội cùng map có dấu ◆. Khi hạ quái thường, đồng đội online còn sống, cùng map/tầng luyện công và cách quái không quá 350 nhận cùng lượt thưởng; người đã trực tiếp đánh vẫn dùng luật đóng góp 15 giây cũ. Không nhân thêm thưởng theo số người, không chia rương boss cho thành viên không tham chiến. Bí cảnh solo và lượt đấu trường riêng vẫn hoạt động độc lập.

Tông môn do người chơi lập tách khỏi phái Kiếm/Liềm/Thương/Quạt, mọi class có thể cùng gia nhập. Lập cần 200 Linh Thạch tại vùng an toàn, tên 3–24 ký tự; tối đa 30 người. Có xin vào, tông chủ duyệt/từ chối, chuyển quyền, trục xuất và rời môn. Tông chủ rời tự chuyển quyền, thành viên cuối rời giải tán. Cống hiến cá nhân mất khi rời môn; UI xác nhận thao tác quản lý/rời tông môn.

Đóng góp 100 Linh Thạch được 10 điểm xây dựng và 10 cống hiến, tối đa 5 lần/ngày/người kể cả đổi tông môn. Cứ 200 điểm xây dựng tăng một cấp danh vọng (hiện không cộng chỉ số chiến đấu). Nhiệm vụ ngày theo UTC+7: cùng hạ 20 quái chung (80 Linh Thạch, 20 Linh Nguyên, 1 mảnh) và hạ một boss thế giới (150 Linh Thạch, 30 Linh Nguyên, 2 mảnh). Một quái chỉ tăng một lần cho mỗi tông môn tham gia, dù có nhiều thành viên/đồng đội. Mỗi người nhận mỗi nhiệm vụ một lần/ngày, không reset khi đổi môn.

Chat chọn kênh Map / Đội / Tông. Server kiểm tra thành viên trước khi gửi và trước khi trả lịch sử; chat Đội/Tông có thể đọc giữa các map, người ngoài không đọc được. Nội dung và tên dùng textContent.

Thái Cổ Chiến Trường là map boss chung mọi cảnh giới/tầng luyện công; dùng sprite đảo và lát đá hiện có, giới hạn đi lại theo mặt đài. Boss Thái Cổ Huyết Ma có 30.000 HP, hai giai đoạn: 50% HP phá ấn miễn sát thương 1,5 giây, giai đoạn hai tung ba vùng nổ lệch nhịp. Cảnh báo 1,4s / 1,1s khóa vị trí lúc bắt đầu. Server xác định vị trí, giải quyết vùng nổ, kiểm tra cửa sổ né 0,22s và cooldown né theo class; không tin cờ né từ client. Khống chế cứng đúng lúc ngắt vận chiêu. Menu không tạm dừng boss; vùng nổ vẫn đánh người đang mở UI. Sự kiện sát thương có ID và ack để retry không trừ HP hai lần.

Mỗi người cần đóng góp min(1% HP boss, 6× công hiện tại), tối đa 300; cả sát thương pet/độc được tính. Phải còn sống, ở chiến trường, online và gây sát thương trong 60 giây cuối khi boss chết. Người đủ điều kiện nhận một rương: 250 Linh Thạch +60 Linh Nguyên +5 mảnh bí cảnh; không giành đòn cuối. HP, encounter, đóng góp và thời điểm tái xuất lưu SQLite; restart không làm boss hồi đầy hoặc nhân đôi rương. Boss tái xuất sau 5 phút tính từ khi bị hạ, có bảng đếm ngược.

Rương boss lưu riêng đến khi nhận tại vùng an toàn. Các thao tác nhận rương, nhận nhiệm vụ, đóng góp/lập môn khóa transaction, kiểm tra revision và mã thao tác; cập nhật nhân vật và đánh dấu đã nhận trong cùng giao dịch. Client lưu xong rồi tạm khóa autosave, nhận snapshot/revision mới từ server và đồng bộ lại trước khi tiếp tục. Dữ liệu quái mạng đang về trong lúc giao dịch sẽ chờ frame kế tiếp để tránh ghi đè phần thưởng.
