# 🚀 DEPLOYMENT INSTRUCTIONS - Timezone Fix

## What Was Changed
Timezone conversion for support request timestamps has been implemented to display UTC+7 (Vietnam time) instead of UTC+0.

## Files Modified
1. `src/pages/adminShared.js` - Added timezone utilities
2. `src/components/RescueTeamDashboard.jsx` - Integrated timezone display
3. `src/pages/RescueTeamMemberPage.jsx` - Integrated timezone conversion

## How to Deploy

### Step 1: Build Production
```bash
npm run build
```
✅ Build completes successfully with no errors

### Step 2: Deploy to Production
Deploy the `dist/` folder to your production server/CDN as usual.

### Step 3: User Testing

1. **Clear Browser Cache:**
   - Open browser DevTools (F12 or Ctrl+Shift+I)
   - Go to Application → Storage → Local Storage
   - Click "Clear Site Data"
   - OR run in console: `localStorage.clear(); sessionStorage.clear();`

2. **Hard Refresh:**
   - Press `Ctrl + F5` (Windows/Linux)
   - Press `Cmd + Shift + R` (Mac)

3. **Test the Fix:**
   - Member sends support request (click "Báo cần hỗ trợ")
   - Leader refreshes dashboard
   - Verify display shows:
     ```
     🆘 Đang cần hỗ trợ
     Yêu cầu lúc: Vừa xong  ← Should show this
     • Member Name: Vừa xong
     ```

4. **Verify Over Time:**
   - After 5 minutes, reload → should show "5 phút trước"
   - After 2 hours, reload → should show "2 giờ trước"
   - Check yesterday's requests → should show "Hôm qua"

## Verification Checklist

- [x] Code compiles successfully
- [x] No syntax errors
- [x] All imports/exports correct
- [x] All function calls in place
- [x] Build size unchanged
- [x] Production ready

## Rollback Plan

If needed to rollback:
1. Revert commits for the 3 modified files
2. Run `npm run build`
3. Deploy old `dist/` folder

## Support

If issues occur during testing:
1. Check browser console for errors
2. Verify localStorage was cleared
3. Check that hard refresh (Ctrl+F5) was performed, not just refresh (F5)
4. Ensure backend is still sending timestamps without timezone indicator

---

**Status:** Ready for production deployment
