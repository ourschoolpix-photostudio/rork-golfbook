import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { X, ChevronDown, BookOpen, Users, UserPlus } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { PersonalGame } from '@/types';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface CreateGameModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (
    courseName: string,
    coursePar: number,
    holePars: number[],
    players: { name: string; handicap: number; strokesReceived?: number; strokeMode?: 'manual' | 'auto' | 'all-but-par3'; teamId?: 1 | 2; memberId?: string }[],
    gameType?: 'individual-net' | 'team-match-play' | 'wolf' | 'niners',
    matchPlayScoringType?: 'best-ball' | 'alternate-ball',
    strokeIndices?: number[],
    dollarAmount?: number,
    front9Bet?: number,
    back9Bet?: number,
    overallBet?: number,
    potBet?: number,
    potPlayers?: { name: string; handicap: number; memberId?: string }[],
    useHandicaps?: boolean
  ) => Promise<void>;
  editingGame?: PersonalGame | null;
}

export default function CreateGameModal({ visible, onClose, onSave, editingGame }: CreateGameModalProps) {
  const { currentUser } = useAuth();
  const [showCourseSelector, setShowCourseSelector] = useState<boolean>(false);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [courseName, setCourseName] = useState<string>('');
  const [coursePar, setCoursePar] = useState<string>('72');
  const [holePars, setHolePars] = useState<string[]>(new Array(18).fill(''));
  const [gameType, setGameType] = useState<'individual-net' | 'team-match-play' | 'wolf' | 'niners'>('individual-net');
  const [useHandicaps, setUseHandicaps] = useState<boolean>(true);
  const [matchPlayScoringType, setMatchPlayScoringType] = useState<'best-ball' | 'alternate-ball'>('best-ball');
  const [players, setPlayers] = useState<{ name: string; handicap: string; strokesReceived: string; strokesASide: string; strokeMode?: 'manual' | 'auto' | 'all-but-par3'; teamId?: 1 | 2 }[]>([
    { name: '', handicap: '', strokesReceived: '0', strokesASide: '0', strokeMode: 'manual' },
    { name: '', handicap: '', strokesReceived: '0', strokesASide: '0', strokeMode: 'manual' },
    { name: '', handicap: '', strokesReceived: '0', strokesASide: '0', strokeMode: 'manual' },
    { name: '', handicap: '', strokesReceived: '0', strokesASide: '0', strokeMode: 'manual' },
  ]);
  const [bettingAmount, setBettingAmount] = useState<string>('');
  const [front9Bet, setFront9Bet] = useState<string>('');
  const [back9Bet, setBack9Bet] = useState<string>('');
  const [overallBet, setOverallBet] = useState<string>('');
  const [potBet, setPotBet] = useState<string>('');
  const [potPlayers, setPotPlayers] = useState<{ name: string; handicap: string; memberId?: string }[]>([]);
  const [addedMainPlayersToPot, setAddedMainPlayersToPot] = useState<boolean>(false);
  const [showMemberPicker, setShowMemberPicker] = useState<boolean>(false);
  const [showPotPlayerPicker, setShowPotPlayerPicker] = useState<boolean>(false);
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [selectedPotMemberIds, setSelectedPotMemberIds] = useState<string[]>([]);
  const holeInputRefs = React.useRef<(TextInput | null)[]>([]);

  const coursesQuery = useQuery({
    queryKey: ['courses', currentUser?.id, 'admin'],
    queryFn: async () => {
      console.log('[CreateGameModal] Fetching courses for member:', currentUser?.id);
      let query = supabase.from('courses').select('*');
      
      query = query.eq('source_type', 'admin');
      query = query.order('name', { ascending: true });
      
      const { data, error } = await query;
      
      if (error) {
        console.error('[CreateGameModal] Error fetching courses:', error);
        throw new Error(`Failed to fetch courses: ${error.message}`);
      }

      const courses = data.map(course => ({
        id: course.id,
        name: course.name,
        par: course.par,
        holePars: course.hole_pars,
        strokeIndices: course.stroke_indices,
        slopeRating: course.slope_rating,
        courseRating: course.course_rating,
        memberId: course.member_id,
        isPublic: course.is_public,
        source: course.source_type,
        createdAt: course.created_at,
        updatedAt: course.updated_at,
      }));

      console.log('[CreateGameModal] Fetched courses:', courses.length);
      return courses;
    },
    enabled: !!currentUser?.id && visible,
  });

  const membersQuery = useQuery({
    queryKey: ['members'],
    queryFn: async () => {
      console.log('[CreateGameModal] Fetching members from Supabase...');
      const { data, error } = await supabase.from('members').select('*');
      
      if (error) throw error;
      
      const fetchedMembers = (data || []).map((m: any) => ({
        id: m.id,
        name: m.name || m.full_name || '',
        username: m.username || m.name || '',
        pin: m.pin || '',
        isAdmin: m.is_admin || false,
        rolexPoints: m.rolex_points || 0,
        email: m.email || '',
        phone: m.phone || '',
        handicap: m.handicap || 0,
        membershipType: m.membership_type || 'active',
        joinDate: m.join_date || new Date().toISOString().split('T')[0],
        createdAt: m.created_at || new Date().toISOString(),
        gender: m.gender,
        address: m.address,
        city: m.city,
        state: m.state,
        flight: m.flight,
        rolexFlight: m.rolex_flight,
        currentHandicap: m.current_handicap,
        dateOfBirth: m.date_of_birth,
        emergencyContactName: m.emergency_contact_name,
        emergencyContactPhone: m.emergency_contact_phone,
        profilePhotoUrl: m.profile_photo_url,
        adjustedHandicap: m.adjusted_handicap,
        ghin: m.ghin,
        boardMemberRoles: m.board_member_roles || [],
      }));
      
      console.log('[CreateGameModal] Fetched members:', fetchedMembers.length);
      return fetchedMembers;
    },
    enabled: visible,
  });

  const courses = coursesQuery.data || [];
  const members = React.useMemo(() => membersQuery.data || [], [membersQuery.data]);

  React.useEffect(() => {
    if (editingGame && visible) {
      setCourseName(editingGame.courseName);
      setCoursePar(editingGame.coursePar.toString());
      setHolePars(editingGame.holePars.map(p => p.toString()));
      setGameType(editingGame.gameType || 'individual-net');
      setUseHandicaps(editingGame.useHandicaps ?? true);
      setMatchPlayScoringType(editingGame.matchPlayScoringType || 'best-ball');
      setBettingAmount(editingGame.dollarAmount?.toString() || '');
      setFront9Bet(editingGame.front9Bet?.toString() || '');
      setBack9Bet(editingGame.back9Bet?.toString() || '');
      setOverallBet(editingGame.overallBet?.toString() || '');
      setPotBet(editingGame.potBet?.toString() || '');
      
      if (editingGame.potPlayers && editingGame.potPlayers.length > 0) {
        const mappedPotPlayers = editingGame.potPlayers.map(pp => ({
          name: pp.name,
          handicap: pp.handicap.toString(),
          memberId: pp.memberId,
        }));
        setPotPlayers(mappedPotPlayers);
        const potMemberIds = mappedPotPlayers
          .map(pp => pp.memberId)
          .filter(id => id !== undefined) as string[];
        setSelectedPotMemberIds(potMemberIds);
        setAddedMainPlayersToPot(true);
      }
      
      const mappedPlayers = editingGame.players.map(p => ({
        name: p.name,
        handicap: p.handicap.toString(),
        strokesReceived: (p.strokesReceived || 0).toString(),
        strokesASide: (editingGame.gameType === 'wolf' || editingGame.gameType === 'niners') ? (p.strokesReceived || 0).toString() : '0',
        strokeMode: p.strokeMode || 'manual',
        teamId: p.teamId,
      }));
      
      while (mappedPlayers.length < 4) {
        mappedPlayers.push({ name: '', handicap: '', strokesReceived: '0', strokesASide: '0', strokeMode: 'manual', teamId: undefined });
      }
      
      setPlayers(mappedPlayers);
      
      const memberIds = mappedPlayers
        .filter(p => p.name.trim() !== '')
        .map(p => {
          const member = members.find(m => m.name === p.name);
          return member?.id;
        })
        .filter(id => id !== undefined) as string[];
      setSelectedMemberIds(memberIds);
    } else if (!visible) {
      setSelectedCourseId(null);
      setCourseName('');
      setCoursePar('72');
      setHolePars(new Array(18).fill(''));
      setGameType('individual-net');
      setMatchPlayScoringType('best-ball');
      setUseHandicaps(true);
      setPlayers([
        { name: '', handicap: '', strokesReceived: '0', strokesASide: '0', strokeMode: 'manual' },
        { name: '', handicap: '', strokesReceived: '0', strokesASide: '0', strokeMode: 'manual' },
        { name: '', handicap: '', strokesReceived: '0', strokesASide: '0', strokeMode: 'manual' },
        { name: '', handicap: '', strokesReceived: '0', strokesASide: '0', strokeMode: 'manual' },
      ]);
      setBettingAmount('');
      setFront9Bet('');
      setBack9Bet('');
      setOverallBet('');
      setPotBet('');
      setPotPlayers([]);
      setSelectedMemberIds([]);
      setSelectedPotMemberIds([]);
      setShowMemberPicker(false);
      setShowPotPlayerPicker(false);
      setAddedMainPlayersToPot(false);
    }
  }, [editingGame, visible, members]);

  const handleSelectCourse = (courseId: string) => {
    const course = courses.find(c => c.id === courseId);
    if (course) {
      setSelectedCourseId(courseId);
      setCourseName(course.name);
      setCoursePar(course.par.toString());
      setHolePars(course.holePars.map((p: number) => p.toString()));
      setShowCourseSelector(false);
      
      if (course.strokeIndices && course.strokeIndices.length === 18 && (gameType === 'wolf' || gameType === 'niners')) {
        const updatedPlayers = players.map(p => ({
          ...p,
          strokeMode: 'auto' as const,
        }));
        setPlayers(updatedPlayers);
      }
    }
  };

  const selectedCourse = courses.find(c => c.id === selectedCourseId);
  const courseHasStrokeIndices = selectedCourse?.strokeIndices && selectedCourse.strokeIndices.length === 18;

  const handleClearCourse = () => {
    setSelectedCourseId(null);
    setCourseName('');
    setCoursePar('72');
    setHolePars(new Array(18).fill(''));
  };

  const handleHoleParChange = (index: number, value: string) => {
    if (value.length > 1) {
      return;
    }
    const updated = [...holePars];
    updated[index] = value;
    setHolePars(updated);

    if (value.length === 1 && index < 17) {
      setTimeout(() => {
        holeInputRefs.current[index + 1]?.focus();
      }, 50);
    }
  };

  const handlePlayerNameChange = (index: number, value: string) => {
    const updated = [...players];
    updated[index] = { ...updated[index], name: value };
    setPlayers(updated);
    
    const currentMemberId = selectedMemberIds[index];
    if (currentMemberId && value.trim() !== '') {
      const member = members.find(m => m.id === currentMemberId);
      if (member && member.name !== value) {
        const updatedIds = [...selectedMemberIds];
        updatedIds[index] = '';
        setSelectedMemberIds(updatedIds);
      }
    }
  };

  const handlePlayerHandicapChange = (index: number, value: string) => {
    if (value === '' || /^\d*\.?\d{0,1}$/.test(value)) {
      const updated = [...players];
      updated[index] = { ...updated[index], handicap: value };
      setPlayers(updated);
    }
  };

  const handlePlayerStrokesChange = (index: number, value: string) => {
    if (value === '' || /^\d+$/.test(value)) {
      const updated = [...players];
      updated[index] = { ...updated[index], strokesReceived: value };
      setPlayers(updated);
    }
  };

  const handlePlayerStrokesASideChange = (index: number, value: string) => {
    if (value === '' || /^\d+$/.test(value)) {
      const updated = [...players];
      updated[index] = { ...updated[index], strokesASide: value };
      setPlayers(updated);
    }
  };

  const handleStrokeModeChange = (index: number, mode: 'manual' | 'auto' | 'all-but-par3') => {
    const updated = [...players];
    updated[index] = { ...updated[index], strokeMode: mode };
    setPlayers(updated);
  };

  const handleTeamAssignment = (index: number, teamId: 1 | 2) => {
    const updated = [...players];
    updated[index] = { ...updated[index], teamId };
    setPlayers(updated);
  };

  const handleSelectMember = (memberId: string) => {
    const member = members.find(m => m.id === memberId);
    if (!member) return;

    let emptySlotIndex = players.findIndex(p => p.name.trim() === '');
    if (emptySlotIndex === -1) {
      emptySlotIndex = players.length;
    }

    const updated = [...players];
    if (emptySlotIndex >= updated.length) {
      updated.push({
        name: member.name,
        handicap: (member.handicap || 0).toString(),
        strokesReceived: '0',
        strokesASide: '0',
        strokeMode: 'manual',
      });
    } else {
      updated[emptySlotIndex] = {
        name: member.name,
        handicap: (member.handicap || 0).toString(),
        strokesReceived: '0',
        strokesASide: '0',
        strokeMode: 'manual',
      };
    }
    setPlayers(updated);

    const updatedIds = [...selectedMemberIds];
    updatedIds[emptySlotIndex] = memberId;
    setSelectedMemberIds(updatedIds);
  };

  const handleRemovePlayer = (index: number) => {
    const updated = [...players];
    updated.splice(index, 1);
    while (updated.length < 4) {
      updated.push({ name: '', handicap: '', strokesReceived: '0', strokesASide: '0', strokeMode: 'manual' });
    }
    setPlayers(updated);

    const updatedIds = [...selectedMemberIds];
    updatedIds.splice(index, 1);
    setSelectedMemberIds(updatedIds);
  };

  React.useEffect(() => {
    if (potBet && parseFloat(potBet) > 0 && !addedMainPlayersToPot) {
      const activePlayers = players.filter(p => p.name.trim() !== '');
      if (activePlayers.length > 0) {
        const mainPlayersAsPotPlayers = activePlayers.map(p => ({
          name: p.name,
          handicap: p.handicap,
          memberId: selectedMemberIds[players.indexOf(p)],
        }));
        setPotPlayers(mainPlayersAsPotPlayers);
        const mainPlayerMemberIds = activePlayers
          .map(p => selectedMemberIds[players.indexOf(p)])
          .filter(id => id);
        setSelectedPotMemberIds(mainPlayerMemberIds);
        setAddedMainPlayersToPot(true);
      }
    } else if (!potBet || parseFloat(potBet) === 0) {
      setAddedMainPlayersToPot(false);
    }
  }, [potBet, players, selectedMemberIds, addedMainPlayersToPot]);

  const handleSelectPotPlayer = (memberId: string) => {
    const member = members.find(m => m.id === memberId);
    if (!member) return;

    const updated = [...potPlayers];
    updated.push({
      name: member.name,
      handicap: (member.handicap || 0).toString(),
      memberId,
    });
    setPotPlayers(updated);

    const updatedIds = [...selectedPotMemberIds];
    updatedIds.push(memberId);
    setSelectedPotMemberIds(updatedIds);
  };

  const handlePotPlayerNameChange = (index: number, value: string) => {
    const updated = [...potPlayers];
    updated[index] = { ...updated[index], name: value };
    setPotPlayers(updated);
    
    const currentMemberId = selectedPotMemberIds[index];
    if (currentMemberId && value.trim() !== '') {
      const member = members.find(m => m.id === currentMemberId);
      if (member && member.name !== value) {
        const updatedIds = [...selectedPotMemberIds];
        updatedIds[index] = '';
        setSelectedPotMemberIds(updatedIds);
      }
    }
  };

  const handlePotPlayerHandicapChange = (index: number, value: string) => {
    if (value === '' || /^\d*\.?\d{0,1}$/.test(value)) {
      const updated = [...potPlayers];
      updated[index] = { ...updated[index], handicap: value };
      setPotPlayers(updated);
    }
  };

  const handleRemovePotPlayer = (index: number) => {
    const updated = [...potPlayers];
    updated.splice(index, 1);
    setPotPlayers(updated);

    const updatedIds = [...selectedPotMemberIds];
    updatedIds.splice(index, 1);
    setSelectedPotMemberIds(updatedIds);
  };

  const handleAddPotPlayer = () => {
    const updated = [...potPlayers];
    updated.push({ name: '', handicap: '', memberId: undefined });
    setPotPlayers(updated);
  };

  const handleSave = async () => {
    if (!courseName.trim()) {
      Alert.alert('Error', 'Please enter a course name');
      return;
    }

    const par = parseInt(coursePar, 10);
    if (isNaN(par) || par < 54 || par > 90) {
      Alert.alert('Error', 'Please enter a valid course par (54-90)');
      return;
    }

    const parsedHolePars = holePars.map(hp => parseInt(hp, 10) || 4);
    if (parsedHolePars.some(p => isNaN(p) || p < 3 || p > 6)) {
      Alert.alert('Error', 'All hole pars must be between 3 and 6');
      return;
    }

    const activePlayers = players.filter(p => p.name.trim() !== '');
    if (activePlayers.length === 0) {
      Alert.alert('Error', 'Please enter at least one player');
      return;
    }

    if (gameType === 'team-match-play') {
      if (activePlayers.length < 2) {
        Alert.alert('Error', 'Team match play requires at least 2 players');
        return;
      }

      const team1Players = activePlayers.filter(p => p.teamId === 1);
      const team2Players = activePlayers.filter(p => p.teamId === 2);

      if (team1Players.length === 0 || team2Players.length === 0) {
        Alert.alert('Error', 'Both teams must have at least one player');
        return;
      }

      if (team1Players.length !== team2Players.length) {
        Alert.alert('Error', 'Both teams must have the same number of players');
        return;
      }
    }

    const parsedPlayers = activePlayers.map(p => ({
      name: p.name.trim(),
      handicap: parseFloat(p.handicap) || 0,
      strokesReceived: (gameType === 'wolf' || gameType === 'niners') ? parseInt(p.strokesASide, 10) || 0 : parseInt(p.strokesReceived, 10) || 0,
      strokeMode: p.strokeMode || 'manual',
      teamId: gameType === 'team-match-play' ? p.teamId : undefined,
    }));

    console.log('[CreateGameModal] Creating game:', { 
      courseName, 
      par, 
      parsedPlayers, 
      gameType,
      matchPlayScoringType: gameType === 'team-match-play' ? matchPlayScoringType : undefined,
    });

    const parsedBettingAmount = bettingAmount && bettingAmount.trim() !== '' ? parseFloat(bettingAmount) : undefined;
    const parsedFront9Bet = front9Bet && front9Bet.trim() !== '' ? parseFloat(front9Bet) : undefined;
    const parsedBack9Bet = back9Bet && back9Bet.trim() !== '' ? parseFloat(back9Bet) : undefined;
    const parsedOverallBet = overallBet && overallBet.trim() !== '' ? parseFloat(overallBet) : undefined;
    const parsedPotBet = potBet && potBet.trim() !== '' ? parseFloat(potBet) : undefined;
    const parsedPotPlayers = potPlayers
      .filter(p => p.name.trim() !== '')
      .map(p => ({
        name: p.name.trim(),
        handicap: parseFloat(p.handicap) || 0,
        memberId: p.memberId,
      }));

    try {
      await onSave(
        courseName, 
        par, 
        parsedHolePars, 
        parsedPlayers,
        gameType,
        gameType === 'team-match-play' ? matchPlayScoringType : undefined,
        selectedCourse?.strokeIndices && selectedCourse.strokeIndices.length > 0 ? selectedCourse.strokeIndices : undefined,
        parsedBettingAmount,
        parsedFront9Bet,
        parsedBack9Bet,
        parsedOverallBet,
        parsedPotBet,
        parsedPotPlayers.length > 0 ? parsedPotPlayers : undefined,
        gameType === 'individual-net' ? useHandicaps : undefined
      );
      onClose();
    } catch (error) {
      console.error('[CreateGameModal] Error saving game:', error);
      Alert.alert('Error', `Failed to ${editingGame ? 'update' : 'create'} game`);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <View style={styles.modal}>
          <View style={styles.header}>
            <Text style={styles.title}>{editingGame ? 'Edit Game' : 'Create New Game'}</Text>
            <TouchableOpacity onPress={onClose}>
              <X size={24} color="#374151" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Game Type</Text>
              <View style={styles.gameTypeSelector}>
                <TouchableOpacity
                  style={[
                    styles.gameTypeButton,
                    gameType === 'individual-net' && styles.gameTypeButtonActive,
                  ]}
                  onPress={() => setGameType('individual-net')}
                >
                  <Text style={[
                    styles.gameTypeButtonText,
                    gameType === 'individual-net' && styles.gameTypeButtonTextActive,
                  ]}>
                    Individual Score
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.gameTypeButton,
                    gameType === 'team-match-play' && styles.gameTypeButtonActive,
                  ]}
                  onPress={() => setGameType('team-match-play')}
                >
                  <Text style={[
                    styles.gameTypeButtonText,
                    gameType === 'team-match-play' && styles.gameTypeButtonTextActive,
                  ]}>
                    Team Match Play
                  </Text>
                </TouchableOpacity>
              </View>
              <View style={styles.gameTypeSelector}>
                <TouchableOpacity
                  style={[
                    styles.gameTypeButton,
                    gameType === 'wolf' && styles.gameTypeButtonActive,
                  ]}
                  onPress={() => setGameType('wolf')}
                >
                  <Text style={[
                    styles.gameTypeButtonText,
                    gameType === 'wolf' && styles.gameTypeButtonTextActive,
                  ]}>
                    Wolf
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.gameTypeButton,
                    gameType === 'niners' && styles.gameTypeButtonActive,
                  ]}
                  onPress={() => setGameType('niners')}
                >
                  <Text style={[
                    styles.gameTypeButtonText,
                    gameType === 'niners' && styles.gameTypeButtonTextActive,
                  ]}>
                    Niners
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {gameType === 'individual-net' && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Handicap Settings</Text>
                <View style={styles.handicapToggleContainer}>
                  <TouchableOpacity
                    style={[styles.handicapToggle, useHandicaps && styles.handicapToggleActive]}
                    onPress={() => setUseHandicaps(true)}
                  >
                    <Text style={[styles.handicapToggleText, useHandicaps && styles.handicapToggleTextActive]}>
                      Use Handicaps
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.handicapToggle, !useHandicaps && styles.handicapToggleActive]}
                    onPress={() => setUseHandicaps(false)}
                  >
                    <Text style={[styles.handicapToggleText, !useHandicaps && styles.handicapToggleTextActive]}>
                      Strokes Per Side
                    </Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.handicapDescription}>
                  {useHandicaps ? 'Net scores will be calculated using player handicaps' : 'Manually assign strokes per side to each player'}
                </Text>
              </View>
            )}

            {gameType === 'team-match-play' && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Match Play Scoring Type</Text>
                <View style={styles.matchPlayTypeSelector}>
                  <TouchableOpacity
                    style={[
                      styles.matchPlayTypeCard,
                      matchPlayScoringType === 'best-ball' && styles.matchPlayTypeCardActive,
                    ]}
                    onPress={() => setMatchPlayScoringType('best-ball')}
                  >
                    <Text style={[
                      styles.matchPlayTypeTitle,
                      matchPlayScoringType === 'best-ball' && styles.matchPlayTypeTitleActive,
                    ]}>
                      Best Ball
                    </Text>
                    <Text style={styles.matchPlayTypeDescription}>
                      Best score from either team member wins the hole
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.matchPlayTypeCard,
                      matchPlayScoringType === 'alternate-ball' && styles.matchPlayTypeCardActive,
                    ]}
                    onPress={() => setMatchPlayScoringType('alternate-ball')}
                  >
                    <Text style={[
                      styles.matchPlayTypeTitle,
                      matchPlayScoringType === 'alternate-ball' && styles.matchPlayTypeTitleActive,
                    ]}>
                      Alternate Ball
                    </Text>
                    <Text style={styles.matchPlayTypeDescription}>
                      If any 2 players tie, other players determine winner
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Course Information</Text>
              
              {courses.length > 0 && (
                <TouchableOpacity
                  style={styles.courseSelector}
                  onPress={() => setShowCourseSelector(!showCourseSelector)}
                >
                  <BookOpen size={18} color="#1B5E20" />
                  <Text style={styles.courseSelectorText}>
                    {selectedCourseId ? 'Change Course' : 'Select Saved Course'}
                  </Text>
                  <ChevronDown size={18} color="#666" />
                </TouchableOpacity>
              )}

              {showCourseSelector && (
                <View style={styles.coursesList}>
                  {coursesQuery.isLoading ? (
                    <View style={styles.coursesLoading}>
                      <ActivityIndicator size="small" color="#1B5E20" />
                    </View>
                  ) : (
                    courses.map((course) => (
                      <TouchableOpacity
                        key={course.id}
                        style={styles.courseOption}
                        onPress={() => handleSelectCourse(course.id)}
                      >
                        <Text style={styles.courseOptionName}>{course.name}</Text>
                        <Text style={styles.courseOptionPar}>Par {course.par}</Text>
                      </TouchableOpacity>
                    ))
                  )}
                </View>
              )}

              {selectedCourseId && (
                <View style={styles.selectedCourseBadge}>
                  <Text style={styles.selectedCourseText}>Using saved course</Text>
                  <TouchableOpacity onPress={handleClearCourse}>
                    <Text style={styles.clearCourseText}>Clear</Text>
                  </TouchableOpacity>
                </View>
              )}

              <TextInput
                style={[styles.input, selectedCourseId && styles.inputDisabled]}
                placeholder="Course Name"
                placeholderTextColor="#999"
                value={courseName}
                onChangeText={setCourseName}
                editable={!selectedCourseId}
              />
              <TextInput
                style={[styles.input, selectedCourseId && styles.inputDisabled]}
                placeholder="Course Par"
                placeholderTextColor="#999"
                keyboardType="number-pad"
                value={coursePar}
                onChangeText={setCoursePar}
                editable={!selectedCourseId}
              />
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Hole Pars (1-18)</Text>
              {selectedCourseId && (
                <Text style={styles.holeParsNote}>Pre-filled from saved course</Text>
              )}
              <View style={styles.holeParsGrid}>
                {[0, 1, 2].map((rowIndex) => (
                  <View key={rowIndex} style={styles.holeParsRow}>
                    {holePars.slice(rowIndex * 6, rowIndex * 6 + 6).map((par, colIndex) => {
                      const index = rowIndex * 6 + colIndex;
                      return (
                        <View key={index} style={styles.holePar}>
                          <Text style={styles.holeLabel}>{index + 1}</Text>
                          <TextInput
                            ref={(ref) => {
                              holeInputRefs.current[index] = ref;
                            }}
                            style={[styles.holeInput, selectedCourseId && styles.holeInputDisabled]}
                            keyboardType="number-pad"
                            value={par}
                            onChangeText={(value) => handleHoleParChange(index, value)}
                            maxLength={1}
                            editable={!selectedCourseId}
                          />
                        </View>
                      );
                    })}
                  </View>
                ))}
              </View>
            </View>

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Players</Text>
                <TouchableOpacity
                  style={styles.memberPickerButton}
                  onPress={() => setShowMemberPicker(!showMemberPicker)}
                >
                  <Users size={16} color="#1B5E20" />
                  <Text style={styles.memberPickerButtonText}>Select from Members</Text>
                  <ChevronDown size={16} color="#1B5E20" />
                </TouchableOpacity>
              </View>

              {showMemberPicker && (
                <View style={styles.memberPickerContainer}>
                  {membersQuery.isLoading ? (
                    <View style={styles.memberPickerLoading}>
                      <ActivityIndicator size="small" color="#1B5E20" />
                    </View>
                  ) : (
                    <ScrollView style={styles.memberPickerList} nestedScrollEnabled>
                      {members
                        .filter(m => !selectedMemberIds.includes(m.id))
                        .map(member => (
                          <TouchableOpacity
                            key={member.id}
                            style={styles.memberPickerItem}
                            onPress={() => handleSelectMember(member.id)}
                          >
                            <View style={styles.memberPickerInfo}>
                              <Text style={styles.memberPickerName}>{member.name}</Text>
                              {member.handicap !== undefined && member.handicap !== null && (
                                <Text style={styles.memberPickerHandicap}>HDC: {member.handicap}</Text>
                              )}
                            </View>
                            <UserPlus size={18} color="#1B5E20" />
                          </TouchableOpacity>
                        ))}
                    </ScrollView>
                  )}
                </View>
              )}

              {players.map((player, index) => (
                <View key={index}>
                  <View style={styles.playerRow}>
                    <Text style={styles.playerNumber}>{index + 1}.</Text>
                    {selectedMemberIds[index] ? (
                      <View style={styles.memberBadge}>
                        <Users size={14} color="#1B5E20" />
                      </View>
                    ) : null}
                    <TextInput
                      style={[styles.input, styles.playerNameInput]}
                      placeholder={`Player ${index + 1} Name (or select from members)`}
                      placeholderTextColor="#999"
                      value={player.name}
                      onChangeText={(value) => handlePlayerNameChange(index, value)}
                    />
                    <TextInput
                      style={[styles.input, styles.handicapInput]}
                      placeholder="HDC"
                      placeholderTextColor="#999"
                      keyboardType="decimal-pad"
                      value={player.handicap}
                      onChangeText={(value) => handlePlayerHandicapChange(index, value)}
                    />
                    {player.name.trim() !== '' && (
                      <TouchableOpacity
                        style={styles.removePlayerButton}
                        onPress={() => handleRemovePlayer(index)}
                      >
                        <X size={18} color="#dc2626" />
                      </TouchableOpacity>
                    )}
                  </View>
                  
                  {(gameType === 'wolf' || gameType === 'niners' || (gameType === 'individual-net' && !useHandicaps)) && player.name.trim() !== '' && (
                    <View style={styles.playerExtras}>
                      <View style={styles.strokesConfigSection}>
                        <View style={styles.strokesSelector}>
                          <Text style={styles.extraLabel}>Strokes a Side:</Text>
                          <TextInput
                            style={styles.strokesInput}
                            placeholder="0"
                            placeholderTextColor="#999"
                            keyboardType="number-pad"
                            value={player.strokesASide}
                            onChangeText={(value) => handlePlayerStrokesASideChange(index, value)}
                          />
                        </View>
                        <Text style={styles.strokesHelpText}>
                          Total: {parseInt(player.strokesASide, 10) * 2 || 0} strokes ({parseInt(player.strokesASide, 10) || 0} per 9)
                        </Text>
                        {courseHasStrokeIndices && parseInt(player.strokesASide, 10) > 0 && (() => {
                          const strokesPerSide = parseInt(player.strokesASide, 10);
                          const frontNineIndices = selectedCourse!.strokeIndices.slice(0, 9);
                          const backNineIndices = selectedCourse!.strokeIndices.slice(9, 18);
                          const frontNinePars = holePars.slice(0, 9).map(p => parseInt(p, 10) || 4);
                          const backNinePars = holePars.slice(9, 18).map(p => parseInt(p, 10) || 4);
                          
                          const sortedFront = frontNineIndices
                            .map((si: number, idx: number) => ({ 
                              holeNum: idx + 1, 
                              strokeIndex: si,
                              par: frontNinePars[idx]
                            }))
                            .filter((h: { holeNum: number; strokeIndex: number; par: number }) => h.par !== 3)
                            .sort((a: { holeNum: number; strokeIndex: number; par: number }, b: { holeNum: number; strokeIndex: number; par: number }) => a.strokeIndex - b.strokeIndex)
                            .slice(0, Math.min(strokesPerSide, 9))
                            .map((h: { holeNum: number; strokeIndex: number; par: number }) => h.holeNum);
                          
                          const sortedBack = backNineIndices
                            .map((si: number, idx: number) => ({ 
                              holeNum: idx + 10, 
                              strokeIndex: si,
                              par: backNinePars[idx]
                            }))
                            .filter((h: { holeNum: number; strokeIndex: number; par: number }) => h.par !== 3)
                            .sort((a: { holeNum: number; strokeIndex: number; par: number }, b: { holeNum: number; strokeIndex: number; par: number }) => a.strokeIndex - b.strokeIndex)
                            .slice(0, Math.min(strokesPerSide, 9))
                            .map((h: { holeNum: number; strokeIndex: number; par: number }) => h.holeNum);
                          
                          return (
                            <View style={styles.strokeHolesDisplay}>
                              <Text style={styles.strokeHolesLabel}>Stroke Holes (No Par 3s):</Text>
                              <View style={styles.strokeHolesLists}>
                                <View style={styles.strokeHolesSide}>
                                  <Text style={styles.strokeHolesSideLabel}>Front:</Text>
                                  <Text style={styles.strokeHolesNumbers}>{sortedFront.length > 0 ? sortedFront.join(', ') : 'None'}</Text>
                                </View>
                                <View style={styles.strokeHolesSide}>
                                  <Text style={styles.strokeHolesSideLabel}>Back:</Text>
                                  <Text style={styles.strokeHolesNumbers}>{sortedBack.length > 0 ? sortedBack.join(', ') : 'None'}</Text>
                                </View>
                              </View>
                            </View>
                          );
                        })()}
                      </View>
                    </View>
                  )}
                  
                  {gameType === 'team-match-play' && player.name.trim() !== '' && (
                    <View style={styles.playerExtras}>
                      <View style={styles.teamSelector}>
                        <Text style={styles.extraLabel}>Team:</Text>
                        <TouchableOpacity
                          style={[
                            styles.teamButton,
                            styles.team1Button,
                            player.teamId === 1 && styles.teamButtonActive,
                          ]}
                          onPress={() => handleTeamAssignment(index, 1)}
                        >
                          <Text style={[
                            styles.teamButtonText,
                            player.teamId === 1 && styles.teamButtonTextActive,
                          ]}>
                            Team 1
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[
                            styles.teamButton,
                            styles.team2Button,
                            player.teamId === 2 && styles.teamButtonActive,
                          ]}
                          onPress={() => handleTeamAssignment(index, 2)}
                        >
                          <Text style={[
                            styles.teamButtonText,
                            player.teamId === 2 && styles.teamButtonTextActive,
                          ]}>
                            Team 2
                          </Text>
                        </TouchableOpacity>
                      </View>
                      <View style={styles.strokesConfigSection}>
                        <View style={styles.strokesSelector}>
                          <Text style={styles.extraLabel}>Strokes:</Text>
                          <TextInput
                            style={styles.strokesInput}
                            placeholder="0"
                            placeholderTextColor="#999"
                            keyboardType="number-pad"
                            value={player.strokesReceived}
                            onChangeText={(value) => handlePlayerStrokesChange(index, value)}
                          />
                        </View>
                        {parseInt(player.strokesReceived, 10) > 0 && (
                          <View style={styles.strokeModeSelector}>
                            <Text style={styles.strokeModeLabel}>Stroke Mode:</Text>
                            <View style={styles.strokeModeButtons}>
                              <TouchableOpacity
                                style={[
                                  styles.strokeModeButton,
                                  player.strokeMode === 'manual' && styles.strokeModeButtonActive,
                                ]}
                                onPress={() => handleStrokeModeChange(index, 'manual')}
                              >
                                <Text style={[
                                  styles.strokeModeButtonText,
                                  player.strokeMode === 'manual' && styles.strokeModeButtonTextActive,
                                ]}>Manual</Text>
                              </TouchableOpacity>
                              <TouchableOpacity
                                style={[
                                  styles.strokeModeButton,
                                  player.strokeMode === 'auto' && styles.strokeModeButtonActive,
                                  !courseHasStrokeIndices && styles.strokeModeButtonDisabled,
                                ]}
                                onPress={() => courseHasStrokeIndices && handleStrokeModeChange(index, 'auto')}
                                disabled={!courseHasStrokeIndices}
                              >
                                <Text style={[
                                  styles.strokeModeButtonText,
                                  player.strokeMode === 'auto' && styles.strokeModeButtonTextActive,
                                  !courseHasStrokeIndices && styles.strokeModeButtonTextDisabled,
                                ]}>Auto</Text>
                              </TouchableOpacity>
                              <TouchableOpacity
                                style={[
                                  styles.strokeModeButton,
                                  player.strokeMode === 'all-but-par3' && styles.strokeModeButtonActive,
                                ]}
                                onPress={() => handleStrokeModeChange(index, 'all-but-par3')}
                              >
                                <Text style={[
                                  styles.strokeModeButtonText,
                                  player.strokeMode === 'all-but-par3' && styles.strokeModeButtonTextActive,
                                ]}>All But Par 3</Text>
                              </TouchableOpacity>
                            </View>
                          </View>
                        )}
                      </View>
                    </View>
                  )}
                </View>
              ))}
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Betting (Optional)</Text>
              {gameType === 'wolf' ? (
                <View>
                  <Text style={styles.bettingDescription}>Enter dollar amount per hole</Text>
                  <View style={styles.bettingRow}>
                    <Text style={styles.bettingLabel}>$ Per Hole:</Text>
                    <TextInput
                      style={styles.bettingInput}
                      placeholder="0.00"
                      placeholderTextColor="#999"
                      keyboardType="decimal-pad"
                      value={bettingAmount}
                      onChangeText={setBettingAmount}
                    />
                  </View>
                </View>
              ) : gameType === 'niners' ? (
                <View>
                  <Text style={styles.bettingDescription}>
                    Amount per player per point
                  </Text>
                  <View style={styles.bettingRow}>
                    <Text style={styles.bettingLabel}>$ Per Point:</Text>
                    <TextInput
                      style={styles.bettingInput}
                      placeholder="0.00"
                      placeholderTextColor="#999"
                      keyboardType="decimal-pad"
                      value={bettingAmount}
                      onChangeText={setBettingAmount}
                    />
                  </View>
                </View>
              ) : gameType === 'individual-net' ? (
                <View>
                  <Text style={styles.bettingDescription}>
                    Amount per player for each bet type
                  </Text>
                  <View style={styles.bettingRow}>
                    <Text style={styles.bettingLabel}>Front 9:</Text>
                    <TextInput
                      style={styles.bettingInput}
                      placeholder="0.00"
                      placeholderTextColor="#999"
                      keyboardType="decimal-pad"
                      value={front9Bet}
                      onChangeText={setFront9Bet}
                    />
                  </View>
                  <View style={styles.bettingRow}>
                    <Text style={styles.bettingLabel}>Back 9:</Text>
                    <TextInput
                      style={styles.bettingInput}
                      placeholder="0.00"
                      placeholderTextColor="#999"
                      keyboardType="decimal-pad"
                      value={back9Bet}
                      onChangeText={setBack9Bet}
                    />
                  </View>
                  <View style={styles.bettingRow}>
                    <Text style={styles.bettingLabel}>Overall:</Text>
                    <TextInput
                      style={styles.bettingInput}
                      placeholder="0.00"
                      placeholderTextColor="#999"
                      keyboardType="decimal-pad"
                      value={overallBet}
                      onChangeText={setOverallBet}
                    />
                  </View>
                </View>
              ) : (
                <View>
                  <Text style={styles.bettingDescription}>
                    Amount per player for Front 9 / Back 9 / Overall
                  </Text>
                  <View style={styles.bettingRow}>
                    <Text style={styles.bettingLabel}>$ Amount:</Text>
                    <TextInput
                      style={styles.bettingInput}
                      placeholder="0.00"
                      placeholderTextColor="#999"
                      keyboardType="decimal-pad"
                      value={bettingAmount}
                      onChangeText={setBettingAmount}
                    />
                  </View>
                </View>
              )}

              <View style={styles.potBetSection}>
                <Text style={styles.potBetTitle}>Pot Bet (Optional)</Text>
                <Text style={styles.potBetDescription}>
                  Add a pot bet where additional players can join without being on the scorecard
                </Text>
                <View style={styles.bettingRow}>
                  <Text style={styles.bettingLabel}>Pot Amount:</Text>
                  <TextInput
                    style={styles.bettingInput}
                    placeholder="0.00"
                    placeholderTextColor="#999"
                    keyboardType="decimal-pad"
                    value={potBet}
                    onChangeText={setPotBet}
                  />
                </View>

                {potBet && parseFloat(potBet) > 0 && (
                  <View style={styles.potPlayersSection}>
                    <View style={styles.sectionHeader}>
                      <Text style={styles.potPlayersTitle}>Pot Players</Text>
                      <TouchableOpacity
                        style={styles.memberPickerButton}
                        onPress={() => setShowPotPlayerPicker(!showPotPlayerPicker)}
                      >
                        <Users size={16} color="#1B5E20" />
                        <Text style={styles.memberPickerButtonText}>Add from Members</Text>
                        <ChevronDown size={16} color="#1B5E20" />
                      </TouchableOpacity>
                    </View>

                    {showPotPlayerPicker && (
                      <View style={styles.memberPickerContainer}>
                        {membersQuery.isLoading ? (
                          <View style={styles.memberPickerLoading}>
                            <ActivityIndicator size="small" color="#1B5E20" />
                          </View>
                        ) : (
                          <ScrollView style={styles.memberPickerList} nestedScrollEnabled>
                            {members
                              .filter(m => !selectedPotMemberIds.includes(m.id))
                              .map(member => (
                                <TouchableOpacity
                                  key={member.id}
                                  style={styles.memberPickerItem}
                                  onPress={() => handleSelectPotPlayer(member.id)}
                                >
                                  <View style={styles.memberPickerInfo}>
                                    <Text style={styles.memberPickerName}>{member.name}</Text>
                                    {member.handicap !== undefined && member.handicap !== null && (
                                      <Text style={styles.memberPickerHandicap}>HDC: {member.handicap}</Text>
                                    )}
                                  </View>
                                  <UserPlus size={18} color="#1B5E20" />
                                </TouchableOpacity>
                              ))}
                          </ScrollView>
                        )}
                      </View>
                    )}

                    {potPlayers.map((potPlayer, index) => (
                      <View key={index} style={styles.potPlayerRow}>
                        <View style={styles.potPlayerBadge}>
                          <Users size={14} color="#1B5E20" />
                        </View>
                        <TextInput
                          style={[styles.input, styles.playerNameInput]}
                          placeholder={`Pot Player ${index + 1} Name`}
                          placeholderTextColor="#999"
                          value={potPlayer.name}
                          onChangeText={(value) => handlePotPlayerNameChange(index, value)}
                        />
                        <TextInput
                          style={[styles.input, styles.handicapInput]}
                          placeholder="HDC"
                          placeholderTextColor="#999"
                          keyboardType="decimal-pad"
                          value={potPlayer.handicap}
                          onChangeText={(value) => handlePotPlayerHandicapChange(index, value)}
                        />
                        <TouchableOpacity
                          style={styles.removePlayerButton}
                          onPress={() => handleRemovePotPlayer(index)}
                        >
                          <X size={18} color="#dc2626" />
                        </TouchableOpacity>
                      </View>
                    ))}

                    <TouchableOpacity
                      style={styles.addPotPlayerButton}
                      onPress={handleAddPotPlayer}
                    >
                      <UserPlus size={16} color="#1B5E20" />
                      <Text style={styles.addPotPlayerButtonText}>Add Custom Pot Player</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
              <Text style={styles.saveButtonText}>{editingGame ? 'Save Changes' : 'Create Game'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  title: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#1a1a1a',
  },
  content: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#374151',
    marginBottom: 12,
  },
  gameTypeSelector: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  gameTypeButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#ddd',
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  gameTypeButtonActive: {
    borderColor: '#1B5E20',
    backgroundColor: '#f0f8f0',
  },
  gameTypeButtonText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#666',
    textAlign: 'center',
  },
  gameTypeButtonTextActive: {
    color: '#1B5E20',
  },
  matchPlayTypeSelector: {
    gap: 12,
  },
  matchPlayTypeCard: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#ddd',
    backgroundColor: '#fff',
  },
  matchPlayTypeCardActive: {
    borderColor: '#1B5E20',
    backgroundColor: '#f0f8f0',
  },
  matchPlayTypeTitle: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: '#374151',
    marginBottom: 4,
  },
  matchPlayTypeTitleActive: {
    color: '#1B5E20',
  },
  matchPlayTypeDescription: {
    fontSize: 12,
    color: '#666',
    lineHeight: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    color: '#1a1a1a',
    backgroundColor: '#fff',
    marginBottom: 12,
  },
  inputDisabled: {
    backgroundColor: '#f5f5f5',
    color: '#666',
  },
  courseSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#1B5E20',
    borderRadius: 8,
    backgroundColor: '#f0f8f0',
    marginBottom: 12,
  },
  courseSelectorText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#1B5E20',
  },
  coursesList: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    marginBottom: 12,
    maxHeight: 200,
  },
  coursesLoading: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  courseOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  courseOptionName: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#1a1a1a',
  },
  courseOptionPar: {
    fontSize: 13,
    color: '#1B5E20',
  },
  selectedCourseBadge: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#e8f5e9',
    borderRadius: 6,
    marginBottom: 12,
  },
  selectedCourseText: {
    fontSize: 13,
    color: '#1B5E20',
    fontWeight: '600' as const,
  },
  clearCourseText: {
    fontSize: 13,
    color: '#007AFF',
    fontWeight: '600' as const,
  },
  holeParsNote: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic' as const,
    marginBottom: 8,
  },
  holeParsGrid: {
    flexDirection: 'column',
  },
  holeParsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  holePar: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 3,
  },
  holeLabel: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: '#666',
    marginBottom: 4,
  },
  holeInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    width: '100%',
    paddingVertical: 8,
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#1a1a1a',
    textAlign: 'center',
  },
  holeInputDisabled: {
    backgroundColor: '#f5f5f5',
    color: '#666',
  },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  playerNumber: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#374151',
    width: 20,
    marginRight: 8,
  },
  playerNameInput: {
    flex: 1,
    marginBottom: 0,
    marginRight: 8,
  },
  handicapInput: {
    width: 70,
    marginBottom: 0,
  },
  playerExtras: {
    flexDirection: 'row',
    marginLeft: 28,
    marginBottom: 16,
    gap: 12,
  },
  teamSelector: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  extraLabel: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#666',
  },
  teamButton: {
    flex: 1,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
  },
  team1Button: {
    borderColor: '#2196F3',
    backgroundColor: '#fff',
  },
  team2Button: {
    borderColor: '#FF9800',
    backgroundColor: '#fff',
  },
  teamButtonActive: {
    backgroundColor: '#e3f2fd',
  },
  teamButtonText: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: '#666',
  },
  teamButtonTextActive: {
    color: '#1a1a1a',
  },
  strokesSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  strokesInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    width: 50,
    paddingVertical: 6,
    paddingHorizontal: 8,
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#1a1a1a',
    textAlign: 'center',
    backgroundColor: '#fff',
  },
  strokesConfigSection: {
    flex: 1,
  },
  strokesHelpText: {
    fontSize: 11,
    color: '#666',
    marginTop: 4,
  },
  strokeModeSelector: {
    marginTop: 8,
  },
  strokeModeLabel: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: '#666',
    marginBottom: 6,
  },
  strokeModeButtons: {
    flexDirection: 'row',
    gap: 4,
  },
  strokeModeButton: {
    flex: 1,
    paddingVertical: 6,
    paddingHorizontal: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  strokeModeButtonActive: {
    borderColor: '#1B5E20',
    backgroundColor: '#e8f5e9',
  },
  strokeModeButtonDisabled: {
    backgroundColor: '#f5f5f5',
    borderColor: '#e0e0e0',
  },
  strokeModeButtonText: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: '#666',
  },
  strokeModeButtonTextActive: {
    color: '#1B5E20',
  },
  strokeModeButtonTextDisabled: {
    color: '#ccc',
  },
  bettingDescription: {
    fontSize: 13,
    color: '#666',
    marginBottom: 12,
  },
  bettingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  bettingLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#374151',
    minWidth: 90,
  },
  bettingInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#1a1a1a',
    backgroundColor: '#fff',
  },
  bettingHelpText: {
    fontSize: 11,
    color: '#1B5E20',
    marginTop: 4,
    fontStyle: 'italic' as const,
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
    marginRight: 6,
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#666',
  },
  saveButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: '#1B5E20',
    alignItems: 'center',
    marginLeft: 6,
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: '#fff',
  },
  strokeHolesDisplay: {
    marginTop: 8,
    padding: 8,
    backgroundColor: '#f0f8f0',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#1B5E20',
  },
  strokeHolesLabel: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: '#1B5E20',
    marginBottom: 6,
  },
  strokeHolesLists: {
    gap: 4,
  },
  strokeHolesSide: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  strokeHolesSideLabel: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: '#666',
    minWidth: 40,
  },
  strokeHolesNumbers: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: '#1B5E20',
    flex: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  memberPickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#1B5E20',
    backgroundColor: '#f0f8f0',
  },
  memberPickerButtonText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#1B5E20',
  },
  memberPickerContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    marginBottom: 16,
    maxHeight: 250,
    backgroundColor: '#fff',
  },
  memberPickerLoading: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  memberPickerList: {
    maxHeight: 250,
  },
  memberPickerItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  memberPickerInfo: {
    flex: 1,
  },
  memberPickerName: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#1a1a1a',
    marginBottom: 2,
  },
  memberPickerHandicap: {
    fontSize: 12,
    color: '#666',
  },
  memberBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#e8f5e9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  removePlayerButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#fee',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
  },
  potBetSection: {
    marginTop: 24,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: '#e5e5e5',
  },
  potBetTitle: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: '#374151',
    marginBottom: 6,
  },
  potBetDescription: {
    fontSize: 12,
    color: '#666',
    marginBottom: 12,
  },
  potPlayersSection: {
    marginTop: 16,
  },
  potPlayersTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#374151',
  },
  potPlayerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  potPlayerBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#e8f5e9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  addPotPlayerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1B5E20',
    backgroundColor: '#f0f8f0',
    marginTop: 12,
  },
  addPotPlayerButtonText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#1B5E20',
  },
  handicapToggleContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  handicapToggle: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#ddd',
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  handicapToggleActive: {
    borderColor: '#1B5E20',
    backgroundColor: '#f0f8f0',
  },
  handicapToggleText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#666',
    textAlign: 'center',
  },
  handicapToggleTextActive: {
    color: '#1B5E20',
  },
  handicapDescription: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic' as const,
  },
});
