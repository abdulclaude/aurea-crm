import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { payrollRunInstructor as payrollRunInstructorTable } from "@/db/schema";

type Instructor = typeof import("@/db/schema").instructor.$inferSelect;
type PayrollRun = typeof import("@/db/schema").payrollRun.$inferSelect;
type PayrollRunInstructor = typeof payrollRunInstructorTable.$inferSelect;

interface PayslipData {
  instructor: Instructor;
  payrollRun: PayrollRun;
  payrollInstructor: PayrollRunInstructor & {
    instructor: Instructor;
  };
  organizationName: string;
  organizationAddress?: string;
}

/**
 * Generate payslip HTML for a instructor
 */
export function generatePayslipHTML(data: PayslipData): string {
  const {
    instructor,
    payrollRun,
    payrollInstructor,
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
  <title>Payslip - ${instructor.name}</title>
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
        <span class="info-value">${instructor.name}</span>
      </div>
      <div class="info-item">
        <span class="info-label">Employee ID:</span>
        <span class="info-value">${instructor.employeeId || "N/A"}</span>
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
        <span class="info-value">${instructor.nationalInsuranceNumber || "N/A"}</span>
      </div>
      <div class="info-item">
        <span class="info-label">Tax Code:</span>
        <span class="info-value">${instructor.taxCode || "N/A"}</span>
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
            Number(payrollInstructor.regularHours) > 0
              ? `<tr>
            <td>Regular Pay</td>
            <td class="amount">${Number(payrollInstructor.regularHours).toFixed(1)}</td>
            <td class="amount">${formatCurrency(Number(instructor.hourlyRate) || 0)}</td>
            <td class="amount">${formatCurrency(payrollInstructor.regularPay)}</td>
          </tr>`
              : ""
          }
          ${
            Number(payrollInstructor.overtimeHours) > 0
              ? `<tr>
            <td>Overtime Pay</td>
            <td class="amount">${Number(payrollInstructor.overtimeHours).toFixed(1)}</td>
            <td class="amount">${formatCurrency((Number(instructor.hourlyRate) || 0) * 1.5)}</td>
            <td class="amount">${formatCurrency(payrollInstructor.overtimePay)}</td>
          </tr>`
              : ""
          }
          ${
            Number(payrollInstructor.bonuses) > 0
              ? `<tr>
            <td>Bonus</td>
            <td class="amount">-</td>
            <td class="amount">-</td>
            <td class="amount">${formatCurrency(payrollInstructor.bonuses)}</td>
          </tr>`
              : ""
          }
          ${
            Number(payrollInstructor.housingAllowance) > 0
              ? `<tr>
            <td>Housing Allowance</td>
            <td class="amount">-</td>
            <td class="amount">-</td>
            <td class="amount">${formatCurrency(payrollInstructor.housingAllowance)}</td>
          </tr>`
              : ""
          }
          ${
            Number(payrollInstructor.transportAllowance) > 0
              ? `<tr>
            <td>Transport Allowance</td>
            <td class="amount">-</td>
            <td class="amount">-</td>
            <td class="amount">${formatCurrency(payrollInstructor.transportAllowance)}</td>
          </tr>`
              : ""
          }
          ${
            Number(payrollInstructor.mealAllowance) > 0
              ? `<tr>
            <td>Meal Allowance</td>
            <td class="amount">-</td>
            <td class="amount">-</td>
            <td class="amount">${formatCurrency(payrollInstructor.mealAllowance)}</td>
          </tr>`
              : ""
          }
          ${
            Number(payrollInstructor.otherAllowances) > 0
              ? `<tr>
            <td>Other Allowances</td>
            <td class="amount">-</td>
            <td class="amount">-</td>
            <td class="amount">${formatCurrency(payrollInstructor.otherAllowances)}</td>
          </tr>`
              : ""
          }
          <tr class="total-row">
            <td colspan="3">GROSS PAY</td>
            <td class="amount">${formatCurrency(payrollInstructor.grossPay)}</td>
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
            Number(payrollInstructor.incomeTax) > 0
              ? `<tr>
            <td>Income Tax (PAYE)</td>
            <td class="amount">${formatCurrency(payrollInstructor.incomeTax)}</td>
            <td class="amount">${payrollInstructor.ytdTax ? formatCurrency(payrollInstructor.ytdTax) : "-"}</td>
          </tr>`
              : ""
          }
          ${
            Number(payrollInstructor.nationalInsurance) > 0
              ? `<tr>
            <td>National Insurance</td>
            <td class="amount">${formatCurrency(payrollInstructor.nationalInsurance)}</td>
            <td class="amount">${payrollInstructor.ytdNi ? formatCurrency(payrollInstructor.ytdNi) : "-"}</td>
          </tr>`
              : ""
          }
          ${
            Number(payrollInstructor.pensionContribution) > 0
              ? `<tr>
            <td>Pension Contribution</td>
            <td class="amount">${formatCurrency(payrollInstructor.pensionContribution)}</td>
            <td class="amount">-</td>
          </tr>`
              : ""
          }
          ${
            Number(payrollInstructor.studentLoan) > 0
              ? `<tr>
            <td>Student Loan</td>
            <td class="amount">${formatCurrency(payrollInstructor.studentLoan)}</td>
            <td class="amount">-</td>
          </tr>`
              : ""
          }
          ${
            Number(payrollInstructor.otherDeductions) > 0
              ? `<tr>
            <td>Other Deductions</td>
            <td class="amount">${formatCurrency(payrollInstructor.otherDeductions)}</td>
            <td class="amount">-</td>
          </tr>`
              : ""
          }
          <tr class="total-row">
            <td>TOTAL DEDUCTIONS</td>
            <td class="amount">${formatCurrency(payrollInstructor.deductions)}</td>
            <td class="amount">-</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="summary-box">
      <table>
        <tr>
          <td><strong>Gross Pay:</strong></td>
          <td class="amount"><strong>${formatCurrency(payrollInstructor.grossPay)}</strong></td>
        </tr>
        <tr>
          <td><strong>Total Deductions:</strong></td>
          <td class="amount"><strong>${formatCurrency(payrollInstructor.deductions)}</strong></td>
        </tr>
        <tr class="total-row">
          <td colspan="2" style="border-top: 2px solid #000; padding-top: 10px;">
            <div class="net-pay">
              NET PAY: ${formatCurrency(payrollInstructor.netPay)}
            </div>
          </td>
        </tr>
      </table>
    </div>

    ${
      payrollInstructor.ytdGrossPay
        ? `
    <div class="section">
      <div class="section-title">YEAR TO DATE SUMMARY</div>
      <div class="info-grid">
        <div class="info-item">
          <span class="info-label">YTD Gross Pay:</span>
          <span class="info-value">${formatCurrency(payrollInstructor.ytdGrossPay)}</span>
        </div>
        <div class="info-item">
          <span class="info-label">YTD Tax:</span>
          <span class="info-value">${payrollInstructor.ytdTax ? formatCurrency(payrollInstructor.ytdTax) : "-"}</span>
        </div>
        <div class="info-item">
          <span class="info-label">YTD NI:</span>
          <span class="info-value">${payrollInstructor.ytdNi ? formatCurrency(payrollInstructor.ytdNi) : "-"}</span>
        </div>
        <div class="info-item">
          <span class="info-label">YTD Net Pay:</span>
          <span class="info-value">${payrollInstructor.ytdNetPay ? formatCurrency(payrollInstructor.ytdNetPay) : "-"}</span>
        </div>
      </div>
    </div>
    `
        : ""
    }

    ${
      payrollInstructor.notes
        ? `
    <div class="section">
      <div class="section-title">NOTES</div>
      <p style="padding: 10px;">${payrollInstructor.notes}</p>
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
 * Fetch payslip data for a specific instructor in a payroll run
 */
export async function getPayslipData(
  payrollRunId: string,
  instructorId: string
): Promise<PayslipData | null> {
  const payrollInstructor = await db.query.payrollRunInstructor.findFirst({
    where: and(
      eq(payrollRunInstructorTable.payrollRunId, payrollRunId),
      eq(payrollRunInstructorTable.instructorId, instructorId)
    ),
    with: {
      instructor: true,
      payrollRun: {
        with: {
          organization: true,
        },
      },
    },
  });

  if (!payrollInstructor) {
    return null;
  }

  return {
    instructor: payrollInstructor.instructor,
    payrollRun: payrollInstructor.payrollRun,
    payrollInstructor,
    organizationName: payrollInstructor.payrollRun.organization.name,
    organizationAddress: undefined,
  };
}
