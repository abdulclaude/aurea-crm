-- AlterTable
ALTER TABLE "PayrollRunWorker" ADD COLUMN     "housingAllowance" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "incomeTax" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "mealAllowance" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "nationalInsurance" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "otherAllowances" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "otherDeductions" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "payslipSentAt" TIMESTAMP(3),
ADD COLUMN     "payslipUrl" TEXT,
ADD COLUMN     "pensionContribution" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "studentLoan" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "transportAllowance" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "ytdGrossPay" DECIMAL(12,2),
ADD COLUMN     "ytdNI" DECIMAL(12,2),
ADD COLUMN     "ytdNetPay" DECIMAL(12,2),
ADD COLUMN     "ytdTax" DECIMAL(12,2);

-- AlterTable
ALTER TABLE "Worker" ADD COLUMN     "employerPensionRate" DECIMAL(5,2) DEFAULT 3,
ADD COLUMN     "housingAllowance" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "mealAllowance" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "otherAllowances" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "pensionContributionRate" DECIMAL(5,2) DEFAULT 5,
ADD COLUMN     "pensionSchemeEnrolled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "studentLoanPlan" TEXT,
ADD COLUMN     "taxCode" TEXT DEFAULT '1257L',
ADD COLUMN     "transportAllowance" DECIMAL(10,2) NOT NULL DEFAULT 0;
