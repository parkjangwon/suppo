import ExcelJS from "exceljs";
import { CustomerReportData } from "../contracts";

export async function buildCustomerReportExcel(
  data: CustomerReportData
): Promise<ExcelJS.Buffer> {
  const workbook = new ExcelJS.Workbook();

  await addSummarySheet(workbook, data);
  await addCustomersSheet(workbook, data);
  await addTicketsSheet(workbook, data);

  return workbook.xlsx.writeBuffer();
}

async function addSummarySheet(workbook: ExcelJS.Workbook, data: CustomerReportData) {
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
  sheet.addRow([]);
  sheet.addRow({ label: "총 고객 수", value: data.summary.totalCustomers });
  sheet.addRow({ label: "활성 고객 수", value: data.summary.activeCustomers });
  sheet.addRow({ label: "총 티켓 수", value: data.summary.totalTickets });
  sheet.addRow({ label: "해결된 티켓", value: data.summary.resolvedTickets });
  sheet.addRow({ label: "평균 응답 시간(분)", value: data.summary.averageResponseTime });
}

async function addCustomersSheet(workbook: ExcelJS.Workbook, data: CustomerReportData) {
  const sheet = workbook.addWorksheet("고객 목록");

  sheet.columns = [
    { header: "고객명", key: "name", width: 25 },
    { header: "이메일", key: "email", width: 30 },
    { header: "티켓 수", key: "tickets", width: 12 },
    { header: "해결됨", key: "resolved", width: 12 },
    { header: "평균 응답시간(분)", key: "avgResponse", width: 18 },
    { header: "마지막 티켓", key: "lastTicket", width: 20 },
  ];

  sheet.getRow(1).font = { bold: true };
  sheet.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFE0E0E0" },
  };

  for (const customer of data.customers) {
    sheet.addRow({
      name: customer.customerName,
      email: customer.customerEmail,
      tickets: customer.ticketCount,
      resolved: customer.resolvedTickets,
      avgResponse: customer.averageResponseTime,
      lastTicket: customer.lastTicketAt
        ? new Date(customer.lastTicketAt).toLocaleString("ko-KR")
        : "-",
    });
  }
}

async function addTicketsSheet(workbook: ExcelJS.Workbook, data: CustomerReportData) {
  const sheet = workbook.addWorksheet("티켓 목록");

  sheet.columns = [
    { header: "티켓번호", key: "number", width: 20 },
    { header: "고객", key: "customer", width: 25 },
    { header: "제목", key: "subject", width: 40 },
    { header: "상태", key: "status", width: 12 },
    { header: "우선순위", key: "priority", width: 12 },
    { header: "생성일", key: "created", width: 20 },
    { header: "응답시간(분)", key: "response", width: 15 },
  ];

  sheet.getRow(1).font = { bold: true };
  sheet.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFE0E0E0" },
  };

  for (const customer of data.customers) {
    for (const ticket of customer.tickets) {
      sheet.addRow({
        number: ticket.ticketNumber,
        customer: customer.customerName,
        subject: ticket.subject,
        status: ticket.status,
        priority: ticket.priority,
        created: new Date(ticket.createdAt).toLocaleString("ko-KR"),
        response: ticket.responseTime ?? "-",
      });
    }
  }
}
