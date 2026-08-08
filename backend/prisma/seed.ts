import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const roles = [
    {
      name: 'Owner',
      description: 'Restaurant owner with full access',
    },
    {
      name: 'Manager',
      description: 'Restaurant manager',
    },
    {
      name: 'Employee',
      description: 'Regular employee',
    },
  ];

  for (const role of roles) {
    await prisma.systemRole.upsert({
      where: {
        name: role.name,
      },
      update: {},
      create: role,
    });
  }

  console.log('✅ System roles seeded.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
