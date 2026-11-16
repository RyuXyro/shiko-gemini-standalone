const VERSION = process.env.WHATSAPP_API_VERSION ?? 'v21.0';
const base = () => `https://graph.facebook.com/${VERSION}/${process.env.WHATSAPP_PHONE_NUMBER_ID}`;
const auth = () => ({ Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}` });

async function graph(path: string, init: RequestInit) {
  const res = await fetch(`${base()}${path}`, init);
  if (!res.ok) console.error('[wa] graph error', res.status, await res.text());
  return res;
}

export async function sendText(to: string, body: string) {
  await graph('/messages', {
    method: 'POST',
    headers: { ...auth(), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: { body: body.slice(0, 4000) },
    }),
  });
}

/**
 * Pollinations membuat gambar saat diminta (bisa lambat), sehingga WhatsApp sering
 * gagal mengambil lewat link. Kita unduh sendiri lalu unggah ke WhatsApp Media.
 */
export async function sendImage(to: string, imageUrl: string, caption: string) {
  const img = await fetch(imageUrl);
  if (!img.ok) throw new Error(`Pollinations membalas ${img.status}`);
  const blob = await img.blob();

  const form = new FormData();
  form.append('messaging_product', 'whatsapp');
  form.append('type', blob.type || 'image/jpeg');
  form.append('file', blob, 'image.jpg');

  const upload = await graph('/media', { method: 'POST', headers: auth(), body: form });
  const { id } = (await upload.json()) as { id?: string };
  if (!id) throw new Error('Upload media ke WhatsApp gagal');

  await graph('/messages', {
    method: 'POST',
    headers: { ...auth(), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      type: 'image',
      image: { id, caption: caption.slice(0, 1000) },
    }),
  });
}
