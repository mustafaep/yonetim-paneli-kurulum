const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();
const DEFAULT_PASSWORD = '12345678';

function normalizeEmailPart(value) {
  return value
    .toLocaleLowerCase('tr-TR')
    .replace(/ç/g, 'c')
    .replace(/ğ/g, 'g')
    .replace(/ı/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ş/g, 's')
    .replace(/ü/g, 'u')
    .replace(/[^a-z0-9]+/g, '.')
    .replace(/^\.+|\.+$/g, '')
    .replace(/\.{2,}/g, '.');
}

function buildFallbackEmail(member, roleName) {
  const fullName = `${normalizeEmailPart(member.firstName)}.${normalizeEmailPart(member.lastName)}`.replace(
    /^\.+|\.+$/g,
    '',
  );
  const rolePart = normalizeEmailPart(roleName);
  return `${fullName || 'panel.user'}.${rolePart || 'role'}.${member.id.slice(-6)}@sendika.local`;
}

async function getUniqueEmail(member, roleName) {
  const candidates = [];

  if (member.email) {
    candidates.push(normalizeEmailPart(member.email.split('@')[0]) + '@' + member.email.split('@')[1].toLowerCase());
  }

  candidates.push(buildFallbackEmail(member, roleName));

  for (const email of candidates) {
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (!existingUser) {
      return email;
    }
  }

  let counter = 1;
  while (true) {
    const email = buildFallbackEmail(member, `${roleName}.${counter}`);
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (!existingUser) {
      return email;
    }
    counter += 1;
  }
}

async function main() {
  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);

  const applications = await prisma.panelUserApplication.findMany({
    where: {
      status: 'APPROVED',
    },
    include: {
      member: true,
      requestedRole: true,
      createdUser: true,
      applicationScopes: {
        where: {
          deletedAt: null,
        },
      },
    },
    orderBy: {
      updatedAt: 'desc',
    },
  });

  let linkedCount = 0;
  let createdCount = 0;

  for (const application of applications) {
    await prisma.$transaction(async (tx) => {
      let userId = application.createdUserId || application.member.userId || null;

      if (application.createdUserId && application.member.userId !== application.createdUserId) {
        await tx.member.update({
          where: { id: application.memberId },
          data: { userId: application.createdUserId },
        });
        linkedCount += 1;
        return;
      }

      if (!userId && application.member.userId) {
        userId = application.member.userId;
      }

      if (!userId) {
        const email = await getUniqueEmail(application.member, application.requestedRole.name);
        const createdUser = await tx.user.create({
          data: {
            email,
            passwordHash,
            firstName: application.member.firstName,
            lastName: application.member.lastName,
            customRoles: {
              connect: [{ id: application.requestedRoleId }],
            },
          },
        });

        if (application.applicationScopes.length > 0) {
          await tx.userScope.createMany({
            data: application.applicationScopes.map((scope) => ({
              userId: createdUser.id,
              provinceId: scope.provinceId,
              districtId: scope.districtId,
            })),
            skipDuplicates: true,
          });
        }

        await tx.member.update({
          where: { id: application.memberId },
          data: { userId: createdUser.id },
        });

        await tx.panelUserApplication.update({
          where: { id: application.id },
          data: { createdUserId: createdUser.id },
        });

        createdCount += 1;
        return;
      }

      await tx.panelUserApplication.update({
        where: { id: application.id },
        data: { createdUserId: userId },
      });

      await tx.member.update({
        where: { id: application.memberId },
        data: { userId },
      });

      linkedCount += 1;
    });
  }

  console.log(
    `Repaired approved panel users. Created: ${createdCount}, linked existing: ${linkedCount}, default password: ${DEFAULT_PASSWORD}`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
