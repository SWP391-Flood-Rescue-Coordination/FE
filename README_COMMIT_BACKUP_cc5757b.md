# Commit Backup: `cc5757befd681874403edc38e07cf82e3ebe211e`

## Muc dich

File nay ton tai de giu "bo nho nghiep vu" cho commit `cc5757befd681874403edc38e07cf82e3ebe211e`
trong truong hop commit nay bi mat khoi history do force-push, rebase, xoa branch, hoac hash
khong con truy cap duoc nua.

Neu sau nay can khoi phuc lai commit nay, hay xem file nay nhu **source of truth**.

## Thong tin commit

- Repo: `FE`
- Commit: `cc5757befd681874403edc38e07cf82e3ebe211e`
- Tieu de: `Fetch api Forgot password`
- Ngay tao commit: `2026-03-31 14:23:41 +0700`
- Pham vi: FE only, **khong** phai BE

## Danh sach file commit nay da sua

- `src/components/ForgotPassword.css`
- `src/components/ForgotPassword.jsx`
- `src/components/Login.css`
- `src/components/Login.jsx`
- `src/components/ResetPassword.jsx`
- `src/pages/ForgotPasswordPage.jsx`
- `src/pages/ResetPasswordPage.jsx`
- `src/services/authService.js`

## Muc tieu nghiep vu cua commit

Commit nay dung de doi luong **Quen mat khau** tu mock OTP sang luong API that:

1. Tu man dang nhap, bam `Quen mat khau?`
2. Chuyen sang man nhap so dien thoai
3. FE goi API `POST /Auth/forgot-password/send-otp`
4. Backend gui OTP ve email da dang ky cua so dien thoai do
5. FE hien man nhap OTP 6 o, kem email da che
6. Sau khi nguoi dung nhap du 6 so, FE chuyen sang man reset password
7. FE goi API `POST /Auth/forgot-password/reset-password`
8. Backend moi la noi kiem tra OTP that su va doi mat khau

## Rang buoc quan trong cua contract backend luc commit nay duoc viet

Backend luc do **khong co** endpoint `verify-otp` rieng.

Dieu nay rat quan trong:

- FE **khong** xac thuc OTP bang mot API trung gian
- FE chi luu `phone + otp + maskedEmail` tam thoi de chuyen sang man reset
- OTP dung/sai chi duoc backend ket luan o buoc `reset-password`
- Neu BE tra ve thong bao OTP sai/het han, FE phai dua user quay lai man OTP
  va hien popup `Ma khong hop le.`

Neu sau nay khoi phuc ma khong nho diem nay, rat de viet sai flow.

## Hanh vi can dung khi khoi phuc

### 1. `Login.jsx` + `Login.css`

Man dang nhap phai co entry vao flow quen mat khau:

- Nut `Quen mat khau?` nam duoi nut `Dang nhap`
- Nut nay goi `onShowForgotPassword()`
- Commit nay cung doi nut back/home o header login thanh icon nha

### 2. `ForgotPasswordPage.jsx`

Page wrapper nay co nhiem vu:

- render component `ForgotPassword`
- navigate:
  - `onClose -> /`
  - `onShowLogin -> /login`
  - `onOtpVerified -> /reset-password`
- doc `location.state` de resume man OTP khi reset-password tra nguoc ve vi OTP sai

State can doc lai:

```js
{
  resumeForgotPassword: true,
  phone,
  maskedEmail,
  message
}
```

### 3. `ForgotPassword.jsx`

Day la file quan trong nhat cua commit nay.

Component nay phai hoat dong theo mo hinh 2 step:

- `request`: man nhap so dien thoai
- `verify`: man nhap OTP

No can co cac hanh vi sau:

- validate so dien thoai truoc khi goi API
- goi `authService.sendForgotPasswordOtp(phone)`
- lay `maskedEmail` tu response backend
- neu backend khong tra field rieng thi parse email tu `message`
- reset OTP digits moi khi gui lai OTP
- bat dau dem nguoc `60s`
- khoa nut gui lai trong thoi gian dem nguoc
- co 6 input OTP rieng biet
- ho tro:
  - tu focus qua o tiep theo
  - backspace quay nguoc
  - paste nhieu so cung luc
- nut `Tiep theo` chi enable khi du 6 so
- khi bam `Tiep theo`, FE **khong** verify OTP voi API rieng
- thay vao do, FE luu du lieu vao `sessionStorage` roi chuyen sang `/reset-password`

Du lieu phai luu:

```js
{
  phone,
  otp,
  maskedEmail
}
```

Popup OTP sai:

- `ForgotPassword` nhan `initialOtpErrorMessage`
- neu co message nay thi mo popup `Ma khong hop le.`
- popup co nut xac nhan de dong

### 4. `ResetPasswordPage.jsx`

Page nay phai:

- doc context bang `authService.getForgotPasswordResetContext()`
- neu khong co `phone` hoac `otp` thi redirect ve `/forgot-password`
- truyen `phone`, `otp`, `maskedEmail` xuong `ResetPassword`
- neu OTP sai o buoc reset, navigate nguoc ve `/forgot-password` voi `location.state`
  de resume dung man OTP

### 5. `ResetPassword.jsx`

Man nay van giu UI reset password cu, nhung noi API moi.

Can giu cac hanh vi sau:

- validate `newPassword` va `confirmPassword`
- goi `authService.resetForgotPassword(phone, otp, newPassword)`
- neu response/message cho thay OTP sai, goi callback `onInvalidOtp`
- `onInvalidOtp` phai clear context cu va dua user quay lai man OTP
- neu reset thanh cong:
  - xoa context trong `sessionStorage`
  - hien state thanh cong
  - dem nguoc 5 giay
  - tu dong quay ve man dang nhap

### 6. `authService.js`

File nay la "xuong song" cua commit.

No phai co it nhat cac helper / method sau:

- `sendForgotPasswordOtp(phone)`
- `resetForgotPassword(phone, otp, newPassword)`
- `validateForgotPasswordPhone(phone)`
- `storeForgotPasswordResetContext(phone, otp, maskedEmail)`
- `getForgotPasswordResetContext()`
- `clearForgotPasswordResetContext()`
- `extractForgotPasswordMaskedEmail(payload)`
- `isForgotPasswordOtpErrorMessage(message)`
- `getForgotPasswordErrorMessage(error)`

Chi tiet can dung:

- key session storage: `forgotPasswordResetContext`
- API public phai goi voi `{ skipAuth: true }`
- endpoint:
  - `/Auth/forgot-password/send-otp`
  - `/Auth/forgot-password/reset-password`
- `extractForgotPasswordMaskedEmail(payload)` phai uu tien:
  - `maskedEmail`
  - `masked_email`
  - `maskedEmailAddress`
  - `emailMasked`
  - `email`
  - neu khong co thi parse email trong `message`
- `isForgotPasswordOtpErrorMessage(message)` phai nhan ra cac truong hop:
  - OTP khong chinh xac
  - OTP khong hop le
  - OTP het han
  - message co tu `invalid`

## Co che noi 3 man hinh cua commit nay

```text
/login
  -> bam "Quen mat khau?"
  -> /forgot-password
    -> nhap phone
    -> send-otp
    -> man OTP
    -> luu sessionStorage { phone, otp, maskedEmail }
    -> /reset-password
      -> reset-password API
      -> thanh cong: /login
      -> OTP sai: quay lai /forgot-password voi state resume
```

## Neu hash commit van con trong local

Khoi phuc nhanh nhat bang mot trong cac cach sau:

```powershell
git branch backup/cc5757b cc5757befd681874403edc38e07cf82e3ebe211e
git cherry-pick cc5757befd681874403edc38e07cf82e3ebe211e
```

Neu chi muon lay lai tung file:

```powershell
git restore --source cc5757befd681874403edc38e07cf82e3ebe211e -- src/components/ForgotPassword.jsx
git restore --source cc5757befd681874403edc38e07cf82e3ebe211e -- src/components/ForgotPassword.css
git restore --source cc5757befd681874403edc38e07cf82e3ebe211e -- src/components/ResetPassword.jsx
git restore --source cc5757befd681874403edc38e07cf82e3ebe211e -- src/services/authService.js
```

## Neu hash commit da mat hoan toan

Lam theo dung checklist nay:

1. Khoi phuc 2 endpoint va helper forgot-password trong `authService.js`
2. Khoi phuc session key `forgotPasswordResetContext`
3. Khoi phuc page wrapper `ForgotPasswordPage.jsx` de doc `location.state`
4. Khoi phuc page wrapper `ResetPasswordPage.jsx` de doc session context
5. Khoi phuc state machine 2 buoc trong `ForgotPassword.jsx`
6. Khoi phuc xu ly OTP sai trong `ResetPassword.jsx`
7. Noi lai nut `Quen mat khau?` tu `Login.jsx`
8. Khoi phuc CSS cho OTP layout va thong diep resend
9. Chay `npm run build`
10. Test tay ca 3 nhanh:
   - gui OTP thanh cong
   - OTP sai -> quay ve man OTP
   - reset thanh cong -> quay ve login

## Prompt mau de nho Codex khoi phuc

Neu sau nay commit bi mat, co the dua cho Codex lenh ngan nhu sau:

```text
Khoi phuc lai commit cc5757b theo README_COMMIT_BACKUP_cc5757b.md.
Giu dung flow forgot-password dung phone -> send OTP -> OTP screen -> reset password.
Khong dung verify-otp endpoint rieng.
OTP chi duoc backend validate o reset-password.
Neu OTP sai thi quay lai man OTP va hien popup "Ma khong hop le."
```

## Tieu chi xac minh sau khi khoi phuc

- `npm run build` pass
- bam `Quen mat khau?` o login di dung route
- nhap phone goi dung API send OTP
- giao dien OTP hien 6 o + countdown 60s
- `Tiep theo` chi sang buoc reset khi du 6 so
- reset password goi dung API moi
- OTP sai quay ve man OTP
- OTP dung reset thanh cong va quay lai login

## Ghi chu cuoi

README nay khong co y nghia "revert ca repo ve commit cc5757b".
No chi ghi lai **y nghia va cau truc** cua commit do, de co the dung lai tren codebase
moi hon ma khong bi mat luong Quen mat khau da noi API that.
