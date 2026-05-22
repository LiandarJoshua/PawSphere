import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import Groq from 'groq-sdk';
import { Pet, Vaccination, WeightLog, Medication, VetVisit } from '@prisma/client';

type PetWithVaccinations = Pet & {
  vaccinations: Vaccination[];
  weightLogs: WeightLog[];
  medications: Medication[];
  vetVisits: VetVisit[];
};

const FAST_MODEL = 'llama-3.1-8b-instant';   // reminders, descriptions
const CHAT_MODEL = 'llama-3.3-70b-versatile'; // pawbot chat

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly groq: Groq | null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly notifications: NotificationsService,
  ) {
    const key = process.env.GROQ_API_KEY || this.config.get<string>('GROQ_API_KEY');
    this.groq = key ? new Groq({ apiKey: key }) : null;
    if (!this.groq) {
      this.logger.warn('GROQ_API_KEY not set — AI features will use demo mode');
    }
  }

  private async complete(
    model: string,
    system: string,
    userPrompt: string,
    maxTokens = 200,
  ): Promise<string | null> {
    if (!this.groq) return null;
    try {
      const res = await this.groq.chat.completions.create({
        model,
        max_tokens: maxTokens,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: userPrompt },
        ],
      });
      return res.choices[0]?.message?.content?.trim() ?? null;
    } catch (err) {
      this.logger.error(`Groq error (${model}): ${err}`);
      return null;
    }
  }

  // ─── Reminders ───────────────────────────────────────────────────────────────

  async generateRemindersForAllPets(): Promise<void> {
    const pets = await this.prisma.pet.findMany({
      include: {
        vaccinations: true,
        weightLogs: { orderBy: { loggedAt: 'desc' }, take: 1 },
        medications: { where: { isActive: true } },
        vetVisits: { orderBy: { visitDate: 'desc' }, take: 1 },
        household: { include: { owner: true } },
      },
    });
    this.logger.log(`Generating AI reminders for ${pets.length} pets`);
    for (const pet of pets) {
      try {
        await this.generateReminderForPet(
          pet as PetWithVaccinations & { household: { owner: { id: string } } },
        );
      } catch (err) {
        this.logger.error(`Failed to generate reminder for pet ${pet.id}: ${err}`);
      }
    }
  }

  async generateRemindersForUser(userId: string): Promise<void> {
    const pets = await this.prisma.pet.findMany({
      where: { household: { ownerId: userId } },
      include: {
        vaccinations: true,
        weightLogs: { orderBy: { loggedAt: 'desc' }, take: 1 },
        medications: { where: { isActive: true } },
        vetVisits: { orderBy: { visitDate: 'desc' }, take: 1 },
      },
    });
    for (const pet of pets) {
      try {
        await this.generateReminderForPet({ ...pet, ownerId: userId } as any);
      } catch (err) {
        this.logger.error(`Failed for pet ${pet.id}: ${err}`);
      }
    }
  }

  private async generateReminderForPet(
    pet: PetWithVaccinations & { ownerId?: string; household?: { owner: { id: string } } },
  ): Promise<void> {
    const userId = pet.ownerId ?? pet.household?.owner?.id;
    if (!userId) return;

    const ageMonths = pet.dob
      ? Math.floor((Date.now() - new Date(pet.dob).getTime()) / (1000 * 60 * 60 * 24 * 30))
      : null;

    const lastVax = [...pet.vaccinations].sort(
      (a, b) => new Date(b.administeredAt).getTime() - new Date(a.administeredAt).getTime(),
    )[0];

    const latestWeight = pet.weightLogs?.[0] ?? null;
    const activeMeds = pet.medications?.filter((m) => m.isActive) ?? [];
    const lastVisit = pet.vetVisits?.[0] ?? null;

    const content = await this.buildReminderContent(
      pet.name,
      pet.species,
      pet.breed ?? null,
      ageMonths,
      lastVax ?? null,
      pet.medicalInfo ?? null,
      latestWeight,
      activeMeds,
      lastVisit,
    );

    await this.prisma.aIReminder.create({ data: { petId: pet.id, userId, content } });
    this.logger.log(`Reminder created for ${pet.name}`);
  }

  private async buildReminderContent(
    name: string,
    species: string,
    breed: string | null,
    ageMonths: number | null,
    lastVax: Vaccination | null,
    medicalInfo: string | null,
    latestWeight: WeightLog | null,
    activeMeds: Medication[],
    lastVisit: VetVisit | null,
  ): Promise<string> {
    const system =
      'You are a veterinary health assistant for PawSphere, a UAE-based pet app. ' +
      'Write a short, friendly, actionable health reminder in exactly 1–2 sentences. ' +
      'Be warm and mention the UAE/Dubai climate where relevant.';

    const prompt = `Pet details:
- Name: ${name}
- Species: ${species}
- Breed: ${breed ?? 'unknown'}
- Age: ${ageMonths != null ? `${ageMonths} months` : 'unknown'}
- Last vaccination: ${lastVax ? `${lastVax.vaccineName} on ${new Date(lastVax.administeredAt).toLocaleDateString()}` : 'none recorded'}
- Medical notes: ${medicalInfo ?? 'none'}
- Latest weight: ${latestWeight ? `${latestWeight.weight}kg (${new Date(latestWeight.loggedAt).toLocaleDateString()})` : 'not recorded'}
- Active medications: ${activeMeds.length > 0 ? activeMeds.map((m) => m.name + (m.dosage ? ` ${m.dosage}` : '')).join(', ') : 'none'}
- Last vet visit: ${lastVisit ? `${new Date(lastVisit.visitDate).toLocaleDateString()} - ${lastVisit.reason}` : 'none recorded'}`;

    const result = await this.complete(FAST_MODEL, system, prompt, 120);
    return result ?? this.demoReminder(name, species, ageMonths, lastVax);
  }

  private demoReminder(
    name: string,
    species: string,
    ageMonths: number | null,
    lastVax: Vaccination | null,
  ): string {
    const tips: Record<string, string> = {
      DOG: `${name} may need extra hydration in Dubai's summer heat — ensure fresh water is always available.`,
      CAT: `Indoor cats like ${name} benefit from enrichment activities during the hot UAE summer months.`,
      BIRD: `Keep ${name}'s cage away from air conditioning vents to avoid temperature shock.`,
      RABBIT: `${name} is sensitive to heat — keep them in an air-conditioned room during UAE summer.`,
      default: `Schedule a routine wellness check for ${name} at your nearest UAE-certified vet.`,
    };
    const baseTip = tips[species] ?? tips.default;
    if (lastVax?.nextDueDate) {
      return `${baseTip} Next vaccination due: ${new Date(lastVax.nextDueDate).toLocaleDateString()}.`;
    }
    if (ageMonths != null && ageMonths < 6) {
      return `${name} is still a young ${species.toLowerCase()} — make sure their vaccination schedule is up to date.`;
    }
    return baseTip;
  }

  async getRemindersForUser(userId: string) {
    return this.prisma.aIReminder.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: { pet: { select: { name: true, species: true } } },
    });
  }

  async markRead(id: string, userId: string) {
    return this.prisma.aIReminder.updateMany({
      where: { id, userId },
      data: { isRead: true },
    });
  }

  // ─── PawBot Chat ─────────────────────────────────────────────────────────────

  async chat(
    userId: string,
    messages: { role: 'user' | 'model'; text: string }[],
  ): Promise<string> {
    const pets = await this.prisma.pet.findMany({
      where: { household: { ownerId: userId } },
      include: {
        vaccinations: { orderBy: { administeredAt: 'desc' }, take: 1 },
        weightLogs: { orderBy: { loggedAt: 'desc' }, take: 3 },
        medications: { where: { isActive: true } },
        vetVisits: { orderBy: { visitDate: 'desc' }, take: 2 },
      },
    });

    const petContext =
      pets.length > 0
        ? pets.map((p) => {
            const age = p.dob
              ? Math.floor((Date.now() - new Date(p.dob).getTime()) / (1000 * 60 * 60 * 24 * 30))
              : null;
            const latestWeight = p.weightLogs[0];
            const activeMeds = p.medications.filter((m) => m.isActive);
            const lastVisit = p.vetVisits[0];
            return [
              `- ${p.name} (${p.species}${p.breed ? `, ${p.breed}` : ''}${age != null ? `, ${age} months old` : ''})`,
              latestWeight
                ? `  Weight: ${latestWeight.weight}kg (as of ${new Date(latestWeight.loggedAt).toLocaleDateString()})`
                : '',
              activeMeds.length > 0
                ? `  Active medications: ${activeMeds.map((m) => m.name + (m.dosage ? ` ${m.dosage}` : '')).join(', ')}`
                : '',
              lastVisit
                ? `  Last vet visit: ${new Date(lastVisit.visitDate).toLocaleDateString()} - ${lastVisit.reason}`
                : '',
            ]
              .filter(Boolean)
              .join('\n');
          }).join('\n')
        : 'No pets registered yet.';

    const system = `You are PawBot, a friendly AI assistant for PawSphere, a UAE-based pet care app.

User's pets:
${petContext}

Help with: pet health, nutrition, behaviour, the user's specific pets above, PawSphere features (vets, groomers, kennels, sitters, community alerts, AI reminders), and UAE-specific pet care (hot climate, local regulations).
Be warm, concise (2–4 sentences), and actionable. Recommend a vet for medical decisions. Stay on pet/app topics.`;

    if (!this.groq) {
      return `Hi! I'm PawBot 🐾 Running in demo mode — add GROQ_API_KEY to enable full AI chat. You have ${pets.length} pet${pets.length !== 1 ? 's' : ''} registered.`;
    }

    try {
      const history = messages.map((m) => ({
        role: m.role === 'model' ? ('assistant' as const) : ('user' as const),
        content: m.text,
      }));

      const res = await this.groq.chat.completions.create({
        model: CHAT_MODEL,
        max_tokens: 400,
        messages: [{ role: 'system', content: system }, ...history],
      });

      return res.choices[0]?.message?.content?.trim() ?? "I had trouble generating a response. Please try again.";
    } catch (err) {
      this.logger.error(`PawBot chat error: ${err}`);
      return "I'm having a bit of trouble right now. Please try again in a moment!";
    }
  }

  // ─── Birthday Reminders ───────────────────────────────────────────────────────

  async sendBirthdayPushes(): Promise<void> {
    const today = new Date();
    const pets = await this.prisma.pet.findMany({
      where: { dob: { not: null } },
      include: { household: { include: { owner: true } } },
    });
    for (const pet of pets) {
      if (!pet.dob) continue;
      const dob = new Date(pet.dob);
      if (dob.getMonth() === today.getMonth() && dob.getDate() === today.getDate()) {
        const userId = pet.household?.owner?.id;
        if (userId) {
          const age = today.getFullYear() - dob.getFullYear();
          await this.notifications.sendPush(
            [userId],
            `Happy Birthday, ${pet.name}!`,
            `${pet.name} turns ${age} today! Give them some extra love.`,
            { petId: pet.id },
          );
        }
      }
    }
  }

  // ─── Place Descriptions ───────────────────────────────────────────────────────

  async describePetPlace(
    name: string,
    serviceType: string,
    rating: number | null,
    reviewCount: number | null,
    address: string,
  ): Promise<string> {
    const system =
      'You are a helpful pet care advisor for PawSphere, a UAE-based pet app. ' +
      'Write warm, friendly 2–3 sentence descriptions of pet services for UAE pet owners. Be concise and positive.';

    const prompt = `Describe this pet service:
- Name: ${name}
- Type: ${serviceType.replace(/_/g, ' ')}
- Rating: ${rating != null ? `${rating}/5 from ${reviewCount ?? 0} reviews` : 'No reviews yet'}
- Address: ${address || 'UAE'}`;

    const result = await this.complete(FAST_MODEL, system, prompt, 120);
    return result ?? `${name} is a trusted pet service in the UAE. Contact them for availability and expert care.`;
  }
}
