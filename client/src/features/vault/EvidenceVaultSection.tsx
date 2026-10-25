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
  CheckCircle,
  Eye,
  EyeOff,
  Copy,
  Fingerprint,
} from 'lucide-react';
import { EvidenceItem, VerifyEvidenceResponse } from '@rakshasphere/shared';
import { apiClient } from '../../services/apiClient';
import { CryptoVaultService } from '../../services/cryptoVault.service';
import {
  Button,
  Card,
  CardHeader,
  CardBody,
  LoadingSpinner,
  ErrorAlert,
  useToast,
  Input,
} from '../../components/ui';

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

export const EvidenceVaultSection: React.FC<EvidenceVaultSectionProps> = ({ incidentId }) => {
  const toast = useToast();
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

  // Verification state
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [verificationResult, setVerificationResult] = useState<VerifyEvidenceResponse | null>(null);

  // Decryption state
  const [decryptingId, setDecryptingId] = useState<string | null>(null);
  const [decryptPassphrase, setDecryptPassphrase] = useState('');
  const [showDecryptPassphrase, setShowDecryptPassphrase] = useState(false);
  const [decryptError, setDecryptError] = useState<string | null>(null);
  const [isDecrypting, setIsDecrypting] = useState(false);

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
      toast.error(`Unsupported file format (${file.type}). Allowed: PNG, JPEG, WEBP, PDF, TXT.`);
      setSelectedFile(null);
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      toast.error('File exceeds maximum size limit of 10MB.');
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
    setError(null);
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || !uploadPassphrase) return;

    setIsEncrypting(true);
    setError(null);
    setUploadProgress('Encrypting file with AES-256-GCM in browser memory…');

    try {
      const arrayBuffer = await selectedFile.arrayBuffer();
      const encrypted = await CryptoVaultService.encrypt(arrayBuffer, uploadPassphrase);

      setUploadProgress('Transmitting ciphertext & cryptographic digest to secure vault…');

      await apiClient.vault.upload({
        incidentId,
        filename: selectedFile.name,
        mimeType: selectedFile.type,
        size: selectedFile.size,
        sha256: encrypted.sha256,
        ciphertextBase64: encrypted.ciphertextBase64,
        encryptionMetadata: encrypted.encryptionMetadata,
        userEnteredCaptureTime: captureTime ? new Date(captureTime).toISOString() : undefined,
      });

      toast.success(`"${selectedFile.name}" encrypted and safely preserved in Evidence Vault.`);
      setSelectedFile(null);
      setUploadPassphrase('');
      setCaptureTime('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      await fetchItems();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Encryption or vault upload failed.');
    } finally {
      setIsEncrypting(false);
      setUploadProgress(null);
    }
  };

  const handleVerify = async (item: EvidenceItem) => {
    setVerifyingId(item.id);
    setVerificationResult(null);
    try {
      const result = await apiClient.vault.verify(item.id);
      setVerificationResult(result);
      if (result.integrityStatus === 'VERIFIED') {
        toast.success(`Integrity verified! SHA-256 hash matches without tampering.`);
      } else {
        toast.error('Integrity verification failed: Hash mismatch detected.');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Verification failed.');
    } finally {
      setVerifyingId(null);
    }
  };

  const handleDecryptDownload = async (item: EvidenceItem) => {
    if (!decryptPassphrase) {
      setDecryptError('Please enter the encryption passphrase to decrypt.');
      return;
    }

    setIsDecrypting(true);
    setDecryptError(null);

    try {
      const ciphertextRecord = await apiClient.vault.getById(item.id);

      const { decryptedBytes, sha256Match } = await CryptoVaultService.decrypt(
        ciphertextRecord.ciphertextBase64,
        decryptPassphrase,
        ciphertextRecord.encryptionMetadata,
        ciphertextRecord.sha256
      );

      if (!sha256Match) {
        throw new Error('Integrity verification failed: Decrypted bytes do not match expected hash.');
      }

      const blob = new Blob([decryptedBytes], { type: item.mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = item.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success(`"${item.filename}" decrypted and downloaded.`);
      setDecryptingId(null);
      setDecryptPassphrase('');
    } catch (err) {
      setDecryptError(err instanceof Error ? err.message : 'Decryption failed: Incorrect passphrase or corrupted data.');
    } finally {
      setIsDecrypting(false);
    }
  };

  const handleDelete = async (id: string, filename: string) => {
    if (!window.confirm(`Permanently remove "${filename}" from the Evidence Vault?`)) return;

    try {
      await apiClient.vault.delete(id);
      toast.success(`Evidence item "${filename}" deleted.`);
      await fetchItems();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete evidence item.');
    }
  };

  const copyHash = (hash: string) => {
    navigator.clipboard.writeText(hash).catch(() => {});
    toast.info('SHA-256 checksum copied to clipboard.');
  };

  return (
    <div className="space-y-6">
      {/* Zero-Knowledge Privacy Architecture Notice */}
      <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200/90 rounded-2xl p-4 sm:p-5 flex items-start gap-3 shadow-xs">
        <div className="w-9 h-9 rounded-xl bg-purple-600 text-white flex items-center justify-center flex-shrink-0">
          <Lock className="w-5 h-5" />
        </div>
        <div className="space-y-1">
          <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            Zero-Knowledge Cryptographic Vault Architecture
            <span className="text-[10px] font-semibold bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full border border-purple-200">
              AES-256-GCM + PBKDF2
            </span>
          </h4>
          <p className="text-xs text-slate-600 leading-relaxed">
            All screenshots, chat logs, and PDFs are encrypted directly inside your browser before transmission.
            The server and database store strictly encrypted ciphertext blocks — your secret passphrase never leaves your device.
          </p>
        </div>
      </div>

      {error && <ErrorAlert message={error} onDismiss={() => setError(null)} />}

      {/* Upload Dropzone Card */}
      <Card className="border-slate-200/90 shadow-subtle">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Fingerprint className="w-4 h-4 text-purple-600" />
            <h3 className="text-sm font-bold text-slate-900">Upload &amp; Encrypt Evidence</h3>
          </div>
        </CardHeader>
        <CardBody className="p-5 sm:p-6">
          <form onSubmit={handleUpload} className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700">
                Select Evidence File <span className="text-rose-500">*</span>
              </label>
              <div className="flex items-center gap-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileChange}
                  accept={ALLOWED_MIME_TYPES.join(',')}
                  className="text-xs text-slate-600 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100 cursor-pointer"
                  required
                />
              </div>
              <p className="text-[11px] text-slate-400">
                Supported formats: PNG, JPEG, WEBP, GIF, PDF, TXT (Maximum file size: 10MB).
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Client-Side Encryption Passphrase"
                type={showUploadPassphrase ? 'text' : 'password'}
                placeholder="Enter secret passphrase…"
                value={uploadPassphrase}
                onChange={(e) => setUploadPassphrase(e.target.value)}
                hint="Never stored on server. You must remember this to decrypt."
                rightElement={
                  <button
                    type="button"
                    onClick={() => setShowUploadPassphrase(!showUploadPassphrase)}
                    className="text-slate-400 hover:text-slate-600 p-1"
                    aria-label={showUploadPassphrase ? 'Hide passphrase' : 'Show passphrase'}
                  >
                    {showUploadPassphrase ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                }
                required
              />

              <Input
                label="Evidence Capture Timestamp (Optional)"
                type="datetime-local"
                value={captureTime}
                onChange={(e) => setCaptureTime(e.target.value)}
                hint="Date when screenshot or recording occurred."
              />
            </div>

            {uploadProgress && (
              <div className="flex items-center gap-2 text-xs text-purple-700 bg-purple-50 border border-purple-200 rounded-xl p-3">
                <LoadingSpinner size="xs" />
                <span className="font-medium">{uploadProgress}</span>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={!selectedFile || !uploadPassphrase || isEncrypting}
                isLoading={isEncrypting}
                leftIcon={<Upload className="w-3.5 h-3.5" />}
              >
                Encrypt &amp; Preserve in Vault
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>

      {/* Evidence Items List */}
      <Card className="border-slate-200/90 shadow-subtle">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-indigo-600" />
              <h3 className="text-sm font-bold text-slate-900">
                Preserved Evidence Items ({items.length})
              </h3>
            </div>
            <Button size="xs" variant="outline" onClick={fetchItems}>
              Refresh Vault
            </Button>
          </div>
        </CardHeader>
        <CardBody className="p-0">
          {isLoading ? (
            <div className="p-8 text-center">
              <LoadingSpinner message="Checking vault inventory…" size="md" />
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-12 px-4 text-slate-400 text-xs">
              No evidence items preserved for this incident yet. Upload screenshots or documents above.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {items.map((item) => {
                const isSelectedForDecrypt = decryptingId === item.id;
                const isVerifying = verifyingId === item.id;

                return (
                  <div key={item.id} className="p-4 sm:p-5 space-y-3 hover:bg-slate-50/50 transition">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-bold text-slate-900 truncate">
                            {item.filename}
                          </span>
                          <span className="text-[10px] font-semibold bg-purple-50 text-purple-700 border border-purple-200 px-2 py-0.5 rounded-full">
                            AES-256-GCM Encrypted
                          </span>
                          <span className="text-[10px] text-slate-500">
                            ({(item.size / 1024).toFixed(1)} KB)
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400">
                          Preserved: {new Date(item.createdAt).toLocaleString()} • MIME: {item.mimeType}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Button
                          size="xs"
                          variant="outline"
                          onClick={() => handleVerify(item)}
                          disabled={isVerifying}
                          isLoading={isVerifying}
                          leftIcon={<ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />}
                        >
                          Verify Hash
                        </Button>

                        <Button
                          size="xs"
                          variant="outline"
                          onClick={() => {
                            setDecryptingId(isSelectedForDecrypt ? null : item.id);
                            setDecryptPassphrase('');
                            setDecryptError(null);
                          }}
                          leftIcon={<Download className="w-3.5 h-3.5 text-indigo-600" />}
                        >
                          {isSelectedForDecrypt ? 'Cancel Decrypt' : 'Decrypt & Download'}
                        </Button>

                        <button
                          type="button"
                          onClick={() => handleDelete(item.id, item.filename)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                          title="Delete from vault"
                          aria-label={`Delete ${item.filename}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* SHA-256 Fingerprint */}
                    <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-2.5 flex items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                          SHA-256:
                        </span>
                        <span className="font-mono text-[11px] text-slate-700 truncate select-all">
                          {item.sha256}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => copyHash(item.sha256)}
                        className="text-slate-400 hover:text-indigo-600 p-1 flex-shrink-0"
                        title="Copy SHA-256 checksum"
                        aria-label="Copy hash"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Verification Result Pill */}
                    {verificationResult && verificationResult.evidenceId === item.id && (
                      <div
                        className={`text-xs p-2.5 rounded-xl border flex items-center gap-2 ${
                          verificationResult.integrityStatus === 'VERIFIED'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : 'bg-rose-50 text-rose-800 border-rose-200'
                        }`}
                      >
                        {verificationResult.integrityStatus === 'VERIFIED' ? (
                          <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                        )}
                        <span>
                          {verificationResult.integrityStatus === 'VERIFIED'
                            ? 'SHA-256 integrity verified: Stored digest matches server ciphertext without corruption.'
                            : 'Integrity compromised: Hash mismatch or corruption detected.'}
                        </span>
                      </div>
                    )}

                    {/* Inline Decryption Drawer */}
                    {isSelectedForDecrypt && (
                      <div className="bg-indigo-50/70 border border-indigo-200/90 rounded-xl p-3.5 space-y-3 animate-fade-in">
                        <div className="flex items-center gap-2 text-xs font-bold text-indigo-950">
                          <Key className="w-3.5 h-3.5 text-indigo-600" />
                          <span>Decrypt "{item.filename}" (Processed In-Browser)</span>
                        </div>

                        {decryptError && <ErrorAlert message={decryptError} onDismiss={() => setDecryptError(null)} />}

                        <div className="flex gap-2">
                          <Input
                            type={showDecryptPassphrase ? 'text' : 'password'}
                            placeholder="Enter the encryption passphrase…"
                            value={decryptPassphrase}
                            onChange={(e) => setDecryptPassphrase(e.target.value)}
                            className="bg-white text-xs"
                            rightElement={
                              <button
                                type="button"
                                onClick={() => setShowDecryptPassphrase(!showDecryptPassphrase)}
                                className="text-slate-400 hover:text-slate-600 p-1"
                              >
                                {showDecryptPassphrase ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                              </button>
                            }
                          />
                          <Button
                            size="sm"
                            variant="primary"
                            onClick={() => handleDecryptDownload(item)}
                            disabled={!decryptPassphrase || isDecrypting}
                            isLoading={isDecrypting}
                          >
                            Decrypt
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
};
