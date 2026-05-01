// tests/reporter/excel-reporter.ts
import {
  Reporter,
  TestCase,
  TestResult,
  TestStep,
  FullResult,
} from "@playwright/test/reporter";
import ExcelJS from "exceljs";
import path from "path";
import fs from "fs";

interface RowData {
  no: number;
  environment: string;
  file: string;
  scenario: string;
  step: string;
  method: string;
  result: "PASS" | "FAIL" | "SKIP";
  error: string;
  screenshotPath: string | null;
  duration: number;
}

export default class ExcelReporter implements Reporter {
  private rows: RowData[] = [];
  private rowNo = 1;
  private stepResults = new Map<string, { status: string; error: string; duration: number }>();
  private environment = process.env.E2E_REPORT_ENV ?? "로컬 개발환경";

  onStepEnd(test: TestCase, _result: TestResult, step: TestStep) {
    if (step.category !== "test.step") return;
    this.stepResults.set(`${test.id}::${step.title}`, {
      status: step.error ? "FAIL" : "PASS",
      error: step.error?.message ?? "",
      duration: step.duration,
    });
  }

  onTestEnd(test: TestCase, result: TestResult) {
    const file = path.basename(test.location.file);
    const scenario = test.parent.title
      ? `${test.parent.title} > ${test.title}`
      : test.title;

    const attachmentsByStep = new Map<string, string>();
    for (const att of result.attachments) {
      if (att.contentType === "image/png" && att.path) {
        attachmentsByStep.set(att.name, att.path);
      }
    }

    const stepKeys = [...this.stepResults.keys()].filter((k) =>
      k.startsWith(test.id + "::")
    );
    const firstScreenshot = [...attachmentsByStep.values()][0] ?? null;
    let lastScreenshot = firstScreenshot;

    if (stepKeys.length === 0) {
      this.rows.push({
        no: this.rowNo++,
        environment: this.environment,
        file,
        scenario,
        step: "-",
        method: test.title,
        result: result.status === "passed" ? "PASS" : result.status === "skipped" ? "SKIP" : "FAIL",
        error: result.error?.message ?? "",
        screenshotPath: [...attachmentsByStep.values()][0] ?? null,
        duration: result.duration,
      });
      return;
    }

    for (const key of stepKeys) {
      const stepTitle = key.replace(`${test.id}::`, "");
      const sr = this.stepResults.get(key)!;
      const stepScreenshot = attachmentsByStep.get(stepTitle) ?? lastScreenshot;
      if (stepScreenshot) {
        lastScreenshot = stepScreenshot;
      }
      this.rows.push({
        no: this.rowNo++,
        environment: this.environment,
        file,
        scenario,
        step: stepTitle,
        method: stepTitle,
        result: sr.status === "PASS" ? "PASS" : "FAIL",
        error: sr.error,
        screenshotPath: stepScreenshot,
        duration: sr.duration,
      });
    }
  }

  async onEnd(_result: FullResult) {
    const outDir = path.resolve("test-report");
    fs.mkdirSync(outDir, { recursive: true });

    const now = new Date();
    const ts = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}-${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}`;
    const safeEnv = this.environment.replace(/[^a-zA-Z0-9가-힣]/g, "_").slice(0, 40);
    const outPath = path.join(outDir, `${ts}-${safeEnv}-e2e-checklist.xlsx`);

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("E2E 체크리스트");

    ws.columns = [
      { header: "No", key: "no", width: 5 },
      { header: "환경", key: "environment", width: 18 },
      { header: "테스트 파일", key: "file", width: 30 },
      { header: "시나리오", key: "scenario", width: 40 },
      { header: "단계", key: "step", width: 40 },
      { header: "테스트 방법", key: "method", width: 40 },
      { header: "결과", key: "result", width: 8 },
      { header: "실패 메시지", key: "error", width: 40 },
      { header: "스크린샷", key: "screenshot", width: 30 },
      { header: "실행시간(ms)", key: "duration", width: 14 },
    ];

    const headerRow = ws.getRow(1);
    headerRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF4472C4" },
    };
    headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
    headerRow.alignment = { vertical: "middle", horizontal: "center" };
    headerRow.height = 20;

    const IMG_HEIGHT_PX = 140;

    for (const rowData of this.rows) {
      const rowIndex = ws.rowCount + 1;
      const row = ws.addRow({
        no: rowData.no,
        environment: rowData.environment,
        file: rowData.file,
        scenario: rowData.scenario,
        step: rowData.step,
        method: rowData.method,
        result: rowData.result,
        error: rowData.error,
        screenshot: "",
        duration: rowData.duration,
      });
      row.alignment = { vertical: "middle", wrapText: true };
      row.height = rowData.screenshotPath ? IMG_HEIGHT_PX * 0.75 + 4 : 18;

      const resultCell = row.getCell("result");
      if (rowData.result === "PASS") {
        resultCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF70AD47" } };
        resultCell.font = { color: { argb: "FFFFFFFF" }, bold: true };
      } else if (rowData.result === "FAIL") {
        resultCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFF0000" } };
        resultCell.font = { color: { argb: "FFFFFFFF" }, bold: true };
      }

      if (rowData.screenshotPath && fs.existsSync(rowData.screenshotPath)) {
        const imgId = wb.addImage({
          filename: rowData.screenshotPath,
          extension: "png",
        });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ws.addImage(imgId, {
          tl: { col: 7, row: rowIndex - 1 },
          br: { col: 8, row: rowIndex },
          editAs: "oneCell",
        } as any);
      }
    }

    await wb.xlsx.writeFile(outPath);
    console.log(`\n✅ Excel 체크리스트 저장됨: ${outPath}`);
  }
}
