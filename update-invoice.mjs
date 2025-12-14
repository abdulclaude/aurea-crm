import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const updated = await prisma.invoice.update({
    where: { id: 'cmiwmfsgy000hzv0au4loibh6' },
    data: {
      paymentMethods: ['BANK_TRANSFER', 'MANUAL'],
    },
  });
  
  console.log('Updated invoice:', JSON.stringify(updated, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
