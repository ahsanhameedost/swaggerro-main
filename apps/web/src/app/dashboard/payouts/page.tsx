"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Button,
  Card,
  CardBody,
  Chip,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Spinner,
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
} from "@heroui/react";
import { addToast } from "@heroui/toast";
import { Wallet } from "lucide-react";
import { useMe } from "@/queries/auth";
import {
  adminListPayoutStores,
  adminPayStore,
  adminSetCommission,
  type AdminStoreRow,
} from "@/modules/payouts/api";

const money = (cents: number) => `$${(cents / 100).toFixed(2)}`;

export default function AdminPayoutsPage() {
  const { data: me } = useMe();
  const canRead = !!me?.permissions?.includes("partners.stores.read");
  const canWrite = !!me?.permissions?.includes("partners.stores.write");
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin-payouts"],
    queryFn: adminListPayoutStores,
    enabled: canRead,
  });

  const [payTarget, setPayTarget] = useState<AdminStoreRow | null>(null);
  const [payAmount, setPayAmount] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [commissionEdits, setCommissionEdits] = useState<Record<string, string>>({});

  if (!canRead) {
    return (
      <Card>
        <CardBody>You do not have permission to view payouts.</CardBody>
      </Card>
    );
  }

  const saveCommission = async (store: AdminStoreRow) => {
    const value = Number(commissionEdits[store.id]);
    if (!Number.isFinite(value) || value < 0 || value > 100) {
      addToast({ title: "Enter a commission between 0 and 100", color: "warning" });
      return;
    }
    try {
      await adminSetCommission(store.id, value);
      await qc.invalidateQueries({ queryKey: ["admin-payouts"] });
      addToast({ title: "Commission updated", color: "success" });
      setCommissionEdits((c) => {
        const n = { ...c };
        delete n[store.id];
        return n;
      });
    } catch (err: any) {
      addToast({ title: "Update failed", description: err?.message ?? "", color: "danger" });
    }
  };

  const submitPay = async () => {
    if (!payTarget) return;
    const amountCents = payAmount ? Math.round(Number(payAmount) * 100) : undefined;
    if (amountCents != null && (!Number.isFinite(amountCents) || amountCents <= 0)) {
      addToast({ title: "Enter a valid amount", color: "warning" });
      return;
    }
    setBusy(true);
    try {
      await adminPayStore(payTarget.id, { amountCents, note: note || null });
      await qc.invalidateQueries({ queryKey: ["admin-payouts"] });
      addToast({ title: "Payout recorded", description: `Marked as paid to ${payTarget.name}.`, color: "success" });
      setPayTarget(null);
      setPayAmount("");
      setNote("");
    } catch (err: any) {
      addToast({ title: "Payout failed", description: err?.message ?? "", color: "danger" });
    } finally {
      setBusy(false);
    }
  };

  const stores = data?.stores ?? [];

  return (
    <div className="flex flex-col gap-6">
      <Card className="border border-divider shadow-sm">
        <CardBody className="flex flex-row items-center gap-3 p-6">
          <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Wallet className="size-5" />
          </span>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Seller payouts</h1>
            <p className="text-sm text-foreground/60">
              Each seller&apos;s earnings (sale minus commission) and what you owe them. Click Pay to record a settlement.
            </p>
          </div>
        </CardBody>
      </Card>

      <Card className="border border-divider shadow-sm">
        <CardBody className="p-0">
          <Table removeWrapper aria-label="Seller payouts">
            <TableHeader>
              <TableColumn>Store</TableColumn>
              <TableColumn>Commission %</TableColumn>
              <TableColumn>Earned</TableColumn>
              <TableColumn>Paid out</TableColumn>
              <TableColumn>Balance</TableColumn>
              <TableColumn>Payout details</TableColumn>
              <TableColumn>{canWrite ? "Action" : ""}</TableColumn>
            </TableHeader>
            <TableBody
              isLoading={isLoading}
              loadingContent={<Spinner label="Loading payouts..." />}
              emptyContent="No stores yet."
            >
              {stores.map((store) => (
                <TableRow key={store.id}>
                  <TableCell>
                    <div className="font-medium">{store.name}</div>
                    <div className="text-xs text-foreground/50">{store.owner?.email ?? "—"}</div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Input
                        size="sm"
                        className="w-20"
                        value={commissionEdits[store.id] ?? String(store.commissionPercent)}
                        onValueChange={(v) => setCommissionEdits((c) => ({ ...c, [store.id]: v }))}
                        isDisabled={!canWrite}
                        endContent={<span className="text-xs text-foreground/50">%</span>}
                      />
                      {canWrite && commissionEdits[store.id] != null && commissionEdits[store.id] !== String(store.commissionPercent) ? (
                        <Button size="sm" variant="flat" onPress={() => saveCommission(store)}>
                          Save
                        </Button>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell className="tabular-nums">{money(store.earnedCents)}</TableCell>
                  <TableCell className="tabular-nums">{money(store.paidOutCents)}</TableCell>
                  <TableCell>
                    <span className="font-semibold tabular-nums text-primary">{money(store.balanceCents)}</span>
                  </TableCell>
                  <TableCell>
                    {store.hasDetails ? (
                      <Chip size="sm" color="success" variant="flat">On file</Chip>
                    ) : (
                      <Chip size="sm" variant="flat">Missing</Chip>
                    )}
                  </TableCell>
                  <TableCell>
                    {canWrite ? (
                      <Button
                        size="sm"
                        color="primary"
                        isDisabled={store.balanceCents <= 0}
                        onPress={() => {
                          setPayTarget(store);
                          setPayAmount((store.balanceCents / 100).toFixed(2));
                          setNote("");
                        }}
                      >
                        Pay
                      </Button>
                    ) : null}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardBody>
      </Card>

      <Modal isOpen={!!payTarget} onClose={() => setPayTarget(null)}>
        <ModalContent>
          <ModalHeader className="flex flex-col gap-1">
            Pay seller
            <span className="text-sm font-normal text-foreground/60">{payTarget?.name}</span>
          </ModalHeader>
          <ModalBody>
            <p className="text-sm text-foreground/60">
              Available balance: <strong>{payTarget ? money(payTarget.balanceCents) : ""}</strong>. Record the amount
              you&apos;re sending — this settles it against their balance.
            </p>
            {payTarget && !payTarget.hasDetails ? (
              <p className="rounded-lg bg-warning/10 px-3 py-2 text-xs text-warning">
                This seller hasn&apos;t added payout details yet.
              </p>
            ) : null}
            {payTarget?.payoutDetails || payTarget?.payoutAccountNumber ? (
              <div className="rounded-xl border border-divider bg-content2 p-3 text-xs text-foreground/70">
                {payTarget.payoutMethod ? <div>Method: {payTarget.payoutMethod}</div> : null}
                {payTarget.payoutBankName ? <div>Bank: {payTarget.payoutBankName}</div> : null}
                {payTarget.payoutAccountName ? <div>Name: {payTarget.payoutAccountName}</div> : null}
                {payTarget.payoutAccountNumber ? <div>Account: {payTarget.payoutAccountNumber}</div> : null}
                {payTarget.payoutRoutingNumber ? <div>Routing: {payTarget.payoutRoutingNumber}</div> : null}
                {payTarget.payoutDetails ? <div>Notes: {payTarget.payoutDetails}</div> : null}
              </div>
            ) : null}
            <Input
              type="number"
              label="Amount (USD)"
              value={payAmount}
              onValueChange={setPayAmount}
              startContent={<span className="text-foreground/50">$</span>}
            />
            <Input label="Note (optional)" value={note} onValueChange={setNote} placeholder="Transfer reference" />
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={() => setPayTarget(null)}>
              Cancel
            </Button>
            <Button color="primary" isLoading={busy} onPress={submitPay}>
              Record payout
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}
