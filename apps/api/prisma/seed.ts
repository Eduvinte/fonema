import { PrismaClient, Plan } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('demo1234', 10);

  const demo = await prisma.user.upsert({
    where: { email: 'demo@pronunciation.app' },
    update: {},
    create: {
      email: 'demo@pronunciation.app',
      name: 'Usuario Demo',
      passwordHash,
      plan: Plan.FREE,
    },
  });

  const existing = await prisma.section.findFirst({
    where: { userId: demo.id, name: 'Comida' },
  });

  if (!existing) {
    const foodWords = [
      { text: 'apple', translation: 'manzana', example: 'I eat an apple every morning.' },
      { text: 'bread', translation: 'pan', example: 'She bought fresh bread at the bakery.' },
      { text: 'butter', translation: 'mantequilla', example: 'Could you pass me the butter, please?' },
      { text: 'cheese', translation: 'queso', example: 'This cheese comes from France.' },
      { text: 'chicken', translation: 'pollo', example: 'We had grilled chicken for dinner.' },
      { text: 'egg', translation: 'huevo', example: 'He boiled an egg for breakfast.' },
      { text: 'rice', translation: 'arroz', example: 'Rice is a staple food in many countries.' },
      { text: 'spoon', translation: 'cuchara', example: 'Use a spoon to stir the soup.' },
      { text: 'fork', translation: 'tenedor', example: 'The fork is next to the plate.' },
      { text: 'knife', translation: 'cuchillo', example: 'Be careful with that sharp knife.' },
    ];

    await prisma.section.create({
      data: {
        name: 'Comida',
        userId: demo.id,
        words: {
          create: foodWords.map((w, i) => ({ ...w, sortOrder: i })),
        },
      },
    });
    console.log('Sección de ejemplo "Comida" creada');
  }

  console.log(`Usuario demo: demo@pronunciation.app / demo1234`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
