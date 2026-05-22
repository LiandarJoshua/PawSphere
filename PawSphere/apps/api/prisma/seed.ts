import { PrismaClient, ServiceType } from '@prisma/client';

const prisma = new PrismaClient();

const UAE_PROVIDERS: Array<{
  serviceType: ServiceType;
  businessName: string;
  description: string;
  phone: string;
  address: string;
  latitude: number;
  longitude: number;
  rating: number;
  isVerified: boolean;
}> = [
  // ── Dubai ─────────────────────────────────────────────────────────────────────
  {
    serviceType: 'VET',
    businessName: 'Dubai Marina Veterinary Clinic',
    description: '24/7 emergency care, surgery, and diagnostics in the heart of Marina.',
    phone: '+971 4 422 1000',
    address: 'Marina Walk, Dubai Marina, Dubai',
    latitude: 25.0777,
    longitude: 55.14,
    rating: 4.8,
    isVerified: true,
  },
  {
    serviceType: 'GROOMER',
    businessName: 'Furry Friends Grooming — JBR',
    description: 'Premium spa treatments, breed cuts, and de-shedding for all pets.',
    phone: '+971 4 437 2200',
    address: 'The Walk, JBR, Dubai',
    latitude: 25.0805,
    longitude: 55.1343,
    rating: 4.6,
    isVerified: true,
  },
  {
    serviceType: 'VET',
    businessName: 'Downtown Pet Hospital',
    description: 'Specialist vets for exotic animals and small mammals near Burj Khalifa.',
    phone: '+971 4 388 9900',
    address: 'Downtown Blvd, Downtown Dubai',
    latitude: 25.1972,
    longitude: 55.2744,
    rating: 4.9,
    isVerified: true,
  },
  {
    serviceType: 'GROOMER',
    businessName: 'Luxury Paws Spa — Business Bay',
    description: 'Award-winning grooming studio with aromatherapy and blueberry facials.',
    phone: '+971 4 555 7788',
    address: 'Bay Square, Business Bay, Dubai',
    latitude: 25.1862,
    longitude: 55.2621,
    rating: 4.7,
    isVerified: true,
  },
  {
    serviceType: 'VET',
    businessName: 'Dubai Hills Animal Clinic',
    description: 'Modern wellness centre offering preventive care, dentistry, and imaging.',
    phone: '+971 4 299 3300',
    address: 'Dubai Hills Mall, Dubai Hills Estate',
    latitude: 25.1032,
    longitude: 55.2346,
    rating: 4.5,
    isVerified: true,
  },
  {
    serviceType: 'PET_HOTEL',
    businessName: 'The Pampered Pet Hotel — Al Quoz',
    description: 'Boutique pet boarding with webcam access and daily activity reports.',
    phone: '+971 4 340 1122',
    address: 'Al Quoz Industrial 4, Dubai',
    latitude: 25.1486,
    longitude: 55.2254,
    rating: 4.4,
    isVerified: false,
  },
  {
    serviceType: 'TRAINER',
    businessName: 'PawsTrained — Dubai South',
    description: 'Certified dog trainers using positive reinforcement for all breeds.',
    phone: '+971 55 123 4567',
    address: 'Dubai South, Expo City Area',
    latitude: 24.9964,
    longitude: 55.1627,
    rating: 4.6,
    isVerified: true,
  },
  {
    serviceType: 'PET_STORE',
    businessName: 'Petzone Flagship — Mall of the Emirates',
    description: "UAE's largest pet store — nutrition, accessories, and live fish.",
    phone: '+971 4 341 0066',
    address: 'Mall of the Emirates, Al Barsha',
    latitude: 25.1184,
    longitude: 55.2004,
    rating: 4.3,
    isVerified: true,
  },
  // ── Abu Dhabi ─────────────────────────────────────────────────────────────────
  {
    serviceType: 'VET',
    businessName: 'Abu Dhabi Animal Hospital',
    description: 'Leading referral hospital with oncology, cardiology, and orthopaedics.',
    phone: '+971 2 635 0000',
    address: 'Khalidiyah, Abu Dhabi',
    latitude: 24.4539,
    longitude: 54.3773,
    rating: 4.9,
    isVerified: true,
  },
  {
    serviceType: 'GROOMER',
    businessName: 'Royal Canine Spa — Yas Island',
    description: 'Grooming, nail art, and skin treatments beside Yas Marina Circuit.',
    phone: '+971 2 565 4400',
    address: 'Yas Island, Abu Dhabi',
    latitude: 24.4672,
    longitude: 54.6031,
    rating: 4.5,
    isVerified: true,
  },
  // ── Sharjah ───────────────────────────────────────────────────────────────────
  {
    serviceType: 'VET',
    businessName: 'Sharjah Veterinary Centre',
    description: 'Government-certified clinic offering affordable care for all pets.',
    phone: '+971 6 556 7788',
    address: 'Al Nahda, Sharjah',
    latitude: 25.3203,
    longitude: 55.4209,
    rating: 4.2,
    isVerified: true,
  },
  {
    serviceType: 'GROOMER',
    businessName: 'Happy Tails Grooming — Al Qasimia',
    description: 'Walk-in grooming with express 30-minute baths available.',
    phone: '+971 6 533 0011',
    address: 'Al Qasimia, Sharjah',
    latitude: 25.3573,
    longitude: 55.4033,
    rating: 4.1,
    isVerified: false,
  },
];

async function main() {
  console.log('🌱 Seeding UAE providers...');

  // Clear existing seed data first
  await prisma.provider.deleteMany({});

  const result = await prisma.provider.createMany({
    data: UAE_PROVIDERS,
    skipDuplicates: true,
  });

  console.log(`✅ Seeded ${result.count} providers successfully.`);
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
