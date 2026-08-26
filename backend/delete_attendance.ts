import prisma from './src/config/prisma';

async function main() {
  console.log('Deleting all records from Attendance table in database...');
  const result = await prisma.attendance.deleteMany({});
  console.log(`Successfully deleted ${result.count} attendance records from backend database.`);
}

main()
  .catch((e) => {
    console.error('Error deleting attendance records:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
