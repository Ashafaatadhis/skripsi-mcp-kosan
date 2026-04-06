import { Controller, Post, Body } from "@nestjs/common";
import { PaymentsService } from "./payments.service";

@Controller("payments")
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post("webhook/bayargg")
  async handleWebhook(@Body() body: { external_id: string; status: string }) {
    if (body.status !== "paid") return { received: true };
    return this.paymentsService.handleWebhook(body.external_id);
  }
}
