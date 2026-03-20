import ExcelJS from "exceljs";
import { OperationalReportData } from "../contracts";

export async function buildOperationalReportExcel(
  data: OperationalReportData
): Promise<ExcelJS.Buffer> {
  const workbook = new ExcelJS.Workbook();

  await addSummarySheet(workbook, data);
  await addAgentActivitiesSheet(workbook, data);
  await addDailyStatsSheet(workbook, data);

  return workbook.xlsx.writeBuffer();
}

async function addSummarySheet(workbook: ExcelJS.Workbook, data: OperationalReportData) {
  const sheet = workbook.addWorksheet("요약");

  sheet.columns = [
    { header: "항목", key: "label", width: 30 },
    { header: "값", key: "value", width: 20 },
  ];

  sheet.getRow(1).font = { bold: true };
  sheet.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFE0E0E0" },
  };

  const period = data.period;
  sheet.addRow({ label: "보고서 기간", value: `${period.from.toLocaleDateString("ko-KR")} ~ ${period.to.toLocaleDateString("ko-KR")}` });
  sheet.addRow({ label: "총 활동 수", value: data.summary.totalActions });
  sheet.addRow({ label: "고유 상담원 수", value: data.summary.uniqueActors });
  sheet.addRow([]);

  sheet.addRow({ label: "활동 유형별 통계", value: "" });
  for (const [action, count] of Object.entries(data.summary.actionsByType)) {
    sheet.addRow({ label: `  ${action}`, value: count });
  }
  sheet.addRow([]);

  sheet.addRow({ label: "리소스 타입별 통계", value: "" });
  for (const [resource, count] of Object.entries(data.summary.actionsByResource)) {
    sheet.addRow({ label: `  ${resource}`, value: count });
  }
}

async function addAgentActivitiesSheet(workbook: ExcelJS.Workbook, data: OperationalReportData) {
  const sheet = workbook.addWorksheet("상담원 활동");

  sheet.columns = [
    { header: "상담원", key: "name", width: 25 },
    { header: "이메일", key: "email", width: 30 },
    { header: "총 활동", key: "total", width: 12 },
    { header: "마지막 활동", key: "lastActivity", width: 20 },
  ];

  sheet.getRow(1).font = { bold: true };
  sheet.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFE0E0E0" },
  };

  for (const agent of data.agentActivities) {
    sheet.addRow({
      name: agent.agentName,
      email: agent.agentEmail,
      total: agent.totalActions,
      lastActivity: new Date(agent.lastActivityAt).toLocaleString("ko-KR"),
    });
  }
}

async function addDailyStatsSheet(workbook: ExcelJS.Workbook, data: OperationalReportData) {
  const sheet = workbook.addWorksheet("일별 통계");

  sheet.columns = [
    { header: "날짜", key: "date", width: 15 },
    { header: "총 활동", key: "total", width: 12 },
    { header: "고유 상담원", key: "unique", width: 15 },
  ];

  sheet.getRow(1).font = { bold: true };
  sheet.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFE0E0E0" },
  };

  for (const stat of data.dailyStats) {
    sheet.addRow({
      date: stat.date,
      total: stat.totalActions,
      unique: stat.uniqueActors,
    });
  }
}
