# Sơn Hà: bản cập nhật vùng săn và lò cường hóa

## Vòng chơi

Nhận nhiệm vụ → chọn vùng đúng cấp → chạy tới bãi săn → đánh quái, tự nhặt đồ/đá → về thành cường hóa → mở vùng mạnh hơn. Cảnh giới vẫn tăng sức mạnh nhân vật, nhưng không dùng để chọn tầng quái hoặc tách phòng chơi.

| Vùng | Cấp vào | Cấp quái | Bãi / quái |
| --- | ---: | ---: | ---: |
| Thanh Phong Nguyên | 1 | 1–3 | 6 / 48 |
| Trúc Hải U Cốc | 6 | 8–10 | 6 / 48 |
| Vân Mộng Trạch | 15 | 18–20 | 6 / 48 |
| Hàn Sương Lĩnh | 25 | 30–32 | 6 / 48 |
| Xích Diệm Hoang | 40 | 45–47 | 6 / 48 |
| U Minh Cổ Địa | 60 | 65–67 | 6 / 48 |

Mỗi vùng có mặt bằng liên tục 1.830 × 1.830 đơn vị, đường chính bắc–nam, sáu nhánh vào bãi và trạm an toàn phía nam. Đường phía bắc nối vùng kế tiếp; trạm cho xem danh sách vùng và về Thiên Vân Thành. Menu **Khác → Vùng săn** và NPC Truyền Tống trong thành cũng mở bản đồ vùng. Đi tới vùng khác cần đứng trong vùng an toàn; cửa bắc cho đi thẳng sang vùng kế tiếp sau khi đủ cấp. Các bản đồ tông môn vẫn giữ dịch vụ, nhập môn và kiến trúc hiện có.

## Rơi đồ

- Bỏ giao diện **Chiến lợi phẩm**. Trang bị/nguyên liệu tự vào túi tại chỗ, giữ nguyên vị trí và trạng thái Auto.
- Quái ngoài trời có 16% rơi đạo bào, hộ thối hoặc giày đúng class. Cấp trang bị theo mốc 10 / 25 / 45 / 70, lấy mốc không vượt cấp quái (vùng đầu dùng đồ cấp 10). Vùng 65–67 hiện rơi đồ cấp 45; đồ cấp 70 còn có công thức ghép. Vũ khí và trang bị tiện ích tiếp tục ghép bằng mảnh hoặc đổi cống hiến.
- Trang bị rơi có 1–3 option khác nhau: Công +1–3, HP +5–20, MP +3–12, Giáp +1–2, Bạo kích +0,2–0,8%, Né +0,2–0,6%. Giá trị được lấy thấp hơn trong hai lần random để hạn chế dòng cao. Option không nhân theo cường hóa.
- Server lưu option gắn với UID; sửa hoặc xóa option trong bản lưu bị từ chối. Nhận lại cùng lượt rơi không tạo đồ trùng.
- Quái có 35% rơi Cường Hóa Thạch; quái cấp 30+ có 12% rơi thêm Tinh Luyện Thạch. Thủ lĩnh bí cảnh luôn cho đá, đồng thời giữ phần thưởng mảnh linh khí.
- Nguyên liệu cộng dồn tối đa 9.999/ô và vẫn vào chồng sẵn có khi túi đủ 30 ô. Túi đầy thì trang bị/nguyên liệu cần ô mới **bị bỏ, không lưu ở đâu**; đồ rơi chờ quá 60 giây cũng bị bỏ, nên bán đồ không làm đồ cũ nhảy vào túi.

## Lò cường hóa

Đến NPC **Luyện Khí** tại (1200, 1100) trong Thiên Vân Thành, đứng trong bán kính 100. Bấm NPC/E, chọn hoặc kéo trang bị vào ô đầu; chọn/đặt chồng đá vào ô nguyên liệu; bấm **Cường hóa**. Mobile chạm chọn thay cho kéo thả.

Vũ khí, đạo bào, hộ thối, giày đúng class được nâng tối đa +15, thành công 100%, mỗi cấp +5% chỉ số gốc. Không còn nút nâng ngay trong túi hoặc menu từ xa. Bản cập nhật này thay chi phí Linh Thạch cũ bằng đá + Linh Nguyên:

- Nâng tới `+n`: Cường Hóa Thạch `2 + 2n`, Linh Nguyên `10 + 5n²`.
- Từ +10 thêm Tinh Luyện Thạch `n − 9`.
- Ví dụ +1: 4 đá +15 Linh Nguyên; +9: 20 đá +415 Linh Nguyên; +15: 32 đá thường +6 đá tinh luyện +1.135 Linh Nguyên.

Server kiểm tra vị trí NPC, sở hữu trang bị/chồng nguyên liệu, đúng class, cấp tối đa, revision và mã giao dịch trước khi cập nhật trong một transaction. Thiếu nguyên liệu không trừ tài nguyên. GM được DB cấp quyền vẫn có thể thử miễn phí khi bật GM, nhưng phải tới NPC.

## Đồ họa và nguồn asset

Các cây, hoa, đá và kiến trúc dùng PNG sprite hiện có. Các vật thể mới được bố trí ngoài đường và khoảng chiến đấu; cỏ/nền đất mới không kéo một ảnh cảnh lên toàn bản đồ. Tán cây chuyển động bằng renderer hiện có; NPC dùng sáu tư thế được vẽ riêng cho mỗi vai trò. NPC đứng cố định ở mặt đất, không nhún cả ảnh lên xuống.

Năm PNG mới được tạo bằng **ImageGen built-in**, chế độ generate, không dùng CLI/API key. Bản gốc giữ trong thư mục generated_images của Codex; các bản sử dụng đã được chép vào source:

- `Character/NPC/Motion/city-v1.png`: atlas 1536×1024, 6 cột ×4 hàng. Hàng: thợ rèn, người giao nhiệm vụ, trưởng lão truyền công, vệ binh. Từng ô 256×256, chân ở y=250; 24 tư thế toàn thân, alpha thật.
- `Map/Terrain/meadow-v1.png`: vật liệu cỏ lặp, dùng ở tỷ lệ nhỏ; có biến thể màu qua renderer cho băng/hỏa.
- `Map/Terrain/dirt-v1.png`: vật liệu đường đất, được mask theo đường chạy trong game; biên đường mềm, giao lộ chung một lớp.
- `Item/NguyenLieu/cuong-hoa-v1.png`: icon Cường Hóa Thạch, PNG alpha.
- `Item/NguyenLieu/tinh-luyen-v1.png`: icon Tinh Luyện Thạch, PNG alpha.

### Prompt set cuối cùng

**NPC**

> Create a production game sprite animation atlas for a 2D high quality hand painted Chinese xianxia MMORPG. Transparent PNG background. Strict evenly spaced grid: 6 columns by 4 rows, exactly 24 full body humanoid NPC sprites, no text, no labels, no weapons on ground, no scenery, no cropped heads or feet. All facing three-quarter front, camera elevated 25 degrees, character proportions elegant adult 5 heads tall. Each row is one identical character across six consecutive animation frames with feet anchored at same baseline and identical scale. Row 1: mature burly blacksmith, dark blue leather apron over rust tunic, golden hammer in right hand, performs smooth hammer raise -> strike -> recover, all frames complete. Row 2: female quest guide in ivory and jade flowing Chinese robes, scroll in hand, six gentle breathing and greeting poses with small sleeve movement. Row 3: elderly cultivation trainer in purple robes, long white beard, six idle breathing staff poses. Row 4: male city guard in red and gold armor, spear, six subtle weight shifting idle poses. Crisply painted outlined silhouette, detailed fabric, warm natural palette matching classic isometric fantasy RPG sprites. Keep generous transparent margins in EVERY individual cell, equal grid cells, no overlap between cells. Every row must contain exactly 6 characters. No motion blur, no halos, no checkerboard baked in, no shadows.

**Cỏ**

> Production seamless repeatable terrain texture for an isometric 2D Chinese fantasy MMORPG, square 1024 x 1024 image, tileable all edges. Painted fine short meadow grass, delicate olive and sage greens with softly mottled earth visible underneath, a few tiny moss specks and subtle clover, natural muted colors. Top-down ground material, flat diffuse ambient lighting, consistent texel density across full image. Very subtle and restrained contrast so tiny player sprites stand out. NOT a landscape scene. NO tall grass, NO objects, NO flowers, NO trees, NO stones, NO paths, NO borders, NO horizon, NO text, NO vignetting. Extremely detailed crisp hand painted ground texture, premium classic 2D fantasy MMORPG terrain tile.

**Đất**

> A seamless tileable square ground material texture for a premium hand painted 2D isometric fantasy MMORPG: naturally compacted ochre brown dirt footpath, fine sandy soil, worn earth, scattered tiny mineral specks and subtle dusty patches. Top-down flat diffuse lighting, evenly distributed detail, no large rocks, no vegetation, no footprints, no wheel ruts, no borders, no vignette, no horizon, no objects, no text. Muted warm taupe brown earth, low contrast but crisp fine detail, natural and organic rather than a smooth solid color. Repeat seamlessly at all four edges. Full frame is the dirt material only, 1024 square.

**Cường Hóa Thạch**

> One premium 2D Chinese fantasy MMORPG inventory item icon: Cường Hóa Thạch enhancement stone. A small rough cluster of three aquamarine crystalline mineral shards with a natural dark gray rocky base, cyan inner facets, crisp gold edge reflections, no aura or background. Centered alone, complete silhouette, square composition with 15% transparent margin, hand painted illustrated RPG icon, readable at 48 pixels, sharp detailed beveled facets, diffuse top left light, no text, no UI border, no cast shadow. Genuinely transparent PNG.

**Tinh Luyện Thạch**

> One premium 2D Chinese fantasy MMORPG inventory item icon: Tinh Luyện Thạch refined enhancement stone. A small complete cluster of three violet amethyst crystalline mineral shards joined by a tiny elegant gold clasp with a rune engraved on the front, soft lavender light INSIDE the crystal, no external aura or background. Centered alone, full silhouette, square composition with 15% transparent margin, hand painted illustrated RPG icon, readable at 48 pixels, sharp detailed beveled facets, diffuse top left light, no text, no UI border, no cast shadow. Genuinely transparent PNG.

## Kiểm tra

`python tests/test_mmorpg.py` kiểm tra cấp/phòng chung, manifest, chi phí đủ 15 cấp, nguyên liệu thiếu, vị trí/class, GM, replay, option và tràn túi. `node tests/mmorpg-game.test.cjs` chạy HTTP + SQLite thật, thao tác đặt đồ/đá, kiểm tra từ xa bị chặn, Auto không bị tắt khi nhận đồ, tải đủ asset sáu vùng, sáu tư thế NPC và giao diện mobile. CI chạy thêm các bộ kiểm tra tài khoản, trang bị, progression, bí cảnh/lôi đài và asset đang có.

Đây là bộ thông số cân bằng ban đầu. Các vùng mới dùng chung quái theo map; EXP/tu vi/tiền của các phần gameplay cũ vẫn còn một phần mô phỏng ở client, chưa chuyển toàn bộ economy sang server.
