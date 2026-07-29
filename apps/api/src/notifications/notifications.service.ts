import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { NotificationStatus } from '@prisma/client';
import { buildPaginatedMeta } from '../common/dto/pagination.dto';
import { notDeleted } from '../common/helpers/soft-delete.helpers';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string, params: { page: number; limit: number; status?: NotificationStatus }) {
    const where = {
      userId,
      ...notDeleted,
      ...(params.status ? { status: params.status } : {}),
    };

    const [total, data] = await this.prisma.$transaction([
      this.prisma.notification.count({ where }),
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (params.page - 1) * params.limit,
        take: params.limit,
      }),
    ]);

    return {
      data,
      meta: buildPaginatedMeta(params.page, params.limit, total),
    };
  }

  async markRead(userId: string, notificationId: string) {
    const notification = await this.prisma.notification.findFirst({
      where: { id: notificationId, ...notDeleted },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }
    if (notification.userId !== userId) {
      throw new ForbiddenException('Cannot access this notification');
    }

    if (notification.status === NotificationStatus.READ) {
      return notification;
    }

    return this.prisma.notification.update({
      where: { id: notificationId },
      data: {
        status: NotificationStatus.READ,
        readAt: new Date(),
        updatedBy: userId,
      },
    });
  }

  async markAllRead(userId: string) {
    const result = await this.prisma.notification.updateMany({
      where: {
        userId,
        status: NotificationStatus.UNREAD,
        ...notDeleted,
      },
      data: {
        status: NotificationStatus.READ,
        readAt: new Date(),
        updatedBy: userId,
      },
    });

    return { updated: result.count };
  }

  async unreadCount(userId: string) {
    const count = await this.prisma.notification.count({
      where: {
        userId,
        status: NotificationStatus.UNREAD,
        ...notDeleted,
      },
    });

    return { count };
  }
}
