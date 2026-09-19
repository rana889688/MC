/**
 * Robust print helper that handles printing both inside sandboxed iframes
 * and in standard top-level browser tabs.
 */
export const printElement = (elementId: string, title: string = 'রসিদ মেমো') => {
  const element = document.getElementById(elementId);
  if (!element) {
    try {
      window.print();
    } catch (e) {
      console.error('Print error:', e);
    }
    return;
  }

  // Detect if running inside an iframe (like AI Studio preview)
  const isInsideIframe = (() => {
    try {
      return window.self !== window.top;
    } catch {
      return true;
    }
  })();

  // If NOT inside an iframe, direct window.print() is preferred
  if (!isInsideIframe) {
    try {
      window.print();
      return;
    } catch (err) {
      console.warn('Standard window.print() failed, trying popup window:', err);
    }
  }

  // For iframe environments where window.print() is blocked by sandbox 'allow-modals':
  // Gather styles from document head so all Tailwind classes render with 100% fidelity
  const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
    .map((el) => el.outerHTML)
    .join('\n');

  const printHtml = `<!DOCTYPE html>
<html lang="bn">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  ${styles}
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: 'Hind Siliguri', system-ui, -apple-system, BlinkMacSystemFont, sans-serif !important;
      background-color: #f8fafc;
      margin: 0;
      padding: 20px;
      display: flex;
      flex-direction: column;
      align-items: center;
      min-height: 100vh;
    }
    .print-toolbar {
      width: 100%;
      max-width: 440px;
      display: flex;
      gap: 10px;
      margin-bottom: 16px;
    }
    .print-btn {
      flex: 1;
      padding: 10px 16px;
      background: #059669;
      color: white;
      font-size: 14px;
      font-weight: 700;
      border: none;
      border-radius: 10px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      transition: background-color 0.2s;
    }
    .print-btn:hover {
      background: #047857;
    }
    .close-btn {
      padding: 10px 16px;
      background: #e2e8f0;
      color: #334155;
      font-size: 14px;
      font-weight: 600;
      border: none;
      border-radius: 10px;
      cursor: pointer;
      transition: background-color 0.2s;
    }
    .close-btn:hover {
      background: #cbd5e1;
    }
    .receipt-card-wrapper {
      width: 100%;
      max-width: 440px;
      background: #ffffff;
      border-radius: 16px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.06);
      border: 1px solid #e2e8f0;
      overflow: hidden;
    }
    @media print {
      body {
        background: transparent !important;
        padding: 0 !important;
      }
      .print-toolbar {
        display: none !important;
      }
      .receipt-card-wrapper {
        box-shadow: none !important;
        border: none !important;
        max-width: 100% !important;
        width: 100% !important;
        border-radius: 0 !important;
      }
      @page {
        margin: 8mm;
        size: auto;
      }
    }
  </style>
</head>
<body>
  <div class="print-toolbar">
    <button class="print-btn" onclick="window.print()">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
      প্রিন্ট করুন
    </button>
    <button class="close-btn" onclick="window.close()">বন্ধ করুন</button>
  </div>
  <div class="receipt-card-wrapper">
    ${element.innerHTML}
  </div>
  <script>
    // Automatically trigger print dialog when popup loads
    window.addEventListener('load', function() {
      setTimeout(function() {
        try {
          window.print();
        } catch (e) {
          console.warn('Auto print failed:', e);
        }
      }, 350);
    });
  </script>
</body>
</html>`;

  try {
    const blob = new Blob([printHtml], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const printWindow = window.open(url, '_blank');
    if (printWindow) {
      printWindow.focus();
    } else {
      // If popup was blocked, fallback to direct print
      window.print();
    }
  } catch (err) {
    console.error('Print blob error, trying direct print:', err);
    try {
      window.print();
    } catch (e) {
      console.error('Final window.print error:', e);
    }
  }
};
