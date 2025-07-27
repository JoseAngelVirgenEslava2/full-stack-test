const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash('password', 10);

  await prisma.user.create({
    data: {
      firstName: 'Admin',
      lastName: 'User',
      email: 'admin@example.com',
      phoneNumber: '1234-5678',
      role: 'ADMIN',
      status: 'ACTIVE',
      password: hashedPassword,
      address: {
        street: 'False Street',
        number: '10',
        city: 'False City',
        postalCode: '11111',
      },
      profilePicture: 'https://images.unsplash.com/photo-1511367461989-f85a21fda167?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8M3x8cHJvZmlsZXxlbnwwfHwwfHx8MA%3D%3D'
    },
  });

  for (let i=1; i<=50; i++) {
    await prisma.user.create({
        data: {
          firstName: `Name ${i}`,
          lastName: `LastName ${i}`,
          email: `user${i}@example.com`,
          phoneNumber: `1234-${1000+i}`,
          role: i%5===0 ? 'ADMIN': 'USER',
          status: i%3===0 ? 'ACTIVE': 'INACTIVE',
          password: hashedPassword,
          address: {
            street: `False Street ${i}`,
            number: `${i}`,
            city: `False City ${i}`,
            postalCode: `${1000+i}`,
          },
          profilePicture: 'https://cdn.pixabay.com/photo/2023/02/18/11/00/icon-7797704_1280.png'
        },
      });
  }

  console.log('Seed complete');
}

main()
  .catch(e => {
    console.error(e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
