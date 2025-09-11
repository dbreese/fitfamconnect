<script setup lang="ts">
import { ScheduleService } from '@/service/ScheduleService';
import { ClassService } from '@/service/ClassService';
import { LocationService } from '@/service/LocationService';
import { CoachService } from '@/service/CoachService';
import type { ISchedule } from '@/server/db/schedule';
import type { IClass } from '@/server/db/class';
import type { ILocation } from '@/server/db/location';
import Card from 'primevue/card';
import Dialog from 'primevue/dialog';
import Button from 'primevue/button';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import InputText from 'primevue/inputtext';
import Textarea from 'primevue/textarea';
import Select from 'primevue/select';
import Calendar from 'primevue/calendar';
import Checkbox from 'primevue/checkbox';
import Toast from 'primevue/toast';
import ConfirmDialog from 'primevue/confirmdialog';
import ProgressSpinner from 'primevue/progressspinner';
import Tag from 'primevue/tag';
import TabView from 'primevue/tabview';
import TabPanel from 'primevue/tabpanel';
import { ref, onMounted, computed, watch } from 'vue';
import { useToast } from 'primevue/usetoast';
import { useConfirm } from 'primevue/useconfirm';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
const toast = useToast();
const confirm = useConfirm();

const schedules = ref<any[]>([]);
const classes = ref<IClass[]>([]);
const locations = ref<ILocation[]>([]);
const coaches = ref<any[]>([]);
const loading = ref(false);
const showDialog = ref(false);
const editMode = ref(false);
const selectedSchedule = ref<any | null>(null);
const currentView = ref('week');
const currentDate = ref(new Date());
const hideEmptySlots = ref(false);
const activeTab = ref(0);
const scheduleFilter = ref('all');

const formData = ref({
    classId: '',
    locationId: '',
    coachId: '',
    // For one-time schedules
    startDateTime: new Date(),
    endDateTime: null as Date | null,
    // For recurring schedules
    startDate: null as Date | null,
    endDate: null as Date | null,
    timeOfDay: null as Date | null,
    maxAttendees: null as string | null,
    notes: '',
    isRecurring: false,
    recurringPattern: {
        frequency: 'weekly' as 'daily' | 'weekly' | 'monthly',
        interval: '1' as string,
        daysOfWeek: [] as number[]
    }
});

const frequencyOptions = [
    { label: 'Daily', value: 'daily' },
    { label: 'Weekly', value: 'weekly' },
    { label: 'Monthly', value: 'monthly' }
];

const daysOfWeek = [
    { label: 'Sunday', value: 0 },
    { label: 'Monday', value: 1 },
    { label: 'Tuesday', value: 2 },
    { label: 'Wednesday', value: 3 },
    { label: 'Thursday', value: 4 },
    { label: 'Friday', value: 5 },
    { label: 'Saturday', value: 6 }
];

const filterOptions = [
    { label: 'All Schedules', value: 'all' },
    { label: 'Recurring Only', value: 'recurring' },
    { label: 'One-Time Only', value: 'non-recurring' }
];

const classOptions = computed(() => {
    return classes.value.map((cls) => ({
        label: cls.category ? `${cls.name} (${cls.category})` : cls.name,
        value: cls._id
    }));
});

const locationOptions = computed(() => {
    return locations.value.map((loc) => ({
        label: loc.name,
        value: loc._id
    }));
});

const coachOptions = computed(() => {
    return [
        { label: t('schedules.noCoachOption'), value: '' },
        ...coaches.value.map((coach) => ({
            label: `${coach.firstName} ${coach.lastName}`,
            value: coach._id
        }))
    ];
});

const filteredSchedules = computed(() => {
    if (scheduleFilter.value === 'all') {
        return schedules.value;
    } else if (scheduleFilter.value === 'recurring') {
        return schedules.value.filter((schedule) => schedule.isRecurring);
    } else if (scheduleFilter.value === 'non-recurring') {
        return schedules.value.filter((schedule) => !schedule.isRecurring);
    }
    return schedules.value;
});

// Color mapping for classes
const classColors = ref<Map<string, string>>(new Map());
const colorPalette = [
    '#3B82F6',
    '#EF4444',
    '#10B981',
    '#F59E0B',
    '#8B5CF6',
    '#EC4899',
    '#06B6D4',
    '#84CC16',
    '#F97316',
    '#6366F1'
];

function getClassColor(classId: string): string {
    if (!classColors.value.has(classId)) {
        const colorIndex = classColors.value.size % colorPalette.length;
        classColors.value.set(classId, colorPalette[colorIndex]);
    }
    return classColors.value.get(classId) || '#6B7280';
}

async function loadSchedules() {
    loading.value = true;
    try {
        const startDate = new Date(currentDate.value);
        startDate.setDate(startDate.getDate() - startDate.getDay()); // Start of week

        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 6); // End of week

        const result = await ScheduleService.getSchedulesByDateRange(startDate.toISOString(), endDate.toISOString());

        if (result) {
            schedules.value = result;
            console.log(`Loaded ${result.length} schedules`);
        } else {
            schedules.value = [];
        }
    } catch (error) {
        console.error('Error loading schedules:', error);
        toast.add({
            severity: 'error',
            summary: t('feedback.errorTitle'),
            detail: t('schedules.error.loadFailed'),
            life: 3000
        });
    } finally {
        loading.value = false;
    }
}

async function loadAllSchedules() {
    loading.value = true;
    try {
        const result = await ScheduleService.getMySchedules();

        if (result) {
            schedules.value = result;
            console.log(`Loaded ${result.length} schedules`);
        } else {
            schedules.value = [];
        }
    } catch (error) {
        console.error('Error loading schedules:', error);
        toast.add({
            severity: 'error',
            summary: t('feedback.errorTitle'),
            detail: t('schedules.error.loadFailed'),
            life: 3000
        });
    } finally {
        loading.value = false;
    }
}

async function loadClasses() {
    try {
        const result = await ClassService.getMyClasses();
        if (result) {
            classes.value = result;
            console.log(`Loaded ${result.length} classes`);
        }
    } catch (error) {
        console.error('Error loading classes:', error);
    }
}

async function loadLocations() {
    try {
        const result = await LocationService.getMyLocations();
        if (result) {
            locations.value = result;
            console.log(`Loaded ${result.length} locations`);
        }
    } catch (error) {
        console.error('Error loading locations:', error);
    }
}

async function loadCoaches() {
    try {
        const result = await CoachService.getCoaches();
        if (result) {
            coaches.value = result;
            console.log(`Loaded ${result.length} coaches`);
        }
    } catch (error) {
        console.error('Error loading coaches:', error);
    }
}

function openNewDialog() {
    editMode.value = false;
    selectedSchedule.value = null;
    resetForm();
    showDialog.value = true;
}

async function openEditDialog(schedule: any) {
    editMode.value = true;
    selectedSchedule.value = schedule;

    // If this is a recurring instance, we need to fetch the original schedule
    let originalSchedule = schedule;
    if (schedule.isRecurringInstance) {
        try {
            const result = await ScheduleService.getScheduleById(schedule._id);
            if (result) {
                originalSchedule = result;
            }
        } catch (error) {
            console.error('Error fetching original schedule:', error);
            // Fall back to the instance data if we can't fetch the original
        }
    }

    formData.value = {
        classId: originalSchedule.classId,
        locationId: originalSchedule.locationId,
        coachId: originalSchedule.coachId || '',
        // For one-time schedules
        startDateTime: originalSchedule.startDateTime ? new Date(originalSchedule.startDateTime) : new Date(),
        endDateTime: originalSchedule.endDateTime ? new Date(originalSchedule.endDateTime) : null,
        // For recurring schedules
        startDate: originalSchedule.startDate ? new Date(originalSchedule.startDate) : null,
        endDate: originalSchedule.endDate ? new Date(originalSchedule.endDate) : null,
        timeOfDay: originalSchedule.timeOfDay ? new Date(originalSchedule.timeOfDay) : null,
        maxAttendees: originalSchedule.maxAttendees ? originalSchedule.maxAttendees.toString() : null,
        notes: originalSchedule.notes || '',
        isRecurring: originalSchedule.isRecurring || false,
        recurringPattern: {
            frequency: originalSchedule.recurringPattern?.frequency || 'weekly',
            interval: originalSchedule.recurringPattern?.interval
                ? originalSchedule.recurringPattern.interval.toString()
                : '1',
            daysOfWeek: originalSchedule.recurringPattern?.daysOfWeek || []
        }
    };
    showDialog.value = true;
}

function resetForm() {
    // Set default start time to 6:00 AM (within 4 AM - 10 PM range)
    const defaultStartTime = new Date();
    defaultStartTime.setHours(6, 0, 0, 0);

    // Set default time of day for recurring schedules
    const defaultTimeOfDay = new Date();
    defaultTimeOfDay.setHours(6, 0, 0, 0);

    formData.value = {
        classId: '',
        locationId: '',
        coachId: '',
        // For one-time schedules
        startDateTime: defaultStartTime,
        endDateTime: null,
        // For recurring schedules
        startDate: null,
        endDate: null,
        timeOfDay: defaultTimeOfDay,
        maxAttendees: null,
        notes: '',
        isRecurring: false,
        recurringPattern: {
            frequency: 'weekly',
            interval: '1',
            daysOfWeek: []
        }
    };
}

function validateForm(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!formData.value.classId) {
        errors.push(t('schedules.validation.classRequired'));
    }

    if (!formData.value.locationId) {
        errors.push(t('schedules.validation.locationRequired'));
    }

    if (formData.value.isRecurring) {
        // For recurring schedules
        if (!formData.value.startDate) {
            errors.push(t('schedules.validation.startDateRequired'));
        }
        if (!formData.value.timeOfDay) {
            errors.push(t('schedules.validation.timeOfDayRequired'));
        }
        if (formData.value.recurringPattern.daysOfWeek.length === 0) {
            errors.push(t('schedules.validation.daysRequired'));
        }
    } else {
        // For one-time schedules
        if (!formData.value.startDateTime) {
            errors.push(t('schedules.validation.startTimeRequired'));
        }
    }

    return {
        isValid: errors.length === 0,
        errors
    };
}

async function handleSubmit() {
    const validation = validateForm();
    if (!validation.isValid) {
        toast.add({
            severity: 'warn',
            summary: t('schedules.validation.validationError'),
            detail: validation.errors[0],
            life: 5000
        });
        return;
    }

    loading.value = true;
    try {
        let result;

        const submitData = {
            ...formData.value,
            // For one-time schedules
            startDateTime: formData.value.isRecurring ? undefined : formData.value.startDateTime,
            endDateTime: formData.value.isRecurring ? undefined : formData.value.endDateTime || undefined,
            // For recurring schedules
            startDate: formData.value.isRecurring ? formData.value.startDate || undefined : undefined,
            endDate: formData.value.isRecurring ? formData.value.endDate || undefined : undefined,
            timeOfDay: formData.value.isRecurring ? formData.value.timeOfDay || undefined : undefined,
            maxAttendees: formData.value.maxAttendees ? parseInt(formData.value.maxAttendees) : undefined,
            notes: formData.value.notes.trim() || undefined,
            coachId: formData.value.coachId && formData.value.coachId.trim() ? formData.value.coachId : undefined,
            recurringPattern: formData.value.isRecurring
                ? {
                      ...formData.value.recurringPattern,
                      interval: parseInt(formData.value.recurringPattern.interval)
                  }
                : undefined
        };

        console.log('ScheduleManagement.handleSubmit: submitData.coachId =', submitData.coachId);
        console.log('ScheduleManagement.handleSubmit: formData.coachId =', formData.value.coachId);

        // Explicitly handle coachId removal by using a special marker
        const finalSubmitData = { ...submitData };
        if (submitData.coachId === undefined) {
            finalSubmitData.coachId = '__REMOVE__';
        }

        console.log('ScheduleManagement.handleSubmit: finalSubmitData.coachId =', finalSubmitData.coachId);

        if (editMode.value && selectedSchedule.value) {
            result = await ScheduleService.updateSchedule((selectedSchedule.value as any)._id, finalSubmitData);
        } else {
            result = await ScheduleService.createSchedule(submitData);
        }

        if (result && result.responseCode === 200) {
            toast.add({
                severity: 'success',
                summary: t('feedback.successTitle'),
                detail: editMode.value ? t('schedules.success.updated') : t('schedules.success.created'),
                life: 3000
            });
            showDialog.value = false;
            await loadSchedules();
        } else {
            toast.add({
                severity: 'error',
                summary: t('feedback.errorTitle'),
                detail: editMode.value ? t('schedules.error.updateFailed') : t('schedules.error.createFailed'),
                life: 3000
            });
        }
    } catch (error) {
        console.error('Error submitting schedule:', error);
        toast.add({
            severity: 'error',
            summary: t('feedback.errorTitle'),
            detail: editMode.value ? t('schedules.error.updateFailed') : t('schedules.error.createFailed'),
            life: 3000
        });
    } finally {
        loading.value = false;
    }
}

function confirmDelete(schedule: any) {
    confirm.require({
        message: t('schedules.deleteMessage', { name: schedule.class?.name }),
        header: t('schedules.deleteConfirmation'),
        icon: 'pi pi-info-circle',
        rejectLabel: t('schedules.cancel'),
        rejectProps: {
            label: t('schedules.cancel'),
            severity: 'secondary',
            outlined: true
        },
        acceptProps: {
            label: t('schedules.delete'),
            severity: 'danger'
        },
        accept: () => {
            deleteSchedule(schedule);
        }
    });
}

async function deleteSchedule(schedule: any) {
    loading.value = true;
    try {
        const result = await ScheduleService.deleteSchedule((schedule as any)._id);
        if (result && result.responseCode === 200) {
            toast.add({
                severity: 'success',
                summary: t('feedback.successTitle'),
                detail: t('schedules.success.deleted'),
                life: 3000
            });
            await loadSchedules();
        } else {
            toast.add({
                severity: 'error',
                summary: t('feedback.errorTitle'),
                detail: t('schedules.error.deleteFailed'),
                life: 3000
            });
        }
    } catch (error) {
        console.error('Error deleting schedule:', error);
        toast.add({
            severity: 'error',
            summary: t('feedback.errorTitle'),
            detail: t('schedules.error.deleteFailed'),
            life: 3000
        });
    } finally {
        loading.value = false;
    }
}

function formatTime(date: string | Date): string {
    return new Date(date).toLocaleTimeString([], {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    });
}

function formatDate(date: string | Date): string {
    return new Date(date).toLocaleDateString();
}

function formatDuration(start: string | Date, end: string | Date): string {
    const startTime = new Date(start);
    const endTime = new Date(end);
    const diffMs = endTime.getTime() - startTime.getTime();
    const diffMins = Math.round(diffMs / 60000);
    return `${diffMins} min`;
}

function formatScheduleType(schedule: any): string {
    return schedule.isRecurring ? t('schedules.recurring') : t('schedules.oneTime');
}

function formatScheduleDates(schedule: any): string {
    if (schedule.isRecurring) {
        const startDate = schedule.startDate ? formatDate(schedule.startDate) : '';
        const endDate = schedule.endDate ? formatDate(schedule.endDate) : t('schedules.noEndDate');
        return `${startDate} - ${endDate}`;
    } else {
        return formatDate(schedule.startDateTime);
    }
}

function formatScheduleTimes(schedule: any): string {
    if (schedule.isRecurring) {
        return schedule.timeOfDay ? formatTime(schedule.timeOfDay) : '';
    } else {
        return `${formatTime(schedule.startDateTime)} - ${formatTime(schedule.endDateTime)}`;
    }
}

function formatRecurringPattern(schedule: any): string {
    if (!schedule.isRecurring || !schedule.recurringPattern) return '';

    const { frequency, interval, daysOfWeek } = schedule.recurringPattern;

    if (frequency === 'weekly' && daysOfWeek && daysOfWeek.length > 0) {
        const dayNames = daysOfWeek.map((day: number) => {
            const dayObj = daysOfWeek.find((d: any) => d.value === day);
            return dayObj
                ? dayObj.label
                : ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][day];
        });
        return `${t('schedules.every')} ${interval} ${t('schedules.week')} (${dayNames.join(', ')})`;
    }

    return `${t('schedules.every')} ${interval} ${frequency}`;
}

function getWeekDates(): Date[] {
    const startDate = new Date(currentDate.value);
    startDate.setDate(startDate.getDate() - startDate.getDay());

    const weekDates = [];
    for (let i = 0; i < 7; i++) {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + i);
        weekDates.push(date);
    }
    return weekDates;
}

function getSchedulesForDay(dayDate: Date): any[] {
    const dayStart = new Date(dayDate);
    dayStart.setHours(0, 0, 0, 0);

    const dayEnd = new Date(dayDate);
    dayEnd.setHours(23, 59, 59, 999);

    return schedules.value.filter((schedule) => {
        const scheduleDate = new Date(schedule.startDateTime);
        return scheduleDate >= dayStart && scheduleDate <= dayEnd;
    });
}

function getTimeSlots(): Array<{ key: string; label: string; hour: number; minute: number }> {
    const timeSlots = [];

    // Generate time slots from 4 AM to 10 PM in 15-minute intervals
    for (let hour = 4; hour <= 22; hour++) {
        for (let minute = 0; minute < 60; minute += 15) {
            // Skip 10 PM slots (we only go to 10 PM, not 10:15 PM)
            if (hour === 22 && minute > 0) break;

            // Convert to 12-hour format
            const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
            const ampm = hour < 12 ? 'AM' : 'PM';
            const timeString = `${displayHour}:${minute.toString().padStart(2, '0')} ${ampm}`;

            timeSlots.push({
                key: `${hour}-${minute}`,
                label: timeString,
                hour,
                minute
            });
        }
    }

    return timeSlots;
}

function getSchedulesForTimeSlot(dayDate: Date, timeSlot: { hour: number; minute: number }): any[] {
    const dayStart = new Date(dayDate);
    dayStart.setHours(0, 0, 0, 0);

    const dayEnd = new Date(dayDate);
    dayEnd.setHours(23, 59, 59, 999);

    // Calculate the time slot boundaries
    const slotStart = new Date(dayDate);
    slotStart.setHours(timeSlot.hour, timeSlot.minute, 0, 0);

    const slotEnd = new Date(dayDate);
    slotEnd.setHours(timeSlot.hour, timeSlot.minute + 15, 0, 0);

    return schedules.value.filter((schedule) => {
        const scheduleStart = new Date(schedule.startDateTime);
        const scheduleEnd = new Date(schedule.endDateTime);

        // Check if schedule is on the same day
        if (scheduleStart < dayStart || scheduleStart > dayEnd) {
            return false;
        }

        // Check if schedule overlaps with this time slot
        // Schedule overlaps if: schedule starts before slot ends AND schedule ends after slot starts
        return scheduleStart < slotEnd && scheduleEnd > slotStart;
    });
}

function hasSchedulesInTimeSlot(timeSlot: { hour: number; minute: number }): boolean {
    const weekDates = getWeekDates();
    return weekDates.some((dayDate) => {
        const schedulesForSlot = getSchedulesForTimeSlot(dayDate, timeSlot);
        return schedulesForSlot.length > 0;
    });
}

function getScheduleSpan(schedule: any): number {
    if (!schedule.endDateTime) return 1;

    const startTime = new Date(schedule.startDateTime);
    const endTime = new Date(schedule.endDateTime);
    const durationMinutes = (endTime.getTime() - startTime.getTime()) / (1000 * 60);

    // Calculate how many 15-minute slots this spans
    return Math.ceil(durationMinutes / 15);
}

function isFirstSlotForSchedule(schedule: any, dayDate: Date, timeSlot: { hour: number; minute: number }): boolean {
    const scheduleStart = new Date(schedule.startDateTime);
    const slotStart = new Date(dayDate);
    slotStart.setHours(timeSlot.hour, timeSlot.minute, 0, 0);
    const slotEnd = new Date(dayDate);
    slotEnd.setHours(timeSlot.hour, timeSlot.minute + 15, 0, 0);

    // This is the first slot if the schedule starts within this time slot
    return scheduleStart >= slotStart && scheduleStart < slotEnd;
}

function getVisibleTimeSlots(): Array<{
    key: string;
    label: string;
    hour: number;
    minute: number;
    isGrouped?: boolean;
    groupSize?: number;
}> {
    if (!hideEmptySlots.value) {
        return getTimeSlots();
    }

    const allTimeSlots = getTimeSlots();
    const groupedSlots = [];
    let i = 0;

    while (i < allTimeSlots.length) {
        const currentSlot = allTimeSlots[i];

        if (hasSchedulesInTimeSlot(currentSlot)) {
            // Slot has schedules - add it normally
            groupedSlots.push(currentSlot);
            i++;
        } else {
            // Slot is empty - find consecutive empty slots
            let emptyCount = 1;
            let j = i + 1;

            while (j < allTimeSlots.length && !hasSchedulesInTimeSlot(allTimeSlots[j])) {
                emptyCount++;
                j++;
            }

            // Add a single grouped slot representing all consecutive empty slots
            groupedSlots.push({
                ...currentSlot,
                isGrouped: true,
                groupSize: emptyCount
            });

            i = j; // Skip all the empty slots we just grouped
        }
    }

    return groupedSlots;
}

function getEndTimeForGroup(timeSlot: any): string {
    if (!timeSlot.isGrouped || !timeSlot.groupSize) return timeSlot.label;

    const startHour = timeSlot.hour;
    const startMinute = timeSlot.minute;
    const totalMinutes = startHour * 60 + startMinute + timeSlot.groupSize * 15;
    const endHour = Math.floor(totalMinutes / 60);
    const endMinute = totalMinutes % 60;

    // Convert to 12-hour format
    const displayHour = endHour === 0 ? 12 : endHour > 12 ? endHour - 12 : endHour;
    const ampm = endHour < 12 ? 'AM' : 'PM';

    return `${displayHour}:${endMinute.toString().padStart(2, '0')} ${ampm}`;
}

function navigateWeek(direction: 'prev' | 'next') {
    const newDate = new Date(currentDate.value);
    newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
    currentDate.value = newDate;
    loadSchedules();
}

// Watch for class selection changes to auto-calculate end time (one-time schedules only)
watch(
    () => formData.value.classId,
    (newClassId) => {
        if (newClassId && !formData.value.isRecurring && formData.value.startDateTime) {
            const selectedClass = classes.value.find((cls) => cls._id === newClassId);
            if (selectedClass) {
                const startTime = new Date(formData.value.startDateTime);
                const endTime = new Date(startTime.getTime() + selectedClass.duration * 60000);
                formData.value.endDateTime = endTime;
            }
        }
    }
);

// Watch for start time changes to auto-calculate end time (one-time schedules only)
watch(
    () => formData.value.startDateTime,
    (newStartTime) => {
        if (newStartTime && !formData.value.isRecurring && formData.value.classId) {
            const selectedClass = classes.value.find((cls) => cls._id === formData.value.classId);
            if (selectedClass) {
                const startTime = new Date(newStartTime);
                const endTime = new Date(startTime.getTime() + selectedClass.duration * 60000);
                formData.value.endDateTime = endTime;
            }
        }
    }
);

// Watch for tab changes to load appropriate data
watch(
    () => activeTab.value,
    (newTab) => {
        if (newTab === 1) {
            // List view
            loadAllSchedules();
        } else if (newTab === 0) {
            // Week view
            loadSchedules();
        }
    }
);

function onTabChange(event: any) {
    activeTab.value = event.index;
}

onMounted(() => {
    loadSchedules();
    loadClasses();
    loadLocations();
    loadCoaches();
});
</script>

<template>
    <Fluid>
        <div class="flex progresscontainer">
            <div v-if="loading" class="spinner-overlay progressoverlay">
                <ProgressSpinner aria-label="Loading" />
            </div>

            <Card class="card-style">
                <template #title>{{ t('schedules.title') }}</template>
                <template #subtitle>{{ t('schedules.subtitle') }}</template>
                <template #content>
                    <TabView v-model:activeIndex="activeTab" @tab-change="onTabChange">
                        <!-- Weekly View Tab -->
                        <TabPanel :header="t('schedules.weeklyView')" value="week">
                            <div class="mb-4 flex justify-between items-center">
                                <div class="flex items-center gap-4">
                                    <Button
                                        icon="pi pi-chevron-left"
                                        @click="navigateWeek('prev')"
                                        size="small"
                                        severity="secondary"
                                    />
                                    <h3 class="text-lg font-semibold">
                                        {{
                                            currentDate.toLocaleDateString('en-US', {
                                                month: 'long',
                                                year: 'numeric'
                                            })
                                        }}
                                    </h3>
                                    <Button
                                        icon="pi pi-chevron-right"
                                        @click="navigateWeek('next')"
                                        size="small"
                                        severity="secondary"
                                    />
                                </div>
                                <div class="flex gap-2">
                                    <Button
                                        :icon="hideEmptySlots ? 'pi pi-eye' : 'pi pi-eye-slash'"
                                        :label="
                                            hideEmptySlots ? t('schedules.showAllSlots') : t('schedules.hideEmptySlots')
                                        "
                                        @click="hideEmptySlots = !hideEmptySlots"
                                        severity="secondary"
                                        size="small"
                                        class="compact-button"
                                    />
                                    <Button
                                        icon="pi pi-plus"
                                        :label="t('schedules.newSchedule')"
                                        @click="openNewDialog"
                                    />
                                </div>
                            </div>

                            <!-- Weekly Calendar Grid -->
                            <div class="grid grid-cols-8 gap-2 mb-4">
                                <!-- Time column header -->
                                <div class="p-2 font-semibold text-center bg-gray-100 rounded">
                                    {{ t('schedules.time') }}
                                </div>

                                <!-- Day headers -->
                                <div
                                    v-for="dayDate in getWeekDates()"
                                    :key="dayDate.toISOString()"
                                    class="p-2 font-semibold text-center bg-gray-100 rounded"
                                >
                                    <div>{{ dayDate.toLocaleDateString('en-US', { weekday: 'short' }) }}</div>
                                    <div class="text-sm">{{ dayDate.getDate() }}</div>
                                </div>
                            </div>

                            <!-- Time slots (4 AM to 10 PM in 15-minute intervals) -->
                            <div class="grid grid-cols-8">
                                <template v-for="timeSlot in getVisibleTimeSlots()" :key="timeSlot.key">
                                    <!-- Time label -->
                                    <div
                                        :class="[
                                            'text-xs text-gray-600 bg-gray-50 relative z-10',
                                            timeSlot.isGrouped ? 'p-1' : 'p-2'
                                        ]"
                                    >
                                        <span v-if="timeSlot.isGrouped">
                                            {{ timeSlot.label }} - {{ getEndTimeForGroup(timeSlot) }}
                                        </span>
                                        <span v-else>
                                            {{ timeSlot.label }}
                                        </span>
                                    </div>

                                    <!-- Schedule slots for each day -->
                                    <div
                                        v-for="dayDate in getWeekDates()"
                                        :key="`${timeSlot.key}-${dayDate.toISOString()}`"
                                        :class="['relative', timeSlot.isGrouped ? 'min-h-[10px]' : 'min-h-[80px]']"
                                    >
                                        <!-- Find schedules for this time slot and day -->
                                        <div
                                            v-for="schedule in getSchedulesForTimeSlot(dayDate, timeSlot)"
                                            :key="schedule._id"
                                            class="absolute inset-0 text-xs p-1 text-white cursor-pointer hover:opacity-80"
                                            :style="{ backgroundColor: getClassColor(schedule.classId) }"
                                            @click="openEditDialog(schedule)"
                                        >
                                            <!-- Show full class info only in the first time slot -->
                                            <template v-if="isFirstSlotForSchedule(schedule, dayDate, timeSlot)">
                                                <div class="font-semibold truncate">
                                                    {{ schedule.class?.name }} ({{ schedule.class?.category }})
                                                </div>
                                                <div class="text-xs opacity-90">{{ schedule.location?.name }}</div>
                                                <div class="text-xs opacity-90">
                                                    {{ formatTime(schedule.startDateTime) }} -
                                                    {{ formatTime(schedule.endDateTime) }}
                                                </div>
                                            </template>
                                            <!-- Show continuation indicator in subsequent slots -->
                                            <template v-else>
                                                <div class="text-center opacity-75">⋯</div>
                                            </template>
                                        </div>
                                    </div>
                                </template>
                            </div>
                        </TabPanel>

                        <!-- List View Tab -->
                        <TabPanel :header="t('schedules.listView')" value="list">
                            <div class="flex justify-between items-center mb-3">
                                <div class="flex items-center gap-3">
                                    <label class="font-medium">{{ t('schedules.filter') }}:</label>
                                    <Select
                                        v-model="scheduleFilter"
                                        :options="filterOptions"
                                        optionLabel="label"
                                        optionValue="value"
                                        class="w-48"
                                    />
                                    <span class="text-sm text-gray-600 whitespace-nowrap">
                                        {{ filteredSchedules.length }} {{ t('schedules.schedulesFound') }}
                                    </span>
                                </div>
                                <Button
                                    icon="pi pi-plus"
                                    :label="t('schedules.newSchedule')"
                                    @click="openNewDialog"
                                    class="ml-auto"
                                />
                            </div>

                            <DataTable :value="filteredSchedules" paginator :rows="10" responsiveLayout="scroll">
                                <Column field="class" :header="t('schedules.class')" sortable>
                                    <template #body="{ data }">
                                        <div class="flex items-center gap-2">
                                            <div
                                                class="w-3 h-3 rounded-full"
                                                :style="{ backgroundColor: getClassColor(data.classId) }"
                                            ></div>
                                            {{ data.class?.name }}
                                        </div>
                                    </template>
                                </Column>
                                <Column field="location" :header="t('schedules.location')" sortable>
                                    <template #body="{ data }">
                                        {{ data.location?.name }}
                                    </template>
                                </Column>
                                <Column field="isRecurring" :header="t('schedules.type')" sortable>
                                    <template #body="{ data }">
                                        <Tag
                                            :value="formatScheduleType(data)"
                                            :severity="data.isRecurring ? 'info' : 'success'"
                                        />
                                    </template>
                                </Column>
                                <Column field="startDate" :header="t('schedules.dates')" sortable>
                                    <template #body="{ data }">
                                        {{ formatScheduleDates(data) }}
                                    </template>
                                </Column>
                                <Column field="timeOfDay" :header="t('schedules.time')" sortable>
                                    <template #body="{ data }">
                                        {{ formatScheduleTimes(data) }}
                                    </template>
                                </Column>
                                <Column field="recurringPattern" :header="t('schedules.pattern')">
                                    <template #body="{ data }">
                                        {{ formatRecurringPattern(data) }}
                                    </template>
                                </Column>
                                <Column field="maxAttendees" :header="t('schedules.maxAttendees')">
                                    <template #body="{ data }">
                                        {{ data.maxAttendees || t('schedules.unlimited') }}
                                    </template>
                                </Column>
                        <Column field="coach" :header="t('schedules.coach')">
                            <template #body="{ data }">
                                {{
                                    data.coach
                                        ? `${data.coach.firstName} ${data.coach.lastName}`
                                        : t('schedules.noCoach')
                                }}
                            </template>
                        </Column>
                                <Column :header="t('schedules.actions')">
                                    <template #body="{ data }">
                                        <div class="flex gap-2">
                                            <Button
                                                icon="pi pi-pencil"
                                                size="small"
                                                severity="secondary"
                                                @click="openEditDialog(data)"
                                            />
                                            <Button
                                                icon="pi pi-trash"
                                                size="small"
                                                severity="danger"
                                                @click="confirmDelete(data)"
                                            />
                                        </div>
                                    </template>
                                </Column>
                            </DataTable>
                        </TabPanel>
                    </TabView>
                </template>
            </Card>

            <!-- Create/Edit Dialog -->
            <Dialog
                v-model:visible="showDialog"
                :modal="true"
                :header="editMode ? t('schedules.editSchedule') : t('schedules.newSchedule')"
                :pt="{ root: { class: 'w-[90vw] md:w-[70vw] lg:w-[60vw]' } }"
            >
                <form @submit.prevent="handleSubmit" class="space-y-4">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div class="field">
                            <label for="class" class="font-medium">{{ t('schedules.class') }} *</label>
                            <Select
                                id="class"
                                v-model="formData.classId"
                                :options="classOptions"
                                optionLabel="label"
                                optionValue="value"
                                class="w-full"
                                required
                            />
                        </div>

                        <div class="field">
                            <label for="location" class="font-medium">{{ t('schedules.location') }} *</label>
                            <Select
                                id="location"
                                v-model="formData.locationId"
                                :options="locationOptions"
                                optionLabel="label"
                                optionValue="value"
                                class="w-full"
                                required
                            />
                        </div>

                        <div class="field">
                            <label for="coach" class="font-medium">{{ t('schedules.coach') }}</label>
                            <Select
                                id="coach"
                                v-model="formData.coachId"
                                :options="coachOptions"
                                optionLabel="label"
                                optionValue="value"
                                class="w-full"
                            />
                            <small class="text-gray-500">{{ t('schedules.coachHelp') }}</small>
                        </div>

                        <!-- One-time schedule fields -->
                        <template v-if="!formData.isRecurring">
                            <div class="field">
                                <label for="startTime" class="font-medium">{{ t('schedules.startTime') }} *</label>
                                <Calendar
                                    id="startTime"
                                    v-model="formData.startDateTime"
                                    showTime
                                    hourFormat="12"
                                    :stepMinute="15"
                                    class="w-full"
                                    required
                                />
                            </div>

                            <div class="field">
                                <label for="endTime" class="font-medium">{{ t('schedules.endTime') }}</label>
                                <Calendar
                                    id="endTime"
                                    v-model="formData.endDateTime"
                                    showTime
                                    hourFormat="12"
                                    :stepMinute="15"
                                    class="w-full"
                                />
                                <small class="text-gray-500">{{ t('schedules.endTimeHelp') }}</small>
                            </div>
                        </template>

                        <!-- Recurring schedule fields -->
                        <template v-else>
                            <div class="field">
                                <label for="startDate" class="font-medium">{{ t('schedules.startDate') }} *</label>
                                <Calendar id="startDate" v-model="formData.startDate" class="w-full" required />
                            </div>

                            <div class="field">
                                <label for="endDate" class="font-medium">{{ t('schedules.endDate') }}</label>
                                <Calendar id="endDate" v-model="formData.endDate" class="w-full" />
                                <small class="text-gray-500">{{ t('schedules.endDateHelp') }}</small>
                            </div>

                            <div class="field">
                                <label for="timeOfDay" class="font-medium">{{ t('schedules.timeOfDay') }} *</label>
                                <Calendar
                                    id="timeOfDay"
                                    v-model="formData.timeOfDay"
                                    timeOnly
                                    hourFormat="12"
                                    :stepMinute="15"
                                    class="w-full"
                                    required
                                />
                            </div>
                        </template>

                        <div class="field">
                            <div class="flex items-center gap-2">
                                <Checkbox v-model="formData.isRecurring" binary />
                                <label class="font-medium">{{ t('schedules.recurring') }}</label>
                            </div>
                        </div>

                        <div class="field">
                            <label for="maxAttendees" class="font-medium">{{ t('schedules.maxAttendees') }}</label>
                            <InputText id="maxAttendees" v-model="formData.maxAttendees" type="number" class="w-full" />
                            <small class="text-gray-500">{{ t('schedules.maxAttendeesHelp') }}</small>
                        </div>
                    </div>

                    <!-- Recurring Pattern -->
                    <div v-if="formData.isRecurring" class="p-4 bg-gray-50 rounded-lg space-y-4">
                        <h4 class="text-lg font-semibold">{{ t('schedules.recurringPattern') }}</h4>

                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div class="field">
                                <label for="frequency" class="font-medium">{{ t('schedules.frequency') }}</label>
                                <Select
                                    id="frequency"
                                    v-model="formData.recurringPattern.frequency"
                                    :options="frequencyOptions"
                                    optionLabel="label"
                                    optionValue="value"
                                    class="w-full"
                                />
                            </div>

                            <div class="field">
                                <label for="interval" class="font-medium">{{ t('schedules.interval') }}</label>
                                <InputText
                                    id="interval"
                                    v-model="formData.recurringPattern.interval"
                                    type="number"
                                    :min="1"
                                    class="w-full"
                                />
                            </div>

                            <div v-if="formData.recurringPattern.frequency === 'weekly'" class="field col-span-full">
                                <label class="font-medium">{{ t('schedules.daysOfWeek') }}</label>
                                <div class="flex flex-wrap gap-2 mt-2">
                                    <div v-for="day in daysOfWeek" :key="day.value" class="flex items-center gap-1">
                                        <Checkbox
                                            :id="`day-${day.value}`"
                                            v-model="formData.recurringPattern.daysOfWeek"
                                            :value="day.value"
                                        />
                                        <label :for="`day-${day.value}`" class="text-sm">{{ day.label }}</label>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="field">
                        <label for="notes" class="font-medium">{{ t('schedules.notes') }}</label>
                        <Textarea
                            id="notes"
                            v-model="formData.notes"
                            rows="3"
                            class="w-full"
                            :placeholder="t('schedules.notesPlaceholder')"
                        />
                    </div>
                </form>

                <template #footer>
                    <div class="flex justify-end gap-2">
                        <Button :label="t('schedules.cancel')" severity="secondary" @click="showDialog = false" />
                        <Button :label="t('schedules.save')" type="submit" @click="handleSubmit" />
                    </div>
                </template>
            </Dialog>

            <Toast />
            <ConfirmDialog />
        </div>
    </Fluid>
</template>

<style scoped>
.field {
    margin-bottom: 1rem;
}

.field label {
    display: block;
    margin-bottom: 0.5rem;
}

.progresscontainer {
    position: relative;
}

.progressoverlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(255, 255, 255, 0.8);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
}

.compact-button {
    flex-shrink: 0;
    min-width: auto;
    width: auto;
}
</style>
