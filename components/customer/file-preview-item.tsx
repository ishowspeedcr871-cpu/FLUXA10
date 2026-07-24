"use client";

import React from "react";
import { FileText } from "lucide-react";
import { RealPdfCanvas } from "@/components/pdf/real-pdf-canvas";

interface FilePreviewItemProps {
  fileName: string;
  fileSize: number;
  mimeType: string;
  previewUrl?: string | null;
}

export function FilePreviewItem({ fileName, fileSize, mimeType, previewUrl }: FilePreviewItemProps) {
  return (
    <div className="flex items-center justify-between p-3.5 rounded-2xl border border-white/10 bg-white/[0.01]">
      <div className="flex items-center gap-3 min-w-0">
        <div className="size-10 rounded-lg overflow-hidden bg-slate-900 flex-shrink-0 border border-white/5">
          {previewUrl ? (
            <RealPdfCanvas
              fileName={fileName}
              fileUrl={previewUrl}
              pageNum={1}
              scale={0.2}
              className="w-full h-full"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-accent-magenta bg-accent-magenta/5">
              <FileText className="size-5" />
            </div>
          )}
        </div>
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold text-white">{fileName}</p>
          <p className="text-[10px] text-muted-foreground">
            {(fileSize / 1024).toFixed(1)} KB · {mimeType.split("/")[1]?.toUpperCase() || "PDF"}
          </p>
        </div>
      </div>
      <span className="text-[10px] font-semibold text-success bg-success/10 px-2 py-0.5 rounded-full">
        Ready
      </span>
    </div>
  );
}
