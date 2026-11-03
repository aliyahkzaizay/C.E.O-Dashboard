import { useEffect, useId, useRef, useState } from "react";
import { previewMemberImport, saveMemberImport } from "../lib/memberImports";
import type { ImportIssue, ImportMapping, ImportPreview, ImportResult } from "../lib/memberImports";
import type { MemberInput } from "../lib/members";
import "./MemberImport.css";

type Props = { organizationId: string; identifierLabel: string; onClose: () => void; onImported: () => void };

/** Show row-specific feedback without hiding issues outside the preview sample. */
function ImportIssues({ issues }: { issues: ImportIssue[] }) {
  if (!issues.length) return null;
  return <details className="import-issues"><summary>Review {issues.length} {issues.length === 1 ? "issue" : "issues"}</summary><ul>{issues.map((issue, index) => <li key={index}>{issue.row ? `Row ${issue.row}: ` : ""}{issue.message}</li>)}</ul></details>;
}

/** Coordinate upload, mapping, review and explicit save; API details stay in memberImports. */
export default function MemberImport({ organizationId, identifierLabel, onClose, onImported }: Props) {
  const id = useId();
  const [file, setFile] = useState<File | null>(null);
  const [mapping, setMapping] = useState<ImportMapping>({});
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [mappingOpen, setMappingOpen] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const [reviewed, setReviewed] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [busy, setBusy] = useState<"preview" | "save" | null>(null);
  const [error, setError] = useState("");
  const request = useRef<AbortController | null>(null);
  const fields: [keyof MemberInput, string][] = [["name", "Name"], ["email", "Email"], ["external_member_id", identifierLabel], ["date_joined", "Date joined"], ["class_year", "Class year"]];
  useEffect(() => () => request.current?.abort(), []);

  /** Invalidate previous results whenever the selected file changes. */
  function chooseFile(next: File | null) {
    setFile(next); setMappingOpen(false); setPreview(null); setMapping({}); setReviewed(false); setResult(null); setError("");
    if (next && (!/\.(csv|xlsx)$/i.test(next.name) || next.size > 2 * 1024 * 1024)) {
      setFile(null); setError("Choose a CSV or XLSX file up to 2 MB.");
    }
  }

  /** Only a successfully reviewed, unchanged mapping may be submitted for saving. */
  async function run(save: boolean) {
    if (!file || request.current || (save && !reviewed)) return;
    const controller = new AbortController(); request.current = controller;
    setBusy(save ? "save" : "preview"); setError("");
    if (!save) setReviewed(false);
    try {
      if (save) {
        const saved = await saveMemberImport(organizationId, file, mapping, controller.signal);
        if (controller.signal.aborted) return;
        setResult(saved); setReviewed(false); onImported();
      } else {
        const checked = await previewMemberImport(organizationId, file, preview ? mapping : undefined, controller.signal);
        if (controller.signal.aborted) return;
        if (!preview) setMapping(checked.suggested_mapping);
        setPreview(checked); setReviewed(checked.mapping_issues.length === 0);
        setMappingOpen(checked.mapping_issues.length > 0);
      }
    } catch (error) {
      if (!controller.signal.aborted) {
        setError(error instanceof Error ? error.message : "Unable to import members.");
        if (save) { setReviewed(false); onImported(); }
      }
    } finally {
      if (!controller.signal.aborted) setBusy(null);
      request.current = null;
    }
  }

  const step = result ? 3 : preview ? 2 : 1;
  const remainingIssues = preview?.issues.filter(issue => issue.row === null || !preview.rows.some(row => row.row_number === issue.row)) ?? [];

  return <section className="member-import" aria-labelledby={`${id}-title`} aria-busy={!!busy}>
    <div className="import-heading">
      <div><h3 id={`${id}-title`}>Import members</h3><p>Add your roster from a spreadsheet.</p></div>
      <button type="button" disabled={!!busy} onClick={onClose} aria-label="Close import" className="import-close">×</button>
    </div>
    <ol className="import-steps" aria-label="Import progress">
      {["Upload", "Review", "Results"].map((label, index) => <li key={label} aria-current={step === index + 1 ? "step" : undefined} className={step >= index + 1 ? "is-current" : ""}><span>{index + 1}</span>{label}</li>)}
    </ol>
    <input ref={fileInput} id={`${id}-file`} className="import-file-input" type="file" accept=".csv,.xlsx" aria-label="Member file" disabled={!!busy} onChange={event => chooseFile(event.target.files?.[0] ?? null)} />
    <div className={preview ? "import-file-summary" : "import-upload"}>
      <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" /><path d="M14 3v6h6M8 13h8M8 17h5" /></svg>
      <div><strong>{file?.name ?? "Choose your member list"}</strong><p>{preview ? `${Math.max(1, Math.round((file?.size ?? 0) / 1024))} KB · CSV / XLSX` : "CSV or XLSX · Up to 2 MB · 2,000 rows"}</p></div>
      <button type="button" disabled={!!busy} onClick={() => fileInput.current?.click()}>{file ? "Change file" : "Choose file"}</button>
    </div>
    {!preview && <div className="import-stage">
      <p className="import-hint">Include a name and either email or external ID. Dates and class year are optional. For Excel, use the first sheet.</p>
      {file && <div className="import-footer"><button type="button" className="member-primary" disabled={!!busy} onClick={() => void run(false)}>{busy ? "Reading file…" : "Preview members"}</button></div>}
    </div>}
    {preview && !result && <div className="import-stage">
      <details className="import-column-matches" open={mappingOpen} onToggle={event => setMappingOpen(event.currentTarget.open)}>
        <summary>Check column matches <span>{preview.mapping_issues.length ? "Needs attention" : "Review or change"}</span></summary>
        <p>Choose which spreadsheet column belongs to each C.E.O. field.</p>
        <fieldset disabled={!!busy} className="import-mapping"><legend className="import-sr-only">Column matches</legend>
          {fields.map(([field, label]) => <div key={field}><label htmlFor={`${id}-${field}`}>{label}</label><select id={`${id}-${field}`} value={mapping[field] ?? ""} onChange={event => {
            const next = { ...mapping }; if (event.target.value) next[field] = event.target.value; else delete next[field];
            setMapping(next); setReviewed(false); setError("");
          }}><option value="">Not included</option>{preview.headers.map(header => <option key={header} value={header}>{header}</option>)}</select></div>)}
        </fieldset>
        {preview.mapping_issues.map((issue, index) => <p key={index} className="import-error">{issue.message}</p>)}
        <button type="button" disabled={!!busy} onClick={() => void run(false)}>{busy === "preview" ? "Checking rows…" : "Update preview"}</button>
      </details>
      {!reviewed && <p className="import-review-notice" role="status">Preview needs updating. <button type="button" disabled={!!busy} onClick={() => void run(false)}>Check rows</button></p>}
      {reviewed && <>
        <div className="import-counts" role="status"><span><strong>{preview.summary.ready}</strong> Ready to import</span><span><strong>{preview.summary.skipped}</strong> Duplicates</span><span><strong>{preview.summary.failed}</strong> Need fixes</span></div>
        <div className="import-preview-heading"><h4>Review members</h4><span>{preview.rows.length} of {preview.summary.total} rows</span></div>
        <div className="import-table" tabIndex={0} role="region" aria-label="Member import preview"><table><thead><tr><th scope="col">Row</th><th scope="col">Member</th><th scope="col">Email</th><th scope="col">{identifierLabel}</th><th scope="col">Review</th></tr></thead><tbody>
          {preview.rows.map(row => {
            // Invalid rows retain their mapped source values; only validated members can be saved.
            const values = row.member ?? row.source_values;
            return <tr key={row.row_number}>
              <td>{row.row_number}</td>
              <td><strong>{values.name || "—"}</strong>{values.date_joined && <small>Joined: {values.date_joined}</small>}{values.class_year && <small>Year: {values.class_year.replaceAll("_", " ")}</small>}</td>
              <td>{values.email || "—"}</td><td>{values.external_member_id || "—"}</td>
              <td><span className={`import-row-status ${row.status}`}>{row.status === "ready" ? "Ready" : row.status === "skipped" ? "Skipped" : "Needs fix"}</span>
                {row.issues.length > 0 && <ul className="import-row-issues">{row.issues.map((issue, index) => <li key={index}>{issue.message}</li>)}</ul>}
              </td>
            </tr>;
          })}
        </tbody></table></div>
        <ImportIssues issues={remainingIssues} />
        <div className="import-footer"><p>Only ready rows will be added.<br />Existing members stay unchanged.</p><button type="button" className="member-primary" disabled={!!busy || preview.summary.ready === 0} onClick={() => void run(true)}>{busy === "save" ? "Importing…" : `Import ${preview.summary.ready} ${preview.summary.ready === 1 ? "member" : "members"}`}</button></div>
      </>}
    </div>}
    {result && <div className="import-result import-stage"><span className="import-result-symbol" aria-hidden="true">{result.interrupted ? "!" : "✓"}</span><h4>{result.interrupted ? "Import interrupted" : "Import complete"}</h4><p role="status">{result.summary.created} created · {result.summary.skipped} skipped · {result.summary.failed} {result.interrupted ? "failed or unconfirmed" : "failed"}</p>{result.interrupted && <p>Some saves could not be confirmed. Check the roster and preview again before retrying.</p>}<ImportIssues issues={result.issues} /><div className="import-footer"><button type="button" onClick={() => { setResult(null); setReviewed(false); setMappingOpen(true); }}>Review file again</button><button type="button" className="member-primary" onClick={onClose}>Back to roster</button></div></div>}
    {error && <p className="import-error" role="alert">{error}</p>}
  </section>;
}
