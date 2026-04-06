import { prisma } from "@crinity/db";
import { ReportType, ReportFormat, ReportRunStatus, ReportTriggerSource } from "@prisma/client";
import { DateRange, GeneratedReportResult } from "./contracts";
import { getOperationalReportData } from "./operational/query";
import { buildOperationalReportExcel } from "./operational/excel";
import { getCustomerReportData } from "./customer/query";
import { buildCustomerReportExcel } from "./customer/excel";
import { saveReportFile, generateStorageKey, getMimeType, generateFileName } from "./storage";

export interface ProcessReportOptions {
  reportId: string;
  reportType: ReportType;
  format: ReportFormat;
  period: DateRange;
}

export async function processReport(options: ProcessReportOptions): Promise<GeneratedReportResult> {
  const { reportId, reportType, format, period } = options;

  try {
    await prisma.generatedReport.update({
      where: { id: reportId },
      data: { status: ReportRunStatus.PROCESSING },
    });

    let buffer: Buffer;

    if (reportType === "OPERATIONAL") {
      const data = await getOperationalReportData(period);
      buffer = Buffer.from(await buildOperationalReportExcel(data));
    } else {
      const data = await getCustomerReportData(period);
      buffer = Buffer.from(await buildCustomerReportExcel(data));
    }

    const storageKey = generateStorageKey(reportId, format);
    const { sizeBytes } = await saveReportFile(storageKey, buffer, format);

    const fileName = generateFileName(reportType, period, format);
    const mimeType = getMimeType(format);

    await prisma.generatedReport.update({
      where: { id: reportId },
      data: {
        status: ReportRunStatus.READY,
        fileName,
        storageKey,
        mimeType,
        sizeBytes,
        generatedAt: new Date(),
      },
    });

    return {
      fileName,
      storageKey,
      mimeType,
      sizeBytes,
    };
  } catch (error) {
    console.error("Failed to process report:", error);

    await prisma.generatedReport.update({
      where: { id: reportId },
      data: {
        status: ReportRunStatus.FAILED,
        errorMessage: error instanceof Error ? error.message : "Unknown error",
      },
    });

    throw error;
  }
}

export async function createPendingReport(params: {
  reportType: ReportType;
  format: ReportFormat;
  period: DateRange;
  periodKey: string;
  requestedById?: string;
  scheduleId?: string;
  triggerSource: ReportTriggerSource;
}): Promise<string> {
  const report = await prisma.generatedReport.create({
    data: {
      reportType: params.reportType,
      format: params.format,
      status: ReportRunStatus.PENDING,
      periodStart: params.period.from,
      periodEnd: params.period.to,
      periodKey: params.periodKey,
      requestedById: params.requestedById,
      scheduleId: params.scheduleId,
      triggerSource: params.triggerSource,
      parameters: {},
    },
  });

  return report.id;
}

export async function getPendingReports(limit: number = 10) {
  return prisma.generatedReport.findMany({
    where: { status: ReportRunStatus.PENDING },
    orderBy: { createdAt: "asc" },
    take: limit,
  });
}
