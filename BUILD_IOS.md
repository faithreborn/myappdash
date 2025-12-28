# 📱 بناء تطبيق iOS - FaciStore Admin

## المتطلبات

### للبناء المحلي (Mac فقط):
- macOS 12+
- Xcode 14+
- Node.js 18+
- CocoaPods

### للبناء عبر GitHub Actions:
- حساب GitHub
- (اختياري) Apple Developer Account للنشر على App Store

---

## 🚀 البناء المحلي

### 1. تثبيت المتطلبات
```bash
cd admin-dashboard
npm install
```

### 2. بناء التطبيق
```bash
npm run build
```

### 3. إعداد Capacitor
```bash
npx cap add ios
npx cap sync ios
```

### 4. فتح في Xcode
```bash
npx cap open ios
```

### 5. البناء من Xcode
- اختر الجهاز أو Simulator
- اضغط ⌘+B للبناء
- اضغط ⌘+R للتشغيل

---

## 🔄 GitHub Actions (بناء تلقائي)

### الإعداد الأساسي (بدون توقيع):

1. ارفع الكود لـ GitHub
2. GitHub Actions سيبني التطبيق تلقائياً
3. حمّل الـ artifact من صفحة Actions

### الإعداد للنشر على App Store:

#### 1. إنشاء الشهادات
- افتح Apple Developer Portal
- أنشئ Distribution Certificate
- أنشئ Provisioning Profile

#### 2. إضافة Secrets في GitHub:
اذهب لـ Settings > Secrets > Actions وأضف:

| Secret Name | الوصف |
|-------------|-------|
| `APPLE_CERTIFICATE_BASE64` | الشهادة بصيغة Base64 |
| `APPLE_CERTIFICATE_PASSWORD` | كلمة مرور الشهادة |
| `PROVISIONING_PROFILE_BASE64` | ملف التوفير بصيغة Base64 |
| `KEYCHAIN_PASSWORD` | كلمة مرور عشوائية |

#### 3. تحويل الملفات لـ Base64:
```bash
# للشهادة
base64 -i certificate.p12 | pbcopy

# للـ Provisioning Profile
base64 -i profile.mobileprovision | pbcopy
```

#### 4. تحديث ExportOptions.plist:
```xml
<key>teamID</key>
<string>YOUR_ACTUAL_TEAM_ID</string>
```

---

## 📁 هيكل المشروع

```
admin-dashboard/
├── ios/                    # مشروع Xcode (يُنشأ تلقائياً)
│   └── App/
│       ├── App.xcworkspace
│       └── Podfile
├── dist/                   # ملفات الويب المبنية
├── src/                    # كود React
├── capacitor.config.ts     # إعدادات Capacitor
├── ExportOptions.plist     # إعدادات التصدير
└── .github/
    └── workflows/
        └── build-ios.yml   # GitHub Actions
```

---

## 🎨 تخصيص الأيقونات

### 1. أنشئ أيقونة 1024x1024
### 2. استخدم أداة مثل:
- https://appicon.co
- https://makeappicon.com

### 3. ضع الأيقونات في:
```
ios/App/App/Assets.xcassets/AppIcon.appiconset/
```

---

## 🔧 حل المشاكل

### خطأ: "No signing certificate"
- تأكد من إضافة الشهادات في Xcode
- أو استخدم `CODE_SIGNING_ALLOWED=NO` للبناء بدون توقيع

### خطأ: "Pod install failed"
```bash
cd ios/App
pod repo update
pod install
```

### خطأ: "Build failed"
```bash
# نظف وأعد البناء
rm -rf ios
npm run build
npx cap add ios
npx cap sync ios
```

---

## 📱 اختبار على الجهاز

### عبر Xcode:
1. وصّل الآيفون بالـ Mac
2. اختر الجهاز في Xcode
3. اضغط Run

### عبر TestFlight:
1. ابني IPA موقّع
2. ارفعه على App Store Connect
3. أضف المختبرين في TestFlight

---

## 🚀 النشر على App Store

1. ابني Archive من Xcode
2. ارفع على App Store Connect
3. أكمل معلومات التطبيق
4. أرسل للمراجعة

---

## 📞 الدعم

للمساعدة أو الاستفسارات، تواصل معنا!
