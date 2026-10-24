import React, { useState, useEffect, useRef } from 'react';
import {
  Lock,
  ShieldCheck,
  Upload,
  FileCheck,
  AlertTriangle,
  Download,
  Trash2,
  Key,
  Info,
  CheckCircle,
  FileText,
  Eye,
  EyeOff,
  Copy,
  Check,
} from 'lucide-react';
import { EvidenceItem, VerifyEvidenceResponse } from '@rakshasphere/shared';
import { apiClient } from '../../services/apiClient';
import { CryptoVaultService } from '../../services/cryptoVault.service';
import { Button } from '../../components/ui/Button';
import { Card, CardHeader, CardBody } from '../../components/ui/Card';
import { LoadingSpinner } from '../../components/ui/Loading';

interface EvidenceVaultSectionProps {
  incidentId: string;
}

const ALLOWED_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
  'application/pdf',
  'text/plain',
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export const EvidenceVaultSection: React.FC<EvidenceVaultSectionProps> = ({
  incidentId,
}) => {
  const [items, setItems] = useState<EvidenceItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadPassphrase, setUploadPassphrase] = useState('');
  const [showUploadPassphrase, setShowUploadPassphrase] = useState(false);
  const [captureTime, setCaptureTime] = useState('');
  const [isEncrypting, setIsEncrypting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);

  // Verification state
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [verificationResult, setVerificationResult] = useState<VerifyEvidenceResponse | null>(null);

  // Decryption state
  const [decryptingId, setDecryptingId] = useState<string | null>(null);
  const [decryptPassphrase, setDecryptPassphrase] = useState('');
  const [showDecryptPassphrase, setShowDecryptPassphrase] = useState(false);
  const [decryptError, setDecryptError] = useState<string | null>(null);
  const [isDecrypting, setIsDecrypting] = useState(false);

  // Copied hash state
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const fetchItems = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiClient.vault.listByIncident(incidentId);
      setItems(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load evidence items');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, [incidentId]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (!file) return;

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      setError(
        `Unsupported file type (${file.type || 'unknown'}). Supported: PNG, JPEG, WEBP, GIF, PDF, TXT.`
      );
      setSelectedFile(null);
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setError('File size exceeds the 10MB limit.');
      setSelectedFile(null);
      return;
    }

    setError(null);
    setSelectedFile(file);
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;

    if (uploadPassphrase.length < 8) {
      setError('Passphrase must be at least 8 characters long for client-side key derivation.');
      return;
    }

    try {
      setIsEncrypting(true);
      setError(null);
      setUploadSuccess(null);
      setUploadProgress('Reading file into browser memory...');

      const arrayBuffer = await selectedFile.arrayBuffer();

      setUploadProgress('Deriving 256-bit AES-GCM key with PBKDF2 (600,000 rounds)...');
      // Yield to UI loop
      await new Promise((resolve) => setTimeout(resolve, 50));

      setUploadProgress('Encrypting file content client-side...');
      const { ciphertextBase64, sha256, encryptionMetadata } =
        await CryptoVaultService.encrypt(arrayBuffer, uploadPassphrase);

      setUploadProgress('Storing encrypted ciphertext in vault...');
      await apiClient.vault.upload({
        incidentId,
        filename: selectedFile.name,
        mimeType: selectedFile.type,
        size: selectedFile.size,
        sha256,
        ciphertextBase64,
        encryptionMetadata,
        userEnteredCaptureTime: captureTime ? new Date(captureTime).toISOString() : undefined,
      });

      setUploadSuccess(`"${selectedFile.name}" successfully encrypted and stored.`);
      setSelectedFile(null);
      setUploadPassphrase('');
      setCaptureTime('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      await fetchItems();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Encryption or upload failed');
    } finally {
      setIsEncrypting(false);
      setUploadProgress(null);
    }
  };

  const handleVerify = async (item: EvidenceItem) => {
    setVerifyingId(item.id);
    setVerificationResult(null);
    try {
      const res = await apiClient.vault.verify(item.id);
      setVerificationResult(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Integrity verification failed');
    } finally {
      setVerifyingId(null);
    }
  };

  const handleStartDecrypt = (item: EvidenceItem) => {
    setDecryptingId(item.id);
    setDecryptPassphrase('');
    setDecryptError(null);
  };

  const handleConfirmDecrypt = async (item: EvidenceItem) => {
    if (!decryptPassphrase) {
      setDecryptError('Please enter your vault passphrase.');
      return;
    }

    setIsDecrypting(true);
    setDecryptError(null);

    try {
      // 1. Fetch encrypted item with ciphertext
      const encryptedItem = await apiClient.vault.getById(item.id);

      // 2. Decrypt client-side and verify SHA-256 against recorded digest
      const { decryptedBytes, sha256Match } = await CryptoVaultService.decrypt(
        encryptedItem.ciphertextBase64,
        decryptPassphrase,
        encryptedItem.encryptionMetadata,
        encryptedItem.sha256
      );

      if (!sha256Match) {
        throw new Error(
          'Integrity alert: Decrypted data does not match the original SHA-256 intake digest.'
        );
      }

      // 3. Trigger in-browser download without ever persisting plaintext to disk/server
      const blob = new Blob([decryptedBytes], { type: item.mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = item.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      // Clean up object URL after download has been scheduled in browser
      setTimeout(() => URL.revokeObjectURL(url), 5000);

      setDecryptingId(null);
      setDecryptPassphrase('');
    } catch (err) {
      setDecryptError(
        err instanceof Error
          ? err.message
          : 'Decryption failed. Please verify your passphrase.'
      );
    } finally {
      setIsDecrypting(false);
    }
  };

  const handleDelete = async (id: string, filename: string) => {
    if (!window.confirm(`Are you sure you want to delete "${filename}" from the vault? This cannot be undone.`)) {
      return;
    }

    try {
      await apiClient.vault.delete(id);
      await fetchItems();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete evidence item');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedHash(text);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <Card className="border-indigo-200 shadow-sm overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-indigo-50 to-slate-50 border-b border-indigo-100 pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-indigo-600" />
            <h2 className="text-base font-semibold text-slate-800">
              Evidence Vault (Client-Side Encrypted)
            </h2>
          </div>
          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
            Phase 4 — Zero-Knowledge
          </span>
        </div>
        <p className="text-xs text-slate-500 mt-1">
          Evidence is encrypted directly in your browser using AES-GCM (PBKDF2 100k rounds) before upload.
          Your passphrase is never sent to or stored on our servers.
        </p>
      </CardHeader>

      <CardBody className="space-y-6">
        {/* Loss of Key Notice */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800 flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold">Important Security Notice: Passphrase Recovery</p>
            <p className="text-amber-700 leading-relaxed">
              Because encryption is client-side and zero-knowledge, RakshaSphere has no access to your
              passphrase or raw files. <strong>If you lose your passphrase, encrypted evidence cannot be recovered by anyone.</strong>
            </p>
          </div>
        </div>

        {/* Error / Success Banners */}
        {error && (
          <div className="bg-rose-50 border border-rose-200 rounded-lg p-3 text-xs text-rose-700 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-500 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {uploadSuccess && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-xs text-emerald-700 flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
            <span>{uploadSuccess}</span>
          </div>
        )}

        {/* Upload Form */}
        <form onSubmit={handleUpload} className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            <Upload className="w-4 h-4 text-indigo-600" />
            <span>Securely Encrypt & Upload Evidence</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Select File (Max 10MB)
              </label>
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileChange}
                accept=".png,.jpg,.jpeg,.webp,.gif,.pdf,.txt"
                disabled={isEncrypting}
                className="block w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer"
              />
              <p className="text-[11px] text-slate-400 mt-1">Supported: Images, PDF, Text</p>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Optional: Event Capture Date & Time
              </label>
              <input
                type="datetime-local"
                value={captureTime}
                onChange={(e) => setCaptureTime(e.target.value)}
                disabled={isEncrypting}
                className="w-full text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Client-Side Encryption Passphrase (Min 8 characters)
            </label>
            <div className="relative">
              <input
                type={showUploadPassphrase ? 'text' : 'password'}
                placeholder="Enter a strong passphrase to encrypt this file"
                value={uploadPassphrase}
                onChange={(e) => setUploadPassphrase(e.target.value)}
                disabled={isEncrypting}
                className="w-full text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 pr-8 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              <button
                type="button"
                onClick={() => setShowUploadPassphrase(!showUploadPassphrase)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showUploadPassphrase ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Required for in-browser PBKDF2 derivation. Will never leave your device.
            </p>
          </div>

          {uploadProgress && (
            <div className="flex items-center gap-2 text-xs text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-lg p-2.5">
              <LoadingSpinner size="sm" />
              <span>{uploadProgress}</span>
            </div>
          )}

          <div className="flex justify-end">
            <Button
              type="submit"
              variant="primary"
              disabled={!selectedFile || uploadPassphrase.length < 8 || isEncrypting}
              className="text-xs bg-indigo-600 hover:bg-indigo-700"
            >
              {isEncrypting ? 'Encrypting & Uploading...' : 'Encrypt & Store File'}
            </Button>
          </div>
        </form>

        {/* Verification Result Banner */}
        {verificationResult && (
          <div className="bg-slate-50 border border-indigo-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span className="text-xs font-semibold text-slate-800">
                  Cryptographic Integrity Verification
                </span>
              </div>
              <span
                className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                  verificationResult.integrityStatus === 'VERIFIED'
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-rose-100 text-rose-700'
                }`}
              >
                {verificationResult.integrityStatus}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-slate-400 block text-[11px]">Plaintext SHA-256 (At Intake):</span>
                <code className="font-mono text-slate-700 break-all">{verificationResult.storedSha256}</code>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Ciphertext SHA-256 (Storage):</span>
                <code className="font-mono text-slate-700 break-all">{verificationResult.ciphertextSha256}</code>
              </div>
            </div>

            <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-2.5 text-[11px] text-indigo-900 leading-relaxed">
              <Info className="w-3.5 h-3.5 inline mr-1 text-indigo-600" />
              {verificationResult.disclaimer}
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setVerificationResult(null)}
                className="text-xs text-slate-500 hover:text-slate-700 underline"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* Stored Evidence Items List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-indigo-600" />
              Stored Encrypted Files ({items.length})
            </h3>
            <button
              type="button"
              onClick={fetchItems}
              className="text-xs text-indigo-600 hover:underline"
            >
              Refresh
            </button>
          </div>

          {isLoading ? (
            <div className="py-6 flex justify-center">
              <LoadingSpinner size="md" />
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-6 border border-dashed border-slate-200 rounded-xl text-slate-400 text-xs">
              No evidence files attached to this incident yet. Use the form above to add encrypted items.
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-sm space-y-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-indigo-600" />
                      <span className="text-xs font-semibold text-slate-800 break-all">
                        {item.filename}
                      </span>
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                        {item.mimeType}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-slate-400 font-mono">
                        {formatBytes(item.size)}
                      </span>
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => handleVerify(item)}
                        disabled={verifyingId === item.id}
                        className="text-xs py-1 px-2.5 h-auto flex items-center gap-1 border-slate-200"
                      >
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                        <span>{verifyingId === item.id ? 'Checking...' : 'Verify Hash'}</span>
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => handleStartDecrypt(item)}
                        className="text-xs py-1 px-2.5 h-auto flex items-center gap-1 border-slate-200"
                      >
                        <Download className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Decrypt & Download</span>
                      </Button>
                      <button
                        type="button"
                        onClick={() => handleDelete(item.id, item.filename)}
                        className="text-slate-400 hover:text-rose-600 p-1"
                        title="Delete from vault"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* SHA-256 fingerprint & metadata */}
                  <div className="bg-slate-50 border border-slate-100 rounded-lg p-2 text-xs flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 max-w-full">
                      <span className="text-[11px] font-medium text-slate-500 flex-shrink-0">
                        Plaintext SHA-256:
                      </span>
                      <code className="font-mono text-[11px] text-slate-700 truncate max-w-xs md:max-w-md">
                        {item.sha256}
                      </code>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(item.sha256)}
                        className="text-slate-400 hover:text-slate-600 flex-shrink-0"
                        title="Copy SHA-256 hash"
                      >
                        {copiedHash === item.sha256 ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                    <span className="text-[11px] text-slate-400">
                      Uploaded {new Date(item.serverReceivedAt).toLocaleDateString()}
                    </span>
                  </div>

                  {/* Decrypt Prompt Inline */}
                  {decryptingId === item.id && (
                    <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-900">
                          <Key className="w-3.5 h-3.5 text-indigo-600" />
                          <span>Enter Passphrase to Decrypt "{item.filename}"</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setDecryptingId(null)}
                          className="text-[11px] text-slate-400 hover:text-slate-600"
                        >
                          Cancel
                        </button>
                      </div>

                      <div className="relative">
                        <input
                          type={showDecryptPassphrase ? 'text' : 'password'}
                          placeholder="Vault passphrase"
                          value={decryptPassphrase}
                          onChange={(e) => setDecryptPassphrase(e.target.value)}
                          disabled={isDecrypting}
                          className="w-full text-xs border border-indigo-300 rounded-lg px-2.5 py-1.5 pr-8 focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                        />
                        <button
                          type="button"
                          onClick={() => setShowDecryptPassphrase(!showDecryptPassphrase)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                          {showDecryptPassphrase ? (
                            <EyeOff className="w-3.5 h-3.5" />
                          ) : (
                            <Eye className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>

                      {decryptError && (
                        <p className="text-[11px] text-rose-600">{decryptError}</p>
                      )}

                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() => setDecryptingId(null)}
                          className="text-xs py-1 px-3"
                        >
                          Cancel
                        </Button>
                        <Button
                          type="button"
                          variant="primary"
                          onClick={() => handleConfirmDecrypt(item)}
                          disabled={isDecrypting || !decryptPassphrase}
                          className="text-xs py-1 px-3 bg-indigo-600 hover:bg-indigo-700"
                        >
                          {isDecrypting ? 'Decrypting in memory...' : 'Decrypt & Download'}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Technical & Legal Limitations Card */}
        <div className="border border-slate-200 rounded-lg p-3 bg-slate-50 text-[11px] text-slate-500 leading-relaxed space-y-1">
          <p className="font-semibold text-slate-700">Cryptographic Integrity vs. Legal Proof</p>
          <p>
            A cryptographic hash (SHA-256) proves that a file’s content matches the exact byte sequence
            calculated during intake without alteration. However, an integrity hash does <strong>not</strong> prove
            who authored the original file, when real-world events transpired, or legal admissibility in a court of law.
          </p>
        </div>
      </CardBody>
    </Card>
  );
};
