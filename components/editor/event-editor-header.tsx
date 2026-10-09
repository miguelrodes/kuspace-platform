export function EventEditorHeader() {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <h1
        className="text-subheading uppercase"
        style={{
          color: "var(--accent-hex)",
          fontFamily: "var(--font-space-grotesk)",
          letterSpacing: "0.12em",
        }}
      >
        Event Editor
      </h1>
    </div>
  );
}
