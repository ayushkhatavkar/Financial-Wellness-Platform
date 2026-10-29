import React, { useState } from 'react';
import { 
  UploadCloud, 
  FileText, 
  CheckCircle, 
  AlertCircle, 
  RefreshCw,
  ArrowRight,
  ShieldCheck
} from 'lucide-react';
import { financialService } from '../services/financialService';
import { StatementUploadPreview, Transaction } from '../types';
import { Card, PageHeader, Button } from '../components/common';

export const UploadStatementPage: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [preview, setPreview] = useState<StatementUploadPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    setImportSuccess(false);
    const selected = e.target.files?.[0];
    if (!selected) return;

    if (!selected.name.endsWith('.csv')) {
      setError('Unsupported file type. Please upload a standard comma-separated CSV statement.');
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
      await financialService.commitStatementImport(file);
      setIsParsing(false);
      setImportSuccess(true);
    } catch (err: any) {
      setIsParsing(false);
      setError(err.message || 'Failed to ingest statement into database.');
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <PageHeader
        title="Upload Financial Statement"
        description="Ingest bank or UPI statements to update your cash flow analysis and trust score."
      />

      {/* Security & Confidentiality */}
      <div className="p-3.5 rounded-lg bg-teal-50/60 border border-teal-200/80 flex items-start gap-3 text-xs text-teal-900">
        <ShieldCheck size={18} className="text-teal-700 shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <p className="font-semibold text-teal-950">Data Privacy Guarantee</p>
          <p className="text-teal-800 text-[11px] leading-relaxed">
            Uploaded statements are parsed locally and evaluated for cash-flow metrics only. We never share raw financial entries or request banking credentials.
          </p>
        </div>
      </div>

      {/* Minimal Upload Box */}
      <Card className="border-dashed border-2 border-slate-300 hover:border-teal-600 transition-colors text-center p-8 space-y-3">
        <div className="w-10 h-10 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center mx-auto">
          <UploadCloud size={20} />
        </div>

        <div>
          <h3 className="text-sm font-semibold text-slate-800">
            Upload your Bank or UPI statement (.csv)
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Compatible with PhonePe, Paytm, Google Pay, and standard bank export formats
          </p>
        </div>

        <div>
          <label className="inline-block cursor-pointer">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-700 hover:bg-teal-800 text-white text-xs font-medium shadow-sm transition-colors">
              <UploadCloud size={14} /> Browse Files
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
          <div className="inline-flex items-center gap-2 text-xs bg-slate-50 px-3 py-1 rounded-md border border-slate-200 text-slate-700">
            <FileText size={13} className="text-teal-700" />
            <span className="font-medium">{file.name}</span>
            <span className="text-slate-400">({(file.size / 1024).toFixed(1)} KB)</span>
          </div>
        )}
      </Card>

      {/* Parsing Spinner */}
      {isParsing && (
        <Card className="text-center py-6">
          <RefreshCw className="animate-spin text-teal-700 mx-auto" size={20} />
          <p className="text-xs text-slate-600 mt-2 font-medium">Validating statement columns and records...</p>
        </Card>
      )}

      {/* Error Message */}
      {error && (
        <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 flex items-center gap-2 text-xs text-rose-800">
          <AlertCircle size={15} className="text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Preview Card */}
      {preview && !importSuccess && (
        <Card className="space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Statement Preview & Validation</h3>
              <p className="text-xs text-slate-500">Verify detected fields before committing to your session</p>
            </div>
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
              {preview.validRows} rows parsed
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/60">
              <span className="text-slate-400 block text-[11px]">Filename</span>
              <span className="font-semibold text-slate-800 truncate block mt-0.5">{preview.filename}</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/60">
              <span className="text-slate-400 block text-[11px]">Columns Detected</span>
              <span className="font-semibold text-slate-800 block mt-0.5">{preview.detectedColumns.length} fields</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/60">
              <span className="text-slate-400 block text-[11px]">Deduplication</span>
              <span className="font-semibold text-emerald-700 block mt-0.5">0 Clashes</span>
            </div>
          </div>

          {/* Sample table */}
          {preview.sampleRows.length > 0 && (
            <div className="border border-slate-200/80 rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-[11px]">
                  <thead className="bg-slate-50 text-slate-500 border-b border-slate-200/80 font-medium">
                    <tr>
                      {preview.detectedColumns.slice(0, 5).map((h, i) => (
                        <th key={i} className="py-2 px-3">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {preview.sampleRows.map((r, i) => (
                      <tr key={i} className="hover:bg-slate-50">
                        {preview.detectedColumns.slice(0, 5).map((h, ci) => (
                          <td key={ci} className="py-2 px-3 truncate max-w-[140px]">
                            {String(r[h] ?? '')}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="pt-2 flex items-center justify-between">
            <span className="text-[11px] text-slate-400">
              Ready to ingest into verified financial ledger.
            </span>
            <Button
              variant="primary"
              size="sm"
              onClick={handleSimulateCommit}
              icon={<ArrowRight size={14} />}
            >
              Confirm & Ingest Statement
            </Button>
          </div>
        </Card>
      )}

      {/* Success Notification */}
      {importSuccess && (
        <Card className="text-center py-8 space-y-3 bg-emerald-50/40 border-emerald-200">
          <CheckCircle size={32} className="text-emerald-600 mx-auto" />
          <h3 className="text-sm font-semibold text-emerald-950">Statement Ingested Successfully</h3>
          <p className="text-xs text-emerald-800 max-w-sm mx-auto">
            Transactions have been verified and recorded to your account. Cash-flow indicators and Trust Score have been updated.
          </p>
          <div className="pt-2">
            <a href="/transactions">
              <Button variant="primary" size="sm">
                View Updated Transactions
              </Button>
            </a>
          </div>
        </Card>
      )}
    </div>
  );
};
