// Utility to trigger or get standalone HTML
export async function downloadSajjatAIHTMLFile(): Promise<void> {
  try {
    const res = await fetch('/Sajjat_AI.html');
    if (res.ok) {
      const htmlText = await res.text();
      const blob = new Blob([htmlText], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'Sajjat_AI.html';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      return;
    }
  } catch (err) {
    console.warn('Direct fetch failed, falling back to direct link download', err);
  }

  // Direct link fallback
  const a = document.createElement('a');
  a.href = '/Sajjat_AI.html';
  a.download = 'Sajjat_AI.html';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

export function generateStandaloneHTML(): string {
  return '<!DOCTYPE html><html><head><meta http-equiv="refresh" content="0; url=/Sajjat_AI.html" /></head><body><script>window.location.href="/Sajjat_AI.html";</script></body></html>';
}
