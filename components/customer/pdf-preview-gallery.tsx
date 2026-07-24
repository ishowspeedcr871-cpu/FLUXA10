"use client";

import React, { useState } from "react";
import { 
  FileText, 
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  Trash2, 
  RefreshCw, 
  Eye, 
  X, 
  ChevronLeft, 
  ChevronRight, 
  Sparkles,
  Layers
} from "lucide-react";
import { RealPdfCanvas } from "@/components/pdf/real-pdf-canvas";

export type UploadedFile = {
  id: string;
  name: string;
  size: number;
  type: string;
  pages: number;
  color: boolean;
  orientation: string;
  uploadTime?: string;
  rawFile?: File;
};

interface PdfPreviewGalleryProps {
  files: UploadedFile[];
  onDeleteFile: (id: string) => void;
  onReplaceFile: (e: React.ChangeEvent<HTMLInputElement>) => void;
  activeFileIndex?: number;
  onSelectFile?: (index: number) => void;
}

export function PdfPreviewGallery({
  files,
  onDeleteFile,
  onReplaceFile,
  activeFileIndex = 0,
  onSelectFile
}: PdfPreviewGalleryProps) {
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [selectedModalPage, setSelectedModalPage] = useState<number | null>(null);
  const replaceInputRef = React.useRef<HTMLInputElement>(null);

  if (!files || files.length === 0) return null;

  const file = files[activeFileIndex] || files[0];
  const totalPages = file.pages || 1;
  const formattedSize = file.size > 1024 * 1024 
    ? `${(file.size / (1024 * 1024)).toFixed(2)} MB` 
    : `${Math.round(file.size / 1024)} KB`;

  const handleZoomIn = () => setZoomLevel(prev => Math.min(200, prev + 25));
  const handleZoomOut = () => setZoomLevel(prev => Math.max(50, prev - 25));
  const handleResetZoom = () => setZoomLevel(100);

  return (
    <div className="rounded-3xl border border-white/10 bg-[#0e0f17] p-5 space-y-5 shadow-2xl">
      {/* Top Header: File Info & Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
        <div className="flex items-center gap-3">
          <div className="size-11 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0 shadow-lg shadow-cyan-500/5">
            <FileText className="size-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-white max-w-[280px] sm:max-w-md truncate">
                {file.name}
              </h3>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                {totalPages} {totalPages === 1 ? "Page" : "Pages"} Detected
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono mt-0.5 flex items-center gap-2">
              <span>{formattedSize}</span>
              <span>•</span>
              <span>{file.uploadTime || "Uploaded Just Now"}</span>
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Zoom controls */}
          <div className="hidden sm:flex items-center bg-black/40 border border-white/10 rounded-xl p-1 gap-1">
            <button
              type="button"
              onClick={handleZoomOut}
              disabled={zoomLevel <= 50}
              className="p-1.5 hover:bg-white/10 rounded-lg text-slate-300 disabled:opacity-30 transition-all cursor-pointer"
              title="Zoom Out"
            >
              <ZoomOut className="size-4" />
            </button>
            <span 
              onClick={handleResetZoom} 
              className="text-[11px] font-mono font-bold text-cyan-300 px-2 cursor-pointer hover:underline"
              title="Reset Zoom"
            >
              {zoomLevel}%
            </span>
            <button
              type="button"
              onClick={handleZoomIn}
              disabled={zoomLevel >= 200}
              className="p-1.5 hover:bg-white/10 rounded-lg text-slate-300 disabled:opacity-30 transition-all cursor-pointer"
              title="Zoom In"
            >
              <ZoomIn className="size-4" />
            </button>
          </div>

          {/* Replace file button */}
          <input
            type="file"
            ref={replaceInputRef}
            onChange={onReplaceFile}
            accept="application/pdf,image/*,.docx,.pptx"
            className="hidden"
          />
          <button
            type="button"
            onClick={() => replaceInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-slate-200 transition-all cursor-pointer"
          >
            <RefreshCw className="size-3.5 text-cyan-400" />
            <span className="hidden xs:inline">Replace File</span>
          </button>

          {/* Delete file button */}
          <button
            type="button"
            onClick={() => onDeleteFile(file.id)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-xs font-semibold text-rose-400 transition-all cursor-pointer"
            title="Delete File"
          >
            <Trash2 className="size-3.5" />
            <span className="hidden xs:inline">Delete</span>
          </button>
        </div>
      </div>

      {/* Multiple Files Tabs Selector (if batch uploaded) */}
      {files.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-2 custom-scrollbar">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 shrink-0">
            <Layers className="size-3.5 text-cyan-400" /> Files:
          </span>
          {files.map((f, idx) => (
            <button
              key={f.id}
              type="button"
              onClick={() => onSelectFile && onSelectFile(idx)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-2 border ${
                idx === activeFileIndex
                  ? "bg-cyan-500/15 text-cyan-300 border-cyan-500/40 shadow-sm"
                  : "bg-black/30 text-slate-400 border-white/5 hover:bg-white/5 hover:text-slate-200"
              }`}
            >
              <span className="truncate max-w-[140px]">{f.name}</span>
              <span className="text-[10px] opacity-70 bg-white/10 px-1.5 py-0.2 rounded-full font-mono">
                {f.pages}p
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Document Page Thumbnail Gallery */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="size-3.5 text-cyan-400" />
            Page Thumbnail Stream ({totalPages} Pages)
          </label>
          <span className="text-[11px] text-slate-400">
            Click page thumbnail to open high-resolution reader
          </span>
        </div>

        {/* Scrollable Gallery Container */}
        <div 
          className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3.5 max-h-[380px] overflow-y-auto p-2 rounded-2xl bg-black/40 border border-white/5 custom-scrollbar"
        >
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
            <div
              key={pageNum}
              onClick={() => setSelectedModalPage(pageNum)}
              style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: "top left" }}
              className="group relative cursor-pointer rounded-xl border border-white/10 hover:border-cyan-400/80 bg-[#181924] p-3 transition-all duration-200 hover:shadow-xl hover:shadow-cyan-500/10 flex flex-col items-center justify-between min-h-[160px]"
            >
              {/* Page Number Badge */}
              <div className="w-full flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono font-black text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-md border border-cyan-500/20">
                  Page {pageNum}
                </span>
                <span className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-white">
                  <Maximize2 className="size-3.5" />
                </span>
              </div>

              {/* High-Fidelity PDF Page Canvas Render */}
              <div className="w-full h-28 relative rounded-md overflow-hidden shadow-md flex items-center justify-center bg-slate-900 group-hover:ring-2 ring-cyan-400/50 transition-all">
                <RealPdfCanvas
                  fileName={file.name}
                  rawFile={file.rawFile}
                  pageNum={pageNum}
                  scale={0.35}
                  className="w-full h-full cursor-pointer"
                  onClick={() => setSelectedModalPage(pageNum)}
                />
                {/* Hover overlay button */}
                <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-[1px] opacity-0 group-hover:opacity-100 transition-all duration-200 flex items-center justify-center pointer-events-none">
                  <span className="px-2.5 py-1 rounded-lg bg-cyan-400 text-black font-extrabold text-[10px] tracking-wider uppercase flex items-center gap-1 shadow-lg">
                    <Eye className="size-3" /> View Page
                  </span>
                </div>
              </div>

              {/* Bottom Label */}
              <span className="text-[10px] font-medium text-slate-400 mt-2">
                Page {pageNum} of {totalPages}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Full Preview Modal */}
      {selectedModalPage !== null && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="relative bg-[#0d0e15] border border-white/20 rounded-3xl max-w-2xl w-full p-6 space-y-5 shadow-2xl flex flex-col items-center">
            <button
              type="button"
              onClick={() => setSelectedModalPage(null)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full bg-white/5 transition-colors cursor-pointer"
            >
              <X className="size-5" />
            </button>

            {/* Modal Title */}
            <div className="text-center space-y-1">
              <h3 className="text-lg font-bold text-white flex items-center justify-center gap-2">
                <FileText className="size-5 text-cyan-400" />
                {file.name}
              </h3>
              <p className="text-xs text-slate-400 font-mono">
                Viewing Page {selectedModalPage} of {totalPages}
              </p>
            </div>

            {/* High-Resolution Full Page Canvas Document Display */}
            <div className="w-full max-w-md h-[420px] bg-white rounded-2xl p-2 shadow-2xl flex flex-col items-center justify-center border border-slate-300 relative overflow-hidden">
              <RealPdfCanvas
                fileName={file.name}
                rawFile={file.rawFile}
                pageNum={selectedModalPage}
                scale={0.8}
                className="max-h-[400px] w-auto shadow-lg"
              />
            </div>

            {/* Page Navigation Controls */}
            <div className="flex items-center gap-4 pt-2">
              <button
                type="button"
                onClick={() => setSelectedModalPage(prev => (prev && prev > 1 ? prev - 1 : prev))}
                disabled={selectedModalPage <= 1}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 disabled:opacity-30 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
              >
                <ChevronLeft className="size-4" /> Previous
              </button>

              <span className="text-xs font-mono text-cyan-300 font-bold">
                {selectedModalPage} / {totalPages}
              </span>

              <button
                type="button"
                onClick={() => setSelectedModalPage(prev => (prev && prev < totalPages ? prev + 1 : prev))}
                disabled={selectedModalPage >= totalPages}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 disabled:opacity-30 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
              >
                Next <ChevronRight className="size-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
