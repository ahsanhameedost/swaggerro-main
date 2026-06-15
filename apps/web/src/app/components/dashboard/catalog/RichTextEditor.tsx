"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import "react-quill-new/dist/quill.snow.css";

type RichTextEditorProps = {
  value: string;
  placeholder?: string;
  toolbar?: "minimal" | "full";
  onChange: (html: string) => void;
};

type ReactQuillComponent = React.ComponentType<{
  ref?: React.Ref<unknown>;
  theme?: string;
  value?: string;
  placeholder?: string;
  modules?: Record<string, unknown>;
  formats?: string[];
  onChange?: (
    value: string,
    delta: unknown,
    source: string,
    editor: { getHTML?: () => string; getContents: () => unknown }
  ) => void;
}>;

export function RichTextEditor({
  value,
  placeholder = "Write product description",
  onChange,
  toolbar = "full"
}: RichTextEditorProps) {
  const [QuillComp, setQuillComp] = useState<ReactQuillComponent | null>(null);
  const quillRef = useRef<unknown>(null);

  useEffect(() => {
    let mounted = true;

    import("react-quill-new").then((mod) => {
      if (mounted) {
        setQuillComp(() => mod.default as ReactQuillComponent);
      }
    });

    return () => {
      mounted = false;
    };
  }, []);

  const modules = useMemo(
    () => ({
      toolbar:
        toolbar === "minimal"
          ? [
            ["bold", "italic", "underline"],
            [{ header: [1, 2, 3, false] }],
            [{ list: "ordered" }, { list: "bullet" }],
            ["link", "blockquote", "clean"]
          ]
          : [
            [{ header: [1, 2, 3, false] }],
            ["bold", "italic", "underline", "strike"],
            [{ color: [] }, { background: [] }],
            [{ script: "sub" }, { script: "super" }],
            [
              { list: "ordered" },
              { list: "bullet" },
              { indent: "-1" },
              { indent: "+1" }
            ],
            [{ align: [] }],
            ["link", "image", "blockquote", "code-block"],
            ["clean"]
          ]
    }),
    [toolbar]
  );

  const formats = useMemo(
    () => [
      "header",
      "bold",
      "italic",
      "underline",
      "strike",
      "color",
      "background",
      "script",
      "list",
      "indent",
      "align",
      "link",
      "image",
      "blockquote",
      "code-block"
    ],
    []
  );

  if (!QuillComp) {
    return (
      <div className="w-full rounded-lg border border-gray-200 p-3 text-gray-400">
        Loading editor…
      </div>
    );
  }

  return (
    <div className="w-full rounded-lg border border-gray-200">
      <QuillComp
        ref={quillRef}
        theme="snow"
        value={value || ""}
        placeholder={placeholder}
        modules={modules}
        formats={formats}
        onChange={(html) => onChange(html)}
      />
    </div>
  );
}