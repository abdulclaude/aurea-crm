import type { ContentLibraryPayload } from "@/features/content-settings/contracts";
import { visibleFaqEntries } from "@/features/content-settings/lib/runtime-content";

export function PayloadPreview({ payload }: { payload: ContentLibraryPayload }): React.JSX.Element {
  if (payload.kind === "TERMINOLOGY_PACK") {
    return <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">{payload.terms.map((term) => <div key={term.key}><dt className="text-muted-foreground">{term.key}</dt><dd>{term.label} / {term.pluralLabel}</dd></div>)}</dl>;
  }
  if (payload.kind === "FAQ_COLLECTION") {
    const entries = visibleFaqEntries(payload);
    return <div className="space-y-3">{entries.length ? entries.map((entry) => <div key={entry.id}><p className="text-sm font-medium">{entry.question}</p><p className="whitespace-pre-wrap text-xs text-muted-foreground">{entry.answer}</p></div>) : <p className="text-xs text-muted-foreground">No visible questions.</p>}</div>;
  }
  if (payload.kind === "MESSAGE_MACRO") {
    return <div className="space-y-2"><p className="text-xs text-muted-foreground">{payload.channel} · {payload.isActive ? "Available" : "Disabled"}</p><p className="whitespace-pre-wrap text-sm">{payload.content}</p></div>;
  }
  return <div className="space-y-2"><h3 className="text-base font-semibold">{payload.displayName}</h3>{payload.summary ? <p className="whitespace-pre-wrap text-sm text-muted-foreground">{payload.summary}</p> : null}<div className="text-xs"><p>{payload.email}</p><p>{payload.phone}</p><p>{payload.websiteUrl}</p></div></div>;
}
