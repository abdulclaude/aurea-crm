/**
 * UK Payroll Tax Calculator (2024/2025 Tax Year)
 *
 * This module provides calculations for UK tax, National Insurance, pension contributions,
 * and student loan deductions based on 2024/2025 tax year rates.
 */

// Tax brackets for 2024/2025 (England, Wales, Northern Ireland)
const TAX_BRACKETS = [
  { limit: 12570, rate: 0 },      // Personal Allowance
  { limit: 50270, rate: 0.20 },   // Basic rate (£12,571 - £50,270)
  { limit: 125140, rate: 0.40 },  // Higher rate (£50,271 - £125,140)
  { limit: Infinity, rate: 0.45 } // Additional rate (over £125,140)
];

// National Insurance thresholds and rates (2024/2025)
const NI_THRESHOLDS = {
  primaryThreshold: 12570,       // Annual primary threshold
  upperEarningsLimit: 50270,     // Annual upper earnings limit
  rateBelow: 0.12,               // 12% between PT and UEL
  rateAbove: 0.02,               // 2% above UEL
};

// Student Loan thresholds (2024/2025) - Annual amounts
const STUDENT_LOAN_THRESHOLDS = {
  plan1: 22015,     // Plan 1 (pre-2012)
  plan2: 27295,     // Plan 2 (2012-2023)
  plan4: 31395,     // Plan 4 (Scotland)
  postgrad: 21000,  // Postgraduate
};

const STUDENT_LOAN_RATES = {
  plan1: 0.09,      // 9%
  plan2: 0.09,      // 9%
  plan4: 0.09,      // 9%
  postgrad: 0.06,   // 6%
};

interface TaxCalculationInput {
  grossPay: number;
  taxCode?: string;
  pensionContributionRate?: number;  // Employee contribution %
  studentLoanPlan?: "plan1" | "plan2" | "plan4" | "postgraduate" | null;
  ytdGrossPay?: number;  // Year-to-date gross pay (for accurate tax calculation)
  ytdTax?: number;       // Year-to-date tax paid
  ytdNI?: number;        // Year-to-date NI paid
}

interface TaxCalculationResult {
  grossPay: number;
  incomeTax: number;
  nationalInsurance: number;
  pensionContribution: number;
  studentLoan: number;
  totalDeductions: number;
  netPay: number;
  ytdGrossPay: number;
  ytdTax: number;
  ytdNI: number;
  ytdNetPay: number;
}

/**
 * Extract personal allowance from tax code
 * Examples: 1257L -> £12,570, BR -> £0, 0T -> £0
 */
function getPersonalAllowance(taxCode: string = "1257L"): number {
  const code = taxCode.toUpperCase().trim();

  // BR (Basic Rate) - no personal allowance
  if (code === "BR") return 0;

  // 0T - no personal allowance
  if (code === "0T") return 0;

  // D0 (Higher Rate) - no personal allowance
  if (code === "D0") return 0;

  // D1 (Additional Rate) - no personal allowance
  if (code === "D1") return 0;

  // K codes - negative allowance (not common)
  if (code.startsWith("K")) return 0;

  // Standard codes like 1257L, 1257M, 1257N
  const numberMatch = code.match(/^(\d+)/);
  if (numberMatch) {
    return parseInt(numberMatch[1], 10) * 10;
  }

  // Default to standard personal allowance
  return 12570;
}

/**
 * Calculate income tax based on gross pay and tax code
 */
function calculateIncomeTax(
  grossPay: number,
  pensionContribution: number,
  taxCode: string = "1257L",
  ytdGrossPay: number = 0,
  ytdTax: number = 0
): number {
  const personalAllowance = getPersonalAllowance(taxCode);

  // Calculate total annual taxable income so far
  const totalAnnualGross = ytdGrossPay + grossPay;
  const totalAnnualPension = pensionContribution; // Simplified - should include YTD
  const totalTaxableIncome = Math.max(0, totalAnnualGross - totalAnnualPension - personalAllowance);

  let totalTaxDue = 0;
  let remainingIncome = totalTaxableIncome;

  // Apply tax brackets
  for (let i = 0; i < TAX_BRACKETS.length; i++) {
    const bracket = TAX_BRACKETS[i];
    const previousLimit = i === 0 ? 0 : TAX_BRACKETS[i - 1].limit;
    const bracketSize = bracket.limit - previousLimit;

    if (remainingIncome <= 0) break;

    const taxableInBracket = Math.min(remainingIncome, bracketSize);
    totalTaxDue += taxableInBracket * bracket.rate;
    remainingIncome -= taxableInBracket;
  }

  // Tax for this period is total tax due minus tax already paid
  const taxForThisPeriod = Math.max(0, totalTaxDue - ytdTax);

  return Math.round(taxForThisPeriod * 100) / 100;
}

/**
 * Calculate National Insurance contributions
 */
function calculateNationalInsurance(
  grossPay: number,
  ytdGrossPay: number = 0,
  ytdNI: number = 0
): number {
  const totalAnnualGross = ytdGrossPay + grossPay;

  let totalNIDue = 0;

  // Calculate NI on earnings above primary threshold
  const earningsAbovePT = Math.max(0, totalAnnualGross - NI_THRESHOLDS.primaryThreshold);

  if (earningsAbovePT > 0) {
    // NI at 12% up to upper earnings limit
    const earningsInMainRate = Math.min(
      earningsAbovePT,
      NI_THRESHOLDS.upperEarningsLimit - NI_THRESHOLDS.primaryThreshold
    );
    totalNIDue += earningsInMainRate * NI_THRESHOLDS.rateBelow;

    // NI at 2% above upper earnings limit
    const earningsAboveUEL = Math.max(0, totalAnnualGross - NI_THRESHOLDS.upperEarningsLimit);
    totalNIDue += earningsAboveUEL * NI_THRESHOLDS.rateAbove;
  }

  // NI for this period is total NI due minus NI already paid
  const niForThisPeriod = Math.max(0, totalNIDue - ytdNI);

  return Math.round(niForThisPeriod * 100) / 100;
}

/**
 * Calculate pension contribution
 */
function calculatePensionContribution(
  grossPay: number,
  contributionRate: number = 0
): number {
  if (contributionRate <= 0) return 0;

  // Pension is calculated on gross pay before tax
  const contribution = grossPay * (contributionRate / 100);

  return Math.round(contribution * 100) / 100;
}

/**
 * Calculate student loan deduction
 */
function calculateStudentLoan(
  grossPay: number,
  studentLoanPlan: TaxCalculationInput["studentLoanPlan"],
  ytdGrossPay: number = 0
): number {
  if (!studentLoanPlan) return 0;

  const threshold = STUDENT_LOAN_THRESHOLDS[studentLoanPlan];
  const rate = STUDENT_LOAN_RATES[studentLoanPlan];

  if (!threshold || !rate) return 0;

  const totalAnnualGross = ytdGrossPay + grossPay;
  const excessIncome = Math.max(0, totalAnnualGross - threshold);

  const totalLoanDue = excessIncome * rate;

  // For simplicity, we'll calculate the proportional amount for this period
  // In reality, you'd track YTD student loan payments
  const loanForThisPeriod = (grossPay / totalAnnualGross) * totalLoanDue;

  return Math.round(loanForThisPeriod * 100) / 100;
}

/**
 * Main tax calculation function
 */
export function calculateUKTax(input: TaxCalculationInput): TaxCalculationResult {
  const {
    grossPay,
    taxCode = "1257L",
    pensionContributionRate = 0,
    studentLoanPlan = null,
    ytdGrossPay = 0,
    ytdTax = 0,
    ytdNI = 0,
  } = input;

  // Calculate pension contribution (reduces taxable income)
  const pensionContribution = calculatePensionContribution(grossPay, pensionContributionRate);

  // Calculate income tax (after pension contribution)
  const incomeTax = calculateIncomeTax(
    grossPay,
    pensionContribution,
    taxCode,
    ytdGrossPay,
    ytdTax
  );

  // Calculate National Insurance
  const nationalInsurance = calculateNationalInsurance(grossPay, ytdGrossPay, ytdNI);

  // Calculate student loan
  const studentLoan = calculateStudentLoan(grossPay, studentLoanPlan, ytdGrossPay);

  // Calculate totals
  const totalDeductions = incomeTax + nationalInsurance + pensionContribution + studentLoan;
  const netPay = grossPay - totalDeductions;

  // Calculate YTD totals
  const newYtdGrossPay = ytdGrossPay + grossPay;
  const newYtdTax = ytdTax + incomeTax;
  const newYtdNI = ytdNI + nationalInsurance;
  const newYtdNetPay = newYtdGrossPay - newYtdTax - newYtdNI;

  return {
    grossPay: Math.round(grossPay * 100) / 100,
    incomeTax: Math.round(incomeTax * 100) / 100,
    nationalInsurance: Math.round(nationalInsurance * 100) / 100,
    pensionContribution: Math.round(pensionContribution * 100) / 100,
    studentLoan: Math.round(studentLoan * 100) / 100,
    totalDeductions: Math.round(totalDeductions * 100) / 100,
    netPay: Math.round(netPay * 100) / 100,
    ytdGrossPay: Math.round(newYtdGrossPay * 100) / 100,
    ytdTax: Math.round(newYtdTax * 100) / 100,
    ytdNI: Math.round(newYtdNI * 100) / 100,
    ytdNetPay: Math.round(newYtdNetPay * 100) / 100,
  };
}

/**
 * Helper function to estimate annual salary from monthly pay
 */
export function estimateAnnualSalary(monthlyPay: number): number {
  return monthlyPay * 12;
}

/**
 * Helper function to estimate monthly pay from hourly rate
 */
export function estimateMonthlyPay(hourlyRate: number, hoursPerWeek: number = 37.5): number {
  const weeksPerMonth = 52 / 12;
  return hourlyRate * hoursPerWeek * weeksPerMonth;
}
