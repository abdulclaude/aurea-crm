-- AddForeignKey
ALTER TABLE "time_log" ADD CONSTRAINT "time_log_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;
