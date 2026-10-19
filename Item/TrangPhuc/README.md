# Trang phục Ngũ Sắc

Atlas `ngu-sac.png` được tạo bằng ImageGen tích hợp (built-in), RGBA trong suốt. Có 15 sprite nguyên món: 5 pháp bào, 5 hộ thối dạng đai và 5 đôi giày. Vùng nguồn `iconRect` trong `Item/equipment.json` bỏ các đường chia ô; renderer inventory lấy nguyên món, không ghép vào mặt/đầu nhân vật.

Năm màu: Xích Diệm (đỏ), Hàn Sương (xanh băng), Thanh Trúc (xanh ngọc), Bạch Nguyệt (trắng), Huyền Dạ (đen). Mỗi bộ có ba món riêng cho mỗi class, tổng cộng 60 template. Đây là các biến thể màu của trang bị khởi đầu, cùng chỉ số; không có cộng thưởng bộ. Pháp bào đang mặc quyết định màu trang phục hiển thị. Hộ thối/giày vẫn có chỉ số và điều kiện class của riêng từng món.

Tạo nhân vật chọn 1 trong 10 dung mạo và màu trang phục. Ba món khởi đầu được mặc sẵn theo màu đã chọn, túi đồ trống. Dung mạo được lưu ở `ap.face`; mặt nạ tạm thay nó, tháo mặt nạ trở về dung mạo đã chọn. Nhân vật cũ dùng dung mạo 1 nếu chưa có trường này, không tự nhận thêm đồ.

Renderer `js/35m-character-wardrobe.js` đổi bảng màu phần trang phục trên nguyên sprite, giữ vùng đầu, alpha, chi tiết da và viền kim loại. Cache màu nằm trong giới hạn 64 frame của nhân vật và 24 frame quay lưng. Trang bị pháp bảo/pháp trận vẫn giữ chỉ số, không hiển thị trên người; vòng trang trí mặc định dưới chân cũng được gỡ. Các hiệu ứng chân/cảnh giới riêng vẫn hoạt động.

## Prompt tạo atlas

Create a production inventory sprite atlas of FIFTEEN full equipment icons for a Chinese xianxia cultivation RPG, polished detailed hand-painted silk, engraved metal, clear silhouettes. Inputs 1-3 are design references: ornate Taoist robe, protective belt, pair of boots. EXACTLY FIVE equal columns and THREE equal rows. Each column is one matching color ensemble: column1 crimson red/gold Xich Diem, column2 icy cyan/silver Han Suong, column3 jade green/gold Thanh Truc, column4 ivory white/silver Bach Nguyet, column5 midnight charcoal/gold Huyen Da. Row1 FIVE complete robes, row2 FIVE complete protective belts with ornate clasps (no robes), row3 FIVE pairs of complete boots. One whole item per cell. Keep each icon fully inside the center 65 percent of its cell with generous clear transparent space on all four sides, no clipping and no overlap. All hems, tassels, toes and ribbons complete. Thin gray registration grid lines separating the five columns and three rows only, equal-sized cells. True transparent PNG background, no floor, no cast shadows, no glow cloud, no labels or text, no character bodies, no weapons. Elegant gold embroidery, balanced readable inventory icons, matching robes belts boots per color, colors unmistakably different.

