import { PDFDocument } from 'pdf-lib';

export async function getDocumentPageCount(file: File): Promise<number> {
  try {
    if (file.type.startsWith('image/')) {
      return 1;
    }
    if (file.name.endsWith('.docx') || file.name.endsWith('.pptx')) {
      return Math.max(1, Math.ceil(file.size / 50000));
    }
    if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
      const buffer = await file.arrayBuffer();
      
      // Method 1: pdf-lib official parser
      try {
        const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
        const count = pdfDoc.getPageCount();
        if (count && count > 0) {
          return count;
        }
      } catch (pdfLibErr) {
        console.warn("pdf-lib parse failed, trying binary stream parser fallback:", pdfLibErr);
      }

      // Method 2: Look for /Count N in PDF catalog/pages dictionary
      const text = new TextDecoder('latin1').decode(buffer);
      const countMatches = text.match(/\/Count\s+(\d+)/g);
      if (countMatches && countMatches.length > 0) {
        let maxCount = 1;
        for (const match of countMatches) {
          const num = parseInt(match.replace(/\/Count\s+/, ''), 10);
          if (!isNaN(num) && num > maxCount && num < 100000) {
            maxCount = num;
          }
        }
        if (maxCount > 1) {
          return maxCount;
        }
      }

      // Method 3: Count occurrences of /Type /Page (excluding /Type /Pages)
      const pageMatches = text.match(/\/Type\s*\/Page\b(?!s)/g);
      if (pageMatches && pageMatches.length > 0) {
        return pageMatches.length;
      }

      // Fallback: search for /Page occurrences
      const fallbackMatches = text.match(/\/Page\b/g);
      if (fallbackMatches && fallbackMatches.length > 0) {
        return Math.max(1, Math.floor(fallbackMatches.length / 2));
      }
    }
  } catch (err) {
    console.error("Error parsing document page count:", err);
  }
  return 1;
}
