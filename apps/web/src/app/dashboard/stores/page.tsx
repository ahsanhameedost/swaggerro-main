"use client";

import { Card, CardBody, CardHeader } from "@heroui/react";

export default function Page() {
  return (
    <Card>
      <CardHeader className="flex flex-col items-start gap-1">
        <div className="text-xl font-semibold">Coming soon</div>
        <div className="text-sm text-foreground/70">This module will be implemented in next phases.</div>
      </CardHeader>
      <CardBody>...</CardBody>
    </Card>
  );
}
