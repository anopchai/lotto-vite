# Mobile Keyboard Features - ระบบหวย

## ภาพรวมฟีเจอร์

ได้เพิ่มฟีเจอร์ Mobile Keyboard ให้กับหน้า TicketPage เพื่อรองรับการใช้งานบนโทรศัพท์มือถือ ตามตัวอย่างที่ได้รับ

## ฟีเจอร์หลัก

### 1. การตรวจจับอุปกรณ์
- ตรวจจับขนาดหน้าจอ (mobile ≤ 768px)
- เปลี่ยน UI อัตโนมัติเมื่อใช้งานบนมือถือ
- รองรับ responsive design ทุกขนาดหน้าจอ

### 2. Mobile Input Fields
แทนที่ input fields ปกติด้วย clickable divs บนมือถือ:
- **ชื่อผู้ซื้อ**: เปิด Thai keyboard + ปุ่มประเภทหวยด่วน
- **เลขหวย**: เปิด Number keypad พร้อมจำกัดจำนวนหลักตามประเภท
- **ราคา**: เปิด Number keypad สำหรับกรอกราคา
- **ราคาโต๊ด**: เปิด Number keypad สำหรับกรอกราคาโต๊ด (เมื่อจำเป็น)

### 3. Virtual Keyboard Components

#### Thai Keyboard (สำหรับชื่อผู้ซื้อ)
- แป้นพิมพ์ภาษาไทยครบถ้วน
- ปุ่มประเภทหวยด่วน (สามตัวบน, สองตัวบน, สองตัวล่าง, วิ่งบน, วิ่งล่าง, ตรงโต๊ด)
- ปุ่ม Space, ตัวเลข, และตัวอักษรภาษาอังกฤษ
- ปุ่มล้างข้อมูลและลบ

#### Number Keypad (สำหรับเลขหวยและราคา)
- ตัวเลข 0-9 ขนาดใหญ่ใช้งานง่าย
- ปุ่มล้างข้อมูล (Clear)
- ปุ่มลบทีละตัว (Backspace)
- จำกัดจำนวนหลักตามประเภทหวย:
  - วิ่งบน/วิ่งล่าง: 1 หลัก
  - 2 ตัวบน/2 ตัวล่าง: 2 หลัก
  - 3 ตัวตรง: 3 หลัก

### 4. Auto-Focus Flow
ระบบเปลี่ยน input field อัตโนมัติเมื่อกรอกข้อมูลเสร็จ:
1. **ชื่อผู้ซื้อ** → **เลขหวย**
2. **เลขหวย** → **ราคา**
3. **ราคา** → **ราคาโต๊ด** (ถ้าจำเป็น) หรือปิด keyboard
4. **ราคาโต๊ด** → ปิด keyboard

### 5. UI/UX Features

#### Modal Design
- เลื่อนขึ้นจากด้านล่าง (slide-up animation)
- พื้นหลังมืดแบบ overlay
- ปุ่มปิด (X) มุมขวาบน
- ขนาดเต็มความกว้างหน้าจอ

#### Display Area
- แสดงข้อมูลที่กำลังกรอกแบบ real-time
- ใช้ font monospace สำหรับตัวเลข
- แสดง placeholder เมื่อยังไม่มีข้อมูล

#### Button Design
- ปุ่มขนาดใหญ่เหมาะสำหรับสัมผัส
- สีแยกประเภท (ตัวเลข, ฟังก์ชัน, ยืนยัน)
- Hover effects และ transitions

### 6. Responsive Behavior
- **Desktop**: ใช้ input fields ปกติ
- **Mobile**: เปลี่ยนเป็น clickable divs + virtual keyboard
- **Tablet**: ปรับขนาดตามหน้าจอ

## การใช้งาน

### สำหรับผู้ใช้
1. เปิดหน้า TicketPage บนมือถือ
2. แตะที่ช่องข้อมูลที่ต้องการกรอก
3. ใช้ virtual keyboard ที่เปิดขึ้น
4. กด "ยืนยัน" เพื่อบันทึกและไปช่องถัดไป
5. หรือกด "ยกเลิก" เพื่อปิดโดยไม่บันทึก

### สำหรับนักพัฒนา
```javascript
// เปิด mobile keyboard
openMobileKeyboard('buyer_name', currentValue)

// ปิด mobile keyboard
closeMobileKeyboard()

// จัดการ input
handleKeypadInput(value)

// ยืนยันข้อมูล
confirmInput()
```

## ไฟล์ที่แก้ไข

### 1. `frontend/src/pages/TicketPage.jsx`
- เพิ่ม state สำหรับ mobile keyboard
- เพิ่มฟังก์ชันจัดการ keyboard
- แก้ไข input fields ให้รองรับ mobile
- เพิ่ม Mobile Keyboard Modal

### 2. `frontend/src/index.css`
- เพิ่ม keyframes สำหรับ animations
- เพิ่ม responsive utilities

### 3. `frontend/test-mobile-keyboard.html`
- ไฟล์ทดสอบ standalone
- แสดงตัวอย่างการทำงานของ mobile keyboard

## การทดสอบ

1. เปิดไฟล์ `test-mobile-keyboard.html` ใน browser
2. ใช้ Developer Tools เปลี่ยนเป็น mobile view
3. ทดสอบการกรอกข้อมูลในแต่ละช่อง
4. ตรวจสอบ auto-focus flow
5. ทดสอบการทำงานของ virtual keyboards

## ข้อดี

1. **ใช้งานง่าย**: ปุ่มขนาดใหญ่เหมาะสำหรับสัมผัส
2. **ประหยัดเวลา**: Auto-focus ลดการแตะหน้าจอ
3. **ป้องกันข้อผิดพลาด**: จำกัดจำนวนหลักตามประเภท
4. **รองรับภาษาไทย**: แป้นพิมพ์ไทยครบถ้วน
5. **Responsive**: ทำงานได้ทุกขนาดหน้าจอ

## การพัฒนาต่อ

1. เพิ่มการบันทึกข้อมูลล่าสุดใน localStorage
2. เพิ่ม voice input สำหรับชื่อผู้ซื้อ
3. เพิ่มการ validate ข้อมูลแบบ real-time
4. เพิ่ม haptic feedback บนมือถือ
5. เพิ่มการ customize layout keyboard

## หมายเหตุ

- ฟีเจอร์นี้ทำงานร่วมกับระบบเดิมโดยไม่กระทบการใช้งานบน desktop
- สามารถปิด/เปิดการใช้งาน mobile keyboard ได้ผ่าน state `isMobile`
- รองรับการใช้งานแบบ offline (ไม่ต้องการ internet สำหรับ keyboard)
