import { Controller, Delete, Get, Post, Req, Res } from "@nestjs/common";
import { Request, Response } from "express";
import { CustomMcpService } from "./streamable.service";

@Controller("mcp")
export class CustomMcpController {
  constructor(private readonly service: CustomMcpService) {}

  @Post()
  async handleMcpPost(@Req() req: Request, @Res() res: Response) {
    await this.service.handlePostRequest(req, res);
  }

  @Get()
  async handleMcpGet(@Req() req: Request, @Res() res: Response) {
    await this.service.handleGetRequest(req, res);
  }

  @Delete()
  async handleMcpDelete(@Req() req: Request, @Res() res: Response) {
    await this.service.handleDeleteRequest(req, res);
  }
}
