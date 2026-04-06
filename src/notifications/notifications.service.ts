import { Injectable, Logger } from "@nestjs/common";
import axios from "axios";

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  private async send(botToken: string, telegramId: bigint, message: string) {
    try {
      await axios.post(
        `https://api.telegram.org/bot${botToken}/sendMessage`,
        { chat_id: telegramId.toString(), text: message, parse_mode: "HTML" }
      );
    } catch (err) {
      this.logger.error(`Failed to send notification to ${telegramId}: ${err}`);
    }
  }

  async notifyOwner(telegramId: bigint, message: string) {
    const token = process.env.OWNER_BOT_TOKEN;
    if (!token) return;
    await this.send(token, telegramId, message);
  }

  async notifyTenant(telegramId: bigint, message: string) {
    const token = process.env.TENANT_BOT_TOKEN;
    if (!token) return;
    await this.send(token, telegramId, message);
  }
}
