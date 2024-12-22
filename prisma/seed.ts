// prisma/seed.ts
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const ADMIN_EMAIL = 'admin@example.com';
const ADMIN_PASSWORD = 'admin123!';  // À changer en production !

async function main() {
  console.log('🌱 Début du seeding...');

  try {
    // Vérifier si les settings existent
    const existingSettings = await prisma.settings.findFirst({
      where: { id: '1' }
    });

    if (!existingSettings) {
      console.log('⚙️ Création des paramètres par défaut...');
      await prisma.settings.create({
        data: {
          id: '1',
          maxFileSize: 100,
          maxAdminFileSize: 10240,
          allowedFileTypes: ['*'],
          defaultExpiration: 'never',
          approvalRequired: true,
          approvalExpiration: 72,
          maxStoragePerUser: 1024,
          minPasswordLength: 8,
          requireEmailVerification: true,
          maxLoginAttempts: 5
        }
      });
    }

    // Vérifier si l'admin existe déjà
    const existingAdmin = await prisma.user.findUnique({
      where: { email: ADMIN_EMAIL }
    });

    if (!existingAdmin) {
      console.log('👤 Création du compte administrateur...');
      const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 10);

      await prisma.user.create({
        data: {
          email: ADMIN_EMAIL,
          password: hashedPassword,
          isAdmin: true,
          isApproved: true
        }
      });

      console.log('✅ Compte administrateur créé avec succès !');
      console.log('Email:', ADMIN_EMAIL);
      console.log('Mot de passe:', ADMIN_PASSWORD);
    } else {
      console.log('ℹ️ Le compte administrateur existe déjà');
    }

  } catch (error) {
    console.error('❌ Erreur lors du seeding:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error('❌ Erreur:', e);
    process.exit(1);
  })
  .finally(async () => {
    console.log('🔚 Déconnexion de la base de données...');
    await prisma.$disconnect();
  });