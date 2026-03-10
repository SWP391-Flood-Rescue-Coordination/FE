# Tính năng Tạo Phiếu Nhập Kho Vật Tư Cứu Trợ

## Mô tả tổng quan

Tính năng này cho phép Manager tạo phiếu nhập kho để ghi nhận vật tư cứu trợ khi tiếp nhận hàng từ các nguồn hỗ trợ (nhà tài trợ, tổ chức, cơ quan khác,...). Phiếu nhập kho giúp ghi nhận nguồn gốc vật tư, phân loại vật tư và vị trí tiếp nhận hàng trước khi cập nhật vào tồn kho.

## Cấu trúc file

```
src/
├── pages/
│   ├── ManagerImportReceiptPage.jsx          # Component trang tạo phiếu nhập kho
│   ├── ManagerImportReceiptPage.css          # Style cho trang tạo phiếu
│   ├── ManagerImportReceiptsListPage.jsx     # Component trang danh sách phiếu nhập kho
│   └── ManagerImportReceiptsListPage.css     # Style cho trang danh sách
├── services/
│   └── managerService.js                     # Service chứa các API methods (đã cập nhật)
└── App.jsx                                   # Router configuration (đã cập nhật)
```

## Các file đã tạo/cập nhật

### 1. ManagerImportReceiptPage.jsx
Component React chính cho trang tạo phiếu nhập kho.

**Đường dẫn:** `src/pages/ManagerImportReceiptPage.jsx`

**Chức năng chính:**
- Hiển thị form nhập thông tin phiếu nhập kho
- Cho phép chọn vật tư và phân loại từ danh sách
- Quản lý danh sách vật tư đã chọn
- Validation dữ liệu đầu vào
- Gọi API để tạo phiếu nhập kho
- Hiển thị thông báo thành công/lỗi

### 2. ManagerImportReceiptPage.css
Style cho trang tạo phiếu nhập kho, đồng bộ với toàn bộ project.

**Đường dẫn:** `src/pages/ManagerImportReceiptPage.css`

**Style chính:**
- Layout responsive
- Form sections với border và background
- Table hiển thị danh sách vật tư
- Buttons với hover effects
- Error và success messages
- Loading states

### 3. ManagerImportReceiptsListPage.jsx
Component React cho trang xem danh sách phiếu nhập kho.

**Đường dẫn:** `src/pages/ManagerImportReceiptsListPage.jsx`

**Chức năng chính:**
- Hiển thị danh sách các phiếu nhập kho đã tạo
- Search/filter theo nguồn gốc, địa chỉ, người tạo
- Card layout với thông tin tóm tắt
- Modal xem chi tiết phiếu nhập kho
- Hiển thị danh sách vật tư trong mỗi phiếu

### 4. ManagerImportReceiptsListPage.css
Style cho trang danh sách phiếu nhập kho.

**Đường dẫn:** `src/pages/ManagerImportReceiptsListPage.css`

**Style chính:**
- Grid layout responsive cho cards
- Search bar với icon
- Modal overlay với animation
- Detail table trong modal
- Empty state
- Loading states

### 5. managerService.js (đã cập nhật)
ThêmTruy cập từ Manager Dashboard

Trong [Manager Dashboard](src/pages/ManagerDashboardPage.jsx), có 2 nút chính:

1. **Nút "Tạo phiếu nhập kho"** (màu đỏ `#dc2626`)
   - Điều hướng đến `/manager/import-receipt`
   # Bước 1: Điền thông tin nguồn gốcg với border)
   - Điều hướng đến `/manager/import-receipts`
   - Để xem danh sách các phiếu đã tạo

### 1. Tạo phiếu nhập kho mới

#### Bước 2:** Nhấn nút "Tạo phiếu nhập kho" hoặc điều hướng đếnervices/managerService.js`

**Methods mới:**
```javascript
// Lấy danh sách phân loại vật tư
getCategories: async () => { ... }

// Tạo phiếu nhập kho
createImportReceipt: async (payload) => { ... }

// Lấy danh sách phiếu nhập kho
getImportReceipts: async () => { ... }
```

### 6. App.jsx (đã cập nhật)
Thêm routes mới cho các trang phiếu nhập kho.

**Đường dẫn:** `src/App.jsx`

**Routes mới:**
```javascript
<Route path="/manager/import-receipt" element={<ManagerImportReceiptPage />} />
<Route path="/manager/import-receipts" element={<ManagerImportReceiptsListPage />} />
```

### 7. ManagerDashboardPage.jsx (đã cập nhật)
Thêm nút "Xem phiếu nhập kho" vào header.

**Đường dẫn:** `src/pages/ManagerDashboardPage.jsx`

**Cập nhật:**
- Thêm nút "Xem phiếu nhập kho" với UI giống nút "Xem yêu cầu" của citizen
- Nút nằm giữa "Tạo phiếu nhập kho" và icon thông tin tài khoản
- Navigation đến `/manager/import-receipts`

## Hướng dẫn sử dụng

### 1. Truy cập trang

Điều hướng đến route: `/manager/import-receipt`

**Lưu ý:** Chỉ user có role `MANAGER` mới có thể truy cập trang này.

#### Bước 3: Chọn vật tư nhập khoc hàng
- Nhập nguồn gốc (ví dụ: "Nhà tài trợ ABC", "Tổ chức Từ Thiện XYZ", "Sở Cứu Trợ Khẩn Cấp")
- Trường này là bắt buộc
Chọn vật tư cần nhập từ dropdown
- Chọn phân loại (category) từ dropdown

### 3. Chọn vật tư nhập kho

**Bước 1:** Chọn vật tư từ dropdown
- Danh sách vật tư được load từ API
- Chọn vật tư cần nhập

**Bước 2:** Chọn phân loại (category)
- Danh sách phân loại được load từ API
- Chọn phân loại phù hợp với vật tư

**Bước 3:** Nhập số lượng
- Nhập số lượng cần nhập kho
- Số lượng phải lớn hơn 0
Nhập số lượng (phải > 0)
- Nhấn "Thêm vật tư"

#### Bước 4:h sửa vật tư:**
- Nhấn nút "Chỉnh sửa" (icon bút) trên hàng muốn sửa
- Form sẽ được điền lại thông tin vật tư đó
- Chỉnh sửa và nhấn "Cập nhật"

**Xóa vật tư:**
- Nhấn nút "Xóa" (icon thùng rác) trên hàng muốn xóa
- Vật tư sẽ bị xóa khỏi danh sách

- Xem danh sách vật tư đã chọn trong bảng
- Chỉnh sửa hoặc xóa vật tư nếu cần

#### Bước 5: Submit phiếu nhập kho
### Payload gửi lên API

```javascript
{
  "source": "Nhà tài trợ ABC",
  "receive_address": "123 Đường ABC, Quận 1, TP.HCM",
  "items": [
    {
      "item_id": 1,
      "category_id": 2,
  Kiểm tra thông tin đã điền
- Nhấn "Tạo phiếu nhập kho"
- Xử lý kết quả:
}
```

### Cấu trúc object vật tư trong danh sách

  - **Thành công:** Hiển thị thông báo thành công, form sẽ được reset sau 2 giây
  - **Lỗi:** Hiển thị thông báo lỗi chi tiết

### 2. Xem danh sách phiếu nhập kho

**Truy cập:** Nhấn nút "Xem phiếu nhập kho" hoặc điều hướng đến `/manager/import-receipts`

**Chức năng:**

#### Tìm kiếm phiếu nhập kho
- Sử dụng thanh search để tìm theo:
  - Nguồn gốc hàng
  - Địa chỉ tiếp nhận
  - Người tạo phiếu

#### Xem danh sách
- Hiển thị dạng cards với thông tin:
  - Mã phiếu nhập
  - Ngày giờ tạo
  - Nguồn gốc
  - Địa chỉ tiếp nhận
  - Số lượng vật tư
  - Người tạo

#### Xem chi tiết phiếu
- Nhấn nút "Xem chi tiết" trên card
- Modal hiển thị:
  - Thông tin chung của phiếu
  - Bảng danh sách vật tư chi tiết (tên, phân loại, số lượng, đơn vị)
  item_id: 1,              // ID của vật tư
  itemName: "Nước uống",   // Tên vật tư
  category_id: 2,          // ID phân loại
  categoryName: "Nhu yếu phẩm",  // Tên phân loại
  quantity: 100,           // Số lượng
  unit: "chai"             // Đơn vị tính
}
```

## API Endpoints

### 1. Lấy danh sách vật tư
```
GET /Manager/supplies
```

**Response:**
```javascript
{
  "data": [
    {
      "supplyId": 1,
      "name": "Nước uống đóng chai",
      "type": "Nhu yếu phẩm",
      "unit": "chai",
      ...
    }
  ]
}
```

### 2. Lấy danh sách phân loại
```
GET /Manager/categories
```

**Response:**
```javascript
{
  "data": [
    {
      "categoryId": 1,
      "name": "Nhu yếu phẩm"
    },
    {
      "categoryId": 2,
      "name": "Thực phẩm"
    }
  ]
}
```

### 3. Tạo phiếu nhập kho
```
POST /Manager/import-receipts
```

**Request Body:**
```javascript
{
  "source": "string",
  "receive_address": "string",
  "items": [
    {
      "item_id": "number",
      "category_id": "number",
      "quantity": "number"
    }
  ]
}
```

**Response:**
```javascript
{
  "data": {
    "receiptId": 123,
    "message": "Tạo phiếu nhập kho thành công"
  }
}
```


### 4. Lấy danh sách phiếu nhập kho
```
GET /Manager/import-receipts
```

**Response:**
```javascript
{
  "data": [
    {
      "receiptId": 1,
      "source": "Nhà tài trợ ABC",
      "receiveAddress": "123 Đường ABC, Quận 1, TP.HCM",
      "createdAt": "2026-03-05T10:30:00",
      "createdBy": "admin",
      "totalItems": 3,
      "items": [
        {
          "itemName": "Nước uống",
          "categoryName": "Nhu yếu phẩm",
          "quantity": 100,
          "unit": "chai"
        }
      ]
    }
  ]
}
```
## Validation Rules

### 1. Nguồn gốc hàng (source)
- ✅ Bắt buộc
- ✅ Không được để trống
- ❌ Không cho phép submit nếu thiếu

### 2. Địa chỉ tiếp nhận (receive_address)
- ✅ Bắt buộc
- ✅ Không được để trống
- ❌ Không cho phép submit nếu thiếu

### 3. Danh sách vật tư (items)
- ✅ Bắt buộc
- ✅ Phải có ít nhất 1 vật tư
- ❌ Không cho phép submit nếu danh sách rỗng

### 4. Mỗi vật tư trong danh sách
- ✅ Phải chọn vật tư
- ✅ Phải chọn phân loại
- ✅ Số lượng phải lớn hơn 0
- ❌ Không cho phép thêm nếu vi phạm

### 5. Quy tắc số lượng
```javascript
quantity > 0           // Hợp lệ
quantity <= 0          // Không hợp lệ
quantity = null        // Không hợp lệ
quantity = ""          // Không hợp lệ
```

## States và Loading

### Loading States

**1. Page Loading (isLoading)**
- Hiển thị khi đang fetch dữ liệu ban đầu
- Hiển thị spinner và text "Đang tải dữ liệu..."

**2. Submit Loading (isSubmitting)**
- Hiển thị khi đang tạo phiếu nhập kho
- Button submit disabled
- Hiển thị spinner và text "Đang xử lý..."

### Error States

**1. Validation Errors (validationErrors)**
- Hiển thị lỗi cho từng trường input
- Lỗi được hiển thị dưới input tương ứng
- Border input chuyển sang màu đỏ

**2. API Errors (errorMessage)**
- Hiển thị lỗi từ API
- Hiển thị ở đầu form
- Background màu đỏ nhạt

### Success States

**1. Success Message (successMessage)**
- Hiển thị khi tạo thành công
- Hiển thị ở đầu form
- Background màu xanh nhạt
- Tự động ẩn sau 2 giây

## Xử lý lỗi

### Lỗi từ API

```javascript
managerService.getErrorMessage(error)
```

**Các loại lỗi:**
- **401:** "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại."
- **403:** "Bạn không có quyền truy cập chức năng này."
- **404:** "Không tìm thấy dữ liệu."
- **500+:** "Hệ thống đang gặp lỗi. Vui lòng thử lại sau."
- **Default:** Message từ server hoặc "Có lỗi xảy ra. Vui lòng thử lại."

### Xử lý unauthorized

```javascript
useEffect(() => {
  const user = authService.getUserInfo()
  if (!user || user.role !== 'MANAGER') {
    navigate('/login', { replace: true })
    return
  }
}, [navigate])
```

## UI/UX Features

### 1. Form Sections
- Chia form thành các sections rõ ràng
- Background khác màu để phân biệt
- Border và padding hợp lý

### 2. Responsive Design
- Hoạt động tốt trên mobile, tablet, desktop
- Grid layout tự động điều chỉnh
- Table scroll ngang trên mobile

### 3. Interactive Elements
- Hover effects cho buttons
- Focus states cho inputs
- Smooth transitions
- Row highlight khi đang edit

### 4. Visual Feedback
- Loading spinners
- Success/error messages với icons
- Disabled states rõ ràng
- Required field indicator (*)

### 5. User Experience
- Auto-scroll to form khi edit
- Cancel button khi đang edit
- Confirmation trước khi xóa (có thể thêm)
- Form reset sau khi submit thành công

## Accessibility

- Semantic HTML elements
- ARIA labels cho buttons
- Proper form labels
- Keyboard navigation support
- Focus management

## Lưu ý quan trọng

### 1. Authentication
- Trang này chỉ dành cho MANAGER
- Tự động redirect về login nếu không có quyền
- Check role trong useEffect

### 2. Data Fetching
- Sử dụng Promise.allSettled để fetch parallel
- Có fallback data nếu API chưa có
- Error handling cho mọi API call

### 3. Validation
- Client-side validation trước khi submit
- Hiển thị lỗi chi tiết cho từng trường
- Không cho phép submit nếu dữ liệu không hợp lệ

### 4. State Management
- Sử dụng multiple useState hooks
- Clear separation of concerns
- Proper state updates

### 5. Code Quality
- Clean code structure
- Proper naming conventions
- Comments cho các phần phức tạp
- Error logging

## Hướng dẫn mở rộng

### 1. Thêm tính năng xem danh sách phiếu nhập
```javascript
// Tạo page mới: ManagerImportReceiptsListPage.jsx
// Thêm route: /manager/import-receipts
// Navigate sau khi tạo thành công:
navigate('/manager/import-receipts')
```

### 2. Thêm tính năng in phiếu
```javascript
// Sau khi tạo thành công, nhận receiptId
// Cung cấp option in phiếu hoặc download PDF
const handlePrint = (receiptId) => {
  // Call API download PDF
}
```

### 3. Thêm tính năng upload hình ảnh
```javascript
// Thêm input file cho từng vật tư
// Upload ảnh hàng hóa khi nhập kho
```

### 4. Thêm tính năng quét QR/Barcode
```javascript
// Tích hợp camera để quét mã vật tư
// Tự động điền thông tin sau khi quét
```

### 5. Thêm tính năng lưu nháp
```javascript
// Lưu form data vào localStorage
// Phục hồi khi quay lại
const saveDraft = () => {
  localStorage.setItem('importReceiptDraft', JSON.stringify(formData))
}
```

## Testing Checklist

- [ ] Render page thành công
- [ ] Load danh sách supplies và categories
- [ ] Thêm vật tư vào danh sách
- [ ] Chỉnh sửa vật tư
- [ ] Xóa vật tư
- [ ] Validation nguồn gốc hàng
- [ ] Validation địa chỉ tiếp nhận
- [ ] Validation danh sách vật tư
- [ ] Validation số lượng > 0
- [ ] Submit form thành công
- [ ] Hiển thị error message từ API
- [ ] Hiển thị success message
- [ ] Reset form sau khi thành công
- [ ] Redirect khi không có quyền
- [ ] Responsive trên mobile
- [ ] Keyboard navigation

## Troubleshooting

### Lỗi: "Cannot read property 'getUserInfo' of undefined"
**Giải pháp:** Check import authService đúng path

### Lỗi: API trả về 404
**Giải pháp:** Kiểm tra endpoint trong managerService.js có đúng không

### Lỗi: Danh sách vật tư không hiển thị
**Giải pháp:** 
1. Check API response structure
2. Check unwrapApiData và normalizeArray functions
3. Sử dụng fallback data để test

### Lỗi: Form không submit
**Giải pháp:**
1. Check validation errors trong state
2. Check console log
3. Check network tab trong DevTools

## Support

Nếu gặp vấn đề, vui lòng:
1. Check console log để xem error details
2. Check network tab để xem API response
3. Review validation rules
4. Contact backend team nếu API có vấn đề

---

**Version:** 1.0.0  
**Last Updated:** March 9, 2026  
**Author:** GitHub Copilot  
**Status:** Production Ready
