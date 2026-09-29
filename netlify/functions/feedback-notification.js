// netlify/functions/feedback-notification.js

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  let data;
  try {
    data = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, body: 'Invalid JSON' };
  }

  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  if (!RESEND_API_KEY) {
    console.error('RESEND_API_KEY nicht gesetzt');
    return { statusCode: 500, body: 'Server configuration error' };
  }

  const stars = (n) => n && n !== '–' ? '★'.repeat(Number(n)) + '☆'.repeat(5 - Number(n)) : '–';
  const row = (label, value) =>
    `<tr>
      <td style="padding:8px 16px 8px 0;color:#7a5c4a;font-size:13px;font-weight:500;vertical-align:top;white-space:nowrap;">${label}</td>
      <td style="padding:8px 0;color:#2a1a1a;font-size:14px;font-weight:300;line-height:1.6;">${value || '–'}</td>
    </tr>`;

  const section = (title, rows) =>
    `<div style="margin-bottom:32px;">
      <h3 style="font-family:Georgia,serif;font-size:18px;font-weight:400;color:#5c2d2d;margin:0 0 12px;padding-bottom:8px;border-bottom:1px solid #ede5dc;">${title}</h3>
      <table style="width:100%;border-collapse:collapse;">${rows}</table>
    </div>`;

  const html = `<!DOCTYPE html>
<html lang="de">
<head><meta charset="UTF-8"/></head>
<body style="background:#f7f2ee;margin:0;padding:32px 16px;font-family:'Helvetica Neue',Arial,sans-serif;">
<div style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 16px rgba(92,45,45,0.08);">
  <div style="background:#7a3f3f;padding:32px 36px;">
    <p style="margin:0 0 6px;font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#c4a882;font-weight:300;">Bauch · Baby · Beckenboden</p>
    <h1 style="margin:0;font-family:Georgia,serif;font-size:26px;font-weight:300;color:#f7f2ee;">Neues Kurs-Feedback</h1>
    <p style="margin:10px 0 0;font-size:14px;color:rgba(247,242,238,0.65);font-weight:300;">
      <strong style="color:#c4a882;">${data.kurs}</strong> &nbsp;·&nbsp; ${data.eingereicht_am}
    </p>
  </div>
  <div style="padding:36px;">

    ${section('🫖 Räumlichkeit', [
      row('Wohlfühlen im Raum', stars(data.raum_wohl)),
      row('Temperatur', data.raum_temp),
      row('Platz auf der Matte', data.raum_platz),
      row('Wünsche zum Raum', data.raum_wunsch),
      row('Beleuchtung (1–5)', data.licht_skala),
      row('Beleuchtungswünsche', data.licht_wunsch),
    ].join(''))}

    ${section('🌿 Körpergefühl & Übungen', [
      row('Schmerzen / Unbehagen', data.schmerz),
      row('Details', data.schmerz_detail),
      row('Modifikationen', stars(data.modifikation)),
      row('Tempo', data.tempo),
      row('Nächste Einheit', data.empfehlen),
    ].join(''))}

    ${section('🌸 Über die Teilnehmerin', [
      row('Vorerfahrung', data.erfahrung),
      row('Nachgefühl', data.nachher),
      row('Altersgruppe', data.alter),
    ].join(''))}

    ${section('💬 Freier Raum', [
      row('Was hat besonders gefallen / geholfen', data.beruehrt),
      row('Wunschthemen', data.wunschthemen),
    ].join(''))}

  </div>
  <div style="padding:20px 36px 28px;background:#f7f2ee;text-align:center;">
    <p style="margin:0;font-size:12px;color:#8a7060;font-style:italic;font-weight:300;">
      Dieses Feedback wurde anonym über das Kurs-Feedback-Formular eingereicht.
    </p>
  </div>
</div>
</body>
</html>`;

  const https = require('https');

  const result = await new Promise((resolve, reject) => {
    const body = JSON.stringify({
      from: 'Kurs-Feedback <onboarding@resend.dev>',
      to: ['bauch.baby.beckenboden@gmail.com'],
      subject: `Neues Feedback: ${data.kurs} – ${data.eingereicht_am}`,
      html,
    });

    const req = https.request(
      {
        hostname: 'api.resend.com',
        path: '/emails',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${RESEND_API_KEY}`,
          'Content-Length': Buffer.byteLength(body),
        },
      },
      (res) => {
        let responseData = '';
        res.on('data', (chunk) => { responseData += chunk; });
        res.on('end', () => resolve({ status: res.statusCode, body: responseData }));
      }
    );
    req.on('error', reject);
    req.write(body);
    req.end();
  });

  console.log('Resend Status:', result.status, result.body);

  if (result.status >= 400) {
    console.error('Resend Fehler:', result.body);
    return { statusCode: 502, body: 'Mail delivery failed' };
  }

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ok: true }),
  };
};
