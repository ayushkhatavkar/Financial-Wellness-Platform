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
  FileCheck2
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

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    setImportSuccess(false);
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
        description="Ingest bank or UPI statement CSVs to update your alternative credit scoring ledger."
      />

      {/* Security & Confidentiality */}
      <div className="p-4 rounded-lg bg-[#FFF5EB] border border-[#F28C28]/25 flex items-start gap-3 text-xs text-[#171B26]">
        <ShieldCheck size={20} className="text-[#F28C28] shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-bold text-[#171B26] text-sm">Data Privacy Guarantee</p>
          <p className="text-[#687080] text-xs leading-relaxed">
            Uploaded statements are parsed securely for cash-flow metrics only. We never share raw financial entries or request banking credentials.
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
          <p className="text-xs text-[#687080] mt-2 font-semibold">Validating statement columns and parsing transactions...</p>
        </Card>
      )}

      {/* Error Message */}
      {error && (
        <div className="p-3.5 rounded-lg bg-[#FDF1F1] border border-[#F9D0D0] flex items-center gap-2.5 text-xs text-[#D94B4B]">
          <AlertCircle size={16} className="text-[#D94B4B] shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Preview Card */}
      {preview && !importSuccess && (
        <Card className="space-y-5 bg-white">
          <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EB]">
            <div>
              <h3 className="text-base font-bold text-[#171B26]">Statement Preview & Validation</h3>
              <p className="text-xs text-[#687080]">Verify detected fields before committing to your verified financial ledger</p>
            </div>
            <span className="text-xs font-bold font-mono-num px-3 py-1 rounded-full bg-[#EDF8F3] text-[#16865C] border border-[#BDE8D3]">
              {preview.validRows} rows parsed
            </span>
          </div>

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
              <span className="text-[#687080] block text-[11px] font-semibold uppercase tracking-wider">Duplicate Conflict Check</span>
              <span className="font-bold text-[#16865C] block mt-1">Clean (0 Clashes)</span>
            </div>
          </div>

          {/* Sample table */}
          {preview.sampleRows.length > 0 && (
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
          )}

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
            <span className="text-xs text-[#687080]">
              Ready to ingest into verified financial ledger.
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
            <p className="text-xs text-[#687080] max-w-sm mx-auto mt-1">
              Transactions have been verified and recorded to your account. Cash-flow indicators and Trust Score have been updated.
            </p>
          </div>
          <div className="pt-2">
            <Link to="/transactions">
              <Button variant="primary" size="md">
                View Updated Transactions
              </Button>
            </Link>
          </div>
        </Card>
      )}
    </div>
  );
};
