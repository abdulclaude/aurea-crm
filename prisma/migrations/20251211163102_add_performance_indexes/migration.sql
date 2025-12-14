-- CreateIndex
CREATE INDEX "rota_organizationId_workerId_startTime_idx" ON "rota"("organizationId", "workerId", "startTime");

-- CreateIndex
CREATE INDEX "rota_organizationId_workerId_status_idx" ON "rota"("organizationId", "workerId", "status");

-- CreateIndex
CREATE INDEX "rota_workerId_startTime_endTime_idx" ON "rota"("workerId", "startTime", "endTime");

-- CreateIndex
CREATE INDEX "time_log_organizationId_workerId_startTime_idx" ON "time_log"("organizationId", "workerId", "startTime");

-- CreateIndex
CREATE INDEX "time_log_status_invoiceId_idx" ON "time_log"("status", "invoiceId");

-- CreateIndex
CREATE INDEX "time_log_workerId_status_idx" ON "time_log"("workerId", "status");
