import { prisma } from "@/lib/db";
import type { PayrollRunWorker, Worker, PayrollRun } from "@/generated/prisma";

interface PayslipData {
  worker: Worker;
  payrollRun: PayrollRun;
  payrollWorker: PayrollRunWorker & {
    worker: Worker;
  };
  organizationName: string;
  organizationAddress?: string;
}

/**
 * Generate payslip HTML for a worker
 */
export function generatePayslipHTML(data: PayslipData): string {
  const {
    worker,
    payrollRun,
    payrollWorker,
    organizationName,
    organizationAddress,
  } = data;

  const periodStart = new Date(payrollRun.periodStart).toLocaleDateString("en-GB");
  const periodEnd = new Date(payrollRun.periodEnd).toLocaleDateString("en-GB");
  const paymentDate = new Date(payrollRun.paymentDate).toLocaleDateString("en-GB");

  const formatCurrency = (amount: number | string) => {
    return `£${Number(amount).toFixed(2)}`;
  };

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Payslip - ${worker.name}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: 'Helvetica Neue', Arial, sans-serif;
      font-size: 11px;
      line-height: 1.4;
      color: #333;
      padding: 40px;
    }
    .payslip {
      max-width: 800px;
      margin: 0 auto;
      border: 1px solid #ddd;
      padding: 30px;
    }
    .header {
      border-bottom: 3px solid #000;
      padding-bottom: 20px;
      margin-bottom: 20px;
    }
    .company-name {
      font-size: 20px;
      font-weight: bold;
      margin-bottom: 5px;
    }
    .company-address {
      font-size: 10px;
      color: #666;
    }
    .payslip-title {
      text-align: center;
      font-size: 18px;
      font-weight: bold;
      margin: 20px 0;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .section {
      margin-bottom: 20px;
    }
    .section-title {
      font-weight: bold;
      font-size: 12px;
      margin-bottom: 10px;
      padding: 5px;
      background: #f5f5f5;
    }
    .info-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 10px;
      margin-bottom: 20px;
    }
    .info-item {
      display: flex;
      justify-content: space-between;
      padding: 5px;
    }
    .info-label {
      color: #666;
      font-weight: 500;
    }
    .info-value {
      font-weight: bold;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
    }
    th {
      background: #f5f5f5;
      padding: 10px;
      text-align: left;
      font-weight: bold;
      border-bottom: 2px solid #ddd;
    }
    td {
      padding: 8px 10px;
      border-bottom: 1px solid #eee;
    }
    .amount {
      text-align: right;
      font-family: 'Courier New', monospace;
    }
    .total-row {
      font-weight: bold;
      background: #fafafa;
      border-top: 2px solid #000;
    }
    .summary-box {
      background: #f9f9f9;
      border: 2px solid #000;
      padding: 15px;
      margin: 20px 0;
    }
    .net-pay {
      font-size: 16px;
      font-weight: bold;
      text-align: center;
      padding: 10px;
    }
    .footer {
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #ddd;
      font-size: 9px;
      color: #666;
      text-align: center;
    }
    .confidential {
      text-align: center;
      font-style: italic;
      color: #999;
      margin-top: 20px;
    }
  </style>
</head>
<body>
  <div class="payslip">
    <div class="header">
      <div class="company-name">${organizationName}</div>
      ${organizationAddress ? `<div class="company-address">${organizationAddress}</div>` : ""}
    </div>

    <div class="payslip-title">Payslip</div>

    <div class="info-grid">
      <div class="info-item">
        <span class="info-label">Employee Name:</span>
        <span class="info-value">${worker.name}</span>
      </div>
      <div class="info-item">
        <span class="info-label">Employee ID:</span>
        <span class="info-value">${worker.employeeId || "N/A"}</span>
      </div>
      <div class="info-item">
        <span class="info-label">Pay Period:</span>
        <span class="info-value">${periodStart} - ${periodEnd}</span>
      </div>
      <div class="info-item">
        <span class="info-label">Payment Date:</span>
        <span class="info-value">${paymentDate}</span>
      </div>
      <div class="info-item">
        <span class="info-label">NI Number:</span>
        <span class="info-value">${worker.nationalInsuranceNumber || "N/A"}</span>
      </div>
      <div class="info-item">
        <span class="info-label">Tax Code:</span>
        <span class="info-value">${worker.taxCode || "N/A"}</span>
      </div>
    </div>

    <div class="section">
      <div class="section-title">EARNINGS</div>
      <table>
        <thead>
          <tr>
            <th>Description</th>
            <th class="amount">Hours/Units</th>
            <th class="amount">Rate</th>
            <th class="amount">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${
            Number(payrollWorker.regularHours) > 0
              ? `<tr>
            <td>Regular Pay</td>
            <td class="amount">${Number(payrollWorker.regularHours).toFixed(1)}</td>
            <td class="amount">${formatCurrency(Number(worker.hourlyRate) || 0)}</td>
            <td class="amount">${formatCurrency(payrollWorker.regularPay)}</td>
          </tr>`
              : ""
          }
          ${
            Number(payrollWorker.overtimeHours) > 0
              ? `<tr>
            <td>Overtime Pay</td>
            <td class="amount">${Number(payrollWorker.overtimeHours).toFixed(1)}</td>
            <td class="amount">${formatCurrency((Number(worker.hourlyRate) || 0) * 1.5)}</td>
            <td class="amount">${formatCurrency(payrollWorker.overtimePay)}</td>
          </tr>`
              : ""
          }
          ${
            Number(payrollWorker.bonuses) > 0
              ? `<tr>
            <td>Bonus</td>
            <td class="amount">-</td>
            <td class="amount">-</td>
            <td class="amount">${formatCurrency(payrollWorker.bonuses)}</td>
          </tr>`
              : ""
          }
          ${
            Number(payrollWorker.housingAllowance) > 0
              ? `<tr>
            <td>Housing Allowance</td>
            <td class="amount">-</td>
            <td class="amount">-</td>
            <td class="amount">${formatCurrency(payrollWorker.housingAllowance)}</td>
          </tr>`
              : ""
          }
          ${
            Number(payrollWorker.transportAllowance) > 0
              ? `<tr>
            <td>Transport Allowance</td>
            <td class="amount">-</td>
            <td class="amount">-</td>
            <td class="amount">${formatCurrency(payrollWorker.transportAllowance)}</td>
          </tr>`
              : ""
          }
          ${
            Number(payrollWorker.mealAllowance) > 0
              ? `<tr>
            <td>Meal Allowance</td>
            <td class="amount">-</td>
            <td class="amount">-</td>
            <td class="amount">${formatCurrency(payrollWorker.mealAllowance)}</td>
          </tr>`
              : ""
          }
          ${
            Number(payrollWorker.otherAllowances) > 0
              ? `<tr>
            <td>Other Allowances</td>
            <td class="amount">-</td>
            <td class="amount">-</td>
            <td class="amount">${formatCurrency(payrollWorker.otherAllowances)}</td>
          </tr>`
              : ""
          }
          <tr class="total-row">
            <td colspan="3">GROSS PAY</td>
            <td class="amount">${formatCurrency(payrollWorker.grossPay)}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="section">
      <div class="section-title">DEDUCTIONS</div>
      <table>
        <thead>
          <tr>
            <th>Description</th>
            <th class="amount">This Period</th>
            <th class="amount">Year to Date</th>
          </tr>
        </thead>
        <tbody>
          ${
            Number(payrollWorker.incomeTax) > 0
              ? `<tr>
            <td>Income Tax (PAYE)</td>
            <td class="amount">${formatCurrency(payrollWorker.incomeTax)}</td>
            <td class="amount">${payrollWorker.ytdTax ? formatCurrency(payrollWorker.ytdTax) : "-"}</td>
          </tr>`
              : ""
          }
          ${
            Number(payrollWorker.nationalInsurance) > 0
              ? `<tr>
            <td>National Insurance</td>
            <td class="amount">${formatCurrency(payrollWorker.nationalInsurance)}</td>
            <td class="amount">${payrollWorker.ytdNI ? formatCurrency(payrollWorker.ytdNI) : "-"}</td>
          </tr>`
              : ""
          }
          ${
            Number(payrollWorker.pensionContribution) > 0
              ? `<tr>
            <td>Pension Contribution</td>
            <td class="amount">${formatCurrency(payrollWorker.pensionContribution)}</td>
            <td class="amount">-</td>
          </tr>`
              : ""
          }
          ${
            Number(payrollWorker.studentLoan) > 0
              ? `<tr>
            <td>Student Loan</td>
            <td class="amount">${formatCurrency(payrollWorker.studentLoan)}</td>
            <td class="amount">-</td>
          </tr>`
              : ""
          }
          ${
            Number(payrollWorker.otherDeductions) > 0
              ? `<tr>
            <td>Other Deductions</td>
            <td class="amount">${formatCurrency(payrollWorker.otherDeductions)}</td>
            <td class="amount">-</td>
          </tr>`
              : ""
          }
          <tr class="total-row">
            <td>TOTAL DEDUCTIONS</td>
            <td class="amount">${formatCurrency(payrollWorker.deductions)}</td>
            <td class="amount">-</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="summary-box">
      <table>
        <tr>
          <td><strong>Gross Pay:</strong></td>
          <td class="amount"><strong>${formatCurrency(payrollWorker.grossPay)}</strong></td>
        </tr>
        <tr>
          <td><strong>Total Deductions:</strong></td>
          <td class="amount"><strong>${formatCurrency(payrollWorker.deductions)}</strong></td>
        </tr>
        <tr class="total-row">
          <td colspan="2" style="border-top: 2px solid #000; padding-top: 10px;">
            <div class="net-pay">
              NET PAY: ${formatCurrency(payrollWorker.netPay)}
            </div>
          </td>
        </tr>
      </table>
    </div>

    ${
      payrollWorker.ytdGrossPay
        ? `
    <div class="section">
      <div class="section-title">YEAR TO DATE SUMMARY</div>
      <div class="info-grid">
        <div class="info-item">
          <span class="info-label">YTD Gross Pay:</span>
          <span class="info-value">${formatCurrency(payrollWorker.ytdGrossPay)}</span>
        </div>
        <div class="info-item">
          <span class="info-label">YTD Tax:</span>
          <span class="info-value">${payrollWorker.ytdTax ? formatCurrency(payrollWorker.ytdTax) : "-"}</span>
        </div>
        <div class="info-item">
          <span class="info-label">YTD NI:</span>
          <span class="info-value">${payrollWorker.ytdNI ? formatCurrency(payrollWorker.ytdNI) : "-"}</span>
        </div>
        <div class="info-item">
          <span class="info-label">YTD Net Pay:</span>
          <span class="info-value">${payrollWorker.ytdNetPay ? formatCurrency(payrollWorker.ytdNetPay) : "-"}</span>
        </div>
      </div>
    </div>
    `
        : ""
    }

    ${
      payrollWorker.notes
        ? `
    <div class="section">
      <div class="section-title">NOTES</div>
      <p style="padding: 10px;">${payrollWorker.notes}</p>
    </div>
    `
        : ""
    }

    <div class="confidential">
      This payslip is confidential and should not be shared with unauthorized persons.
    </div>

    <div class="footer">
      Generated on ${new Date().toLocaleDateString("en-GB")} | ${organizationName}
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Fetch payslip data for a specific worker in a payroll run
 */
export async function getPayslipData(
  payrollRunId: string,
  workerId: string
): Promise<PayslipData | null> {
  const payrollWorker = await prisma.payrollRunWorker.findUnique({
    where: {
      payrollRunId_workerId: {
        payrollRunId,
        workerId,
      },
    },
    include: {
      worker: true,
      payrollRun: {
        include: {
          organization: true,
        },
      },
    },
  });

  if (!payrollWorker) {
    return null;
  }

  return {
    worker: payrollWorker.worker,
    payrollRun: payrollWorker.payrollRun,
    payrollWorker,
    organizationName: payrollWorker.payrollRun.organization.name,
    organizationAddress: undefined, // TODO: Add organization address field
  };
}
