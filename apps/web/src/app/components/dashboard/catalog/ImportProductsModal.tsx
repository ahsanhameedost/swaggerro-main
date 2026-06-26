"use client";

import { useRef, useState } from "react";
import {
  Button,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader
} from "@heroui/react";
import { addToast } from "@heroui/toast";
import { CheckCircle2, Download, FileUp, Loader2, Upload } from "lucide-react";
import {
  downloadProductsTemplate,
  importProductsCsv,
  type ProductImportResult
} from "@/modules/catalog/products/api";

export function ImportProductsModal({
  isOpen,
  onClose,
  onImported
}: {
  isOpen: boolean;
  onClose: () => void;
  onImported: () => void;
}) {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [csv, setCsv] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ProductImportResult | null>(null);

  const reset = () => {
    setFileName(null);
    setCsv(null);
    setResult(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const close = () => {
    reset();
    onClose();
  };

  const onFile = async (file: File) => {
    if (!/\.csv$/i.test(file.name) && file.type !== "text/csv") {
      addToast({ title: "Use a .csv file", color: "warning" });
      return;
    }
    setResult(null);
    setFileName(file.name);
    setCsv(await file.text());
  };

  const runImport = async () => {
    if (!csv) {
      addToast({ title: "Choose a CSV file first", color: "warning" });
      return;
    }
    setImporting(true);
    try {
      const res = await importProductsCsv(csv);
      setResult(res);
      onImported();
      addToast({
        title: "Import complete",
        description: `${res.created} created · ${res.updated} updated · ${res.errors.length} errors`,
        color: res.errors.length ? "warning" : "success"
      });
    } catch (error: any) {
      addToast({ title: "Import failed", description: error?.message ?? "", color: "danger" });
    } finally {
      setImporting(false);
    }
  };

  const getTemplate = async () => {
    try {
      const tpl = await downloadProductsTemplate();
      const blob = new Blob([tpl], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "products-template.csv";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (error: any) {
      addToast({ title: "Couldn't download template", description: error?.message ?? "", color: "danger" });
    }
  };

  return (
    <Modal isOpen={isOpen} onOpenChange={(open) => !open && close()} size="2xl" scrollBehavior="inside">
      <ModalContent>
        <ModalHeader className="flex flex-col gap-0">
          <span>Import products</span>
          <span className="text-sm font-normal text-foreground/55">
            Upload a CSV to create or update products (matched by slug, else by name).
          </span>
        </ModalHeader>
        <ModalBody>
          <div className="rounded-2xl border border-dashed border-divider p-6 text-center">
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void onFile(f);
              }}
            />
            <FileUp className="mx-auto size-8 text-foreground/40" />
            <p className="mt-2 text-sm text-foreground/70">
              {fileName ? <span className="font-medium text-foreground">{fileName}</span> : "No file selected"}
            </p>
            <Button
              className="mt-3"
              variant="flat"
              startContent={<Upload className="size-4" />}
              onPress={() => fileRef.current?.click()}
            >
              Choose CSV
            </Button>
          </div>

          <button
            type="button"
            onClick={getTemplate}
            className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
          >
            <Download className="size-4" /> Download CSV template
          </button>

          <div className="mt-3 rounded-xl bg-default-100 p-3 text-xs leading-relaxed text-foreground/60">
            Columns: <span className="font-mono">name, slug, shortDescription, description, status, category,
            basePrice, compareAtPrice, minQty, baseStock, currency, isPackaging, bulkPricingEnabled, imageUrl,
            tiers</span>. Tiers format: <span className="font-mono">1-24:18 | 25-99:17 | 100+:16</span>. Imports
            simple products (no variants).
          </div>

          {result ? (
            <div className="mt-4 rounded-2xl border border-divider p-4">
              <div className="flex items-center gap-2 font-semibold">
                <CheckCircle2 className="size-5 text-success" /> Import finished
              </div>
              <div className="mt-2 flex flex-wrap gap-4 text-sm">
                <span>Total: <b>{result.total}</b></span>
                <span className="text-success">Created: <b>{result.created}</b></span>
                <span className="text-primary">Updated: <b>{result.updated}</b></span>
                <span className="text-danger">Errors: <b>{result.errors.length}</b></span>
              </div>
              {result.errors.length ? (
                <div className="mt-3 max-h-40 overflow-auto rounded-lg bg-danger-50 p-2 text-xs">
                  {result.errors.map((e, i) => (
                    <div key={i} className="text-danger">
                      Row {e.row}{e.name ? ` (${e.name})` : ""}: {e.message}
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
        </ModalBody>
        <ModalFooter>
          <Button variant="flat" onPress={close}>
            {result ? "Done" : "Cancel"}
          </Button>
          <Button color="primary" onPress={runImport} isLoading={importing} isDisabled={!csv}>
            Import
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
