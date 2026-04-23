import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.role.upsert({ where: { id: 1 }, update: {}, create: { id: 1, name: 'SUPER_ADMIN' } });
  await prisma.role.upsert({ where: { id: 2 }, update: {}, create: { id: 2, name: 'ADMIN' } });
  await prisma.role.upsert({ where: { id: 3 }, update: {}, create: { id: 3, name: 'USER' } });

  console.log('Seed concluído: roles SUPER_ADMIN, ADMIN, USER criadas.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
