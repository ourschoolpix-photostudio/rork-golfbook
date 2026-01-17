import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
  ScrollView,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Camera, X, CheckCircle, AlertTriangle, XCircle } from 'lucide-react-native';
import { generateObject } from '@rork-ai/toolkit-sdk';
import { z } from 'zod';

interface Player {
  id: string;
  name: string;
  scoreTotal: number;
}

interface ScorecardVerificationModalProps {
  visible: boolean;
  onClose: () => void;
  players: Player[];
  groupLabel: string;
}

const verificationSchema = z.object({
  status: z.enum(['verified', 'mismatch', 'illegible']),
  message: z.string(),
  details: z.string().optional(),
});

type VerificationResult = z.infer<typeof verificationSchema>;

export default function ScorecardVerificationModal({
  visible,
  onClose,
  players,
  groupLabel,
}: ScorecardVerificationModalProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [imageUri, setImageUri] = useState<string | null>(null);

  const handleTakePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        setResult({
          status: 'illegible',
          message: 'Camera permission denied',
          details: 'Please enable camera access in settings',
        });
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        setImageUri(asset.uri);
        await verifyScorecard(asset.base64!);
      }
    } catch (error) {
      console.error('[ScorecardVerification] Error taking photo:', error);
      setResult({
        status: 'illegible',
        message: 'Failed to capture photo',
        details: 'Please try again',
      });
    }
  };

  const handleSelectFromGallery = async () => {
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
        await verifyScorecard(asset.base64!);
      }
    } catch (error) {
      console.error('[ScorecardVerification] Error selecting photo:', error);
      setResult({
        status: 'illegible',
        message: 'Failed to select photo',
        details: 'Please try again',
      });
    }
  };

  const verifyScorecard = async (base64Image: string) => {
    setIsAnalyzing(true);
    setResult(null);

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

      const verification = await generateObject({
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
      });

      console.log('[ScorecardVerification] Result:', verification);
      setResult(verification as any);
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
  };

  const handleClose = () => {
    setResult(null);
    setImageUri(null);
    onClose();
  };

  const getStatusIcon = () => {
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
            {!imageUri && !result && !isAnalyzing && (
              <View style={styles.actionsContainer}>
                <Text style={styles.instruction}>
                  Take a photo of the scorecard to verify scores
                </Text>
                
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={handleTakePhoto}
                >
                  <Camera size={24} color="#fff" />
                  <Text style={styles.actionButtonText}>Take Photo</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionButton, styles.secondaryButton]}
                  onPress={handleSelectFromGallery}
                >
                  <Text style={styles.actionButtonText}>Choose from Gallery</Text>
                </TouchableOpacity>

                <View style={styles.playersList}>
                  <Text style={styles.playersTitle}>Expected Scores:</Text>
                  {players.map((player) => (
                    <Text key={player.id} style={styles.playerScore}>
                      {player.name}: {player.scoreTotal ?? 0}
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
                  }}
                >
                  <Text style={styles.retryButtonText}>Verify Another</Text>
                </TouchableOpacity>
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
});
