import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  UploadCloud, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw,
  ArrowRight,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Sparkles,
  ExternalLink
} from 'lucide-react';
import { financialService } from '../services/financialService';
import { StatementUploadPreview } from '../types';
import { Card, PageHeader, Button } from '../components/common';

export const UploadStatementPage: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [preview, setPreview] = useState<StatementUploadPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState(false);
  const [importedReport, setImportedReport] = useState<any | null>(null);
  const [showAllAlerts, setShowAllAlerts] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    setImportSuccess(false);
    setImportedReport(null);
    const selected = e.target.files?.[0];
    if (!selected) return;

    if (!selected.name.endsWith('.csv')) {
      setError('Unsupported file type. Please upload a standard comma-separated CSV statement (.csv).');
      setFile(null);
      setPreview(null);
      return;
    }

    setFile(selected);
    setIsParsing(true);

    try {
      const result = await financialService.previewStatementCsv(selected);
      setPreview(result);
    } catch (err: any) {
      setError(err.message || 'Failed to parse the uploaded file on the server.');
      setPreview(null);
    } finally {
      setIsParsing(false);
    }
  };

  const handleSimulateCommit = async () => {
    if (!file) return;

    setIsParsing(true);
    setError(null);

    try {
      const res = await financialService.commitStatementImport(file);
      setIsParsing(false);
      setImportedReport(res.integrity_report);
      setImportSuccess(true);
    } catch (err: any) {
      setIsParsing(false);
      setError(err.message || 'Failed to ingest statement into database.');
    }
  };

  const integrityReport = preview?.integrity_report;
  const isReviewRecommended = integrityReport?.overall_status === 'REVIEW_RECOMMENDED';

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <PageHeader
        title="Upload Financial Statement"
        description="Ingest bank or UPI statement CSVs with automated FraudShield integrity analysis."
        actions={
          <Link to="/fraud-shield">
            <Button variant="outline" size="sm" icon={<ShieldAlert size={14} className="text-[#F28C28]" />}>
              Open FraudShield
            </Button>
          </Link>
        }
      />

      {/* Security & Confidentiality */}
      <div className="p-4 rounded-lg bg-[#FFF5EB] border border-[#F28C28]/25 flex items-start gap-3 text-xs text-[#171B26]">
        <ShieldCheck size={20} className="text-[#F28C28] shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-bold text-[#171B26] text-sm">Automated FraudShield Integrity Guard</p>
          <p className="text-[#687080] text-xs leading-relaxed">
            Uploaded records are screened in real time for duplicate UTRs, circular fund transfers, artificial bursts, and statistical income spikes before ingestion. Suspicious items are flagged for review rather than automatic rejection.
          </p>
        </div>
      </div>

      {/* Upload Zone Card */}
      <Card className="border-dashed border-2 border-[#E5E7EB] hover:border-[#F28C28] transition-colors text-center p-8 sm:p-12 space-y-4 bg-white">
        <div className="w-14 h-14 rounded-full bg-[#FFF5EB] text-[#F28C28] border border-[#F28C28]/20 flex items-center justify-center mx-auto shadow-sm">
          <UploadCloud size={28} />
        </div>

        <div>
          <h3 className="text-base font-bold text-[#171B26]">
            Upload your Bank or UPI statement (.csv)
          </h3>
          <p className="text-xs text-[#687080] mt-1">
            Compatible with PhonePe, Paytm, Google Pay, and standard bank export statements
          </p>
        </div>

        <div>
          <label className="inline-block cursor-pointer">
            <span className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#F28C28] hover:bg-[#DD7416] text-white text-xs sm:text-sm font-semibold shadow-[0_2px_6px_0_rgba(242,140,40,0.3)] transition-all cursor-pointer">
              <UploadCloud size={16} /> Browse Files
            </span>
            <input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>
        </div>

        {file && (
          <div className="inline-flex items-center gap-2.5 text-xs bg-[#F0F2F5] px-3.5 py-1.5 rounded-full border border-[#E5E7EB] text-[#171B26]">
            <FileText size={15} className="text-[#F28C28]" />
            <span className="font-semibold">{file.name}</span>
            <span className="text-[#687080] font-mono-num">({(file.size / 1024).toFixed(1)} KB)</span>
          </div>
        )}
      </Card>

      {/* Parsing Spinner */}
      {isParsing && (
        <Card className="text-center py-8">
          <RefreshCw className="animate-spin text-[#F28C28] mx-auto" size={24} />
          <p className="text-xs text-[#687080] mt-2 font-semibold">Running FraudShield integrity pipeline and validating transactions...</p>
        </Card>
      )}

      {/* Error Message */}
      {error && (
        <div className="p-3.5 rounded-lg bg-[#FDF1F1] border border-[#F9D0D0] flex items-center gap-2.5 text-xs text-[#D94B4B]">
          <AlertCircle size={16} className="text-[#D94B4B] shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Preview Card with FraudShield Integrity Card */}
      {preview && !importSuccess && (
        <Card className="space-y-5 bg-white">
          <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EB] flex-wrap gap-2">
            <div>
              <h3 className="text-base font-bold text-[#171B26]">Statement Preview & Validation</h3>
              <p className="text-xs text-[#687080]">Verify detected fields and FraudShield integrity checks before importing</p>
            </div>
            <span className="text-xs font-bold font-mono-num px-3 py-1 rounded-full bg-[#EDF8F3] text-[#16865C] border border-[#BDE8D3]">
              {preview.validRows} rows parsed
            </span>
          </div>

          {/* FraudShield Integrity Pre-Import Banner */}
          {integrityReport && (
            <div className={`p-4 rounded-xl border transition-all ${
              isReviewRecommended 
                ? 'bg-[#FEF9EC] border-[#D18A22]/30 text-[#171B26]' 
                : 'bg-[#EDF8F3] border-[#16865C]/25 text-[#171B26]'
            }`}>
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2.5">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                    isReviewRecommended ? 'bg-[#D18A22]/15 text-[#D18A22]' : 'bg-[#16865C]/15 text-[#16865C]'
                  }`}>
                    {isReviewRecommended ? <AlertTriangle size={18} /> : <ShieldCheck size={18} />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-[#171B26]">FraudShield Integrity Check:</span>
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                        isReviewRecommended 
                          ? 'bg-[#D18A22]/20 text-[#D18A22]' 
                          : 'bg-[#16865C]/20 text-[#16865C]'
                      }`}>
                        {integrityReport.overall_status.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <p className="text-xs text-[#687080] mt-0.5">
                      {integrityReport.summary_notes}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-semibold text-[#687080] block">Anomaly Indicator</span>
                    <span className="font-mono-num font-bold text-sm text-[#171B26]">
                      {integrityReport.anomaly_score.toFixed(1)} / 100
                    </span>
                  </div>
                </div>
              </div>

              {/* Expandable Alert Findings */}
              {integrityReport.alerts.length > 0 && (
                <div className="mt-3 pt-3 border-t border-black/5 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-[#171B26]">
                      {integrityReport.alerts.length} Detection Flag{integrityReport.alerts.length > 1 ? 's' : ''} Identified
                    </span>
                    <button
                      onClick={() => setShowAllAlerts(!showAllAlerts)}
                      className="text-[#F28C28] hover:text-[#DD7416] font-semibold flex items-center gap-1 text-[11px]"
                    >
                      {showAllAlerts ? 'Hide Details' : 'Inspect Alerts'}
                      {showAllAlerts ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                    </button>
                  </div>

                  {showAllAlerts && (
                    <div className="space-y-2 pt-1">
                      {integrityReport.alerts.map((alert, i) => (
                        <div key={i} className="p-2.5 rounded-lg bg-white border border-[#E5E7EB] text-xs space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-[#171B26]">{alert.rule_name}</span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                              alert.severity === 'HIGH' ? 'bg-[#FDF1F1] text-[#D94B4B]' :
                              alert.severity === 'MEDIUM' ? 'bg-[#FEF9EC] text-[#D18A22]' :
                              'bg-[#F0F2F5] text-[#687080]'
                            }`}>
                              {alert.severity} SEVERITY
                            </span>
                          </div>
                          <p className="text-[11px] text-[#687080]">{alert.explanation}</p>
                          {alert.affected_indices && alert.affected_indices.length > 0 && (
                            <span className="text-[10px] text-[#9299A5] block">
                              Affected rows in file: {alert.affected_indices.map(idx => `#${idx + 1}`).join(', ')}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 text-xs">
            <div className="p-3.5 bg-[#F0F2F5] rounded-lg border border-[#E5E7EB]">
              <span className="text-[#687080] block text-[11px] font-semibold uppercase tracking-wider">Filename</span>
              <span className="font-bold text-[#171B26] truncate block mt-1">{preview.filename}</span>
            </div>
            <div className="p-3.5 bg-[#F0F2F5] rounded-lg border border-[#E5E7EB]">
              <span className="text-[#687080] block text-[11px] font-semibold uppercase tracking-wider">Columns Detected</span>
              <span className="font-bold text-[#171B26] block mt-1 font-mono-num">{preview.detectedColumns.length} fields</span>
            </div>
            <div className="p-3.5 bg-[#F0F2F5] rounded-lg border border-[#E5E7EB]">
              <span className="text-[#687080] block text-[11px] font-semibold uppercase tracking-wider">Flagged Entries</span>
              <span className={`font-bold block mt-1 font-mono-num ${integrityReport && integrityReport.flagged_count > 0 ? 'text-[#D18A22]' : 'text-[#16865C]'}`}>
                {integrityReport?.flagged_count || 0} items for review
              </span>
            </div>
          </div>

          {/* Sample table preview with row indicators */}
          {preview.parsed_records && preview.parsed_records.length > 0 ? (
            <div className="border border-[#E5E7EB] rounded-lg overflow-hidden">
              <div className="p-2.5 bg-[#F0F2F5] text-[11px] font-semibold text-[#687080] border-b border-[#E5E7EB] flex items-center justify-between">
                <span>Parsed Transactions Preview</span>
                <span className="text-[10px] text-[#9299A5]">Showing first {Math.min(10, preview.parsed_records.length)} of {preview.parsed_records.length} records</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F7F8FA] text-[#687080] border-b border-[#E5E7EB] font-semibold text-[11px]">
                    <tr>
                      <th className="py-2.5 px-3 whitespace-nowrap">Row</th>
                      <th className="py-2.5 px-3 whitespace-nowrap">Date</th>
                      <th className="py-2.5 px-3 whitespace-nowrap">Description</th>
                      <th className="py-2.5 px-3 whitespace-nowrap">Type</th>
                      <th className="py-2.5 px-3 whitespace-nowrap">Amount</th>
                      <th className="py-2.5 px-3 whitespace-nowrap text-right">Integrity Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E7EB] text-[#171B26]">
                    {preview.parsed_records.slice(0, 10).map((r, i) => (
                      <tr key={i} className={`hover:bg-[#F7F8FA] transition-colors ${r.is_flagged ? 'bg-[#FEF9EC]/40' : ''}`}>
                        <td className="py-2 px-3 font-mono-num text-[11px] text-[#687080]">#{r.row_number}</td>
                        <td className="py-2 px-3 font-mono-num text-[11px] whitespace-nowrap">{r.transaction_date}</td>
                        <td className="py-2 px-3 text-[11px] truncate max-w-[200px]">{r.description}</td>
                        <td className="py-2 px-3 whitespace-nowrap">
                          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                            r.transaction_type === 'CREDIT' ? 'bg-[#EDF8F3] text-[#16865C]' : 'bg-[#F0F2F5] text-[#171B26]'
                          }`}>
                            {r.transaction_type}
                          </span>
                        </td>
                        <td className="py-2 px-3 font-mono-num font-bold text-[11px] whitespace-nowrap">
                          ₹{Number(r.amount).toLocaleString('en-IN')}
                        </td>
                        <td className="py-2 px-3 text-right whitespace-nowrap">
                          {r.is_flagged ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#D18A22] bg-[#FEF9EC] px-2 py-0.5 rounded border border-[#D18A22]/20">
                              <AlertTriangle size={10} /> Review Flag
                            </span>
                          ) : (
                            <span className="text-[10px] font-semibold text-[#16865C] bg-[#EDF8F3] px-2 py-0.5 rounded">
                              Clear
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : preview.sampleRows.length > 0 ? (
            <div className="border border-[#E5E7EB] rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F0F2F5] text-[#687080] border-b border-[#E5E7EB] font-semibold">
                    <tr>
                      {preview.detectedColumns.slice(0, 5).map((h, i) => (
                        <th key={i} className="py-2.5 px-3.5 whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E7EB] text-[#171B26]">
                    {preview.sampleRows.map((r, i) => (
                      <tr key={i} className="hover:bg-[#F7F8FA]">
                        {preview.detectedColumns.slice(0, 5).map((h, ci) => (
                          <td key={ci} className="py-2.5 px-3.5 truncate max-w-[150px] font-mono-num text-[11px]">
                            {String(r[h] ?? '')}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
            <span className="text-xs text-[#687080]">
              {isReviewRecommended
                ? 'Flagged transactions will be recorded with "Pending Review" status for safety.'
                : 'All integrity checks passed. Ready to commit to verified financial ledger.'}
            </span>
            <Button
              variant="primary"
              size="md"
              onClick={handleSimulateCommit}
              icon={<ArrowRight size={15} />}
            >
              Confirm & Ingest Statement
            </Button>
          </div>
        </Card>
      )}

      {/* Success Notification */}
      {importSuccess && (
        <Card className="text-center py-10 space-y-4 bg-[#EDF8F3] border-[#BDE8D3]">
          <div className="w-14 h-14 rounded-full bg-white text-[#16865C] border border-[#BDE8D3] flex items-center justify-center mx-auto shadow-sm">
            <CheckCircle2 size={32} />
          </div>
          <div>
            <h3 className="text-base font-bold text-[#16865C]">Statement Ingested Successfully</h3>
            <p className="text-xs text-[#687080] max-w-md mx-auto mt-1">
              Transactions have been recorded to your verified account. FraudShield integrity logs have been updated.
            </p>
          </div>

          {importedReport && (
            <div className="max-w-md mx-auto p-3 bg-white rounded-lg border border-[#BDE8D3] text-xs text-left space-y-1.5">
              <div className="flex justify-between items-center">
                <span className="text-[#687080]">FraudShield Verdict:</span>
                <span className="font-bold text-[#171B26]">{importedReport.overall_status}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#687080]">Flagged for Manual Review:</span>
                <span className="font-mono-num font-bold text-[#D18A22]">{importedReport.flagged_count} records</span>
              </div>
            </div>
          )}

          <div className="pt-2 flex flex-wrap justify-center gap-3">
            <Link to="/transactions">
              <Button variant="outline" size="sm">
                View Ledger Transactions
              </Button>
            </Link>
            <Link to="/fraud-shield">
              <Button variant="primary" size="sm" icon={<ExternalLink size={14} />}>
                Review in FraudShield
              </Button>
            </Link>
          </div>
        </Card>
      )}
    </div>
  );
};
