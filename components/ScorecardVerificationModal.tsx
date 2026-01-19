import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
  ScrollView,
  Platform,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { X, CheckCircle, AlertTriangle, XCircle, ScanLine, ClipboardCheck, ImageIcon } from 'lucide-react-native';
import { generateObject } from '@rork-ai/toolkit-sdk';
import { z } from 'zod';

type ScanMode = 'verify' | 'scanOnly';

interface Player {
  id: string;
  name: string;
  scoreTotal: number;
}

interface ExtractedScore {
  name: string;
  holes: number[];
  total: number;
}

interface ScorecardVerificationModalProps {
  visible: boolean;
  onClose: () => void;
  players: Player[];
  groupLabel: string;
  onScoresExtracted?: (scores: ExtractedScore[]) => void;
}

const verificationSchema = z.object({
  status: z.enum(['verified', 'mismatch', 'illegible']),
  message: z.string(),
  details: z.string().optional(),
});

const scanOnlySchema = z.object({
  status: z.enum(['success', 'partial', 'illegible']),
  message: z.string(),
  players: z.array(z.object({
    name: z.string(),
    holes: z.array(z.number()),
    total: z.number(),
  })),
});

type VerificationResult = z.infer<typeof verificationSchema>;
type ScanOnlyResult = z.infer<typeof scanOnlySchema>;

export default function ScorecardVerificationModal({
  visible,
  onClose,
  players,
  groupLabel,
  onScoresExtracted,
}: ScorecardVerificationModalProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [scanResult, setScanResult] = useState<ScanOnlyResult | null>(null);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [scanMode, setScanMode] = useState<ScanMode>('verify');
  const [showCamera, setShowCamera] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<any>(null);

  useEffect(() => {
    if (!visible) {
      setShowCamera(false);
    }
  }, [visible]);

  const handleStopCamera = useCallback(() => {
    setShowCamera(false);
  }, []);

  const verifyScorecard = useCallback(async (base64Image: string) => {
    if (isAnalyzing) return;
    
    setIsAnalyzing(true);
    setResult(null);
    setScanResult(null);

    try {
      const playerScores = players
        .filter(p => p.scoreTotal !== undefined && p.scoreTotal !== null)
        .map(p => `${p.name}: ${p.scoreTotal}`)
        .join(', ');

      const prompt = `You are verifying a golf scorecard photo. 

Current scores in the app for ${groupLabel}:
${playerScores}

Your task:
1. Check if the scorecard is legible (can you read the handwriting/numbers?)
2. Verify the math on each player's row adds up correctly
3. Compare the totals on the scorecard with the app scores above

Return:
- status: "verified" if everything matches and math is correct
- status: "mismatch" if there's a math error or totals don't match the app
- status: "illegible" if you can't read the scorecard clearly
- message: A brief flag message (under 10 words)
- details: Optional. Only if status is "mismatch", specify which player or hole has an issue

Be quick and concise. We just need a simple flag, not a detailed analysis.`;

      const verification = (await generateObject({
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              { type: 'image', image: `data:image/jpeg;base64,${base64Image}` },
            ],
          },
        ],
        schema: verificationSchema as any,
      })) as VerificationResult;

      console.log('[ScorecardVerification] Result:', verification);
      setResult(verification);
      handleStopCamera();
    } catch (error) {
      console.error('[ScorecardVerification] Error analyzing:', error);
      setResult({
        status: 'illegible',
        message: 'Analysis failed',
        details: 'Please try again or check the photo quality',
      });
    } finally {
      setIsAnalyzing(false);
    }
  }, [isAnalyzing, players, groupLabel, handleStopCamera]);

  const scanScorecardOnly = useCallback(async (base64Image: string) => {
    if (isAnalyzing) return;
    
    setIsAnalyzing(true);
    setResult(null);
    setScanResult(null);

    try {
      const playerNames = players.map(p => p.name).join(', ');

      const prompt = `You are extracting golf scores from a scorecard photo.

Players in this group: ${playerNames}

Your task:
1. Read the hole-by-hole scores for each player (holes 1-18 or 1-9)
2. Calculate the total for each player by adding up their hole scores
3. Match names from the scorecard to the player names provided above

Return:
- status: "success" if you can read all scores clearly
- status: "partial" if some holes are hard to read but you got most
- status: "illegible" if you cannot read the scorecard
- message: Brief status message
- players: Array of player scores with:
  - name: Player name (match to the names above)
  - holes: Array of scores for each hole (use 0 if illegible)
  - total: Sum of all hole scores (you calculate this from the holes array)

IMPORTANT: Calculate the total yourself by adding up the hole scores. Do NOT use the written total on the scorecard.`;

      const scanResult = (await generateObject({
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              { type: 'image', image: `data:image/jpeg;base64,${base64Image}` },
            ],
          },
        ],
        schema: scanOnlySchema as any,
      })) as ScanOnlyResult;

      console.log('[ScorecardVerification] Scan result:', scanResult);
      setScanResult(scanResult);
      handleStopCamera();
    } catch (error) {
      console.error('[ScorecardVerification] Error scanning:', error);
      setScanResult({
        status: 'illegible',
        message: 'Scan failed - please try again',
        players: [],
      });
    } finally {
      setIsAnalyzing(false);
    }
  }, [isAnalyzing, players, handleStopCamera]);

  const captureAndAnalyze = useCallback(async () => {
    if (!cameraRef.current || isAnalyzing) return;

    try {
      console.log('[ScorecardVerification] Capturing frame for analysis...');
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.7,
        base64: true,
        skipProcessing: true,
      });

      if (photo && photo.base64) {
        setImageUri(photo.uri);
        if (scanMode === 'verify') {
          verifyScorecard(photo.base64);
        } else {
          scanScorecardOnly(photo.base64);
        }
      }
    } catch (error) {
      console.error('[ScorecardVerification] Error capturing frame:', error);
    }
  }, [isAnalyzing, scanMode, verifyScorecard, scanScorecardOnly]);



  const handleSelectFromGallery = useCallback(async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        setResult({
          status: 'illegible',
          message: 'Gallery permission denied',
          details: 'Please enable photo access in settings',
        });
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        setImageUri(asset.uri);
        if (scanMode === 'verify') {
          verifyScorecard(asset.base64!);
        } else {
          scanScorecardOnly(asset.base64!);
        }
      }
    } catch (error) {
      console.error('[ScorecardVerification] Error selecting photo:', error);
      setResult({
        status: 'illegible',
        message: 'Failed to select photo',
        details: 'Please try again',
      });
    }
  }, [scanMode, verifyScorecard, scanScorecardOnly]);

  const handleStartCamera = async () => {
    if (Platform.OS === 'web') {
      handleSelectFromGallery();
      return;
    }

    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) {
        setResult({
          status: 'illegible',
          message: 'Camera permission denied',
          details: 'Please enable camera access in settings',
        });
        return;
      }
    }

    setShowCamera(true);
  };

  const handleClose = () => {
    handleStopCamera();
    setResult(null);
    setScanResult(null);
    setImageUri(null);
    setScanMode('verify');
    setShowCamera(false);
    onClose();
  };

  const handleUseScannedScores = () => {
    if (scanResult && scanResult.players.length > 0 && onScoresExtracted) {
      onScoresExtracted(scanResult.players);
      handleClose();
    }
  };

  const getStatusIcon = () => {
    if (scanResult) {
      switch (scanResult.status) {
        case 'success':
          return <CheckCircle size={48} color="#4CAF50" />;
        case 'partial':
          return <AlertTriangle size={48} color="#FF9800" />;
        case 'illegible':
          return <XCircle size={48} color="#f44336" />;
      }
    }
    if (!result) return null;
    
    switch (result.status) {
      case 'verified':
        return <CheckCircle size={48} color="#4CAF50" />;
      case 'mismatch':
        return <AlertTriangle size={48} color="#FF9800" />;
      case 'illegible':
        return <XCircle size={48} color="#f44336" />;
    }
  };

  const getStatusColor = () => {
    if (scanResult) {
      switch (scanResult.status) {
        case 'success':
          return '#4CAF50';
        case 'partial':
          return '#FF9800';
        case 'illegible':
          return '#f44336';
      }
    }
    if (!result) return '#666';
    
    switch (result.status) {
      case 'verified':
        return '#4CAF50';
      case 'mismatch':
        return '#FF9800';
      case 'illegible':
        return '#f44336';
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <Text style={styles.title}>Verify Scorecard - {groupLabel}</Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <X size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body}>
            {showCamera && !result && !scanResult && (
              <View style={styles.cameraContainer}>
                <CameraView
                  ref={cameraRef}
                  style={styles.camera}
                  facing="back"
                />
                <View style={styles.scanOverlay}>
                  <View style={styles.scanFrame} />
                  <View style={styles.scanInstructions}>
                    <ScanLine size={32} color="#fff" />
                    <Text style={styles.scanInstructionsText}>
                      Position scorecard in frame
                    </Text>
                    <Text style={styles.scanInstructionsSubtext}>
                      Tap capture when ready
                    </Text>
                  </View>
                  <View style={styles.cameraButtons}>
                    <TouchableOpacity
                      style={styles.stopCameraBtn}
                      onPress={handleStopCamera}
                    >
                      <X size={20} color="#fff" />
                      <Text style={styles.stopCameraBtnText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.stopCameraBtn, styles.captureBtn]}
                      onPress={captureAndAnalyze}
                      disabled={isAnalyzing}
                    >
                      <ScanLine size={20} color="#fff" />
                      <Text style={styles.stopCameraBtnText}>
                        {isAnalyzing ? 'Analyzing...' : 'Capture'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}

            {!showCamera && !imageUri && !result && !scanResult && !isAnalyzing && (
              <View style={styles.actionsContainer}>
                <View style={styles.modeToggleContainer}>
                  <TouchableOpacity
                    style={[
                      styles.modeToggleBtn,
                      scanMode === 'verify' && styles.modeToggleBtnActive,
                    ]}
                    onPress={() => setScanMode('verify')}
                  >
                    <ClipboardCheck size={18} color={scanMode === 'verify' ? '#fff' : '#666'} />
                    <Text style={[
                      styles.modeToggleText,
                      scanMode === 'verify' && styles.modeToggleTextActive,
                    ]}>Verify</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.modeToggleBtn,
                      scanMode === 'scanOnly' && styles.modeToggleBtnActive,
                    ]}
                    onPress={() => setScanMode('scanOnly')}
                  >
                    <ScanLine size={18} color={scanMode === 'scanOnly' ? '#fff' : '#666'} />
                    <Text style={[
                      styles.modeToggleText,
                      scanMode === 'scanOnly' && styles.modeToggleTextActive,
                    ]}>Scan Only</Text>
                  </TouchableOpacity>
                </View>

                <Text style={styles.modeDescription}>
                  {scanMode === 'verify'
                    ? 'Compare scorecard totals with app scores'
                    : 'Extract hole-by-hole scores (app calculates totals)'}
                </Text>
                
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={handleStartCamera}
                >
                  <ScanLine size={24} color="#fff" />
                  <Text style={styles.actionButtonText}>
                    {Platform.OS === 'web' ? 'Choose Photo' : 'Start Scanner'}
                  </Text>
                </TouchableOpacity>

                {Platform.OS !== 'web' && (
                  <TouchableOpacity
                    style={[styles.actionButton, styles.secondaryButton]}
                    onPress={handleSelectFromGallery}
                  >
                    <ImageIcon size={24} color="#fff" />
                    <Text style={styles.actionButtonText}>Choose from Gallery</Text>
                  </TouchableOpacity>
                )}

                <View style={styles.playersList}>
                  <Text style={styles.playersTitle}>
                    {scanMode === 'verify' ? 'Expected Scores:' : 'Players in Group:'}
                  </Text>
                  {players.map((player) => (
                    <Text key={player.id} style={styles.playerScore}>
                      {scanMode === 'verify' 
                        ? `${player.name}: ${player.scoreTotal ?? 0}`
                        : player.name}
                    </Text>
                  ))}
                </View>
              </View>
            )}

            {isAnalyzing && (
              <View style={styles.analyzingContainer}>
                <ActivityIndicator size="large" color="#1B5E20" />
                <Text style={styles.analyzingText}>Analyzing scorecard...</Text>
                {imageUri && (
                  <Image source={{ uri: imageUri }} style={styles.previewImage} />
                )}
              </View>
            )}

            {result && !isAnalyzing && (
              <View style={styles.resultContainer}>
                <View style={styles.statusIconContainer}>
                  {getStatusIcon()}
                </View>
                
                <Text style={[styles.resultMessage, { color: getStatusColor() }]}>
                  {result.message}
                </Text>
                
                {result.details && (
                  <View style={styles.detailsContainer}>
                    <Text style={styles.detailsText}>{result.details}</Text>
                  </View>
                )}

                {imageUri && (
                  <Image source={{ uri: imageUri }} style={styles.resultImage} />
                )}

                <TouchableOpacity
                  style={styles.retryButton}
                  onPress={() => {
                    setResult(null);
                    setImageUri(null);
                    handleStartCamera();
                  }}
                >
                  <Text style={styles.retryButtonText}>Scan Another</Text>
                </TouchableOpacity>
              </View>
            )}

            {scanResult && !isAnalyzing && (
              <View style={styles.resultContainer}>
                <View style={styles.statusIconContainer}>
                  {getStatusIcon()}
                </View>
                
                <Text style={[styles.resultMessage, { color: getStatusColor() }]}>
                  {scanResult.message}
                </Text>
                
                {scanResult.players.length > 0 && (
                  <View style={styles.scannedScoresContainer}>
                    <Text style={styles.scannedScoresTitle}>Extracted Scores:</Text>
                    {scanResult.players.map((player, idx) => (
                      <View key={idx} style={styles.scannedPlayerRow}>
                        <Text style={styles.scannedPlayerName}>{player.name}</Text>
                        <View style={styles.scannedHolesRow}>
                          {player.holes.map((score, holeIdx) => (
                            <View key={holeIdx} style={styles.scannedHoleBox}>
                              <Text style={styles.scannedHoleNum}>{holeIdx + 1}</Text>
                              <Text style={styles.scannedHoleScore}>{score}</Text>
                            </View>
                          ))}
                        </View>
                        <Text style={styles.scannedPlayerTotal}>Total: {player.total}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {imageUri && (
                  <Image source={{ uri: imageUri }} style={styles.resultImage} />
                )}

                <View style={styles.scanResultButtons}>
                  {scanResult.players.length > 0 && onScoresExtracted && (
                    <TouchableOpacity
                      style={styles.useScoresButton}
                      onPress={handleUseScannedScores}
                    >
                      <Text style={styles.useScoresButtonText}>Use These Scores</Text>
                    </TouchableOpacity>
                  )}
                  
                  <TouchableOpacity
                    style={styles.retryButton}
                    onPress={() => {
                      setScanResult(null);
                      setImageUri(null);
                      handleStartCamera();
                    }}
                  >
                    <Text style={styles.retryButtonText}>Scan Another</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    width: '90%',
    maxHeight: '80%',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1B5E20',
    flex: 1,
  },
  closeButton: {
    padding: 4,
  },
  body: {
    padding: 20,
  },
  actionsContainer: {
    gap: 16,
  },
  instruction: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 8,
  },
  actionButton: {
    backgroundColor: '#1B5E20',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 8,
    gap: 8,
  },
  secondaryButton: {
    backgroundColor: '#4CAF50',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  playersList: {
    marginTop: 16,
    padding: 16,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  playersTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1B5E20',
    marginBottom: 8,
  },
  playerScore: {
    fontSize: 14,
    color: '#333',
    marginVertical: 2,
  },
  analyzingContainer: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 16,
  },
  analyzingText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  previewImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginTop: 16,
  },
  resultContainer: {
    alignItems: 'center',
    gap: 16,
  },
  statusIconContainer: {
    marginVertical: 16,
  },
  resultMessage: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  detailsContainer: {
    backgroundColor: '#fff3e0',
    padding: 12,
    borderRadius: 8,
    width: '100%',
  },
  detailsText: {
    fontSize: 14,
    color: '#e65100',
    textAlign: 'center',
  },
  resultImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginTop: 8,
  },
  retryButton: {
    backgroundColor: '#1B5E20',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginTop: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  modeToggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
    padding: 4,
    marginBottom: 12,
  },
  modeToggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  modeToggleBtnActive: {
    backgroundColor: '#1B5E20',
  },
  modeToggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  modeToggleTextActive: {
    color: '#fff',
  },
  modeDescription: {
    fontSize: 12,
    color: '#888',
    textAlign: 'center',
    marginBottom: 16,
    fontStyle: 'italic',
  },
  scannedScoresContainer: {
    width: '100%',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  scannedScoresTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1B5E20',
    marginBottom: 12,
  },
  scannedPlayerRow: {
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  scannedPlayerName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
  },
  scannedHolesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginBottom: 6,
  },
  scannedHoleBox: {
    width: 28,
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 4,
    padding: 2,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  scannedHoleNum: {
    fontSize: 8,
    color: '#888',
  },
  scannedHoleScore: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1B5E20',
  },
  scannedPlayerTotal: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1B5E20',
  },
  scanResultButtons: {
    gap: 8,
    width: '100%',
    marginTop: 8,
  },
  useScoresButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  useScoresButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  cameraContainer: {
    width: '100%',
    height: 400,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#000',
    position: 'relative',
  },
  camera: {
    width: '100%',
    height: '100%',
  },
  scanOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 32,
  },
  scanFrame: {
    width: '80%',
    height: 200,
    borderWidth: 3,
    borderColor: '#4CAF50',
    borderRadius: 12,
    backgroundColor: 'transparent',
  },
  scanInstructions: {
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  scanInstructionsText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  scanInstructionsSubtext: {
    color: '#ddd',
    fontSize: 12,
    textAlign: 'center',
  },
  cameraButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  stopCameraBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    gap: 8,
  },
  stopCameraBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  captureBtn: {
    backgroundColor: '#4CAF50',
  },
});
