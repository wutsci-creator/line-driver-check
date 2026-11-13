# ตรวจประวัตินักขับผ่าน LINE OA

เจ้าหน้าที่ส่งเลข 13 หลักในแชตส่วนตัวของ OA ระบบตรวจสิทธิ์และเลขตรวจสอบ แล้วค้นทะเบียนเดิมแบบตรงตัว เจ้าหน้าที่เป็นผู้พิจารณารับสมัคร ผล “ไม่พบ” หมายถึงค้นทะเบียนนี้สำเร็จและไม่มีเลขนั้น ณ เวลาที่อ่านเท่านั้น

## 1. เปิดโปรเจกต์และลองบนเครื่อง

ติดตั้ง Node.js 24 เปิด PowerShell ในโฟลเดอร์ที่มี package.json แล้วรันทีละบรรทัด

```powershell
npm.cmd install
npm.cmd test
npm.cmd run typecheck
npm.cmd run build
Copy-Item .env.example .env.local
```

บน macOS/Linux ใช้ npm และ cp แทน npm.cmd และ Copy-Item การทดสอบอัตโนมัติใช้ข้อมูลที่สร้างขึ้นเฉพาะการทดสอบ ไม่ต้องต่อชีตหรือใช้คีย์จริง โปรเจกต์นี้ให้บริการที่ POST /api/line/webhook เปิดหน้าแรกแล้วเห็น 404 เป็นปกติ

## 2. ตรวจทะเบียนที่จะใช้

เปิดไฟล์เดิม ตรวจว่าชื่อหัวตารางแถว 1 จาก A ถึง G เรียงเป็น **เลขบัตร | ชื่อ | พื้นที่ | ลูกค้า | วันลาออก | อายุงาน | สถานะ** ถ้าชื่อจริงต่างกัน ให้แก้รายการ headers ใน lib/check.ts ให้ตรง ชื่อแท็บด้านล่างอาจต่างจากชื่อไฟล์ จดชื่อแท็บให้ตรงตัว และคัดลอก Spreadsheet ID ระหว่าง /d/ กับ /edit ใน URL

ตั้งคอลัมน์ A เป็นข้อความธรรมดาก่อนกรอกข้อมูลเพื่อรักษาเลขศูนย์นำหน้า ตรวจข้อมูลเดิมด้วย เพราะการเปลี่ยนรูปแบบเซลล์ไม่คืนเลขที่สูญหาย ระบบอ่าน A:G เพื่อจับแถวที่มีรายละเอียดแต่ไม่มีเลขบัตร เก็บเฉพาะชุดเลขไว้ค้นภายในคำขอ และไม่ส่ง B:G ออกทาง LINE ทุกแถวที่มีเลขตรงกันถือว่า “พบ” โดยไม่กรองสถานะ G ตามโจทย์ที่ทะเบียนนี้เก็บเฉพาะประวัติที่ต้องตรวจ หากแท็บรวมพนักงานประเภทอื่น ให้แยกแท็บให้ถูกก่อนใช้

ระบบถือว่าชีตว่าง หัวตารางผิด หรือมีเลขผิดแม้หนึ่งแถวเป็นข้อผิดพลาด แถวว่างทั้งแถวข้ามได้ ตรวจให้แท็บมีข้อมูลครบและเป็นทะเบียนปัจจุบัน ระบบตรวจความครบถ้วนของข้อมูลต้นทางที่ถูกลบไปแล้วไม่ได้

## 3. ให้ Google อ่านชีตได้

1. เข้า Google Cloud Console เลือกหรือสร้าง Project จาก APIs & Services → Library เปิด Google Sheets API
2. ใน IAM & Admin → Service Accounts สร้างบัญชีเฉพาะงานนี้ ข้ามการให้ Project role แล้วเปิดบัญชีนั้น → Keys → Add key → Create new key → JSON เก็บไฟล์ที่ดาวน์โหลดไว้นอกโฟลเดอร์โปรเจกต์
3. ใน Google Sheets กด Share ใส่ client_email จากไฟล์ JSON เลือก **Viewer** คงการเข้าถึงทั่วไปเป็น Restricted โค้ดขอ scope spreadsheets.readonly
4. กรอก GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY, GOOGLE_SPREADSHEET_ID และ GOOGLE_SHEET_NAME ใน .env.local ใช้ค่า private_key ทั้งส่วน BEGIN/END เขียนบรรทัดใหม่เป็นตัวอักษร \n ได้ ถ้าค่าใน .env.local มีช่องว่าง ให้ครอบค่าด้วยเครื่องหมายคำพูด

[Google Sheets API](https://developers.google.com/workspace/sheets/api/reference/rest/v4/spreadsheets.values/get) · [การสร้างคีย์](https://cloud.google.com/iam/docs/keys-create-delete)

## 4. ตั้งค่า LINE OA

1. เข้า LINE Official Account Manager → เลือก OA → Settings → Messaging API → Enable Messaging API เลือก Provider ขององค์กร แล้วเปิด Messaging API channel ที่สร้างขึ้นใน LINE Developers Console
2. ที่ Basic settings คัดลอก Channel secret ลง LINE_CHANNEL_SECRET ที่ Messaging API ออก Channel access token (long-lived) ลง LINE_CHANNEL_ACCESS_TOKEN
3. เริ่มกับผู้ดูแลหนึ่งคน ให้ผู้ดูแลล็อกอิน LINE Developers ด้วยบัญชี LINE เดียวกับที่จะส่งแชต ดู **Your user ID** ใน Basic settings ของ channel นี้ แล้วใส่ใน LINE_ALLOWED_USER_IDS เพิ่มหลายบัญชีโดยคั่นด้วยจุลภาค ใช้ user ID ของ provider นี้ ชื่อที่แสดง เบอร์โทร และ LINE ID สำหรับค้นหาเพื่อนใช้แทนไม่ได้ ตรวจตัวบุคคลก่อนเพิ่มสิทธิ์ ช่องว่างเปล่าปิดสิทธิ์การค้นหาทั้งหมด
4. ปิดข้อความตอบกลับอัตโนมัติที่อาจทำให้ผู้ใช้เข้าใจผิดว่าได้รับผลตรวจแล้ว เพิ่ม OA เป็นเพื่อน เตรียมทดสอบผ่านแชตส่วนตัว กลุ่มและห้องสนทนาจะไม่มีข้อความตอบจากระบบนี้

[เริ่มใช้งาน Messaging API](https://developers.line.biz/en/docs/messaging-api/getting-started/) · [User ID](https://developers.line.biz/en/docs/messaging-api/getting-user-ids/)

## 5. Deploy และต่อ webhook

1. ใส่ซอร์สใน Git repository ส่วนตัว ตรวจรายชื่อไฟล์ก่อน commit ให้มี .env.example และ package-lock.json ส่วน .env.local และไฟล์คีย์ต้องอยู่นอก Git
2. ใน Vercel เลือก Add New → Project → Import repository ตั้ง Framework Preset เป็น Next.js และ Root Directory เป็นโฟลเดอร์ที่มี package.json เลือก Node.js 24.x
3. ใน Environment Variables เพิ่มทุกตัวตาม .env.example สำหรับ Production ใส่ค่าในหน้าจอ Vercel โดยไม่ครอบด้วยเครื่องหมายคำพูด ตัว private key วางหลายบรรทัดหรือใช้ \n ได้ แยก Preview ออกจากข้อมูลจริง เมื่อแก้ค่าแล้วให้ redeploy
4. Deploy แล้วคัดลอกโดเมน Production ที่คงที่ ใน LINE Developers → Messaging API → Webhook settings ใส่ https://YOUR-PROJECT.vercel.app/api/line/webhook กด Verify ให้สำเร็จ แล้วเปิด Use webhook และ Webhook redelivery
5. Endpoint ต้องเข้าถึงได้จาก LINE โดยตรง ถ้า Verify ได้ 302/307 ให้ตรวจโดเมน การ redirect และ Deployment Protection ถ้า 401 ตรวจ Channel secret และ channel ที่เลือก ถ้า 503 ตรวจการตั้งค่าและ log รหัสเหตุการณ์ ห้ามส่งคีย์หรือภาพหน้าจอที่มี token ให้ผู้อื่น

LINE Verify ส่งรายการ events ว่าง การได้ HTTP 200 ยืนยันทางเข้าและลายเซ็น ยังต้องทดสอบการอ่านชีตและการตอบจริงด้านล่าง

[การรับ webhook และ redelivery](https://developers.line.biz/en/docs/messaging-api/receiving-messages/) · [การตรวจลายเซ็น](https://developers.line.biz/en/docs/messaging-api/verify-webhook-signature/) · [Vercel environment variables](https://vercel.com/docs/environment-variables)

## 6. ทดลองก่อนให้เจ้าหน้าที่ใช้

ใช้ OA และแท็บทดสอบที่มีหัวตารางตรงกัน ใช้เลขสมมติจากนิพจน์ใน tests/webhook.test.ts สร้างด้วย Node บนเครื่องดังนี้ ผลบรรทัดแรกใช้ใส่ A2 เป็นข้อความ ส่วนผลบรรทัดที่สองให้เว้นออกจากชีต ห้ามคัดลอกประวัติจริงมาทดสอบ

```powershell
node -e "console.log('0'.repeat(11)+'19'); console.log('0'.repeat(12)+'1')"
```

| ทดลอง | สิ่งที่ต้องเห็น |
|---|---|
| ผู้มีสิทธิ์ส่งเลข A2 | พบรายการ โดยไม่มีชื่อ เลขบัตร หรือรายละเอียดแถว |
| ส่งเลขสมมติที่สอง | ไม่พบรายการ |
| เปลี่ยนหลักสุดท้ายของเลข A2 | ข้อความให้ตรวจเลข |
| ส่งจากบัญชีนอก allowlist | ไม่มีสิทธิ์ |
| ส่งในกลุ่ม | ไม่มีผลค้นหาในกลุ่ม |
| ถอนสิทธิ์ Viewer ของบัญชีทดสอบชั่วคราว แล้วส่งเลขที่สองอีกครั้ง | ระบบตรวจสอบไม่ได้ ให้พักการพิจารณา |
| คืนสิทธิ์ Viewer แล้วส่งข้อความใหม่ | ผลไม่พบกลับมาตามปกติ |

ก่อนอนุมัติใช้งาน ให้เจ้าของทะเบียนยืนยันชื่อไฟล์ แท็บ ความเป็นปัจจุบัน และรายชื่อผู้มีสิทธิ์ ทดสอบผลพบ/ไม่พบ/ขัดข้องครบ หากไม่มีคำตอบหรือผลตรวจไม่สำเร็จ ให้พักรายการและส่งตรวจใหม่ ตรวจ log ว่ามีเพียง reply_ok, sheet_unavailable, event_or_reply_failed หรือ webhook_unavailable อย่าเปิดการบันทึก request body, headers หรือ HTTP tracing ที่เก็บข้อความ แชตต้นทางใน LINE ยังคงมีข้อความที่ผู้ใช้ส่ง

## การส่งซ้ำและข้อจำกัด

ระบบตรวจ HMAC-SHA256 จากไบต์ดิบก่อนแปลง JSON เปรียบเทียบลายเซ็นที่มีความยาวเท่ากันแบบ constant-time ประมวลผลครั้งละไม่เกิน 8 event พร้อมกัน หนึ่งคำขออ่านชีตครั้งเดียวเมื่อมีคำค้นที่ผ่านสิทธิ์และรูปแบบ เช็ก HTTP status จาก LINE ก่อนบันทึกว่าส่งสำเร็จ เมื่อส่งผล “ระบบตรวจสอบไม่ได้” สำเร็จ เจ้าหน้าที่ต้องส่งคำถามใหม่หลังแก้ระบบ

ภายใน instance เดียว webhookEventId ป้องกันงานซ้ำที่กำลังทำ และจำงานสำเร็จสูงสุด 5,000 รายการไม่เกิน 24 ชั่วโมง หากส่งตอบล้มเหลว คืน HTTP 503 ให้ LINE มีโอกาสส่งซ้ำ งานอื่นในชุดยังทำต่อ ข้าม instance หรือหลัง cold start อาจอ่านชีตซ้ำ LINE จำกัด reply token ใช้ครั้งเดียว กรณี LINE รับข้อความแล้วแต่การเชื่อมต่อขาด ฝั่งแอปอาจเห็นการตอบซ้ำเป็นข้อผิดพลาด ห้ามถือว่า HTTP 400 คือเคยส่งสำเร็จ ระบบนี้ไม่มีคิวถาวร และการส่งซ้ำจาก LINE ไม่รับประกันการส่งถึง ผู้ดูแลควรตรวจ Webhook error statistics และให้ผู้ใช้ส่งคำขอใหม่เมื่อไม่มีคำตอบ

[ข้อกำหนด reply token](https://developers.line.biz/en/reference/messaging-api/#send-reply-message)

