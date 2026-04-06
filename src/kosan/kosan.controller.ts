import { Body, Controller, Get, Post, Query } from "@nestjs/common";
import { PinoLogger } from "nestjs-pino";
import { KosanService } from "./kosan.service";

@Controller("kosan")
export class KosanController {
  constructor(
    private readonly kosanService: KosanService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(KosanController.name);
  }

  @Get("me")
  async getMyKosan(@Query("ownerId") ownerId: string) {
    const kosan = await this.kosanService.getOwnerKosan(ownerId);

    this.logger.info(
      {
        event: "get_owner_kosan",
        ownerId,
        found: Boolean(kosan),
      },
      "Resolved owner kosan",
    );

    return kosan;
  }

  @Post()
  async createKosan(
    @Body() body: { ownerId: string; name: string; address: string; description?: string },
  ) {
    this.logger.info(
      {
        event: "create_kosan_request",
        ownerId: body.ownerId,
      },
      "Creating kosan for owner",
    );

    const kosan = await this.kosanService.createKosan(body);

    this.logger.info(
      {
        event: "create_kosan_success",
        ownerId: body.ownerId,
        kosanId: kosan.id,
      },
      "Kosan created successfully",
    );

    return kosan;
  }
}
