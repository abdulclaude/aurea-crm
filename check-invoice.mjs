import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const invoice = await prisma.invoice.findUnique({
    where: { id: 'cmiwmfsgy000hzv0au4loibh6' },
    select: {
      id: true,
      invoiceNumber: true,
      subaccountId: true,
      organizationId: true,
      paymentMethods: true,
    },
  });
  
  console.log('Invoice:', JSON.stringify(invoice, null, 2));
  
  if (invoice?.subaccountId) {
    const settings = await prisma.bankTransferSettings.findFirst({
      where: {
        organizationId: invoice.organizationId,
        subaccountId: invoice.subaccountId,
        enabled: true,
      },
    });
    console.log('\nBank Transfer Settings:', JSON.stringify(settings, null, 2));
  } else {
    console.log('\nNo subaccountId on invoice');
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
