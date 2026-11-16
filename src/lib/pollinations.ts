// Semua hal terkait Pollinations.ai ada di sini; ubah di satu tempat jika API berubah.
export function pollinationsUrl(
  prompt: string,
  opts: { width?: number; height?: number } = {},
): string {
  const { width = 1024, height = 1024 } = opts;
  const seed = Math.floor(Math.random() * 1_000_000);
  const encoded = encodeURIComponent(prompt.trim())
    .replace(/\(/g, '%28')
    .replace(/\)/g, '%29'); // supaya aman dipakai di markdown ![](url)
  return `https://image.pollinations.ai/prompt/${encoded}?width=${width}&height=${height}&seed=${seed}&nologo=true`;
}
