import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from "@nestjs/common";
import type { FastifyRequest } from "fastify";
import { RequireAnyPermissions, RequirePermissions } from "../common/decorators/permissions.decorator";
import type { AuthUser } from "../common/guards/auth.guard";
import { AuthGuard } from "../common/guards/auth.guard";
import { PermissionsGuard } from "../common/guards/permissions.guard";
import { parseOrThrow } from "../catalog/common/parse-or-throw";
import {
  createShippingProfileSchema,
  createShipmentPaymentSchema,
  createShippingRateSchema,
  createShippingShipmentSchema,
  createShippingZoneSchema,
  estimateOrderShipmentSchema,
  listShipmentsQuerySchema,
  listShippingRatesQuerySchema,
  updateShipmentTrackingSchema,
  updateShippingProfileSchema,
  updateShippingRateSchema,
  updateShippingShipmentStatusSchema,
  updateShippingZoneSchema
} from "./shipping.dto";
import { ShippingService } from "./shipping.service";

@Controller("shipping")
@UseGuards(AuthGuard, PermissionsGuard)
export class ShippingController {
  constructor(private readonly shippingService: ShippingService) {}

  @Get("profiles")
  @RequirePermissions("shipping.settings.read")
  async listShippingProfiles() {
    return await this.shippingService.listShippingProfiles();
  }

  @Post("profiles")
  @RequirePermissions("shipping.settings.write")
  async createShippingProfile(@Body() body: unknown) {
    return {
      profile: await this.shippingService.createShippingProfile(
        parseOrThrow(createShippingProfileSchema.safeParse(body), "Invalid shipping profile payload")
      )
    };
  }

  @Patch("profiles/:id")
  @RequirePermissions("shipping.settings.write")
  async updateShippingProfile(@Param("id") id: string, @Body() body: unknown) {
    return {
      profile: await this.shippingService.updateShippingProfile(
        id,
        parseOrThrow(updateShippingProfileSchema.safeParse(body), "Invalid shipping profile payload")
      )
    };
  }

  @Delete("profiles/:id")
  @RequirePermissions("shipping.settings.write")
  async deleteShippingProfile(@Param("id") id: string) {
    return await this.shippingService.deleteShippingProfile(id);
  }

  @Get("zones")
  @RequirePermissions("shipping.settings.read")
  async listShippingZones() {
    return await this.shippingService.listShippingZones();
  }

  @Post("zones")
  @RequirePermissions("shipping.settings.write")
  async createShippingZone(@Body() body: unknown) {
    return {
      zone: await this.shippingService.createShippingZone(
        parseOrThrow(createShippingZoneSchema.safeParse(body), "Invalid shipping zone payload")
      )
    };
  }

  @Patch("zones/:id")
  @RequirePermissions("shipping.settings.write")
  async updateShippingZone(@Param("id") id: string, @Body() body: unknown) {
    return {
      zone: await this.shippingService.updateShippingZone(
        id,
        parseOrThrow(updateShippingZoneSchema.safeParse(body), "Invalid shipping zone payload")
      )
    };
  }

  @Delete("zones/:id")
  @RequirePermissions("shipping.settings.write")
  async deleteShippingZone(@Param("id") id: string) {
    return await this.shippingService.deleteShippingZone(id);
  }

  @Get("rates")
  @RequirePermissions("shipping.rates.read")
  async listShippingRates(@Query() query: unknown) {
    return await this.shippingService.listShippingRates(
      parseOrThrow(listShippingRatesQuerySchema.safeParse(query), "Invalid shipping rates query")
    );
  }

  @Post("rates")
  @RequirePermissions("shipping.rates.write")
  async createShippingRate(@Body() body: unknown) {
    return {
      rate: await this.shippingService.createShippingRate(
        parseOrThrow(createShippingRateSchema.safeParse(body), "Invalid shipping rate payload")
      )
    };
  }

  @Patch("rates/:id")
  @RequirePermissions("shipping.rates.write")
  async updateShippingRate(@Param("id") id: string, @Body() body: unknown) {
    return {
      rate: await this.shippingService.updateShippingRate(
        id,
        parseOrThrow(updateShippingRateSchema.safeParse(body), "Invalid shipping rate payload")
      )
    };
  }

  @Delete("rates/:id")
  @RequirePermissions("shipping.rates.write")
  async deleteShippingRate(@Param("id") id: string) {
    return await this.shippingService.deleteShippingRate(id);
  }


  @Get("shipments")
  @RequireAnyPermissions("shipping.shipments.read", "shipping.shipments.assigned.read", "shipping.shipments.self.read")
  async listShipments(
    @Query() query: unknown,
    @Req() req: FastifyRequest & { user?: AuthUser }
  ) {
    return await this.shippingService.listShipments(
      parseOrThrow(listShipmentsQuerySchema.safeParse(query), "Invalid shipment query"),
      req.user!
    );
  }

  @Get("order/:orderId/planner")
  @RequireAnyPermissions("shipping.shipments.read", "shipping.shipments.assigned.read", "shipping.shipments.self.read")
  async getOrderShippingPlanner(
    @Param("orderId") orderId: string,
    @Req() req: FastifyRequest & { user?: AuthUser }
  ) {
    return await this.shippingService.getOrderShippingPlanner(orderId, req.user!);
  }

  @Post("estimate")
  @RequireAnyPermissions("shipping.estimate", "shipping.assigned.estimate", "shipping.self.estimate")
  async estimateOrderShipment(
    @Body() body: unknown,
    @Req() req: FastifyRequest & { user?: AuthUser }
  ) {
    return await this.shippingService.estimateOrderShipment(
      parseOrThrow(estimateOrderShipmentSchema.safeParse(body), "Invalid shipment estimate payload"),
      req.user!
    );
  }

  @Post("shipments")
  @RequireAnyPermissions("shipping.shipments.write", "shipping.shipments.assigned.write", "shipping.shipments.self.write")
  async createShipment(
    @Body() body: unknown,
    @Req() req: FastifyRequest & { user?: AuthUser }
  ) {
    return {
      shipment: await this.shippingService.createShipment(
        parseOrThrow(createShippingShipmentSchema.safeParse(body), "Invalid shipment payload"),
        req.user!
      )
    };
  }

  @Post("shipments/:id/payment")
  @RequirePermissions("shipping.shipments.self.write")
  async createShipmentPayment(
    @Param("id") id: string,
    @Body() body: unknown,
    @Req() req: FastifyRequest & { user?: AuthUser }
  ) {
    return {
      shipment: await this.shippingService.createShipmentPayment(
        id,
        parseOrThrow(createShipmentPaymentSchema.safeParse(body), "Invalid shipment payment payload"),
        req.user!
      )
    };
  }

  @Get("shipments/:id")
  @RequireAnyPermissions("shipping.shipments.read", "shipping.shipments.assigned.read", "shipping.shipments.self.read")
  async getShipmentById(
    @Param("id") id: string,
    @Req() req: FastifyRequest & { user?: AuthUser }
  ) {
    return {
      shipment: await this.shippingService.getShipmentById(id, req.user!)
    };
  }

  @Patch("shipments/:id/status")
  @RequireAnyPermissions("shipping.shipments.write", "shipping.shipments.assigned.write")
  async updateShipmentStatus(
    @Param("id") id: string,
    @Body() body: unknown,
    @Req() req: FastifyRequest & { user?: AuthUser }
  ) {
    return {
      shipment: await this.shippingService.updateShipmentStatus(
        id,
        parseOrThrow(updateShippingShipmentStatusSchema.safeParse(body), "Invalid shipment status payload"),
        req.user!
      )
    };
  }

  @Patch("shipments/:id/tracking")
  @RequireAnyPermissions("shipping.shipments.write", "shipping.shipments.assigned.write")
  async updateShipmentTracking(
    @Param("id") id: string,
    @Body() body: unknown,
    @Req() req: FastifyRequest & { user?: AuthUser }
  ) {
    return {
      shipment: await this.shippingService.updateShipmentTracking(
        id,
        parseOrThrow(updateShipmentTrackingSchema.safeParse(body), "Invalid shipment tracking payload"),
        req.user!
      )
    };
  }
}
