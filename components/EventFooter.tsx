import React, { useState, useEffect } from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useRouter, usePathname, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Home, Users, Grid3x3, Target, Award, DollarSign } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '@/contexts/AuthContext';
import { OfflineModeToggle } from '@/components/OfflineModeToggle';
import { EventStatusButton, EventStatus } from '@/components/EventStatusButton';
import { supabase } from '@/integrations/supabase/client';
import { canViewFinance } from '@/utils/rolePermissions';

type EventFooterProps = {
  showStartButton?: boolean;
  eventStatus?: EventStatus;
  onStatusChange?: (newStatus: EventStatus) => void | Promise<void>;
  isAdmin?: boolean;
};

export function EventFooter({
  showStartButton = false,
  eventStatus = 'upcoming',
  onStatusChange,
  isAdmin = false,
}: EventFooterProps = {}) {
  const router = useRouter();
  const pathname = usePathname();
  const { eventId } = useLocalSearchParams<{ eventId: string }>();
  const { currentUser } = useAuth();
  const insets = useSafeAreaInsets();
  const [useCourseHandicap, setUseCourseHandicap] = useState<boolean>(false);

  const [event, setEvent] = useState<any>(null);
  const isSocialEvent = event?.type === 'social';

  useEffect(() => {
    if (!eventId) return;
    
    const fetchEvent = async () => {
      try {
        const { data, error } = await supabase
          .from('events')
          .select('*')
          .eq('id', eventId)
          .single();
        
        if (error) throw error;
        setEvent(data);
        console.log('[EventFooter] Fetched event:', data?.id);
      } catch (error) {
        console.error('[EventFooter] Error fetching event:', error);
        setEvent(null);
      }
    };
    
    fetchEvent();
  }, [eventId]);

  useEffect(() => {
    const loadCourseHandicapSetting = async () => {
      if (eventId) {
        try {
          const key = `useCourseHandicap_${eventId}`;
          const value = await AsyncStorage.getItem(key);
          if (value !== null) {
            setUseCourseHandicap(value === 'true');
          }
        } catch (error) {
          console.error('[EventFooter] Error loading course handicap setting:', error);
        }
      }
    };
    loadCourseHandicapSetting();
  }, [eventId]);

  const toggleCourseHandicap = async () => {
    if (eventId) {
      const newValue = !useCourseHandicap;
      setUseCourseHandicap(newValue);
      try {
        const key = `useCourseHandicap_${eventId}`;
        await AsyncStorage.setItem(key, newValue.toString());
        console.log('[EventFooter] Course handicap toggled:', newValue);
      } catch (error) {
        console.error('[EventFooter] Error saving course handicap setting:', error);
      }
    }
  };

  const navigateTo = (route: string) => {
    if (route === 'home') {
      router.push('/(tabs)/dashboard');
    } else {
      router.push(`/(event)/${eventId}/${route}` as any);
    }
  };

  const isActive = (route: string) => {
    if (route === 'home') return false;
    if (route === 'index') return pathname === `/(event)/${eventId}` || pathname === `/(event)/${eventId}/`;
    return pathname.includes(`/${route}`);
  };

  const tabs = [
    { id: 'home', icon: Home, label: 'Home' },
    { id: 'registration', icon: Users, label: 'Register' },
    ...(!isSocialEvent ? [
      { id: 'groupings', icon: Grid3x3, label: 'Groupings' },
      { id: 'scoring', icon: Target, label: 'Scoring' },
      { id: 'rolex', icon: Award, label: 'Leader' },
    ] : []),
  ];

  if (canViewFinance(currentUser)) {
    tabs.push({ id: 'finance', icon: DollarSign, label: 'Finance' });
  }

  return (
    <View style={styles.footerContainer}>
      {currentUser?.isAdmin && (
        <View style={styles.topRow}>
          <View style={styles.toggleButtonWrapper}>
            <OfflineModeToggle eventId={eventId} position="footer" />
          </View>
          {showStartButton && onStatusChange && (
            <View style={styles.startButtonWrapper}>
              <EventStatusButton
                status={eventStatus!}
                onStatusChange={onStatusChange}
                isAdmin={isAdmin}
              />
            </View>
          )}
          <TouchableOpacity
            style={[
              styles.courseHandicapToggle,
              useCourseHandicap && styles.courseHandicapToggleActive,
            ]}
            onPress={toggleCourseHandicap}
          >
            <Text style={styles.courseHandicapToggleText}>
              {useCourseHandicap ? 'Course' : 'Regular'}
            </Text>
          </TouchableOpacity>
        </View>
      )}
      <View style={[styles.footer, { paddingBottom: insets.bottom }]}>
        {tabs.map((tab) => {
        const Icon = tab.icon;
        const active = isActive(tab.id);
        
        return (
          <TouchableOpacity
            key={tab.id}
            style={styles.tabItem}
            onPress={() => navigateTo(tab.id)}
            activeOpacity={0.7}
          >
            <Icon size={24} color={active ? '#fff' : '#8899AA'} />
            <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  footerContainer: {
    backgroundColor: '#1B5E20',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
  },
  toggleButtonWrapper: {
    flex: 1,
  },
  startButtonWrapper: {
    flex: 1,
  },
  courseHandicapToggle: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  courseHandicapToggleActive: {
    backgroundColor: '#2196F3',
  },
  courseHandicapToggleText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  footer: {
    flexDirection: 'row',
    backgroundColor: '#1B5E20',
    paddingBottom: 0,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: '#8899AA',
    marginTop: 4,
    textAlign: 'center',
  },
  tabLabelActive: {
    color: '#fff',
  },
});
