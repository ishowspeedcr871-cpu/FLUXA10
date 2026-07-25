"use client";

import React, { useEffect, useRef, useState } from "react";

type PdfJs = typeof import("pdfjs-dist/legacy/build/pdf.mjs");

async function loadPdfJs(): Promise<PdfJs> {
  const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");
  if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
  }
  return pdfjsLib;
}

export interface PdfCanvasProps {
  fileName: string;
  rawFile?: File | null;
  fileUrl?: string | null;
  pageNum: number;
  scale?: number;
  className?: string;
  onClick?: () => void;
}

export function RealPdfCanvas({
  fileName,
  rawFile,
  fileUrl,
  pageNum,
  scale = 0.5,
  className = "",
  onClick,
}: PdfCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [loading, setLoading] = useState(true);
  const [rendered, setRendered] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "240px" },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [fileName, pageNum]);

  useEffect(() => {
    if (!isVisible) return;

    let isCancelled = false;

    async function renderPage() {
      if (!canvasRef.current) return;
      setLoading(true);
      setRendered(false);

      try {
        // 1. Handle Images
        const isRawImage = rawFile?.type?.startsWith("image/");
        const isUrlImage = fileUrl && (
          fileUrl.match(/\.(jpeg|jpg|gif|png|webp)/i) || 
          fileUrl.startsWith("data:image/")
        );

        if (isRawImage || isUrlImage) {
          const img = new Image();
          let srcUrl = "";
          if (isRawImage && rawFile) {
            srcUrl = URL.createObjectURL(rawFile);
          } else if (fileUrl) {
            srcUrl = fileUrl;
          }

          if (srcUrl) {
            img.src = srcUrl;
            await new Promise((resolve, reject) => {
              img.onload = resolve;
              img.onerror = reject;
            });

            if (isCancelled) {
              if (isRawImage) URL.revokeObjectURL(srcUrl);
              return;
            }

            const canvas = canvasRef.current;
            if (!canvas) {
              if (isRawImage) URL.revokeObjectURL(srcUrl);
              return;
            }
            const context = canvas.getContext("2d");
            if (!context) {
              if (isRawImage) URL.revokeObjectURL(srcUrl);
              return;
            }

            canvas.width = img.naturalWidth * scale;
            canvas.height = img.naturalHeight * scale;
            context.drawImage(img, 0, 0, canvas.width, canvas.height);

            setLoading(false);
            setRendered(true);

            if (isRawImage) URL.revokeObjectURL(srcUrl);
            return;
          }
        }

        // 2. Handle PDF
        let pdfSource: any = null;
        if (rawFile) {
          pdfSource = new Uint8Array(await rawFile.arrayBuffer());
        } else if (fileUrl) {
          pdfSource = fileUrl;
        }

        if (pdfSource) {
          const pdfjsLib = await loadPdfJs();
          const loadingTask = pdfjsLib.getDocument(pdfSource);
          const pdf = await loadingTask.promise;
          if (isCancelled) return;

          const targetPageNum = Math.min(Math.max(1, pageNum), pdf.numPages);
          const page = await pdf.getPage(targetPageNum);
          if (isCancelled) return;

          const viewport = page.getViewport({ scale });
          const canvas = canvasRef.current;
          if (!canvas) return;

          const context = canvas.getContext("2d");
          if (!context) return;

          canvas.width = viewport.width;
          canvas.height = viewport.height;

          const renderContext = {
            canvasContext: context,
            viewport,
            canvas,
          };

          await page.render(renderContext).promise;
          if (!isCancelled) {
            setLoading(false);
            setRendered(true);
            return;
          }
        }
      } catch (err) {
        console.warn("[PDF_RENDER_ERROR] Render failed:", err);
      }

      // If rendering failed/not loaded, draw a simple blank block (never a fake document)
      if (!isCancelled && canvasRef.current) {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          const width = Math.round(210 * scale * 2.5);
          const height = Math.round(297 * scale * 2.5);
          canvas.width = width;
          canvas.height = height;

          ctx.fillStyle = "#1e293b";
          ctx.fillRect(0, 0, width, height);

          ctx.fillStyle = "#94a3b8";
          ctx.font = `${Math.round(8 * scale * 2)}px monospace`;
          ctx.textAlign = "center";
          ctx.fillText("PREVIEW UNAVAILABLE", width / 2, height / 2);

          setLoading(false);
          setRendered(true);
        }
      }
    }

    renderPage();

    return () => {
      isCancelled = true;
    };
  }, [fileName, rawFile, fileUrl, pageNum, scale, isVisible]);

  return (
    <div
      ref={containerRef}
      onClick={onClick}
      className={`relative flex items-center justify-center bg-white rounded-xl overflow-hidden shadow-md border border-slate-200 group-hover:border-cyan-400 transition-all ${className}`}
    >
      <canvas ref={canvasRef} className="max-w-full max-h-full object-contain block" />
      {loading && !rendered && (
        <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-[1px] flex flex-col items-center justify-center p-2 text-center text-[10px] text-cyan-300 font-mono">
          <span>Rendering Page {pageNum}...</span>
        </div>
      )}
    </div>
  );
}
