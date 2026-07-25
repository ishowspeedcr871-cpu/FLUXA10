import { NextResponse } from "next/server";
import { prisma } from "@/database/client";
import { ORGANIZATION_PERMISSIONS, requireOrganizationPermission } from "@/services/authorization/guards";

const supportedConnectionMethods = [
  "USB",
  "Network/IP",
  "Wi-Fi",
  "Ethernet",
  "Bluetooth (connector/OS supported)",
  "Windows Shared Printers",
  "CUPS",
  "IPP",
  "RAW Port 9100",
  "LPR/LPD",
  "Epson ePOS",
  "Star Micronics",
  "Brother",
  "HP",
  "Canon",
  "Zebra",
  "Thermal / Receipt / Label Printers",
  "PDF Virtual Printers",
];

export async function POST() {
  const { organization } = await requireOrganizationPermission(ORGANIZATION_PERMISSIONS.PRINTERS_READ);

  const printers = await prisma.printer.findMany({
    where: { organizationId: organization.id, deletedAt: null },
    include: {
      _count: { select: { jobs: { where: { status: { in: ["QUEUED", "PRINTING", "WAITING_FOR_PRINTER"] } } } } },
    },
    orderBy: [{ status: "asc" }, { isDefault: "desc" }, { name: "asc" }],
  });

  return NextResponse.json({
    success: true,
    count: printers.length,
    printers,
    supportedConnectionMethods,
    message:
      "Cloud discovery is active for registered connector heartbeats. Browser/Vercel runtimes cannot enumerate local USB, Bluetooth, CUPS, Windows spooler, or LAN devices directly; install the Fluxa Desktop Print Spooler on the print-station machine for hardware-level discovery and test printing.",
  });
}
