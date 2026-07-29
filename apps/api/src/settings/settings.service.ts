import { Injectable } from '@nestjs/common';
import { ActivityType } from '@prisma/client';
import { ActivitiesService } from '../activities/activities.service';
import { AuditService } from '../audit/audit.service';
import { notDeleted } from '../common/helpers/soft-delete.helpers';
import { PrismaService } from '../prisma/prisma.service';
import type { UpdateSettingsDto } from './dto/update-settings.dto';

@Injectable()
export class SettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly activities: ActivitiesService,
  ) {}

  async get(userId: string) {
    const settings = await this.prisma.userSettings.findFirst({
      where: { userId, ...notDeleted },
    });

    if (settings) {
      return settings;
    }

    return this.prisma.userSettings.create({
      data: { userId, createdBy: userId },
    });
  }

  async update(userId: string, dto: UpdateSettingsDto) {
    const before = await this.get(userId);

    const updated = await this.prisma.userSettings.update({
      where: { id: before.id },
      data: {
        ...(dto.locale !== undefined ? { locale: dto.locale } : {}),
        ...(dto.timezone !== undefined ? { timezone: dto.timezone } : {}),
        ...(dto.emailNotifications !== undefined
          ? { emailNotifications: dto.emailNotifications }
          : {}),
        ...(dto.smsNotifications !== undefined
          ? { smsNotifications: dto.smsNotifications }
          : {}),
        ...(dto.theme !== undefined ? { theme: dto.theme } : {}),
        updatedBy: userId,
      },
    });

    await Promise.all([
      this.audit.log({
        action: 'SETTINGS_UPDATED',
        entityType: 'UserSettings',
        entityId: updated.id,
        actorId: userId,
        before: {
          locale: before.locale,
          timezone: before.timezone,
          theme: before.theme,
          emailNotifications: before.emailNotifications,
          smsNotifications: before.smsNotifications,
        },
        after: {
          locale: updated.locale,
          timezone: updated.timezone,
          theme: updated.theme,
          emailNotifications: updated.emailNotifications,
          smsNotifications: updated.smsNotifications,
        },
      }),
      this.activities.create({
        type: ActivityType.SETTINGS_UPDATED,
        title: 'Settings updated',
        actorId: userId,
        entityType: 'UserSettings',
        entityId: updated.id,
      }),
    ]);

    return updated;
  }
}
