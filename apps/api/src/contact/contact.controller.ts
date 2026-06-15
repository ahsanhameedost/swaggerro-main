import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UseGuards
} from "@nestjs/common";
import { AuthGuard } from "../common/guards/auth.guard";
import { RequirePermissions } from "../common/decorators/permissions.decorator";
import { PermissionsGuard } from "../common/guards/permissions.guard";
import { ContactCreateSchema, contactMessagesQuerySchema } from "./contact.dto";
import { ContactService } from "./contact.service";

@Controller()
export class ContactController {
  constructor(private readonly contactService: ContactService) {}

  @Post("/contact")
  async create(@Body() body: unknown) {
    const parsed = ContactCreateSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }

    const { id } = await this.contactService.createAndEnqueue(parsed.data);
    return { ok: true, id };
  }

  @Get("/contact/messages")
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("contact.messages.read")
  async listMessages(@Query() query: unknown) {
    const parsed = contactMessagesQuerySchema.safeParse(query);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues[0]?.message ?? "Invalid query");
    }

    return this.contactService.listMessages(parsed.data);
  }

  @Get("/contact/messages/:id")
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("contact.messages.read")
  async getMessage(@Param("id") id: string) {
    return { message: await this.contactService.getMessageById(id) };
  }

  @Delete("/contact/messages/:id")
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("contact.messages.delete")
  async deleteMessage(@Param("id") id: string) {
    return this.contactService.deleteMessage(id);
  }
}
