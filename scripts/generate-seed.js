const fs = require('fs');
const path = require('path');

// Raw Config data from Google Sheets (A: Key, C: Target URL, E: Nombre del local)
const basePage = "https://fachinha.github.io/QRdinamicos/";

const configuredQRs = {
  "QR000011": { url: "https://search.google.com/local/writereview?placeid=ChIJPaeP-Ah7GpYRG02h9MK0llg&utm_source=chatgpt.com", place: "vinarte google" },
  "QR000012": { url: "https://search.google.com/local/writereview?placeid=ChIJNaGEG3J7GpYRMpkN8HhtVA4&utm_source=chatgpt.com", place: "electronica fricke google" },
  "QR000014": { url: "https://search.google.com/local/writereview?placeid=ChIJ2S7ysUR7GpYRg83SC3-4hzU&utm_source=chatgpt.com", place: "polleria onelli google" },
  "QR000015": { url: "https://search.google.com/local/writereview?placeid=ChIJe1ol9pJ7GpYRjt_-75QMCp4", place: "polleria belgrano google" },
  "QR000016": { url: "https://search.google.com/local/writereview?placeid=ChIJ5Zgi7Ul7GpYRAxNJzjUv2KI", place: "" },
  "QR000017": { url: "https://search.google.com/local/writereview?placeid=ChIJ-aTI5Z97GpYRbZL6pxbHz-4", place: "negro el 31 google" },
  "QR000018": { url: "https://search.google.com/local/writereview?placeid=ChIJpf7xgOF7GpYRPWTppPnpxNc", place: "florhema google" },
  "QR000020": { url: "https://search.google.com/local/writereview?placeid=ChIJwToIrgJ7GpYR9B3zu7h_e88&utm_source=chatgpt.com", place: "mercado molino google" },
  "QR000044": { url: "https://search.google.com/local/writereview?placeid=ChIJTUe66Gd7GpYRMR8gUm0ndQQ&utm_source=chatgpt.com", place: "" },
  "QR000047": { url: "https://web.facebook.com/agenciala32?_rdc=1&_rdr#", place: "" },
  "QR000048": { url: "https://www.facebook.com/share/1abXw6g8in/", place: "polleria onelli facebook" },
  "QR000051": { url: "https://www.instagram.com/polleriabelgrano?igsi=MTlxeHlwdjdlNzhsYw==", place: "polleria belgrano instagram" },
  "QR000052": { url: "https://www.instagram.com/tentacionesbelgrano?igsi=MWczeHk1MmN2M21teQ==", place: "fiambreria belgrano instagram" },
  "QR000053": { url: "https://www.instagram.com/agencia32bariloche/", place: "polleria onelli instagram" },
  "QR000054": { url: "https://www.instagram.com/polleriaonelli?igsh=MTN2bHBqanNiN3NwbQ==", place: "polleria onelli instagram" },
  "QR000055": { url: "https://www.instagram.com/vinartevinoteca?igsi=cWs0bnowcXp2N29y", place: "vinarte instagram" },
  "QR000056": { url: "https://wa.me/5492944586328", place: "" },
  "QR000057": { url: "https://wa.me/5492944512020", place: "polleria belgrano whatsapp" },
  "QR000058": { url: "https://wa.me/5492944509410", place: "fiambreria belgrano whatsapp" },
  "QR000059": { url: "https://api.whatsapp.com/send?phone=5492944629707", place: "" },
  "QR000060": { url: "https://wa.me/5492944251925", place: "vinarte whatsapp" }
};

const qrs = [];
for (let i = 1; i <= 80; i++) {
  const key = "QR" + String(i).padStart(6, "0");
  const entry = configuredQRs[key] || { url: "", place: "" };
  qrs.push({
    key,
    url: entry.url,
    place: entry.place,
    active: 1
  });
}

const rawHitsText = `casa comida|https://maps.app.goo.gl/G2pSn982WmJreuM86|2026-07-13 19:46:10
casa comida|https://maps.app.goo.gl/G2pSn982WmJreuM86|2026-07-13 19:46:12
casa comida|https://search.google.com/local/writereview?placeid=ChIJPyoz6Fx7GpYRfgXZJSrQNAk|2026-07-13 19:47:00
casa comida|https://search.google.com/local/writereview?placeid=ChIJPyoz6Fx7GpYRfgXZJSrQNAk|2026-08-01 17:53:14
QR000002|https://search.google.com/local/writereview?placeid=ChIJPyoz6Fx7GpYRfgXZJSrQNAk|2026-08-01 17:54:10
QR000001|https://search.google.com/local/writereview?placeid=ChIJfZ5oY0F7GpYRns8T9wSfWjU|2026-08-01 18:55:35
QR000001||2026-08-01 18:59:50
QR000001||2026-08-01 20:09:03
QR000001||2026-08-01 20:09:05
QR000011||2026-08-05 14:41:09
QR000019||2026-08-05 15:57:04
QR000019||2026-08-06 08:45:28
QR000018|https://search.google.com/local/writereview?placeid=ChIJpf7xgOF7GpYRPWTppPnpxNc|2026-08-06 10:18:56
QR000012|https://search.google.com/local/writereview?placeid=ChIJPyoz6Fx7GpYRfgXZJSrQNAk|2026-08-06 10:32:34
QR000012|https://search.google.com/local/writereview?placeid=ChIJPyoz6Fx7GpYRfgXZJSrQNAk|2026-08-06 11:00:15
QR000012|https://search.google.com/local/writereview?placeid=ChIJPyoz6Fx7GpYRfgXZJSrQNAk|2026-08-06 11:00:26
QR000018|https://search.google.com/local/writereview?placeid=ChIJpf7xgOF7GpYRPWTppPnpxNc|2026-08-06 11:07:01
QR000018|https://search.google.com/local/writereview?placeid=ChIJpf7xgOF7GpYRPWTppPnpxNc|2026-08-06 11:07:02
QR000017|https://search.google.com/local/writereview?placeid=ChIJ-aTI5Z97GpYRbZL6pxbHz-4|2026-08-06 11:46:14
QR000017|https://search.google.com/local/writereview?placeid=ChIJ-aTI5Z97GpYRbZL6pxbHz-4|2026-08-06 11:51:05
QR000017|https://search.google.com/local/writereview?placeid=ChIJ-aTI5Z97GpYRbZL6pxbHz-4|2026-08-06 11:58:58
QR000017|https://search.google.com/local/writereview?placeid=ChIJ-aTI5Z97GpYRbZL6pxbHz-4|2026-08-06 12:02:29
QR000018|https://search.google.com/local/writereview?placeid=ChIJpf7xgOF7GpYRPWTppPnpxNc|2026-08-06 12:03:07
QR000018|https://search.google.com/local/writereview?placeid=ChIJpf7xgOF7GpYRPWTppPnpxNc|2026-08-06 13:14:49
QR000018|https://search.google.com/local/writereview?placeid=ChIJpf7xgOF7GpYRPWTppPnpxNc|2026-08-06 21:24:58
QR000018|https://search.google.com/local/writereview?placeid=ChIJpf7xgOF7GpYRPWTppPnpxNc|2026-08-07 09:33:44
QR000018|https://search.google.com/local/writereview?placeid=ChIJpf7xgOF7GpYRPWTppPnpxNc|2026-08-07 09:35:16
QR000018|https://search.google.com/local/writereview?placeid=ChIJpf7xgOF7GpYRPWTppPnpxNc|2026-08-07 11:24:03
QR000018|https://search.google.com/local/writereview?placeid=ChIJpf7xgOF7GpYRPWTppPnpxNc|2026-08-07 14:10:36
QR000048||2026-08-07 14:32:18
QR000014||2026-08-14 14:00:45
QR000014|https://search.google.com/local/writereview?placeid=ChIJ2S7ysUR7GpYRg83SC3-4hzU&utm_source=chatgpt.com|2026-08-14 14:02:37
QR000014|https://search.google.com/local/writereview?placeid=ChIJ2S7ysUR7GpYRg83SC3-4hzU&utm_source=chatgpt.com|2026-08-14 14:03:07
QR000014|https://search.google.com/local/writereview?placeid=ChIJ2S7ysUR7GpYRg83SC3-4hzU&utm_source=chatgpt.com|2026-08-14 14:03:11
QR000054||2026-08-14 14:04:30
QR000054|https://www.instagram.com/polleriaonelli?igsh=MTN2bHBqanNiN3NwbQ==|2026-08-14 14:06:21
QR000048|https://www.facebook.com/share/1abXw6g8in/|2026-08-14 14:10:17
QR000048|https://www.facebook.com/share/1abXw6g8in/|2026-08-14 14:18:29
QR000054|https://www.instagram.com/polleriaonelli?igsh=MTN2bHBqanNiN3NwbQ==|2026-08-14 14:19:08
QR000014|https://search.google.com/local/writereview?placeid=ChIJ2S7ysUR7GpYRg83SC3-4hzU&utm_source=chatgpt.com|2026-08-14 14:19:57
QR000054|https://www.instagram.com/polleriaonelli?igsh=MTN2bHBqanNiN3NwbQ==|2026-08-14 17:44:06
QR000014|https://search.google.com/local/writereview?placeid=ChIJ2S7ysUR7GpYRg83SC3-4hzU&utm_source=chatgpt.com|2026-08-14 17:44:06
QR000014|https://search.google.com/local/writereview?placeid=ChIJ2S7ysUR7GpYRg83SC3-4hzU&utm_source=chatgpt.com|2026-08-14 19:43:30
QR000014|https://search.google.com/local/writereview?placeid=ChIJ2S7ysUR7GpYRg83SC3-4hzU&utm_source=chatgpt.com|2026-08-18 11:16:51
QR000014|https://search.google.com/local/writereview?placeid=ChIJ2S7ysUR7GpYRg83SC3-4hzU&utm_source=chatgpt.com|2026-08-18 11:16:51
QR000014|https://search.google.com/local/writereview?placeid=ChIJ2S7ysUR7GpYRg83SC3-4hzU&utm_source=chatgpt.com|2026-08-18 11:16:55
QR000048|https://www.facebook.com/share/1abXw6g8in/|2026-08-18 11:17:05
QR000048|https://www.facebook.com/share/1abXw6g8in/|2026-08-18 11:17:30
QR000048|https://www.facebook.com/share/1abXw6g8in/|2026-08-18 13:00:14
QR000048|https://www.facebook.com/share/1abXw6g8in/|2026-08-24 12:34:11
QR000048|https://www.facebook.com/share/1abXw6g8in/|2026-08-24 12:35:38
QR000012|https://search.google.com/local/writereview?placeid=ChIJPyoz6Fx7GpYRfgXZJSrQNAk|2026-08-25 10:48:02
QR000015||2026-08-25 10:57:56
QR000015|https://search.google.com/local/writereview?placeid=ChIJe1ol9pJ7GpYRjt_-75QMCp4|2026-08-25 10:58:50
QR000053|https://www.instagram.com/polleriaonelli?igsh=MTN2bHBqanNiN3NwbQ==|2026-08-25 11:08:16
QR000053|https://www.instagram.com/polleriaonelli?igsh=MTN2bHBqanNiN3NwbQ==|2026-08-25 11:08:17
QR000015|https://search.google.com/local/writereview?placeid=ChIJe1ol9pJ7GpYRjt_-75QMCp4|2026-08-25 11:11:27
QR000051|https://www.instagram.com/polleriabelgrano?igsi=MTlxeHlwdjdlNzhsYw==|2026-08-25 11:11:43
QR000057|https://wa.me/5492944512020|2026-08-25 11:11:59
QR000057|https://wa.me/5492944512020|2026-08-25 11:13:42
QR000057|https://wa.me/5492944512020|2026-08-25 11:13:44
QR000051|https://www.instagram.com/polleriabelgrano?igsi=MTlxeHlwdjdlNzhsYw==|2026-08-25 11:13:53
QR000015|https://search.google.com/local/writereview?placeid=ChIJe1ol9pJ7GpYRjt_-75QMCp4|2026-08-25 11:14:04
QR000052||2026-08-25 11:15:10
QR000057|https://wa.me/5492944512020|2026-08-25 11:15:34
QR000052|https://www.instagram.com/tentacionesbelgrano?igsi=MWczeHk1MmN2M21teQ==|2026-08-25 11:15:40
QR000057|https://wa.me/5492944512020|2026-08-25 11:15:47
QR000058|https://wa.me/5492944509410|2026-08-25 11:17:44
QR000058|https://wa.me/5492944509410|2026-08-25 11:17:45
QR000052|https://www.instagram.com/tentacionesbelgrano?igsi=MWczeHk1MmN2M21teQ==|2026-08-25 11:18:03
QR000060|https://wa.me/5492944251925|2026-08-25 11:18:12
QR000055|https://www.instagram.com/vinartevinoteca?igsi=cWs0bnowcXp2N29y|2026-08-25 11:18:26
QR000011|https://search.google.com/local/writereview?placeid=ChIJPaeP-Ah7GpYRG02h9MK0llg&utm_source=chatgpt.com|2026-08-25 11:18:39
QR000015|https://search.google.com/local/writereview?placeid=ChIJe1ol9pJ7GpYRjt_-75QMCp4|2026-08-25 15:51:40
QR000015|https://search.google.com/local/writereview?placeid=ChIJe1ol9pJ7GpYRjt_-75QMCp4|2026-08-25 16:38:40
QR000020|https://search.google.com/local/writereview?placeid=ChIJwToIrgJ7GpYR9B3zu7h_e88&utm_source=chatgpt.com|2026-08-26 11:02:39
QR000020|https://search.google.com/local/writereview?placeid=ChIJwToIrgJ7GpYR9B3zu7h_e88&utm_source=chatgpt.com|2026-08-26 11:19:57
QR000020|https://search.google.com/local/writereview?placeid=ChIJwToIrgJ7GpYR9B3zu7h_e88&utm_source=chatgpt.com|2026-08-26 11:20:18
QR000020|https://search.google.com/local/writereview?placeid=ChIJwToIrgJ7GpYR9B3zu7h_e88&utm_source=chatgpt.com|2026-08-26 11:20:53
QR000020|https://search.google.com/local/writereview?placeid=ChIJwToIrgJ7GpYR9B3zu7h_e88&utm_source=chatgpt.com|2026-08-27 12:22:54
QR000014|https://search.google.com/local/writereview?placeid=ChIJ2S7ysUR7GpYRg83SC3-4hzU&utm_source=chatgpt.com|2026-08-27 18:18:04
QR000054|https://www.instagram.com/polleriaonelli?igsh=MTN2bHBqanNiN3NwbQ==|2026-08-27 18:18:21
QR000048|https://www.facebook.com/share/1abXw6g8in/|2026-08-27 18:18:41
QR000048|https://www.facebook.com/share/1abXw6g8in/|2026-08-27 21:24:40
QR000020|https://search.google.com/local/writereview?placeid=ChIJwToIrgJ7GpYR9B3zu7h_e88&utm_source=chatgpt.com|2026-08-28 13:42:14
QR000058|https://wa.me/5492944509410|2026-09-01 15:50:41
QR000054|https://www.instagram.com/polleriaonelli?igsh=MTN2bHBqanNiN3NwbQ==|2026-09-01 17:53:16
QR000015|https://search.google.com/local/writereview?placeid=ChIJe1ol9pJ7GpYRjt_-75QMCp4|2026-09-01 23:32:41
QR000053|https://www.instagram.com/polleriaonelli?igsh=MTN2bHBqanNiN3NwbQ==|2026-09-01 23:53:59
QR000053|https://www.instagram.com/polleriaonelli?igsh=MTN2bHBqanNiN3NwbQ==|2026-09-01 23:54:01
QR000052|https://www.instagram.com/tentacionesbelgrano?igsi=MWczeHk1MmN2M21teQ==|2026-09-01 23:55:55
QR000052|https://www.instagram.com/tentacionesbelgrano?igsi=MWczeHk1MmN2M21teQ==|2026-09-02 00:08:34
QR000052|https://www.instagram.com/tentacionesbelgrano?igsi=MWczeHk1MmN2M21teQ==|2026-09-02 00:08:36
QR000058|https://wa.me/5492944509410|2026-09-02 00:22:26
QR000018|https://search.google.com/local/writereview?placeid=ChIJpf7xgOF7GpYRPWTppPnpxNc|2026-09-02 08:24:54
QR000058|https://wa.me/5492944509410|2026-09-02 11:05:14
QR000058|https://wa.me/5492944509410|2026-09-02 21:31:36
QR000054|https://www.instagram.com/polleriaonelli?igsh=MTN2bHBqanNiN3NwbQ==|2026-09-05 13:50:03
QR000054|https://www.instagram.com/polleriaonelli?igsh=MTN2bHBqanNiN3NwbQ==|2026-09-07 11:36:26
QR000058|https://wa.me/5492944509410|2026-09-14 18:08:21
QR000053|https://www.instagram.com/polleriaonelli?igsh=MTN2bHBqanNiN3NwbQ==|2026-09-15 08:43:03
QR000053|https://www.instagram.com/polleriaonelli?igsh=MTN2bHBqanNiN3NwbQ==|2026-09-15 08:43:36
QR000054|https://www.instagram.com/polleriaonelli?igsh=MTN2bHBqanNiN3NwbQ==|2026-09-15 20:46:50
QR000048|https://www.facebook.com/share/1abXw6g8in/|2026-09-16 19:22:53
QR000054|https://www.instagram.com/polleriaonelli?igsh=MTN2bHBqanNiN3NwbQ==|2026-09-16 19:23:17
QR000020|https://search.google.com/local/writereview?placeid=ChIJwToIrgJ7GpYR9B3zu7h_e88&utm_source=chatgpt.com|2026-09-19 11:16:10
QR000048|https://www.facebook.com/share/1abXw6g8in/|2026-09-21 20:13:11
QR000015|https://search.google.com/local/writereview?placeid=ChIJe1ol9pJ7GpYRjt_-75QMCp4|2026-09-22 18:33:24
QR000015|https://search.google.com/local/writereview?placeid=ChIJe1ol9pJ7GpYRjt_-75QMCp4|2026-09-22 18:33:27
QR000054|https://www.instagram.com/polleriaonelli?igsh=MTN2bHBqanNiN3NwbQ==|2026-09-23 10:21:50
QR000020|https://search.google.com/local/writereview?placeid=ChIJwToIrgJ7GpYR9B3zu7h_e88&utm_source=chatgpt.com|2026-09-25 17:50:02
QR000020|https://search.google.com/local/writereview?placeid=ChIJwToIrgJ7GpYR9B3zu7h_e88&utm_source=chatgpt.com|2026-09-25 17:51:56
QR000020|https://search.google.com/local/writereview?placeid=ChIJwToIrgJ7GpYR9B3zu7h_e88&utm_source=chatgpt.com|2026-09-25 17:52:49
QR000020|https://search.google.com/local/writereview?placeid=ChIJwToIrgJ7GpYR9B3zu7h_e88&utm_source=chatgpt.com|2026-09-25 18:40:14
QR000020|https://search.google.com/local/writereview?placeid=ChIJwToIrgJ7GpYR9B3zu7h_e88&utm_source=chatgpt.com|2026-09-25 20:08:00
QR000054|https://www.instagram.com/polleriaonelli?igsh=MTN2bHBqanNiN3NwbQ==|2026-09-26 11:16:05
QR000020|https://search.google.com/local/writereview?placeid=ChIJwToIrgJ7GpYR9B3zu7h_e88&utm_source=chatgpt.com|2026-09-26 19:03:09
QR000020|https://search.google.com/local/writereview?placeid=ChIJwToIrgJ7GpYR9B3zu7h_e88&utm_source=chatgpt.com|2026-09-26 21:15:31
QR000020|https://search.google.com/local/writereview?placeid=ChIJwToIrgJ7GpYR9B3zu7h_e88&utm_source=chatgpt.com|2026-09-27 12:18:27
QR000020|https://search.google.com/local/writereview?placeid=ChIJwToIrgJ7GpYR9B3zu7h_e88&utm_source=chatgpt.com|2026-09-29 14:41:36
QR000014|https://search.google.com/local/writereview?placeid=ChIJ2S7ysUR7GpYRg83SC3-4hzU&utm_source=chatgpt.com|2026-09-30 17:50:31
QR000057|https://wa.me/5492944512020|2026-10-01 12:13:45
QR000057|https://wa.me/5492944512020|2026-10-01 12:13:46
QR000054|https://www.instagram.com/polleriaonelli?igsh=MTN2bHBqanNiN3NwbQ==|2026-10-01 13:13:05
QR000054|https://www.instagram.com/polleriaonelli?igsh=MTN2bHBqanNiN3NwbQ==|2026-10-01 13:13:09
QR000054|https://www.instagram.com/polleriaonelli?igsh=MTN2bHBqanNiN3NwbQ==|2026-10-01 21:03:27
QR000057|https://wa.me/5492944512020|2026-10-05 12:11:09
QR000020|https://search.google.com/local/writereview?placeid=ChIJwToIrgJ7GpYR9B3zu7h_e88&utm_source=chatgpt.com|2026-10-07 14:42:00
QR000020|https://search.google.com/local/writereview?placeid=ChIJwToIrgJ7GpYR9B3zu7h_e88&utm_source=chatgpt.com|2026-10-07 14:42:11
QR000020|https://search.google.com/local/writereview?placeid=ChIJwToIrgJ7GpYR9B3zu7h_e88&utm_source=chatgpt.com|2026-10-07 14:42:36
QR000054|https://www.instagram.com/polleriaonelli?igsh=MTN2bHBqanNiN3NwbQ==|2026-10-09 09:45:24
QR000054|https://www.instagram.com/polleriaonelli?igsh=MTN2bHBqanNiN3NwbQ==|2026-10-09 09:45:26
QR000057|https://wa.me/5492944512020|2026-10-09 19:49:49
QR000057|https://wa.me/5492944512020|2026-10-12 00:43:13
QR000054|https://www.instagram.com/polleriaonelli?igsh=MTN2bHBqanNiN3NwbQ==|2026-10-13 20:09:08
QR000048|https://www.facebook.com/share/1abXw6g8in/|2026-10-20 20:13:08
QR000016|https://search.google.com/local/writereview?placeid=ChIJ5Zgi7Ul7GpYRAxNJzjUv2KI|2026-10-21 13:06:33
QR000016|https://search.google.com/local/writereview?placeid=ChIJ5Zgi7Ul7GpYRAxNJzjUv2KI|2026-10-21 13:07:39
QR000016|https://search.google.com/local/writereview?placeid=ChIJ5Zgi7Ul7GpYRAxNJzjUv2KI|2026-10-21 13:07:41
QR000016|https://search.google.com/local/writereview?placeid=ChIJ5Zgi7Ul7GpYRAxNJzjUv2KI|2026-10-21 13:14:49
QR000054|https://www.instagram.com/polleriaonelli?igsh=MTN2bHBqanNiN3NwbQ==|2026-10-21 18:52:06
QR000048|https://www.facebook.com/share/1abXw6g8in/|2026-10-24 12:16:28
QR000012|https://search.google.com/local/writereview?placeid=ChIJPyoz6Fx7GpYRfgXZJSrQNAk|2026-10-24 20:56:21
QR000012|https://search.google.com/local/writereview?placeid=ChIJPyoz6Fx7GpYRfgXZJSrQNAk|2026-10-24 20:56:23
QR000012|https://search.google.com/local/writereview?placeid=ChIJPyoz6Fx7GpYRfgXZJSrQNAk|2026-10-24 21:05:57
QR000012|https://search.google.com/local/writereview?placeid=ChIJPyoz6Fx7GpYRfgXZJSrQNAk|2026-10-24 21:10:19
QR000012|https://search.google.com/local/writereview?placeid=ChIJPyoz6Fx7GpYRfgXZJSrQNAk|2026-10-24 21:11:13
QR000012|https://search.google.com/local/writereview?placeid=ChIJPyoz6Fx7GpYRfgXZJSrQNAk|2026-10-24 21:12:52
QR000012|https://search.google.com/local/writereview?placeid=ChIJPyoz6Fx7GpYRfgXZJSrQNAk|2026-10-24 21:17:21
QR000012|https://search.google.com/local/writereview?placeid=ChIJPyoz6Fx7GpYRfgXZJSrQNAk|2026-10-24 21:20:35
QR000012|https://search.google.com/local/writereview?placeid=ChIJPyoz6Fx7GpYRfgXZJSrQNAk|2026-10-24 21:24:58
QR000012|https://search.google.com/local/writereview?placeid=ChIJPyoz6Fx7GpYRfgXZJSrQNAk|2026-10-24 21:27:18
QR000048|https://www.facebook.com/share/1abXw6g8in/|2026-10-27 10:18:17
QR000058|https://wa.me/5492944509410|2026-10-27 12:17:36
QR000058|https://wa.me/5492944509410|2026-10-27 12:17:45
QR000058|https://wa.me/5492944509410|2026-10-27 12:17:52
QR000015|https://search.google.com/local/writereview?placeid=ChIJe1ol9pJ7GpYRjt_-75QMCp4|2026-10-30 20:19:26
QR000050||2026-11-03 07:50:44
QR000053|https://www.instagram.com/polleriaonelli?igsh=MTN2bHBqanNiN3NwbQ==|2026-11-03 07:50:44
QR000058|https://wa.me/5492944509410|2026-11-03 07:50:44
QR000015|https://search.google.com/local/writereview?placeid=ChIJe1ol9pJ7GpYRjt_-75QMCp4|2026-11-03 18:10:50
QR000048|https://www.facebook.com/share/1abXw6g8in/|2026-11-05 19:48:32
QR000048|https://www.facebook.com/share/1abXw6g8in/|2026-11-05 19:48:52
QR000048|https://www.facebook.com/share/1abXw6g8in/|2026-11-05 19:48:59
QR000048|https://www.facebook.com/share/1abXw6g8in/|2026-11-05 19:49:05
QR000012|https://search.google.com/local/writereview?placeid=ChIJPyoz6Fx7GpYRfgXZJSrQNAk|2026-11-06 13:04:08
QR000012|https://search.google.com/local/writereview?placeid=ChIJPyoz6Fx7GpYRfgXZJSrQNAk|2026-11-06 13:04:10
QR000053|https://www.instagram.com/polleriaonelli?igsh=MTN2bHBqanNiN3NwbQ==|2026-11-06 14:30:43
QR000053|https://www.instagram.com/agencia32bariloche/|2026-11-06 14:38:17
QR000047|https://web.facebook.com/agenciala32?_rdc=1&_rdr#|2026-11-06 14:38:31
QR000056|https://wa.me/5492944586328|2026-11-06 14:38:49
QR000012|https://search.google.com/local/writereview?placeid=ChIJNaGEG3J7GpYRMpkN8HhtVA4|2026-11-06 14:39:32
QR000012|https://search.google.com/local/writereview?placeid=ChIJNaGEG3J7GpYRMpkN8HhtVA4&utm_source=chatgpt.com|2026-11-06 14:41:54
QR000059|https://wa.me/5492944629707|2026-11-06 16:25:01
QR000059|https://wa.me/5492944629707|2026-11-06 16:25:03
QR000044|https://search.google.com/local/writereview?placeid=ChIJTUe66Gd7GpYRMR8gUm0ndQQ&utm_source=chatgpt.com|2026-11-06 16:25:50
QR000044|https://search.google.com/local/writereview?placeid=ChIJTUe66Gd7GpYRMR8gUm0ndQQ&utm_source=chatgpt.com|2026-11-06 16:25:52
QR000059|https://wa.me/5492944629707|2026-11-06 16:30:06
QR000044|https://search.google.com/local/writereview?placeid=ChIJTUe66Gd7GpYRMR8gUm0ndQQ&utm_source=chatgpt.com|2026-11-06 16:30:20
QR000059|https://wa.me/5492944629707|2026-11-06 16:31:07
QR000059|https://wa.me/5492944629707|2026-11-06 16:31:08
QR000044|https://search.google.com/local/writereview?placeid=ChIJTUe66Gd7GpYRMR8gUm0ndQQ&utm_source=chatgpt.com|2026-11-06 16:31:53
QR000059|https://wa.me/5492944629707|2026-11-06 16:32:09
QR000059|https://wa.me/5492944629707|2026-11-06 16:33:00
QR000059|https://wa.me/5492944629707|2026-11-06 16:33:10
QR000059|https://wa.me/5492944629707|2026-11-06 16:34:10
QR000059|https://wa.me/5492944629707|2026-11-06 16:35:06
QR000059|https://wa.me/542944629707|2026-11-06 16:37:57
QR000059|https://wa.me/542944629707|2026-11-06 16:38:01
QR000044|https://search.google.com/local/writereview?placeid=ChIJTUe66Gd7GpYRMR8gUm0ndQQ&utm_source=chatgpt.com|2026-11-06 16:38:29
QR000059|https://wa.me/542944629707|2026-11-06 16:38:55
QR000059|https://api.whatsapp.com/send?phone=5492944586328|2026-11-06 16:39:59
QR000059|https://api.whatsapp.com/send?phone=5492944586328|2026-11-06 16:40:13
QR000059|https://api.whatsapp.com/send?phone=5492944629707|2026-11-06 16:40:45
QR000059|https://api.whatsapp.com/send?phone=5492944629707|2026-11-06 16:40:53
QR000059|https://api.whatsapp.com/send?phone=5492944629707|2026-11-06 16:43:15
QR000059|https://api.whatsapp.com/send?phone=5492944629707|2026-11-06 17:26:28
QR000057|https://wa.me/5492944512020|2026-11-06 19:51:40
QR000059|https://api.whatsapp.com/send?phone=5492944629707|2026-11-09 12:02:05
QR000059|https://api.whatsapp.com/send?phone=5492944629707|2026-11-09 12:02:05
QR000059|https://api.whatsapp.com/send?phone=5492944629707|2026-11-09 12:02:07
QR000059|https://api.whatsapp.com/send?phone=5492944629707|2026-11-09 12:08:22
QR000059|https://api.whatsapp.com/send?phone=5492944629707|2026-11-09 12:16:04
QR000044|https://search.google.com/local/writereview?placeid=ChIJTUe66Gd7GpYRMR8gUm0ndQQ&utm_source=chatgpt.com|2026-11-10 12:59:46
QR000044|https://search.google.com/local/writereview?placeid=ChIJTUe66Gd7GpYRMR8gUm0ndQQ&utm_source=chatgpt.com|2026-11-10 13:00:11
QR000051|https://www.instagram.com/polleriabelgrano?igsi=MTlxeHlwdjdlNzhsYw==|2026-11-10 13:55:29
QR000059|https://api.whatsapp.com/send?phone=5492944629707|2026-11-10 18:00:55
QR000059|https://api.whatsapp.com/send?phone=5492944629707|2026-11-11 23:59:27
QR000059|https://api.whatsapp.com/send?phone=5492944629707|2026-11-11 23:59:27
QR000044|https://search.google.com/local/writereview?placeid=ChIJTUe66Gd7GpYRMR8gUm0ndQQ&utm_source=chatgpt.com|2026-11-16 11:52:14
QR000044|https://search.google.com/local/writereview?placeid=ChIJTUe66Gd7GpYRMR8gUm0ndQQ&utm_source=chatgpt.com|2026-11-16 16:27:36
QR000048|https://www.facebook.com/share/1abXw6g8in/|2026-11-16 18:14:11
QR000044|https://search.google.com/local/writereview?placeid=ChIJTUe66Gd7GpYRMR8gUm0ndQQ&utm_source=chatgpt.com|2026-11-17 10:15:41
QR000044|https://search.google.com/local/writereview?placeid=ChIJTUe66Gd7GpYRMR8gUm0ndQQ&utm_source=chatgpt.com|2026-11-18 11:26:48
QR000044|https://search.google.com/local/writereview?placeid=ChIJTUe66Gd7GpYRMR8gUm0ndQQ&utm_source=chatgpt.com|2026-11-18 13:26:41
QR000044|https://search.google.com/local/writereview?placeid=ChIJTUe66Gd7GpYRMR8gUm0ndQQ&utm_source=chatgpt.com|2026-11-18 13:45:36
QR000044|https://search.google.com/local/writereview?placeid=ChIJTUe66Gd7GpYRMR8gUm0ndQQ&utm_source=chatgpt.com|2026-11-19 11:57:33
QR000044|https://search.google.com/local/writereview?placeid=ChIJTUe66Gd7GpYRMR8gUm0ndQQ&utm_source=chatgpt.com|2026-11-19 13:03:19
QR000060|https://wa.me/5492944251925|2026-11-20 00:00:35
QR000013||2026-11-20 00:06:28
QR000045||2026-11-20 00:07:12
QR000045||2026-11-20 00:07:22
QR000019||2026-11-20 00:08:07
QR000013||2026-11-20 00:09:00
QR000045||2026-11-20 00:09:51
QR000043||2026-11-20 00:10:14
QR000042||2026-11-20 00:10:42
QR000041||2026-11-20 00:10:53
QR000013||2026-11-20 00:12:40
QR000013||2026-11-20 00:14:27
QR000020|https://search.google.com/local/writereview?placeid=ChIJwToIrgJ7GpYR9B3zu7h_e88&utm_source=chatgpt.com|2026-11-20 00:14:27`;

function formatDateTimeAR(isoDateTimeStr) {
  // Input: "2026-08-25 11:18:39"
  const [datePart, timePart] = isoDateTimeStr.split(' ');
  const [yyyy, mm, dd] = datePart.split('-');
  const [HH, MM] = timePart.split(':');
  return `${dd}/${mm}/${yyyy} ${HH}:${MM}`;
}

const hits = rawHitsText.trim().split('\n').map((line, idx) => {
  const [key, url, rawDate] = line.split('|');
  // Parse in Argentina timezone (-03:00)
  const isoStr = rawDate.trim().replace(' ', 'T') + '-03:00';
  const timestamp = new Date(isoStr).getTime();
  const dateOnly = rawDate.trim().split(' ')[0];
  return {
    id: idx + 1,
    key: key.trim(),
    url: (url || '').trim(),
    timestamp,
    date: dateOnly,
    dateTime: formatDateTimeAR(rawDate.trim()),
    rawDate: rawDate.trim()
  };
});

const seedData = {
  settings: {
    basePage
  },
  qrs,
  hits
};

fs.mkdirSync(path.join(__dirname, '..', 'data'), { recursive: true });
fs.mkdirSync(path.join(__dirname, '..', 'functions', '_shared'), { recursive: true });

fs.writeFileSync(
  path.join(__dirname, '..', 'data', 'db.json'),
  JSON.stringify(seedData, null, 2),
  'utf8'
);

fs.writeFileSync(
  path.join(__dirname, '..', 'functions', '_shared', 'seed-data.js'),
  `export const INITIAL_DATA = ${JSON.stringify(seedData, null, 2)};\n`,
  'utf8'
);

// Generate schema.sql and seed.sql for Cloudflare D1
const schemaSql = `-- Esquema de Base de Datos Cloudflare D1 para KiurCode QRs
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS qrs (
  key TEXT PRIMARY KEY,
  url TEXT DEFAULT '',
  place TEXT DEFAULT '',
  active INTEGER DEFAULT 1,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS hits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  qr_key TEXT NOT NULL,
  url TEXT DEFAULT '',
  timestamp INTEGER NOT NULL,
  date TEXT NOT NULL,
  date_time TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_hits_qr_key ON hits(qr_key);
CREATE INDEX IF NOT EXISTS idx_hits_timestamp ON hits(timestamp);
`;

fs.writeFileSync(path.join(__dirname, '..', 'schema.sql'), schemaSql, 'utf8');

function sqlEscape(str) {
  return "'" + String(str || '').replace(/'/g, "''") + "'";
}

let seedSql = schemaSql + "\n-- Datos iniciales migrados desde Google Sheets\n";
seedSql += `INSERT OR REPLACE INTO settings (key, value) VALUES ('basePage', ${sqlEscape(basePage)});\n\n`;

for (const qr of qrs) {
  seedSql += `INSERT OR REPLACE INTO qrs (key, url, place, active) VALUES (${sqlEscape(qr.key)}, ${sqlEscape(qr.url)}, ${sqlEscape(qr.place)}, ${qr.active});\n`;
}

seedSql += "\n";
for (const hit of hits) {
  seedSql += `INSERT INTO hits (qr_key, url, timestamp, date, date_time) VALUES (${sqlEscape(hit.key)}, ${sqlEscape(hit.url)}, ${hit.timestamp}, ${sqlEscape(hit.date)}, ${sqlEscape(hit.dateTime)});\n`;
}

fs.writeFileSync(path.join(__dirname, '..', 'seed.sql'), seedSql, 'utf8');

console.log(`Generated ${qrs.length} QRs and ${hits.length} hits.`);
