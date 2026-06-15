import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UseGuards
} from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { RequireAnyPermissions, RequirePermissions } from "../../common/decorators/permissions.decorator";
import { AuthGuard, type AuthUser } from "../../common/guards/auth.guard";
import { PermissionsGuard } from "../../common/guards/permissions.guard";
import { parseOrThrow } from "../common/parse-or-throw";
import {
  approveOrderItemSchema,
  assignOrderEmployeeSchema,
  createOrderDesignUploadSchema,
  createOrderPaymentSchema,
  listOrdersQuerySchema,
  requestOrderItemRevisionSchema,
  updateOrderItemDesignSchema,
  updateOrderStatusSchema
} from "../dto/order.dto";
import { CatalogOrdersService } from "./orders.service";

@Controller("catalog")
export class CatalogOrdersController {
  constructor(private readonly ordersService: CatalogOrdersService) {}

  @UseGuards(AuthGuard, PermissionsGuard)
  @Get("orders")
  @RequireAnyPermissions("catalog.orders.read", "orders.assigned.read", "orders.self.read")
  async listOrders(
    @Query() query: unknown,
    @Req() req: FastifyRequest & { user?: AuthUser }
  ) {
    return await this.ordersService.listOrders(
      parseOrThrow(listOrdersQuerySchema.safeParse(query), "Invalid order query"),
      req.user!
    );
  }

  @UseGuards(AuthGuard, PermissionsGuard)
  @Get("orders/:id")
  @RequireAnyPermissions("catalog.orders.read", "orders.assigned.read", "orders.self.read")
  async getOrderById(
    @Param("id") id: string,
    @Req() req: FastifyRequest & { user?: AuthUser }
  ) {
    return {
      order: await this.ordersService.getOrderById(id, req.user!)
    };
  }

  @UseGuards(AuthGuard, PermissionsGuard)
  @Patch("orders/:id/status")
  @RequirePermissions("catalog.orders.update")
  async updateOrderStatus(
    @Param("id") id: string,
    @Body() body: unknown,
    @Req() req: FastifyRequest & { user?: AuthUser }
  ) {
    return {
      order: await this.ordersService.updateOrderStatus(
        id,
        parseOrThrow(updateOrderStatusSchema.safeParse(body), "Invalid order status payload"),
        req.user!
      )
    };
  }

  @UseGuards(AuthGuard, PermissionsGuard)
  @Patch("orders/:id/assignment")
  @RequirePermissions("admin.users.write")
  async assignOrderEmployee(
    @Param("id") id: string,
    @Body() body: unknown,
    @Req() req: FastifyRequest & { user?: AuthUser }
  ) {
    return {
      order: await this.ordersService.assignEmployee(
        id,
        parseOrThrow(assignOrderEmployeeSchema.safeParse(body), "Invalid assignment payload"),
        req.user!
      )
    };
  }

  @UseGuards(AuthGuard, PermissionsGuard)
  @Post("orders/design-upload-url")
  @RequireAnyPermissions("design.write", "orders.assigned.read", "orders.self.read")
  async createDesignUploadUrl(
    @Body() body: unknown,
    @Req() req: FastifyRequest & { user?: AuthUser }
  ) {
    return await this.ordersService.createDesignUploadUrl(
      parseOrThrow(createOrderDesignUploadSchema.safeParse(body), "Invalid design upload request"),
      req.user!
    );
  }

  @UseGuards(AuthGuard, PermissionsGuard)
  @Patch("orders/:orderId/items/:itemId/design")
  @RequirePermissions("design.write")
  async updateOrderItemDesign(
    @Param("orderId") orderId: string,
    @Param("itemId") itemId: string,
    @Body() body: unknown,
    @Req() req: FastifyRequest & { user?: AuthUser }
  ) {
    return {
      order: await this.ordersService.updateOrderItemDesign(
        orderId,
        itemId,
        parseOrThrow(updateOrderItemDesignSchema.safeParse(body), "Invalid design payload"),
        req.user!
      )
    };
  }

  @UseGuards(AuthGuard)
  @Post("orders/:orderId/items/:itemId/revisions")
  async requestOrderItemRevision(
    @Param("orderId") orderId: string,
    @Param("itemId") itemId: string,
    @Body() body: unknown,
    @Req() req: FastifyRequest & { user?: AuthUser }
  ) {
    return {
      order: await this.ordersService.requestItemRevision(
        orderId,
        itemId,
        parseOrThrow(requestOrderItemRevisionSchema.safeParse(body), "Invalid revision payload"),
        req.user!
      )
    };
  }

  @UseGuards(AuthGuard)
  @Post("orders/:id/payments")
  async createOrderPayment(
    @Param("id") id: string,
    @Body() body: unknown,
    @Req() req: FastifyRequest & { user?: AuthUser }
  ) {
    return await this.ordersService.createOrderPayment(
      id,
      parseOrThrow(createOrderPaymentSchema.safeParse(body), "Invalid payment payload"),
      req.user!
    );
  }

  @UseGuards(AuthGuard)
  @Post("orders/:orderId/items/:itemId/approve")
  async approveOrderItem(
    @Param("orderId") orderId: string,
    @Param("itemId") itemId: string,
    @Body() body: unknown,
    @Req() req: FastifyRequest & { user?: AuthUser }
  ) {
    return {
      order: await this.ordersService.approveOrderItem(
        orderId,
        itemId,
        parseOrThrow(approveOrderItemSchema.safeParse(body), "Invalid approval payload"),
        req.user!
      )
    };
  }

  @UseGuards(AuthGuard)
  @Get("orders/:id/assets.zip")
  async downloadOrderAssetsZip(
    @Param("id") id: string,
    @Req() req: FastifyRequest & { user?: AuthUser },
    @Res({ passthrough: true }) reply: FastifyReply
  ) {
    const zip = await this.ordersService.downloadOrderAssetsZip(id, req.user!);
    reply.header("content-type", "application/zip");
    reply.header("content-disposition", `attachment; filename="order-${id}-assets.zip"`);
    return zip;
  }

  @UseGuards(AuthGuard)
  @Get("orders/:id/mockups.pdf")
  async downloadOrderMockupsPdf(
    @Param("id") id: string,
    @Req() req: FastifyRequest & { user?: AuthUser },
    @Res({ passthrough: true }) reply: FastifyReply
  ) {
    const pdf = await this.ordersService.downloadOrderMockupsPdf(id, req.user!);
    reply.header("content-type", "application/pdf");
    reply.header("content-disposition", `attachment; filename="order-${id}-mockups.pdf"`);
    return pdf;
  }
}
