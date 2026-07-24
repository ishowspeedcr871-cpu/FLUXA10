"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Printer,
  ShieldCheck,
  Sliders,
  DollarSign,
  FileText,
  User,
  Clock,
  Info,
  Scale,
  Settings,
  HelpCircle,
  FileDown,
} from "lucide-react";
import { RealPdfCanvas } from "@/components/pdf/real-pdf-canvas";

interface EmployeePrintReviewModalProps {
  job: any;
  printers?: any[];
  onClose: () => void;
  onConfirmRelease: (updatedSettings: any, newCost: number, reason: string) => Promise<void>;
  isReleasing?: boolean;
}

export function EmployeePrintReviewModal({
  job,
  printers = [],
  onClose,
  onConfirmRelease,
  isReleasing = false,
}: EmployeePrintReviewModalProps) {
  // Extract initial values from the job and its metadata safely
  const uploadConfig = (job?.metadata as any)?.uploadConfiguration || {};

  const [color, setColor] = useState<boolean>(job?.color ?? false);
  const [copies, setCopies] = useState<number>(job?.copies ?? 1);
  const [duplex, setDuplex] = useState<boolean>(job?.duplex ?? true);
  const [paperSize, setPaperSize] = useState<string>(uploadConfig.paperSize || "A4");
  const [orientation, setOrientation] = useState<string>(uploadConfig.orientation || "portrait");
  const [pageRange, setPageRange] = useState<string>(uploadConfig.pageRange || "");
  const [printerId, setPrinterId] = useState<string>(job?.printerId || "");
  const [printQuality, setPrintQuality] = useState<string>(uploadConfig.paperQuality || "standard");
  const [scaling, setScaling] = useState<string>(uploadConfig.scaling || "fit");
  const [fitToPage, setFitToPage] = useState<boolean>(uploadConfig.fitToPage ?? true);
  const [reason, setReason] = useState<string>("");

  const pageCount = job?.pageCount || 1;

  // Real-time automatic total price calculation matching FLUXA rates
  // Rs 2 for B/W, Rs 10 for Color per page, per copy
  const rate = color ? 10 : 2;
  const newTotalCost = pageCount * copies * rate;

  const displayOtp =
    job?.otpCode || (job?.id && job.id.length >= 4 ? job.id.slice(-4).toUpperCase() : "0000");

  // Pre-fill printerId if empty and printers list is available
  useEffect(() => {
    if (!printerId && printers.length > 0) {
      const onlinePrinter = printers.find((p) => p.status === "ONLINE") || printers[0];
      setPrinterId(onlinePrinter.id);
    }
  }, [printers, printerId]);

  const handleReleaseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirmRelease(
      {
        color,
        copies,
        duplex,
        paperSize,
        orientation,
        pageRange,
        printerId,
        printQuality,
        scaling,
        fitToPage,
      },
      newTotalCost,
      reason,
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto select-none">
      <div
        id="print-review-modal-container"
        className="bg-[#0b0c14] border border-white/10 rounded-[28px] max-w-5xl w-full p-6 md:p-8 space-y-6 relative shadow-2xl my-8"
      >
        {/* Top Header Row */}
        <div className="flex items-center justify-between border-b border-white/5 pb-4">
          <div className="flex items-center gap-3">
            <div className="size-11 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Sliders className="size-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white uppercase tracking-wider flex items-center gap-2">
                Print Job Review & Edit
                <span className="text-[10px] bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 px-2 py-0.5 rounded-full font-bold">
                  Admin Overrides
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Verify parameters, adjust specifications for quality or economy, and release to
                print.
              </p>
            </div>
          </div>

          <button
            id="close-review-modal-btn"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-all duration-200"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Info Highlights Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-white/[0.02] border border-white/5 rounded-2xl p-4 text-xs">
          <div>
            <span className="text-slate-500 block uppercase font-bold text-[9px] tracking-wider">
              Customer Name
            </span>
            <span className="text-white font-bold flex items-center gap-1.5 mt-0.5">
              <User className="size-3.5 text-cyan-400" />
              {job?.customerUser?.name || job?.customerUser?.email || "Guest Customer"}
            </span>
          </div>
          <div>
            <span className="text-slate-500 block uppercase font-bold text-[9px] tracking-wider">
              Verification OTP
            </span>
            <span className="text-cyan-300 font-black tracking-widest font-mono text-sm mt-0.5 block">
              {displayOtp}
            </span>
          </div>
          <div>
            <span className="text-slate-500 block uppercase font-bold text-[9px] tracking-wider">
              Job ID reference
            </span>
            <span className="text-slate-300 font-mono mt-0.5 block">#{job?.id?.toUpperCase()}</span>
          </div>
          <div>
            <span className="text-slate-500 block uppercase font-bold text-[9px] tracking-wider">
              Total pages
            </span>
            <span className="text-emerald-400 font-bold flex items-center gap-1.5 mt-0.5">
              <FileText className="size-3.5 text-emerald-400" />
              {pageCount} {pageCount === 1 ? "page" : "pages"} detected
            </span>
          </div>
        </div>

        {/* Main Content Side-by-Side Panel */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* LEFT PANEL: High Fidelity PDF Preview Card */}
          <div className="lg:col-span-5 space-y-4">
            <div className="border border-white/10 rounded-2xl bg-black/40 overflow-hidden relative">
              {/* Header Label inside Preview */}
              <div className="bg-[#12131e] px-4 py-2.5 border-b border-white/15 flex items-center justify-between text-xs font-bold text-slate-300">
                <span className="flex items-center gap-1.5">
                  <FileText className="size-4 text-cyan-400" />
                  {job?.files?.[0]?.fileName || "Document.pdf"}
                </span>
                <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded font-mono">
                  {pageCount} pgs
                </span>
              </div>

              {/* High-Fidelity Canvas Display Container */}
              <div className="p-4 bg-slate-950 flex items-center justify-center min-h-[340px] max-h-[380px] overflow-hidden">
                <RealPdfCanvas
                  fileName={job?.title || "Document.pdf"}
                  rawFile={job?.files?.[0]?.rawFile}
                  fileUrl={job?.files?.[0]?.url}
                  pageNum={1}
                  scale={0.5}
                  className="max-h-[320px] w-auto shadow-2xl"
                />
              </div>

              {/* Warning/Guide Label */}
              <div className="p-3 bg-white/[0.02] border-t border-white/5 text-[10px] text-slate-400 flex items-center gap-2">
                <Info className="size-3.5 text-cyan-400 shrink-0" />
                <span>
                  Generating interactive high-fidelity viewport matching the target print specs.
                </span>
              </div>
            </div>

            {/* Original Customer Request Parameters Summary */}
            <div className="bg-[#0e0f18] border border-white/5 rounded-2xl p-4 space-y-2.5">
              <span className="text-slate-400 font-bold uppercase text-[9px] tracking-wider block">
                Original Customer Request
              </span>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Color mode:</span>
                  <span className="font-semibold text-white">
                    {job?.color ? "Full Color" : "B&W"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Copies:</span>
                  <span className="font-semibold text-white">{job?.copies ?? 1} copies</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Paper Size:</span>
                  <span className="font-semibold text-white">{uploadConfig.paperSize || "A4"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Duplex:</span>
                  <span className="font-semibold text-white">
                    {job?.duplex ? "Double-Sided" : "Single-Sided"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT PANEL: Specifications Editing Panel */}
          <form onSubmit={handleReleaseSubmit} className="lg:col-span-7 space-y-5">
            <div className="bg-[#0e0f18] border border-white/10 rounded-2xl p-5 space-y-4">
              <h3 className="text-xs font-black text-white uppercase tracking-wider border-b border-white/5 pb-2 flex items-center gap-1.5">
                <Settings className="size-4 text-accent-cyan" /> Configure overrides
              </h3>

              {/* Specs Grid Controls */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 1. Color / B&W switch */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Color Mode
                  </label>
                  <div className="flex bg-black/40 border border-white/10 rounded-xl p-1 text-xs">
                    <button
                      id="bw-toggle-btn"
                      type="button"
                      onClick={() => setColor(false)}
                      className={`flex-1 py-1.5 rounded-lg font-bold uppercase cursor-pointer tracking-wider transition-all ${
                        !color
                          ? "bg-white/10 text-white shadow-sm border border-white/5"
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      B&W (₹2/pg)
                    </button>
                    <button
                      id="color-toggle-btn"
                      type="button"
                      onClick={() => setColor(true)}
                      className={`flex-1 py-1.5 rounded-lg font-bold uppercase cursor-pointer tracking-wider transition-all ${
                        color
                          ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-sm"
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      Color (₹10/pg)
                    </button>
                  </div>
                </div>

                {/* 2. Copies Counter */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Copies to Print
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setCopies((prev) => Math.max(1, prev - 1))}
                      className="size-9 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-lg font-black transition-all cursor-pointer flex items-center justify-center text-sm"
                    >
                      -
                    </button>
                    <input
                      id="copies-input"
                      type="number"
                      min={1}
                      max={200}
                      value={copies}
                      onChange={(e) => setCopies(Math.max(1, parseInt(e.target.value) || 1))}
                      className="flex-1 h-9 bg-black/40 border border-white/10 text-center text-sm font-bold text-white rounded-lg focus:outline-none focus:border-cyan-400/50"
                    />
                    <button
                      type="button"
                      onClick={() => setCopies((prev) => prev + 1)}
                      className="size-9 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-lg font-black transition-all cursor-pointer flex items-center justify-center text-sm"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* 3. Paper Size Select */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Paper size format
                  </label>
                  <select
                    id="paper-size-select"
                    value={paperSize}
                    onChange={(e) => setPaperSize(e.target.value)}
                    className="w-full h-9 bg-black/40 border border-white/10 rounded-lg px-3 text-xs text-white font-bold focus:outline-none focus:border-cyan-400/50 cursor-pointer"
                  >
                    <option value="A4" className="bg-[#0b0b12] text-white">
                      A4 (Standard)
                    </option>
                    <option value="A3" className="bg-[#0b0b12] text-white">
                      A3 (Poster / Ledger)
                    </option>
                    <option value="Letter" className="bg-[#0b0b12] text-white">
                      Letter (US format)
                    </option>
                    <option value="Legal" className="bg-[#0b0b12] text-white">
                      US Legal
                    </option>
                  </select>
                </div>

                {/* 4. Duplex Switch */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Duplex format
                  </label>
                  <div className="flex bg-black/40 border border-white/10 rounded-xl p-1 text-xs">
                    <button
                      id="duplex-false-btn"
                      type="button"
                      onClick={() => setDuplex(false)}
                      className={`flex-1 py-1.5 rounded-lg font-bold cursor-pointer transition-all ${
                        !duplex
                          ? "bg-white/10 text-white shadow-sm border border-white/5"
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      Single-Sided
                    </button>
                    <button
                      id="duplex-true-btn"
                      type="button"
                      onClick={() => setDuplex(true)}
                      className={`flex-1 py-1.5 rounded-lg font-bold cursor-pointer transition-all ${
                        duplex
                          ? "bg-white/10 text-white shadow-sm border border-white/5"
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      Double-Sided
                    </button>
                  </div>
                </div>

                {/* 5. Orientation Switch */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Page orientation
                  </label>
                  <div className="flex bg-black/40 border border-white/10 rounded-xl p-1 text-xs">
                    <button
                      id="orientation-portrait-btn"
                      type="button"
                      onClick={() => setOrientation("portrait")}
                      className={`flex-1 py-1.5 rounded-lg font-bold cursor-pointer transition-all ${
                        orientation === "portrait"
                          ? "bg-white/10 text-white shadow-sm border border-white/5"
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      Portrait
                    </button>
                    <button
                      id="orientation-landscape-btn"
                      type="button"
                      onClick={() => setOrientation("landscape")}
                      className={`flex-1 py-1.5 rounded-lg font-bold cursor-pointer transition-all ${
                        orientation === "landscape"
                          ? "bg-white/10 text-white shadow-sm border border-white/5"
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      Landscape
                    </button>
                  </div>
                </div>

                {/* 6. Page Range Selector */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Custom page range
                  </label>
                  <input
                    id="page-range-input"
                    type="text"
                    value={pageRange}
                    onChange={(e) => setPageRange(e.target.value)}
                    placeholder="e.g. All, 1-5, 3, 5-8"
                    className="w-full h-9 bg-black/40 border border-white/10 rounded-lg px-3 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-400/50"
                  />
                </div>

                {/* 7. Assigned Printer Selector */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Target Printer Destination
                  </label>
                  <select
                    id="target-printer-select"
                    value={printerId}
                    onChange={(e) => setPrinterId(e.target.value)}
                    className="w-full h-9 bg-black/40 border border-white/10 rounded-lg px-3 text-xs text-white font-bold focus:outline-none focus:border-cyan-400/50 cursor-pointer"
                  >
                    <option value="" className="bg-[#0b0b12]">
                      Auto-Assign Online Printer
                    </option>
                    {printers.map((p) => (
                      <option key={p.id} value={p.id} className="bg-[#0b0b12] text-white">
                        {p.name} ({p.status})
                      </option>
                    ))}
                  </select>
                </div>

                {/* 8. Print Quality Option */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Print output quality
                  </label>
                  <select
                    id="print-quality-select"
                    value={printQuality}
                    onChange={(e) => setPrintQuality(e.target.value)}
                    className="w-full h-9 bg-black/40 border border-white/10 rounded-lg px-3 text-xs text-white font-bold focus:outline-none focus:border-cyan-400/50 cursor-pointer"
                  >
                    <option value="standard" className="bg-[#0b0b12] text-white">
                      Standard quality
                    </option>
                    <option value="high" className="bg-[#0b0b12] text-white">
                      High (HD Photo)
                    </option>
                    <option value="draft" className="bg-[#0b0b12] text-white">
                      Draft / Economy mode
                    </option>
                  </select>
                </div>

                {/* 9. Scaling Mode */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Scaling format
                  </label>
                  <select
                    id="scaling-select"
                    value={scaling}
                    onChange={(e) => setScaling(e.target.value)}
                    className="w-full h-9 bg-black/40 border border-white/10 rounded-lg px-3 text-xs text-white font-bold focus:outline-none focus:border-cyan-400/50 cursor-pointer"
                  >
                    <option value="fit" className="bg-[#0b0b12] text-white">
                      Fit Printable Area
                    </option>
                    <option value="actual" className="bg-[#0b0b12] text-white">
                      Actual Size (100%)
                    </option>
                    <option value="shrink" className="bg-[#0b0b12] text-white">
                      Shrink Oversized Only
                    </option>
                  </select>
                </div>

                {/* 10. Fit to Page Checkbox */}
                <div className="flex items-center gap-2.5 pt-7">
                  <input
                    id="fit-to-page-checkbox"
                    type="checkbox"
                    checked={fitToPage}
                    onChange={(e) => setFitToPage(e.target.checked)}
                    className="size-4 rounded bg-black/40 border border-white/20 text-cyan-400 focus:ring-0 focus:ring-offset-0 focus:outline-none cursor-pointer"
                  />
                  <label
                    htmlFor="fit-to-page-checkbox"
                    className="text-xs font-bold text-slate-300 uppercase tracking-wider cursor-pointer select-none"
                  >
                    Auto-Fit printable page boundaries
                  </label>
                </div>
              </div>
            </div>

            {/* Modifications Reason */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Modification Reason (Optional)
              </label>
              <textarea
                id="modification-reason-textarea"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Provide a brief explanation if you overrode original parameters (e.g., paper sizing optimization, duplex choice mismatch correction)"
                className="w-full p-3 bg-black/40 border border-white/10 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-400/50 h-16 resize-none"
              />
            </div>

            {/* Price Recalculation & Submission Row */}
            <div className="bg-[#0f171e]/80 border border-cyan-500/20 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
                  <DollarSign className="size-5" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Recalculated Cost
                  </span>
                  <span className="text-xl font-black text-cyan-300 mt-0.5 block">
                    ₹{newTotalCost.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Action Trigger Buttons */}
              <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                <button
                  id="cancel-review-btn"
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white font-extrabold text-xs tracking-wider uppercase rounded-xl transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  id="approve-release-btn"
                  type="submit"
                  disabled={isReleasing}
                  className="px-6 py-2 bg-cyan-400 hover:bg-cyan-300 disabled:opacity-50 text-black font-black text-xs tracking-wider uppercase rounded-xl transition-all shadow-[0_0_15px_rgba(0,255,255,0.25)] cursor-pointer flex items-center gap-2"
                >
                  {isReleasing ? (
                    <span>Releasing...</span>
                  ) : (
                    <>
                      <Printer className="size-4" />
                      <span>Approve & Release</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
