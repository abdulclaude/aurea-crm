# Device Types - Quick Reference

## 5 Main Categories

```
🖥️  Desktop     Standard monitors (1920x1080)
💻  Laptop      Smaller screens (< 1920 width)
📱  Mobile      Smartphones
📱  Tablet      iPads, Android tablets
🖥️  Ultrawide   Wide monitors (≥ 2560 or 21:9)
```

---

## Detection Rules

| Device | Condition | Common Sizes |
|--------|-----------|--------------|
| **Mobile** | User agent = mobile | 390x844, 412x915 |
| **Tablet** | User agent = tablet | 1024x1366, 834x1194 |
| **Laptop** | Desktop + width < 1920 | 1366x768, 1440x900 |
| **Desktop** | Desktop + 1920-2559 | 1920x1080 |
| **Ultrawide** | width ≥ 2560 OR ratio ≥ 2.2 | 3440x1440, 5120x1440 |

---

## How to Test

### Chrome DevTools
1. Cmd+Shift+M (Toggle device toolbar)
2. Select preset or custom size
3. Reload page
4. Check Aurea CRM events

### Test Sizes
```
Mobile:     390x844   (iPhone 14)
Tablet:    1024x1366  (iPad)
Laptop:    1366x768   (Most common)
Desktop:   1920x1080  (Full HD)
Ultrawide: 3440x1440  (21:9)
```

---

## What Changed

**SDK:** `1.3.3`  
**File:** `aurea-tracking-sdk/src/index.ts`  
**Logic:** Resolution + aspect ratio analysis  

**Install:**
```bash
cd /Users/abdul/Desktop/ttr
npm install ../aurea-tracking-sdk
npm run dev
```

---

## Expected Analytics

```
Desktop:    ~37% (work computers)
Mobile:     ~29% (smartphones)
Tablet:     ~27% (iPads)
Laptop:      ~5% (portable)
Ultrawide:   ~2% (power users)
```

---

**Just restart TTR and test!** 🚀
