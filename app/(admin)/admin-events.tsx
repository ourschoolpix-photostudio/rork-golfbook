import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  Image,
  Modal,
  TextInput,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { AddEventModal } from '@/components/AddEventModal';
import { AdminFooter } from '@/components/AdminFooter';
import { useAuth } from '@/contexts/AuthContext';
import { Event } from '@/types';

import { supabaseService } from '@/utils/supabaseService';
import { formatDateForDisplay } from '@/utils/dateUtils';
import { useQuery } from '@tanstack/react-query';

type EventFormType = {
  status: 'upcoming' | 'active' | 'complete';
  type: 'tournament' | 'social';
  eventName: string;
  entryFee: string;
  course: string;
  address: string;
  city: string;
  state: string;
  zipcode: string;
  startDate: string;
  endDate: string;
  numberOfDays: 1 | 2 | 3;
  day1StartTime: string;
  day1StartPeriod: 'AM' | 'PM';
  day1EndTime: string;
  day1EndPeriod: 'AM' | 'PM';
  day1Course: string;
  day1StartType: 'tee-time' | 'shotgun';
  day1LeadingHole: string;
  day1Par: string;
  day1SlopeRating: string;
  day1CourseRating: string;
  day2StartTime: string;
  day2StartPeriod: 'AM' | 'PM';
  day2EndTime: string;
  day2EndPeriod: 'AM' | 'PM';
  day2Course: string;
  day2StartType: 'tee-time' | 'shotgun';
  day2LeadingHole: string;
  day2Par: string;
  day2SlopeRating: string;
  day2CourseRating: string;
  day3StartTime: string;
  day3StartPeriod: 'AM' | 'PM';
  day3EndTime: string;
  day3EndPeriod: 'AM' | 'PM';
  day3Course: string;
  day3StartType: 'tee-time' | 'shotgun';
  day3LeadingHole: string;
  day3Par: string;
  day3SlopeRating: string;
  day3CourseRating: string;
  flightACutoff: string;
  flightBCutoff: string;
  flightATeebox: string;
  flightBTeebox: string;
  flightLTeebox: string;
  day1HolePars?: string[];
  day2HolePars?: string[];
  day3HolePars?: string[];
  flightATrophy1st: boolean;
  flightATrophy2nd: boolean;
  flightATrophy3rd: boolean;
  flightBTrophy1st: boolean;
  flightBTrophy2nd: boolean;
  flightBTrophy3rd: boolean;
  flightCTrophy1st: boolean;
  flightCTrophy2nd: boolean;
  flightCTrophy3rd: boolean;
  flightLTrophy1st: boolean;
  flightLTrophy2nd: boolean;
  flightLTrophy3rd: boolean;
  flightACashPrize1st: string;
  flightACashPrize2nd: string;
  flightACashPrize3rd: string;
  flightBCashPrize1st: string;
  flightBCashPrize2nd: string;
  flightBCashPrize3rd: string;
  flightCCashPrize1st: string;
  flightCCashPrize2nd: string;
  flightCCashPrize3rd: string;
  flightLCashPrize1st: string;
  flightLCashPrize2nd: string;
  flightLCashPrize3rd: string;
  lowGrossTrophy: boolean;
  lowGrossCashPrize: string;
  closestToPin: string;
  memo: string;
  photoUrl: string;
  holePars: string[];
};

export default function AdminEventsScreen() {
  const { currentUser } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [showArchived, setShowArchived] = useState<boolean>(false);
  const [eventRegistrations, setEventRegistrations] = useState<Record<string, any[]>>({});
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pinModalVisible, setPinModalVisible] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [eventToDelete, setEventToDelete] = useState<string | null>(null);
  const [form, setForm] = useState<EventFormType>({
    status: 'upcoming' as 'upcoming' | 'active' | 'complete',
    type: 'tournament' as 'tournament' | 'social',
    eventName: '',
    entryFee: '',
    course: '',
    address: '',
    city: '',
    state: '',
    zipcode: '',
    startDate: '',
    endDate: '',
    numberOfDays: 1 as 1 | 2 | 3,
    day1StartTime: '',
    day1StartPeriod: 'AM' as 'AM' | 'PM',
    day1EndTime: '',
    day1EndPeriod: 'AM' as 'AM' | 'PM',
    day1Course: '',
    day1StartType: 'tee-time' as 'tee-time' | 'shotgun',
    day1LeadingHole: '',
    day1Par: '',
    day1SlopeRating: '',
    day1CourseRating: '',
    day2StartTime: '',
    day2StartPeriod: 'AM' as 'AM' | 'PM',
    day2EndTime: '',
    day2EndPeriod: 'AM' as 'AM' | 'PM',
    day2Course: '',
    day2StartType: 'tee-time' as 'tee-time' | 'shotgun',
    day2LeadingHole: '',
    day2Par: '',
    day2SlopeRating: '',
    day2CourseRating: '',
    day3StartTime: '',
    day3StartPeriod: 'AM' as 'AM' | 'PM',
    day3EndTime: '',
    day3EndPeriod: 'AM' as 'AM' | 'PM',
    day3Course: '',
    day3StartType: 'tee-time' as 'tee-time' | 'shotgun',
    day3LeadingHole: '',
    day3Par: '',
    day3SlopeRating: '',
    day3CourseRating: '',
    flightACutoff: '',
    flightBCutoff: '',
    flightATeebox: '',
    flightBTeebox: '',
    flightLTeebox: '',
    flightATrophy1st: false,
    flightATrophy2nd: false,
    flightATrophy3rd: false,
    flightBTrophy1st: false,
    flightBTrophy2nd: false,
    flightBTrophy3rd: false,
    flightCTrophy1st: false,
    flightCTrophy2nd: false,
    flightCTrophy3rd: false,
    flightLTrophy1st: false,
    flightLTrophy2nd: false,
    flightLTrophy3rd: false,
    flightACashPrize1st: '',
    flightACashPrize2nd: '',
    flightACashPrize3rd: '',
    flightBCashPrize1st: '',
    flightBCashPrize2nd: '',
    flightBCashPrize3rd: '',
    flightCCashPrize1st: '',
    flightCCashPrize2nd: '',
    flightCCashPrize3rd: '',
    flightLCashPrize1st: '',
    flightLCashPrize2nd: '',
    flightLCashPrize3rd: '',
    lowGrossTrophy: false,
    lowGrossCashPrize: '',
    closestToPin: '',
    memo: '',
    photoUrl: '',
    holePars: Array(18).fill(''),
    day1HolePars: Array(18).fill(''),
    day2HolePars: Array(18).fill(''),
    day3HolePars: Array(18).fill(''),
  });

  const registrationsQuery = useQuery({
    queryKey: ['all-admin-event-registrations', events.length],
    queryFn: async () => {
      const allRegistrations: Record<string, any[]> = {};
      if (events && events.length > 0) {
        for (const event of events) {
          try {
            const regs = await supabaseService.registrations.getAll(event.id);
            allRegistrations[event.id] = regs || [];
          } catch (error) {
            console.error(`Error fetching registrations for event ${event.id}:`, error);
            allRegistrations[event.id] = [];
          }
        }
      }
      return allRegistrations;
    },
    enabled: events.length > 0,
  });

  useEffect(() => {
    loadEvents();
  }, []);

  useEffect(() => {
    if (registrationsQuery.data) {
      setEventRegistrations(registrationsQuery.data);
    }
  }, [registrationsQuery.data]);

  const loadEvents = async () => {
    try {
      const data = await supabaseService.events.getAll();
      console.log('✅ Admin Events - Events from Supabase:', data.length);
      const sortedEvents = [...data].sort((a, b) => {
        if (a.archived && !b.archived) return 1;
        if (!a.archived && b.archived) return -1;
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return timeB - timeA;
      });
      setEvents(sortedEvents);
    } catch (error) {
      console.error('[AdminEvents] Error loading events:', error);
    }
  };

  const resetForm = () => {
    setForm({
      status: 'upcoming',
      type: 'tournament',
      eventName: '',
      entryFee: '',
      course: '',
      address: '',
      city: '',
      state: '',
      zipcode: '',
      startDate: '',
      endDate: '',
      numberOfDays: 1,
      day1StartTime: '',
      day1StartPeriod: 'AM',
      day1EndTime: '',
      day1EndPeriod: 'AM',
      day1Course: '',
      day1StartType: 'tee-time',
      day1LeadingHole: '',
      day1Par: '',
      day1SlopeRating: '',
      day1CourseRating: '',
      day2StartTime: '',
      day2StartPeriod: 'AM',
      day2EndTime: '',
      day2EndPeriod: 'AM',
      day2Course: '',
      day2StartType: 'tee-time',
      day2LeadingHole: '',
      day2Par: '',
      day2SlopeRating: '',
      day2CourseRating: '',
      day3StartTime: '',
      day3StartPeriod: 'AM',
      day3EndTime: '',
      day3EndPeriod: 'AM',
      day3Course: '',
      day3StartType: 'tee-time',
      day3LeadingHole: '',
      day3Par: '',
      day3SlopeRating: '',
      day3CourseRating: '',
      flightACutoff: '',
      flightBCutoff: '',
      flightATeebox: '',
      flightBTeebox: '',
      flightLTeebox: '',
      flightATrophy1st: false,
      flightATrophy2nd: false,
      flightATrophy3rd: false,
      flightBTrophy1st: false,
      flightBTrophy2nd: false,
      flightBTrophy3rd: false,
      flightCTrophy1st: false,
      flightCTrophy2nd: false,
      flightCTrophy3rd: false,
      flightLTrophy1st: false,
      flightLTrophy2nd: false,
      flightLTrophy3rd: false,
      flightACashPrize1st: '',
      flightACashPrize2nd: '',
      flightACashPrize3rd: '',
      flightBCashPrize1st: '',
      flightBCashPrize2nd: '',
      flightBCashPrize3rd: '',
      flightCCashPrize1st: '',
      flightCCashPrize2nd: '',
      flightCCashPrize3rd: '',
      flightLCashPrize1st: '',
      flightLCashPrize2nd: '',
      flightLCashPrize3rd: '',
      lowGrossTrophy: false,
      lowGrossCashPrize: '',
      closestToPin: '',
      memo: '',
      photoUrl: '',
      holePars: Array(18).fill(''),
      day1HolePars: Array(18).fill(''),
      day2HolePars: Array(18).fill(''),
      day3HolePars: Array(18).fill(''),
    });
  };



  const handleSaveEvent = async () => {
    if (!form.eventName.trim() || !form.course.trim()) {
      Alert.alert('Error', 'Event name and course are required');
      return;
    }

    try {
      if (editingId) {
        await supabaseService.events.update(editingId, {
            id: editingId,
            name: form.eventName,
            venue: form.course,
            location: form.course,
            date: form.startDate,
            startDate: form.startDate,
            endDate: form.endDate,
            photoUrl: form.photoUrl,
            entryFee: form.entryFee,
            status: form.status,
            type: form.type,
            numberOfDays: form.numberOfDays,
            day1StartTime: form.day1StartTime,
            day1StartPeriod: form.day1StartPeriod,
            day1EndTime: form.day1EndTime,
            day1EndPeriod: form.day1EndPeriod,
            day1Course: form.day1Course,
            day1StartType: form.day1StartType,
            day1LeadingHole: form.day1LeadingHole,
            day1Par: form.day1Par,
            day1SlopeRating: form.day1SlopeRating,
            day1CourseRating: form.day1CourseRating,
            day1HolePars: form.day1HolePars,
            day2StartTime: form.day2StartTime,
            day2StartPeriod: form.day2StartPeriod,
            day2EndTime: form.day2EndTime,
            day2EndPeriod: form.day2EndPeriod,
            day2Course: form.day2Course,
            day2StartType: form.day2StartType,
            day2LeadingHole: form.day2LeadingHole,
            day2Par: form.day2Par,
            day2SlopeRating: form.day2SlopeRating,
            day2CourseRating: form.day2CourseRating,
            day2HolePars: form.day2HolePars,
            day3StartTime: form.day3StartTime,
            day3StartPeriod: form.day3StartPeriod,
            day3EndTime: form.day3EndTime,
            day3EndPeriod: form.day3EndPeriod,
            day3Course: form.day3Course,
            day3StartType: form.day3StartType,
            day3LeadingHole: form.day3LeadingHole,
            day3Par: form.day3Par,
            day3SlopeRating: form.day3SlopeRating,
            day3CourseRating: form.day3CourseRating,
            day3HolePars: form.day3HolePars,
            flightACutoff: form.flightACutoff,
            flightBCutoff: form.flightBCutoff,
            flightATeebox: form.flightATeebox,
            flightBTeebox: form.flightBTeebox,
            flightLTeebox: form.flightLTeebox,
            address: form.address,
            city: form.city,
            state: form.state,
            zipcode: form.zipcode,
            memo: form.memo,
            flightATrophy1st: form.flightATrophy1st,
            flightATrophy2nd: form.flightATrophy2nd,
            flightATrophy3rd: form.flightATrophy3rd,
            flightBTrophy1st: form.flightBTrophy1st,
            flightBTrophy2nd: form.flightBTrophy2nd,
            flightBTrophy3rd: form.flightBTrophy3rd,
            flightCTrophy1st: form.flightCTrophy1st,
            flightCTrophy2nd: form.flightCTrophy2nd,
            flightCTrophy3rd: form.flightCTrophy3rd,
            flightLTrophy1st: form.flightLTrophy1st,
            flightLTrophy2nd: form.flightLTrophy2nd,
            flightLTrophy3rd: form.flightLTrophy3rd,
            flightACashPrize1st: form.flightACashPrize1st,
            flightACashPrize2nd: form.flightACashPrize2nd,
            flightACashPrize3rd: form.flightACashPrize3rd,
            flightBCashPrize1st: form.flightBCashPrize1st,
            flightBCashPrize2nd: form.flightBCashPrize2nd,
            flightBCashPrize3rd: form.flightBCashPrize3rd,
            flightCCashPrize1st: form.flightCCashPrize1st,
            flightCCashPrize2nd: form.flightCCashPrize2nd,
            flightCCashPrize3rd: form.flightCCashPrize3rd,
            flightLCashPrize1st: form.flightLCashPrize1st,
            flightLCashPrize2nd: form.flightLCashPrize2nd,
            flightLCashPrize3rd: form.flightLCashPrize3rd,
            lowGrossTrophy: form.lowGrossTrophy,
            lowGrossCashPrize: form.lowGrossCashPrize,
            closestToPin: form.closestToPin,
        });
      } else {
        const newEvent = {
          id: Date.now().toString(),
          name: form.eventName,
          venue: form.course,
          location: form.course,
          date: form.startDate,
          startDate: form.startDate,
          endDate: form.endDate,
          status: form.status,
          type: form.type,
          photoUrl: form.photoUrl,
          entryFee: form.entryFee,
          numberOfDays: form.numberOfDays,
          day1StartTime: form.day1StartTime,
          day1StartPeriod: form.day1StartPeriod,
          day1EndTime: form.day1EndTime,
          day1EndPeriod: form.day1EndPeriod,
          day1Course: form.day1Course,
          day1StartType: form.day1StartType,
          day1LeadingHole: form.day1LeadingHole,
          day1Par: form.day1Par,
          day1SlopeRating: form.day1SlopeRating,
          day1CourseRating: form.day1CourseRating,
          day1HolePars: form.day1HolePars,
          day2StartTime: form.day2StartTime,
          day2StartPeriod: form.day2StartPeriod,
          day2EndTime: form.day2EndTime,
          day2EndPeriod: form.day2EndPeriod,
          day2Course: form.day2Course,
          day2StartType: form.day2StartType,
          day2LeadingHole: form.day2LeadingHole,
          day2Par: form.day2Par,
          day2SlopeRating: form.day2SlopeRating,
          day2CourseRating: form.day2CourseRating,
          day2HolePars: form.day2HolePars,
          day3StartTime: form.day3StartTime,
          day3StartPeriod: form.day3StartPeriod,
          day3EndTime: form.day3EndTime,
          day3EndPeriod: form.day3EndPeriod,
          day3Course: form.day3Course,
          day3StartType: form.day3StartType,
          day3LeadingHole: form.day3LeadingHole,
          day3Par: form.day3Par,
          day3SlopeRating: form.day3SlopeRating,
          day3CourseRating: form.day3CourseRating,
          day3HolePars: form.day3HolePars,
          flightACutoff: form.flightACutoff,
          flightBCutoff: form.flightBCutoff,
          flightATeebox: form.flightATeebox,
          flightBTeebox: form.flightBTeebox,
          flightLTeebox: form.flightLTeebox,
          address: form.address,
          city: form.city,
          state: form.state,
          zipcode: form.zipcode,
          memo: form.memo,
          flightATrophy1st: form.flightATrophy1st,
          flightATrophy2nd: form.flightATrophy2nd,
          flightATrophy3rd: form.flightATrophy3rd,
          flightBTrophy1st: form.flightBTrophy1st,
          flightBTrophy2nd: form.flightBTrophy2nd,
          flightBTrophy3rd: form.flightBTrophy3rd,
          flightCTrophy1st: form.flightCTrophy1st,
          flightCTrophy2nd: form.flightCTrophy2nd,
          flightCTrophy3rd: form.flightCTrophy3rd,
          flightLTrophy1st: form.flightLTrophy1st,
          flightLTrophy2nd: form.flightLTrophy2nd,
          flightLTrophy3rd: form.flightLTrophy3rd,
          flightACashPrize1st: form.flightACashPrize1st,
          flightACashPrize2nd: form.flightACashPrize2nd,
          flightACashPrize3rd: form.flightACashPrize3rd,
          flightBCashPrize1st: form.flightBCashPrize1st,
          flightBCashPrize2nd: form.flightBCashPrize2nd,
          flightBCashPrize3rd: form.flightBCashPrize3rd,
          flightCCashPrize1st: form.flightCCashPrize1st,
          flightCCashPrize2nd: form.flightCCashPrize2nd,
          flightCCashPrize3rd: form.flightCCashPrize3rd,
          flightLCashPrize1st: form.flightLCashPrize1st,
          flightLCashPrize2nd: form.flightLCashPrize2nd,
          flightLCashPrize3rd: form.flightLCashPrize3rd,
          lowGrossTrophy: form.lowGrossTrophy,
          lowGrossCashPrize: form.lowGrossCashPrize,
          closestToPin: form.closestToPin,
          createdAt: new Date().toISOString(),
        };
        await supabaseService.events.create(newEvent);
      }

      Alert.alert('Success', editingId ? 'Event updated successfully' : 'Event created successfully');
      resetForm();
      setEditingId(null);
      setModalVisible(false);
      await loadEvents();
    } catch (error) {
      console.error('Error saving event:', error);
      Alert.alert('Error', 'Failed to save event. Please try again.');
    }
  };

  const handleFormChange = (field: string, value: any) => {
    setForm({ ...form, [field]: value });
  };

  const handleDeleteEvent = async (id: string) => {
    setEventToDelete(id);
    setPinModalVisible(true);
  };

  const confirmDeleteWithPin = async () => {
    if (!currentUser || !currentUser.isAdmin) {
      Alert.alert('Error', 'Only administrators can delete events');
      return;
    }

    if (pinInput !== currentUser.pin) {
      Alert.alert('Error', 'Incorrect PIN. Please try again.');
      setPinInput('');
      return;
    }

    if (!eventToDelete) return;

    try {
      await supabaseService.events.delete(eventToDelete);
      
      console.log(`Deleted event ${eventToDelete} from Supabase`);
      Alert.alert('Success', 'Event deleted successfully');
      await loadEvents();
    } catch (error) {
      console.error('Error deleting event:', error);
      Alert.alert('Error', 'Failed to delete event');
    } finally {
      setPinModalVisible(false);
      setPinInput('');
      setEventToDelete(null);
    }
  };

  const cancelPinModal = () => {
    setPinModalVisible(false);
    setPinInput('');
    setEventToDelete(null);
  };

  const handleEditEvent = (event: Event) => {
    setEditingId(event.id);
    setForm({
      status: (event.status || 'upcoming') as 'upcoming' | 'active' | 'complete',
      type: (event.type || 'tournament') as 'tournament' | 'social',
      eventName: event.eventName || event.name || '',
      entryFee: String(event.entryFee || ''),
      course: event.course || event.location || '',
      address: event.address || '',
      city: event.city || '',
      state: event.state || '',
      zipcode: event.zipcode || '',
      startDate: formatDateForDisplay(event.startDate || event.date || ''),
      endDate: formatDateForDisplay(event.endDate || ''),
      numberOfDays: (event.numberOfDays || 1) as 1 | 2 | 3,
      day1StartTime: event.day1StartTime || '',
      day1StartPeriod: event.day1StartPeriod || 'AM',
      day1EndTime: event.day1EndTime || '',
      day1EndPeriod: event.day1EndPeriod || 'AM',
      day1Course: event.day1Course || '',
      day1StartType: event.day1StartType || 'tee-time',
      day1LeadingHole: event.day1LeadingHole || '',
      day1Par: event.day1Par || '',
      day1SlopeRating: event.day1SlopeRating || '',
      day1CourseRating: event.day1CourseRating || '',
      day2StartTime: event.day2StartTime || '',
      day2StartPeriod: event.day2StartPeriod || 'AM',
      day2EndTime: event.day2EndTime || '',
      day2EndPeriod: event.day2EndPeriod || 'AM',
      day2Course: event.day2Course || '',
      day2StartType: event.day2StartType || 'tee-time',
      day2LeadingHole: event.day2LeadingHole || '',
      day2Par: event.day2Par || '',
      day2SlopeRating: event.day2SlopeRating || '',
      day2CourseRating: event.day2CourseRating || '',
      day3StartTime: event.day3StartTime || '',
      day3StartPeriod: event.day3StartPeriod || 'AM',
      day3EndTime: event.day3EndTime || '',
      day3EndPeriod: event.day3EndPeriod || 'AM',
      day3Course: event.day3Course || '',
      day3StartType: event.day3StartType || 'tee-time',
      day3LeadingHole: event.day3LeadingHole || '',
      day3Par: event.day3Par || '',
      day3SlopeRating: event.day3SlopeRating || '',
      day3CourseRating: event.day3CourseRating || '',
      flightACutoff: event.flightACutoff || '',
      flightBCutoff: event.flightBCutoff || '',
      flightATeebox: event.flightATeebox || '',
      flightBTeebox: event.flightBTeebox || '',
      flightLTeebox: event.flightLTeebox || '',
      flightATrophy1st: event.flightATrophy1st || false,
      flightATrophy2nd: event.flightATrophy2nd || false,
      flightATrophy3rd: event.flightATrophy3rd || false,
      flightBTrophy1st: event.flightBTrophy1st || false,
      flightBTrophy2nd: event.flightBTrophy2nd || false,
      flightBTrophy3rd: event.flightBTrophy3rd || false,
      flightCTrophy1st: event.flightCTrophy1st || false,
      flightCTrophy2nd: event.flightCTrophy2nd || false,
      flightCTrophy3rd: event.flightCTrophy3rd || false,
      flightLTrophy1st: event.flightLTrophy1st || false,
      flightLTrophy2nd: event.flightLTrophy2nd || false,
      flightLTrophy3rd: event.flightLTrophy3rd || false,
      flightACashPrize1st: event.flightACashPrize1st || '',
      flightACashPrize2nd: event.flightACashPrize2nd || '',
      flightACashPrize3rd: event.flightACashPrize3rd || '',
      flightBCashPrize1st: event.flightBCashPrize1st || '',
      flightBCashPrize2nd: event.flightBCashPrize2nd || '',
      flightBCashPrize3rd: event.flightBCashPrize3rd || '',
      flightCCashPrize1st: event.flightCCashPrize1st || '',
      flightCCashPrize2nd: event.flightCCashPrize2nd || '',
      flightCCashPrize3rd: event.flightCCashPrize3rd || '',
      flightLCashPrize1st: event.flightLCashPrize1st || '',
      flightLCashPrize2nd: event.flightLCashPrize2nd || '',
      flightLCashPrize3rd: event.flightLCashPrize3rd || '',
      lowGrossTrophy: event.lowGrossTrophy || false,
      lowGrossCashPrize: event.lowGrossCashPrize || '',
      closestToPin: event.closestToPin || '',
      memo: event.memo || '',
      photoUrl: event.photoUrl || '',
      holePars: event.holePars || Array(18).fill(''),
      day1HolePars: event.day1HolePars || Array(18).fill(''),
      day2HolePars: event.day2HolePars || Array(18).fill(''),
      day3HolePars: event.day3HolePars || Array(18).fill(''),
    });
    setModalVisible(true);
  };

  const formatDateRange = (start: string, end: string) => {
    if (!start) return '';
    const formattedStart = formatDateForDisplay(start);
    if (!end || end === start) return formattedStart;
    const formattedEnd = formatDateForDisplay(end);
    return `${formattedStart} - ${formattedEnd}`;
  };

  const formatSchedule = (event: Partial<EventFormType>) => {
    const days = event.numberOfDays || 1;
    const schedules = [];

    if (days >= 1) {
      if (event.day1StartTime) {
        schedules.push(
          `Day 1: ${event.day1StartTime} ${event.day1StartPeriod} (${event.day1StartType})${event.day1Course ? ` - ${event.day1Course}` : ''}`
        );
      }
    }
    if (days >= 2) {
      if (event.day2StartTime) {
        schedules.push(
          `Day 2: ${event.day2StartTime} ${event.day2StartPeriod} (${event.day2StartType})${event.day2Course ? ` - ${event.day2Course}` : ''}`
        );
      }
    }
    if (days >= 3) {
      if (event.day3StartTime) {
        schedules.push(
          `Day 3: ${event.day3StartTime} ${event.day3StartPeriod} (${event.day3StartType})${event.day3Course ? ` - ${event.day3Course}` : ''}`
        );
      }
    }

    return schedules.join('\n');
  };

  const getEventAttendeeCount = (event: Event): number => {
    const registrations = eventRegistrations[event.id] || [];
    
    if (event.type === 'social') {
      const registeredPlayerIds = Array.from(new Set(event.registeredPlayers || []));
      const nonSponsorCount = registrations.filter(reg => !reg.isSponsor && registeredPlayerIds.includes(reg.memberId)).length;
      const nonSponsorGuestCount = registrations
        .filter(reg => !reg.isSponsor && registeredPlayerIds.includes(reg.memberId))
        .reduce((total, reg) => total + (reg.numberOfGuests || 0), 0);
      return nonSponsorCount + nonSponsorGuestCount;
    } else {
      return (event.registeredPlayers || []).length;
    }
  };

  const handleArchiveEvent = async (event: Event) => {
    try {
      console.log('📦 [AdminEvents] Archiving event:', event.id);
      await supabaseService.events.update(event.id, {
        archived: true,
        archivedAt: new Date().toISOString(),
      });
      Alert.alert('Success', 'Event archived successfully');
      await loadEvents();
    } catch (error) {
      console.error('❌ [AdminEvents] Error archiving event:', error instanceof Error ? error.message : JSON.stringify(error));
      Alert.alert('Error', `Failed to archive event: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleUnarchiveEvent = async (event: Event) => {
    try {
      console.log('📤 [AdminEvents] Unarchiving event:', event.id);
      await supabaseService.events.update(event.id, {
        archived: false,
        archivedAt: undefined,
      });
      Alert.alert('Success', 'Event unarchived successfully');
      await loadEvents();
    } catch (error) {
      console.error('❌ [AdminEvents] Error unarchiving event:', error instanceof Error ? error.message : JSON.stringify(error));
      Alert.alert('Error', `Failed to unarchive event: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };
  
  return (
    <View style={styles.container}>
      <View style={styles.customHeaderWrapper}>
        <View style={styles.header}>
          <Text style={styles.title}>Events</Text>
          <View style={styles.headerButtons}>
            <TouchableOpacity
              style={[styles.filterButton, showArchived && styles.filterButtonActive]}
              onPress={() => setShowArchived(!showArchived)}
            >
              <Text style={[styles.filterButtonText, showArchived && styles.filterButtonTextActive]}>
                {showArchived ? 'Hide Archived' : 'Show Archived'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => {
                setEditingId(null);
                resetForm();
                setModalVisible(true);
              }}
            >
              <Ionicons name="add" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </View>



      <FlatList
          data={showArchived ? events : events.filter(e => !e.archived)}
          keyExtractor={(item) => item.id}
          style={{ flex: 1 }}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <TouchableOpacity 
              style={styles.eventCard}
              onPress={() => handleEditEvent(item)}
            >
              {item.photoUrl && (
                <View style={styles.photoContainer}>
                  <Image 
                    source={{ uri: item.photoUrl }} 
                    style={styles.eventPhoto}
                  />
                  {item.archived && (
                    <View style={styles.archivedBadge}>
                      <Text style={styles.archivedBadgeText}>ARCHIVED</Text>
                    </View>
                  )}
                </View>
              )}
              <View style={styles.eventContent}>
                <Text style={styles.eventName}>{item.eventName || item.name || 'Event'}</Text>
                <Text style={styles.eventDetail}>📍 {item.course || item.location || 'TBA'}</Text>
                <Text style={styles.eventDetail}>📅 {formatDateRange(item.startDate || item.date || '', item.endDate || '')}</Text>
                {item.numberOfDays && (item.day1StartTime || item.day2StartTime || item.day3StartTime) ? (
                  <Text style={styles.eventDetail}>{formatSchedule({
                    numberOfDays: item.numberOfDays as 1 | 2 | 3 | undefined,
                    day1StartTime: item.day1StartTime,
                    day1StartPeriod: item.day1StartPeriod,
                    day1StartType: item.day1StartType,
                    day1Course: item.day1Course,
                    day2StartTime: item.day2StartTime,
                    day2StartPeriod: item.day2StartPeriod,
                    day2StartType: item.day2StartType,
                    day2Course: item.day2Course,
                    day3StartTime: item.day3StartTime,
                    day3StartPeriod: item.day3StartPeriod,
                    day3StartType: item.day3StartType,
                    day3Course: item.day3Course,
                  })}</Text>
                ) : null}
                <Text style={styles.eventPlayers}>{item.type === 'social' ? 'Attendees:' : 'Players:'} {getEventAttendeeCount(item)}</Text>
                <View style={styles.eventActionsRow}>
                  {!item.archived ? (
                    <TouchableOpacity
                      style={styles.archiveButton}
                      onPress={(e) => {
                        e.stopPropagation();
                        handleArchiveEvent(item);
                      }}
                    >
                      <Text style={styles.archiveButtonText}>Archive</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      style={styles.unarchiveButton}
                      onPress={(e) => {
                        e.stopPropagation();
                        handleUnarchiveEvent(item);
                      }}
                    >
                      <Text style={styles.unarchiveButtonText}>Unarchive</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={styles.deleteButtonCircle}
                    onPress={(e) => {
                      e.stopPropagation();
                      handleDeleteEvent(item.id);
                    }}
                  >
                    <Ionicons name="close" size={24} color="#fff" />
                  </TouchableOpacity>
                </View>
                {item.entryFee ? (
                  <View style={styles.entryFeeBadge}>
                    <Text style={styles.entryFeeText}>💰 ${item.entryFee}</Text>
                  </View>
                ) : null}
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={<Text style={styles.emptyText}>No events found.</Text>}
        />

        <AddEventModal
          visible={modalVisible}
          isEditing={!!editingId}
          form={form}
          onFormChange={handleFormChange}
          onClose={() => {
            setModalVisible(false);
            setEditingId(null);
            resetForm();
          }}
          onSave={handleSaveEvent}
        />

        <Modal
          visible={pinModalVisible}
          transparent
          animationType="fade"
          onRequestClose={cancelPinModal}
        >
          <View style={styles.pinModalOverlay}>
            <View style={styles.pinModalContent}>
              <Text style={styles.pinModalTitle}>Confirm Deletion</Text>
              <Text style={styles.pinModalMessage}>
                Enter your admin PIN to confirm deletion of this event.
                This will permanently delete all event data including registrations, scores, and groupings.
              </Text>
              <TextInput
                style={styles.pinInput}
                value={pinInput}
                onChangeText={setPinInput}
                placeholder="Enter PIN"
                placeholderTextColor="#999"
                keyboardType="number-pad"
                secureTextEntry
                maxLength={4}
                autoFocus
              />
              <View style={styles.pinModalButtons}>
                <TouchableOpacity
                  style={[styles.pinModalButton, styles.pinModalCancelButton]}
                  onPress={cancelPinModal}
                >
                  <Text style={styles.pinModalCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.pinModalButton, styles.pinModalConfirmButton]}
                  onPress={confirmDeleteWithPin}
                >
                  <Text style={styles.pinModalConfirmText}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

      <AdminFooter />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  customHeaderWrapper: {
    position: 'absolute' as 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 145,
    zIndex: 1000,
    backgroundColor: '#003366',
  },
  header: {
    backgroundColor: '#003366',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
  },

  headerButtons: {
    position: 'absolute' as 'absolute',
    right: 16,
    top: 60,
    flexDirection: 'row' as 'row',
    gap: 8,
    alignItems: 'center',
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  filterButtonActive: {
    backgroundColor: '#fff',
  },
  filterButtonText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#fff',
  },
  filterButtonTextActive: {
    color: '#003366',
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingTop: 160,
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  eventCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  photoContainer: {
    width: '100%',
    height: 200,
    position: 'relative' as const,
  },
  eventPhoto: {
    width: '100%',
    height: 200,
    resizeMode: 'cover' as const,
  },
  archivedBadge: {
    position: 'absolute' as const,
    top: 12,
    left: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  archivedBadgeText: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: '#fff',
    letterSpacing: 0.5,
  },
  eventContent: {
    padding: 16,
    flexDirection: 'column' as const,
    position: 'relative' as const,
  },
  eventName: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#1a1a1a',
    marginBottom: 8,
  },
  eventDetail: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
  },
  eventPlayers: {
    fontSize: 13,
    color: '#007AFF',
    fontWeight: '500' as const,
    marginTop: 4,
    marginBottom: 8,
  },
  eventActionsRow: {
    flexDirection: 'row' as const,
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  archiveButton: {
    backgroundColor: '#374151',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  archiveButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600' as const,
  },
  unarchiveButton: {
    backgroundColor: '#34C759',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  unarchiveButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600' as const,
  },
  deleteButtonCircle: {
    position: 'absolute' as const,
    top: 16,
    right: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FF3B30',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  entryFeeBadge: {
    position: 'absolute' as const,
    bottom: 16,
    right: 16,
    backgroundColor: '#007AFF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  entryFeeText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600' as const,
  },
  emptyText: {
    textAlign: 'center' as const,
    color: '#999',
    marginTop: 40,
  },
  pinModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  pinModalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  pinModalTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#1a1a1a',
    marginBottom: 12,
    textAlign: 'center' as const,
  },
  pinModalMessage: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center' as const,
    lineHeight: 20,
  },
  pinInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center' as const,
  },
  pinModalButtons: {
    flexDirection: 'row' as const,
    gap: 12,
  },
  pinModalButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  pinModalCancelButton: {
    backgroundColor: '#f5f5f5',
  },
  pinModalConfirmButton: {
    backgroundColor: '#FF3B30',
  },
  pinModalCancelText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#666',
  },
  pinModalConfirmText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#fff',
  },

});
